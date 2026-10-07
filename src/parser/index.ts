import { basename } from "node:path";
import { resolve as resolvePath } from "node:path";
import { Project } from "ts-morph";
import { fallbackAdapter } from "./adapters.ts";
import type { FrameworkAdapter } from "./adapters.ts";
import { extractImports } from "./extract.ts";
import { computeFanCounts, dedupeEdges } from "./graph.ts";
import { classifySpecifier, loadResolveContext } from "./resolve.ts";
import { PARSE_RESULT_VERSION } from "./types.ts";
import type {
  CoverageReport,
  ExcludedImport,
  ImportRecord,
  ParsedEdge,
  ParsedFile,
  ParseResult,
  SkippedFile,
  UnresolvedImport,
} from "./types.ts";
import { toPosixPath, walkRepository } from "./walk.ts";

/**
 * Parse a repository on disk into files, edges and coverage. Takes a directory
 * path, returns data. No network, no framework, no database: runnable from a
 * plain script with nothing else started.
 */
export function parseRepository(rootInput: string, adapter: FrameworkAdapter = fallbackAdapter): ParseResult {
  const root = resolvePath(rootInput);
  const walked = walkRepository(root);
  const entryIds = new Set(walked.entryIds);
  const nodeIds = new Set(walked.files.map((file) => file.id));
  const context = loadResolveContext(root, nodeIds);

  const skipped: SkippedFile[] = [...walked.skipped];
  const parsedIds: string[] = [];
  const rawEdges: ParsedEdge[] = [];
  const externalExamples: ImportRecord[] = [];
  const excludedExamples: ExcludedImport[] = [];
  const unresolvedExamples: UnresolvedImport[] = [];
  let reExportsFound = 0;
  let reExportsResolved = 0;

  // In-memory only: files are fed as text so the parser never touches the
  // disk itself and never picks up an ambient tsconfig.
  const project = new Project({ useInMemoryFileSystem: true });

  for (const file of walked.files) {
    let raws;
    try {
      const sourceFile = project.createSourceFile(toPosixPath(file.absolutePath), file.text, { overwrite: true });
      raws = extractImports(sourceFile);
      parsedIds.push(file.id);
    } catch (error) {
      skipped.push({
        path: file.id,
        reason: `parse-error: ${error instanceof Error ? error.message : String(error)}`,
      });
      continue;
    }
    for (const raw of raws) {
      const record: ImportRecord = {
        importer: file.id,
        specifier: raw.specifier,
        kind: raw.kind,
        line: raw.line,
      };
      const outcome = classifySpecifier(raw.specifier, raw.isLiteral, file.absolutePath, context);
      if (outcome.outcome === "resolved") {
        rawEdges.push({ from: file.id, to: outcome.id, kind: raw.kind });
        if (raw.kind === "re-export") reExportsResolved += 1;
      } else if (outcome.outcome === "external") {
        externalExamples.push(record);
      } else if (outcome.outcome === "excluded") {
        excludedExamples.push({ ...record, reason: outcome.reason });
      } else {
        unresolvedExamples.push({ ...record, reason: outcome.reason });
      }
      if (raw.kind === "re-export") reExportsFound += 1;
    }
  }

  const edges = dedupeEdges(rawEdges);
  const fans = computeFanCounts(parsedIds, edges);

  const parsed = new Set(parsedIds);
  const files: ParsedFile[] = [];
  for (const file of walked.files) {
    if (!parsed.has(file.id)) continue; // became a skip at parse time
    const info = {
      id: file.id,
      directory: file.directory,
      language: file.language,
      isEntryPoint: entryIds.has(file.id),
    };
    files.push({
      ...info,
      lines: file.lines,
      hash: file.hash,
      role: adapter.classify(info),
      fanIn: fans[file.id]?.fanIn ?? 0,
      fanOut: fans[file.id]?.fanOut ?? 0,
    });
  }
  files.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  skipped.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));

  const coverage: CoverageReport = {
    totalImportsSeen: rawEdges.length + externalExamples.length + excludedExamples.length + unresolvedExamples.length,
    resolvedInternal: rawEdges.length,
    external: externalExamples.length,
    excluded: excludedExamples.length,
    unresolved: unresolvedExamples.length,
    reExportsFound,
    reExportsResolved,
    externalExamples,
    excludedExamples,
    unresolvedExamples,
  };

  return {
    version: PARSE_RESULT_VERSION,
    framework: adapter.name,
    rootName: basename(root),
    files,
    edges,
    coverage,
    skipped,
    stats: {
      filesFound: files.length + skipped.length,
      filesParsed: files.length,
      filesSkipped: skipped.length,
    },
  };
}
