import type { ParsedEdge, ParsedFile, ParseResult } from "../parser/types.ts";
import { languageCategories, type FileCategory } from "./file-kinds.ts";

/**
 * Numbers the detail pane shows. Pure functions over files and edges: the
 * pane renders these lists, and the stated count is the list's length.
 */

const TOP_DEPENDED = 10;

export interface RankedFile {
  id: string;
  importers: number;
}

export interface RepoSummary {
  name: string;
  framework: string;
  fileCount: number;
  /** Resolved edges, the connections drawn on the map. */
  importCount: number;
  /**
   * "none" when the framework is none. The contract has no route list, so
   * this is never a counted zero.
   */
  routes: "none";
  topDepended: RankedFile[];
  zeroImporterCount: number;
  zeroImporters: string[];
  unidentified: number;
}

function byPath(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function repoSummary(
  result: Pick<ParseResult, "rootName" | "framework" | "files" | "edges">,
): RepoSummary {
  const topDepended = result.files
    .filter((file) => file.fanIn > 0)
    .map((file) => ({ id: file.id, importers: file.fanIn }))
    .sort((a, b) => b.importers - a.importers || byPath(a.id, b.id))
    .slice(0, TOP_DEPENDED);

  const zeroImporters = result.files
    .filter((file) => file.fanIn === 0)
    .map((file) => file.id)
    .sort(byPath);

  return {
    name: result.rootName,
    framework: result.framework,
    fileCount: result.files.length,
    importCount: result.edges.length,
    // ponytail: no route field on the contract. A named framework still reads none until one exists.
    routes: result.framework === "none" ? "none" : "none",
    topDepended,
    zeroImporterCount: zeroImporters.length,
    zeroImporters,
    unidentified: result.files.filter((file) => file.role === "unknown").length,
  };
}

export interface FileNeighbours {
  imports: string[];
  importers: string[];
}

/** Distinct files this one imports, and distinct files that import it. Both sorted. */
export function fileNeighbours(
  fileId: string,
  edges: Pick<ParsedEdge, "from" | "to">[],
): FileNeighbours {
  const imports = new Set<string>();
  const importers = new Set<string>();
  for (const edge of edges) {
    if (edge.from === fileId) imports.add(edge.to);
    if (edge.to === fileId) importers.add(edge.from);
  }
  return {
    imports: [...imports].sort(byPath),
    importers: [...importers].sort(byPath),
  };
}

/** Kinds inside one folder, same categories the rail uses. */
export function folderKinds(
  files: Pick<ParsedFile, "id" | "language">[],
  fileIds: readonly string[],
): FileCategory[] {
  const ids = new Set(fileIds);
  return languageCategories(files.filter((file) => ids.has(file.id)));
}
