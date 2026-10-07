/**
 * Contract for parser output. Everything built after phase 3 reads ParseResult,
 * including the typed data file the CLI writes. Plain data only: nothing under
 * src/parser imports a web framework, a UI library, or a database client.
 */

export const PARSE_RESULT_VERSION = 2;

/** The three import forms that become edges. require() is not a phase 3 edge. */
export type EdgeKind = "import" | "re-export" | "dynamic-import";

export type SourceLanguage =
  | "ts"
  | "tsx"
  | "js"
  | "jsx"
  | "mjs"
  | "cjs"
  | "mts"
  | "cts";

export interface ParsedFile {
  /** Repo-relative posix path, e.g. "src/parser/walk.ts". The stable node id. */
  id: string;
  /** Posix dirname of id, "." for the repo root. Downstream groups by this. */
  directory: string;
  language: SourceLanguage;
  lines: number;
  /** sha256 hex of file contents. */
  hash: string;
  /** Structural entry guess (package.json entry or root index). No framework. */
  isEntryPoint: boolean;
  /** From the framework adapter. The fallback always yields "unknown". */
  role: string;
  /** Distinct importers, counted after edge dedup. */
  fanIn: number;
  /** Distinct targets, counted after edge dedup. */
  fanOut: number;
}

export interface ParsedEdge {
  from: string;
  to: string;
  kind: EdgeKind;
}

/** One import specifier seen in one file, before resolution. */
export interface ImportRecord {
  importer: string;
  specifier: string;
  kind: EdgeKind;
  line: number;
}

export interface UnresolvedImport extends ImportRecord {
  reason: string;
}

export interface ExcludedImport extends ImportRecord {
  reason: string;
}

export interface CoverageReport {
  /** Every specifier seen, of any kind. */
  totalImportsSeen: number;
  /** Specifiers resolved to a node file inside the repository. */
  resolvedInternal: number;
  /** Bare specifiers and paths escaping the repo: they point outside it. */
  external: number;
  /** Resolved on disk but deliberately not a node (excluded dir, asset). */
  excluded: number;
  /** Could not be resolved, each with a named reason below. */
  unresolved: number;
  /** `export ... from` seen vs resolved. Barrel coverage lives or dies here. */
  reExportsFound: number;
  reExportsResolved: number;
  externalExamples: ImportRecord[];
  excludedExamples: ExcludedImport[];
  unresolvedExamples: UnresolvedImport[];
}

export interface SkippedFile {
  path: string;
  reason: string;
}

export interface ParseStats {
  filesFound: number;
  filesParsed: number;
  filesSkipped: number;
}

export interface ParseResult {
  version: typeof PARSE_RESULT_VERSION;
  /** Name of the adapter that classified files. "none" means the fallback ran. */
  framework: string;
  /** Basename of the parsed directory, for display only. */
  rootName: string;
  files: ParsedFile[];
  edges: ParsedEdge[];
  coverage: CoverageReport;
  skipped: SkippedFile[];
  stats: ParseStats;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown, what: string): string {
  if (typeof value !== "string") throw new Error(`invalid parse result: ${what} is not a string`);
  return value;
}

function asNumber(value: unknown, what: string): number {
  if (typeof value !== "number" || !Number.isFinite(value))
    throw new Error(`invalid parse result: ${what} is not a number`);
  return value;
}

function asBoolean(value: unknown, what: string): boolean {
  if (typeof value !== "boolean") throw new Error(`invalid parse result: ${what} is not a boolean`);
  return value;
}

function asArray(value: unknown, what: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`invalid parse result: ${what} is not an array`);
  return value;
}

function isEdgeKind(value: unknown): value is EdgeKind {
  return value === "import" || value === "re-export" || value === "dynamic-import";
}

function isLanguage(value: unknown): value is SourceLanguage {
  return (
    value === "ts" ||
    value === "tsx" ||
    value === "js" ||
    value === "jsx" ||
    value === "mjs" ||
    value === "cjs" ||
    value === "mts" ||
    value === "cts"
  );
}

function readImportRecord(value: unknown, what: string): ImportRecord {
  if (!isRecord(value)) throw new Error(`invalid parse result: ${what} is not an object`);
  if (!isEdgeKind(value.kind)) throw new Error(`invalid parse result: ${what}.kind is not an edge kind`);
  return {
    importer: asString(value.importer, `${what}.importer`),
    specifier: asString(value.specifier, `${what}.specifier`),
    kind: value.kind,
    line: asNumber(value.line, `${what}.line`),
  };
}

function readReasoned<T extends ImportRecord>(
  value: unknown,
  what: string,
  merge: (base: ImportRecord, reason: string) => T,
): T {
  const base = readImportRecord(value, what);
  if (!isRecord(value)) throw new Error(`invalid parse result: ${what} is not an object`);
  return merge(base, asString(value.reason, `${what}.reason`));
}

