import { readFileSync, statSync } from "node:fs";
import { dirname, extname, isAbsolute, join, relative, resolve as resolvePath, sep } from "node:path";
import { EXCLUDED_DIR_NAMES, toPosixPath } from "./walk.ts";

const PROBE_EXTENSIONS = [".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"];

/** ESM-style explicit ".js" specifiers routinely point at ".ts" sources. */
const EXTENSION_SWAPS: Record<string, string[]> = {
  ".js": [".ts", ".tsx"],
  ".jsx": [".tsx", ".ts"],
  ".mjs": [".mts", ".ts"],
  ".cjs": [".cts", ".ts"],
};

function isFile(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

export type ProbeResult =
  | { status: "file"; absolutePath: string }
  | { status: "directory-without-index" }
  | { status: "missing" };

function probeFileWithSwaps(absolutePath: string): string | null {
  if (isFile(absolutePath)) return absolutePath;
  const ext = extname(absolutePath).toLowerCase();
  for (const swap of EXTENSION_SWAPS[ext] ?? []) {
    const candidate = absolutePath.slice(0, absolutePath.length - ext.length) + swap;
    if (isFile(candidate)) return candidate;
  }
  return null;
}

/** package.json "main" inside an imported directory, one level, files only. */
function probeDirectoryMain(dir: string): string | null {
  let pkg: unknown = null;
  try {
    pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8")) as unknown;
  } catch {
    return null;
  }
  if (typeof pkg !== "object" || pkg === null || Array.isArray(pkg)) return null;
  const main = (pkg as Record<string, unknown>).main;
  if (typeof main !== "string" || main.length === 0) return null;
  const target = resolvePath(dir, main);
  const direct = probeFileWithSwaps(target);
  if (direct !== null) return direct;
  if (extname(target) === "") {
    for (const ext of PROBE_EXTENSIONS) {
      if (isFile(target + ext)) return target + ext;
    }
  }
  return null;
}

function probeDirectory(dir: string): ProbeResult {
  if (!isDirectory(dir)) return { status: "missing" };
  const main = probeDirectoryMain(dir);
  if (main !== null) return { status: "file", absolutePath: main };
  for (const ext of PROBE_EXTENSIONS) {
    const candidate = join(dir, `index${ext}`);
    if (isFile(candidate)) return { status: "file", absolutePath: candidate };
  }
  return { status: "directory-without-index" };
}

/** Resolve a base path the way Node/TypeScript do: file, swaps, extensions, dir. */
export function probeTarget(absolutePath: string): ProbeResult {
  const ext = extname(absolutePath).toLowerCase();
  if (ext !== "") {
    const hit = probeFileWithSwaps(absolutePath);
    return hit === null ? { status: "missing" } : { status: "file", absolutePath: hit };
  }
  for (const candidateExt of PROBE_EXTENSIONS) {
    if (isFile(absolutePath + candidateExt))
      return { status: "file", absolutePath: absolutePath + candidateExt };
  }
  return probeDirectory(absolutePath);
}

export interface AliasRule {
  pattern: string;
  head: string;
  tail: string;
  exact: boolean;
  targets: string[];
}

function matchAlias(rule: AliasRule, specifier: string): string | null {
  if (rule.exact) return specifier === rule.pattern ? "" : null;
  if (!specifier.startsWith(rule.head)) return null;
  if (rule.tail !== "" && !specifier.endsWith(rule.tail)) return null;
  if (specifier.length < rule.head.length + rule.tail.length) return null;
  return specifier.slice(rule.head.length, specifier.length - (rule.tail === "" ? 0 : rule.tail.length));
}

export interface ResolveContext {
  root: string;
  nodeIds: Set<string>;
  /** tsconfig/jsconfig paths, in file order. Empty when the repo has none. */
  aliases: AliasRule[];
}

function asStringRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === "object" && value !== null && !Array.isArray(value))
    return value as Record<string, unknown>;
  return null;
}

/**
 * Load tsconfig/jsconfig path aliases. Only mapping knowledge is used here:
 * no framework checks, no guessing beyond what the repo's own config says.
 */
