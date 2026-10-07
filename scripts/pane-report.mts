#!/usr/bin/env node
/**
 * Pane counts against parser output. Neighbour lists must match fan-in and
 * fan-out, folder kind counts must cover the folder, and under framework
 * none every file is unidentified. Exits non-zero on any failure.
 * Usage: node scripts/pane-report.mts <parse-result.json>
 */
import { readFileSync } from "node:fs";
import { resolve as resolvePath } from "node:path";
import { foldFiles } from "../src/graph/fold.ts";
import { fileNeighbours, folderKinds, repoSummary } from "../src/graph/pane.ts";
import { parseResultFromJson } from "../src/parser/types.ts";

function byPath(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function sorted(ids: string[]): boolean {
  for (let i = 1; i < ids.length; i += 1) {
    const prev = ids[i - 1];
    const curr = ids[i];
    if (prev === undefined || curr === undefined || prev > curr) return false;
  }
  return true;
}

function main(): void {
  const input = process.argv[2];
  if (input === undefined) {
    console.error("usage: node scripts/pane-report.mts <parse-result.json>");
    process.exit(2);
  }
  const result = parseResultFromJson(JSON.parse(readFileSync(resolvePath(input), "utf8")) as unknown);
  const summary = repoSummary(result);
  const folded = foldFiles(result.files, result.edges);
  let failed = false;

  function fail(message: string): void {
    console.error(`FAIL: ${message}`);
    failed = true;
  }

  for (const file of result.files) {
    const neighbours = fileNeighbours(file.id, result.edges);
    if (neighbours.imports.length !== file.fanOut) {
      fail(`${file.id} imports ${neighbours.imports.length} != fanOut ${file.fanOut}`);
    }
    if (neighbours.importers.length !== file.fanIn) {
      fail(`${file.id} importers ${neighbours.importers.length} != fanIn ${file.fanIn}`);
    }
    if (!sorted(neighbours.imports) || !sorted(neighbours.importers)) {
      fail(`${file.id} neighbour lists are not sorted`);
    }
  }

  if (summary.zeroImporterCount !== summary.zeroImporters.length) {
    fail(
      `zero-importer count ${summary.zeroImporterCount} != list ${summary.zeroImporters.length}`,
    );
  }
  const zeroIds = result.files
    .filter((file) => file.fanIn === 0)
    .map((file) => file.id)
    .sort(byPath);
  if (summary.zeroImporters.join("\n") !== zeroIds.join("\n")) {
    fail("zero-importer list is not the files with fan-in 0");
  }

  for (const node of folded.nodes) {
    const kinds = folderKinds(result.files, node.files);
    const sum = kinds.reduce((total, category) => total + category.count, 0);
    if (sum !== node.files.length) {
      fail(`folder ${node.id} kinds sum to ${sum}, holds ${node.files.length}`);
    }
  }

  if (result.framework === "none" && summary.unidentified !== result.files.length) {
    fail(`unidentified ${summary.unidentified} != file count ${result.files.length} under framework none`);
  }
  if (result.framework === "none" && summary.routes !== "none") {
    fail(`routes read ${summary.routes} under framework none`);
  }

  console.log(
    `files: ${summary.fileCount} | imports: ${summary.importCount} | routes: ${summary.routes} | unidentified: ${summary.unidentified} | zero-importers: ${summary.zeroImporterCount} | top: ${summary.topDepended.length}`,
  );
  console.log(failed ? "RESULT: FAIL" : "RESULT: PASS");
  if (failed) process.exit(1);
}

main();