/**
 * Validate unknown JSON back into a ParseResult. The CLI reads its own --out
 * file through this, so acceptance "write and read back, types hold" is a real
 * check rather than an assumption. Throws naming the first problem found.
 */
export function parseResultFromJson(data: unknown): ParseResult {
  if (!isRecord(data)) throw new Error("invalid parse result: root is not an object");
  if (data.version !== PARSE_RESULT_VERSION)
    throw new Error(`invalid parse result: version is ${String(data.version)}, expected ${PARSE_RESULT_VERSION}`);

  const files = asArray(data.files, "files").map((entry, i) => {
    if (!isRecord(entry)) throw new Error(`invalid parse result: files[${i}] is not an object`);
    if (!isLanguage(entry.language)) throw new Error(`invalid parse result: files[${i}].language is unknown`);
    return {
      id: asString(entry.id, `files[${i}].id`),
      directory: asString(entry.directory, `files[${i}].directory`),
      language: entry.language,
      lines: asNumber(entry.lines, `files[${i}].lines`),
      hash: asString(entry.hash, `files[${i}].hash`),
      isEntryPoint: asBoolean(entry.isEntryPoint, `files[${i}].isEntryPoint`),
      role: asString(entry.role, `files[${i}].role`),
      fanIn: asNumber(entry.fanIn, `files[${i}].fanIn`),
      fanOut: asNumber(entry.fanOut, `files[${i}].fanOut`),
    };
  });

  const edges = asArray(data.edges, "edges").map((entry, i) => {
    if (!isRecord(entry)) throw new Error(`invalid parse result: edges[${i}] is not an object`);
    if (typeof entry.from !== "string" || typeof entry.to !== "string" || !isEdgeKind(entry.kind))
      throw new Error(`invalid parse result: edges[${i}] has a bad from/to/kind`);
    return { from: entry.from, to: entry.to, kind: entry.kind };
  });

  if (!isRecord(data.coverage)) throw new Error("invalid parse result: coverage is not an object");
  const coverage: CoverageReport = {
    totalImportsSeen: asNumber(data.coverage.totalImportsSeen, "coverage.totalImportsSeen"),
    resolvedInternal: asNumber(data.coverage.resolvedInternal, "coverage.resolvedInternal"),
    external: asNumber(data.coverage.external, "coverage.external"),
    excluded: asNumber(data.coverage.excluded, "coverage.excluded"),
    unresolved: asNumber(data.coverage.unresolved, "coverage.unresolved"),
    reExportsFound: asNumber(data.coverage.reExportsFound, "coverage.reExportsFound"),
    reExportsResolved: asNumber(data.coverage.reExportsResolved, "coverage.reExportsResolved"),
    externalExamples: asArray(data.coverage.externalExamples, "coverage.externalExamples").map((e, i) =>
      readImportRecord(e, `coverage.externalExamples[${i}]`),
    ),
    excludedExamples: asArray(data.coverage.excludedExamples, "coverage.excludedExamples").map((e, i) =>
      readReasoned(e, `coverage.excludedExamples[${i}]`, (base, reason) => ({ ...base, reason })),
    ),
    unresolvedExamples: asArray(data.coverage.unresolvedExamples, "coverage.unresolvedExamples").map((e, i) =>
      readReasoned(e, `coverage.unresolvedExamples[${i}]`, (base, reason) => ({ ...base, reason })),
    ),
  };
  if (
    coverage.totalImportsSeen !==
    coverage.resolvedInternal + coverage.external + coverage.excluded + coverage.unresolved
  ) {
    throw new Error("invalid parse result: coverage buckets do not add up to totalImportsSeen");
  }

  const skipped = asArray(data.skipped, "skipped").map((entry, i) => {
    if (!isRecord(entry)) throw new Error(`invalid parse result: skipped[${i}] is not an object`);
    return { path: asString(entry.path, `skipped[${i}].path`), reason: asString(entry.reason, `skipped[${i}].reason`) };
  });

  if (!isRecord(data.stats)) throw new Error("invalid parse result: stats is not an object");
  const stats: ParseStats = {
    filesFound: asNumber(data.stats.filesFound, "stats.filesFound"),
    filesParsed: asNumber(data.stats.filesParsed, "stats.filesParsed"),
    filesSkipped: asNumber(data.stats.filesSkipped, "stats.filesSkipped"),
  };
  if (stats.filesFound !== stats.filesParsed + stats.filesSkipped) {
    throw new Error("invalid parse result: filesFound != filesParsed + filesSkipped");
  }
  if (stats.filesParsed !== files.length || stats.filesSkipped !== skipped.length) {
    throw new Error("invalid parse result: stats disagree with the files/skipped lists");
  }

  return {
    version: PARSE_RESULT_VERSION,
    framework: asString(data.framework, "framework"),
    rootName: asString(data.rootName, "rootName"),
    files,
    edges,
    coverage,
    skipped,
    stats,
  };
}
