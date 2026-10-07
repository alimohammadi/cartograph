import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, extname, join, relative, sep } from "node:path";
import type { SkippedFile, SourceLanguage } from "./types.ts";

/**
 * Directories never walked. Whole directories are kept or dropped; files are
 * never cherry-picked by size or rank, so an edge always points at a node.
 */
export const EXCLUDED_DIR_NAMES: readonly string[] = [
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  "out",
  "coverage",
  ".turbo",
  ".vercel",
];

const LANGUAGE_BY_EXTENSION: Record<string, SourceLanguage> = {
  ".ts": "ts",
  ".tsx": "tsx",
  ".js": "js",
  ".jsx": "jsx",
  ".mjs": "mjs",
  ".cjs": "cjs",
  ".mts": "mts",
  ".cts": "cts",
};

/** Files too large to parse as code, reported as skips with a reason. */
export const MAX_FILE_BYTES = 1000000;

export interface DiscoveredFile {
  absolutePath: string;
  /** Repo-relative posix path. */
  id: string;
  directory: string;
  language: SourceLanguage;
  text: string;
  lines: number;
  hash: string;
  sizeBytes: number;
}

export interface WalkOutcome {
  files: DiscoveredFile[];
  skipped: SkippedFile[];
  /** Entry ids from package.json plus root index files. Structural only. */
  entryIds: string[];
}

export function toPosixPath(path: string): string {
  return path.split(sep).join("/");
}

function languageForFile(fileName: string): SourceLanguage | null {
  // Generated declarations look like .ts but are not nodes.
  if (/\.d\.(ts|mts|cts)$/.test(fileName)) return null;
  if (fileName.endsWith(".min.js") || fileName.endsWith(".bundle.js")) return null;
  return LANGUAGE_BY_EXTENSION[extname(fileName).toLowerCase()] ?? null;
}

function isExcludedDir(dirName: string): boolean {
  return EXCLUDED_DIR_NAMES.includes(dirName);
}

/** Match a package.json entry value against discovered ids, tolerantly. */
function matchEntryId(ids: Set<string>, raw: string): string | null {
  const cleaned = raw.replace(/^\.\//, "").replace(/\\/g, "/");
  if (ids.has(cleaned)) return cleaned;
  for (const ext of [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".mts", ".cts"]) {
    if (ids.has(cleaned + ext)) return cleaned + ext;
    if (ids.has(cleaned.replace(/\.(js|jsx|mjs|cjs)$/, ext))) return cleaned.replace(/\.(js|jsx|mjs|cjs)$/, ext);
  }
  return null;
}

function entryIdsFromPackageJson(root: string, ids: Set<string>): string[] {
  const found: string[] = [];
  let pkg: unknown = null;
  try {
    pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as unknown;
  } catch {
    return found;
  }
  if (typeof pkg !== "object" || pkg === null || Array.isArray(pkg)) return found;
  const record = pkg as Record<string, unknown>;
  const candidates: string[] = [];
  for (const key of ["main", "module"]) {
    if (typeof record[key] === "string") candidates.push(record[key] as string);
  }
  const bin = record.bin;
  if (typeof bin === "string") candidates.push(bin);
  else if (typeof bin === "object" && bin !== null && !Array.isArray(bin)) {
    for (const value of Object.values(bin as Record<string, unknown>)) {
      if (typeof value === "string") candidates.push(value);
    }
  }
  for (const candidate of candidates) {
    const matched = matchEntryId(ids, candidate);
    if (matched !== null && !found.includes(matched)) found.push(matched);
  }
  return found;
}

/**
 * Walk root depth-first, keeping every code file outside excluded directories.
 * Returns candidates with text, line counts and hashes, plus a skip record
 * (with reason) for every candidate that could not become a node.
 */
export function walkRepository(root: string): WalkOutcome {
  const files: DiscoveredFile[] = [];
  const skipped: SkippedFile[] = [];

  const visit = (dir: string): void => {
    let entries: string[];
    try {
      entries = readdirSync(dir).sort();
    } catch (error) {
      skipped.push({
        path: toPosixPath(relative(root, dir)),
        reason: `unreadable-directory: ${error instanceof Error ? error.message : String(error)}`,
      });
      return;
    }
    for (const name of entries) {
      const absolutePath = join(dir, name);
      let isDirectory = false;
      let sizeBytes = 0;
      try {
        const stat = statSync(absolutePath);
        isDirectory = stat.isDirectory();
        sizeBytes = stat.size;
      } catch (error) {
        skipped.push({
          path: toPosixPath(relative(root, absolutePath)),
          reason: `unreadable: ${error instanceof Error ? error.message : String(error)}`,
        });
        continue;
      }
      if (isDirectory) {
        if (!isExcludedDir(name)) visit(absolutePath);
        continue;
      }
      const language = languageForFile(name);
      if (language === null) continue; // not a code candidate: never counted, never skipped
      const id = toPosixPath(relative(root, absolutePath));
      if (sizeBytes > MAX_FILE_BYTES) {
        skipped.push({ path: id, reason: `over-size-limit: ${sizeBytes} bytes > ${MAX_FILE_BYTES}` });
        continue;
      }
      let buffer: Buffer;
      try {
        buffer = readFileSync(absolutePath);
      } catch (error) {
        skipped.push({
          path: id,
          reason: `unreadable: ${error instanceof Error ? error.message : String(error)}`,
        });
        continue;
      }
      if (buffer.includes(0)) {
        skipped.push({ path: id, reason: "binary-content: NUL byte in file" });
        continue;
      }
      const text = buffer.toString("utf8");
      files.push({
        absolutePath,
        id,
        directory: toPosixPath(dirname(id)) === "." ? "." : toPosixPath(dirname(id)),
        language,
        text,
        lines: text.length === 0 ? 0 : text.split("\n").length,
        hash: createHash("sha256").update(buffer).digest("hex"),
        sizeBytes,
      });
    }
  };

  visit(root);
  files.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  const ids = new Set(files.map((file) => file.id));
  const entryIds = entryIdsFromPackageJson(root, ids);
  for (const file of files) {
    // A root index file is an entry by position, whatever the framework.
    if (file.directory === "." && /^index\.[^.]+$/.test(basename(file.id)) && !entryIds.includes(file.id)) {
      entryIds.push(file.id);
    }
  }

  skipped.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  return { files, skipped, entryIds };
}
