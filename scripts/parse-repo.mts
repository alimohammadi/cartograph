#!/usr/bin/env node
/**
 * Run the parser against a directory and print what it found.
 * Usage: node scripts/parse-repo.mts <directory> [--out <file>]
 * --out writes the full typed result as JSON, reads it back, and validates it.
 */
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { resolve as resolvePath } from "node:path";
import { parseRepository } from "../src/parser/index.ts";
import { parseResultFromJson } from "../src/parser/types.ts";
import type { ImportRecord, ParseResult } from "../src/parser/types.ts";

function usage(): string {
  return "usage: node scripts/parse-repo.mts <directory> [--out <file>]";
}

function parseArgs(argv: string[]): { dir: string; out: string | null } {
  const positional: string[] = [];
  let out: string | null = null;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--out") {
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) throw new Error("--out needs a file path");
      out = next;
      i += 1;
    } else if (arg?.startsWith("--")) {
      throw new Error(`unknown flag: ${arg}`);
    } else if (arg !== undefined) {
      positional.push(arg);
    }
  }
  if (positional.length !== 1 || positional[0] === undefined) throw new Error(usage());
  return { dir: positional[0], out };
}

function formatSpecifier(item: ImportRecord, reason?: string): string {
  // A non-literal dynamic import has code where a path would be; quote it and it lies.
  if (item.kind === "dynamic-import" && reason === "dynamic-import-non-literal") {
    return item.specifier === "" ? "import(<missing>)" : `import(${item.specifier})`;
  }
  return `'${item.specifier}'`;
}

function printResult(result: ParseResult): void {
  const folders = [...new Set(result.files.map((file) => file.directory))].sort();
  const byKind = new Map<string, number>();
  for (const edge of result.edges) byKind.set(edge.kind, (byKind.get(edge.kind) ?? 0) + 1);
  const c = result.coverage;

  console.log(`root: ${result.rootName} (version ${result.version})`);
  console.log(`framework: ${result.framework}`);
  console.log(
    `files found: ${result.stats.filesFound} | parsed: ${result.stats.filesParsed} | skipped: ${result.stats.filesSkipped}`,
  );
  for (const skip of result.skipped) console.log(`  skipped: ${skip.path} — ${skip.reason}`);
  console.log(`distinct folders: ${folders.length}`);
  for (const folder of folders) console.log(`  dir: ${folder}`);
  console.log(
    `edges: ${result.edges.length} (import: ${byKind.get("import") ?? 0}, re-export: ${byKind.get("re-export") ?? 0}, dynamic-import: ${byKind.get("dynamic-import") ?? 0})`,
  );
  console.log(
    `coverage: seen ${c.totalImportsSeen} -> internal ${c.resolvedInternal}, external ${c.external}, excluded ${c.excluded}, unresolved ${c.unresolved}`,
  );
  console.log(`re-exports: found ${c.reExportsFound}, resolved ${c.reExportsResolved}`);
  const externalSpecifiers = [...new Set(c.externalExamples.map((e) => e.specifier))].sort();
  console.log(`external specifiers (${externalSpecifiers.length} unique): ${externalSpecifiers.join(", ")}`);
  for (const item of c.excludedExamples) {
    console.log(`  excluded: ${item.importer}:${item.line} ${formatSpecifier(item, item.reason)} [${item.kind}] — ${item.reason}`);
  }
  for (const item of c.unresolvedExamples) {
    console.log(`  unresolved: ${item.importer}:${item.line} ${formatSpecifier(item, item.reason)} [${item.kind}] — ${item.reason}`);
  }
}

function main(): void {
  let args: { dir: string; out: string | null };
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(2);
  }
  const root = resolvePath(args.dir);
  if (!existsSync(root) || !statSync(root).isDirectory()) {
    console.error(`not a directory: ${args.dir}`);
    process.exit(2);
  }

  const result = parseRepository(root);
  printResult(result);

  if (args.out !== null) {
    const outPath = resolvePath(args.out);
    writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
    const readBack = parseResultFromJson(JSON.parse(readFileSync(outPath, "utf8")) as unknown);
    console.log(
      `wrote ${outPath} (${readBack.files.length} files, ${readBack.edges.length} edges) — read-back ok, types hold`,
    );
  }
}

main();