export function loadResolveContext(root: string, nodeIds: Set<string>): ResolveContext {
  const aliases: AliasRule[] = [];
  for (const configName of ["tsconfig.json", "jsconfig.json"]) {
    let config: unknown = null;
    try {
      config = JSON.parse(readFileSync(join(root, configName), "utf8")) as unknown;
    } catch {
      continue;
    }
    const options = asStringRecord(asStringRecord(config)?.compilerOptions);
    if (options === null) continue;
    const configDir = dirname(join(root, configName));
    const baseUrl = typeof options.baseUrl === "string" ? resolvePath(configDir, options.baseUrl) : configDir;
    const paths = asStringRecord(options.paths);
    if (paths === null) continue;
    for (const [pattern, rawTargets] of Object.entries(paths)) {
      if (!Array.isArray(rawTargets)) continue;
      const targets = rawTargets.filter((t): t is string => typeof t === "string");
      if (targets.length === 0) continue;
      const star = pattern.indexOf("*");
      if (star === -1) {
        aliases.push({ pattern, head: pattern, tail: "", exact: true, targets: targets.map((t) => join(baseUrl, t)) });
      } else if (pattern.indexOf("*", star + 1) === -1) {
        aliases.push({
          pattern,
          head: pattern.slice(0, star),
          tail: pattern.slice(star + 1),
          exact: false,
          targets: targets.map((t) => join(baseUrl, t)),
        });
      }
      // Patterns with two stars are not real tsconfig; ignored, not guessed.
    }
    if (aliases.length > 0) break;
  }
  // Exact-pattern targets resolve against the config dir too.
  return { root, nodeIds, aliases };
}

export type SpecifierOutcome =
  | { outcome: "resolved"; id: string }
  | { outcome: "external"; reason: string }
  | { outcome: "excluded"; reason: string }
  | { outcome: "unresolved"; reason: string };

function classifyProbedFile(root: string, nodeIds: Set<string>, absolutePath: string): SpecifierOutcome {
  const rel = relative(root, absolutePath);
  if (rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
    return { outcome: "external", reason: "outside-repository" };
  }
  const id = toPosixPath(rel);
  const segments = id.split("/");
  const excluded = segments.find((segment) => (EXCLUDED_DIR_NAMES as readonly string[]).includes(segment));
  if (excluded !== undefined) {
    return { outcome: "excluded", reason: `inside-excluded-directory: ${excluded}` };
  }
  if (nodeIds.has(id)) return { outcome: "resolved", id };
  const ext = extname(id).toLowerCase();
  return { outcome: "excluded", reason: `non-node-asset: ${ext === "" ? "no-extension" : ext}` };
}

function classifyProbe(root: string, nodeIds: Set<string>, probe: ProbeResult): SpecifierOutcome | null {
  if (probe.status === "missing") return null;
  if (probe.status === "directory-without-index")
    return { outcome: "unresolved", reason: "directory-without-index" };
  return classifyProbedFile(root, nodeIds, probe.absolutePath);
}

/**
 * Classify one specifier. Relative and alias-mapped paths are probed on disk;
 * bare specifiers point outside the repo; failures name their reason.
 */
export function classifySpecifier(
  specifier: string,
  isLiteral: boolean,
  importerAbs: string,
  context: ResolveContext,
): SpecifierOutcome {
  if (!isLiteral) return { outcome: "unresolved", reason: "dynamic-import-non-literal" };
  if (specifier === "") return { outcome: "unresolved", reason: "empty-specifier" };

  if (specifier === "." || specifier === ".." || specifier.startsWith("./") || specifier.startsWith("../")) {
    const probe = probeTarget(resolvePath(dirname(importerAbs), specifier));
    return classifyProbe(context.root, context.nodeIds, probe) ?? { outcome: "unresolved", reason: "target-not-found" };
  }

  for (const rule of context.aliases) {
    const middle = matchAlias(rule, specifier);
    if (middle === null) continue;
    for (const target of rule.targets) {
      const substituted = rule.exact ? target : target.replace("*", middle);
      const probe = probeTarget(substituted);
      const classified = classifyProbe(context.root, context.nodeIds, probe);
      if (classified !== null) {
        if (classified.outcome === "unresolved") return classified;
        return classified;
      }
    }
    return { outcome: "unresolved", reason: `alias-target-missing: '${specifier}' matched '${rule.pattern}'` };
  }
  if (specifier.startsWith("@/") || specifier.startsWith("~/") || specifier.startsWith("#")) {
    return { outcome: "unresolved", reason: "unmapped-alias-prefix" };
  }

  if (specifier.startsWith("/") || isAbsolute(specifier)) {
    return { outcome: "unresolved", reason: "absolute-specifier-unsupported" };
  }

  return { outcome: "external", reason: "bare-specifier" };
}
