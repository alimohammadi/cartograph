import type { ParsedEdge } from "../parser/types.ts";
import type { FolderEdge } from "./fold.ts";

/**
 * Selection highlighting as arithmetic, not a model decision. Selecting a
 * file or a folder keeps it, its edges, and whatever those edges connect to
 * at full strength; everything else dims. Renderer-agnostic: returns sorted
 * id lists, the renderer checks membership.
 */

export type GraphSelection =
  | { kind: "file"; id: string }
  | { kind: "folder"; id: string }
  | null;

export interface Highlight {
  fullFiles: string[];
  fullFolders: string[];
  /** "from to" keys over the file edge list. */
  fullFileEdges: string[];
}

function edgeKey(from: string, to: string): string {
  return `${from} ${to}`;
}

export function computeHighlight(
  selection: GraphSelection,
  fileToNode: Record<string, string>,
  fileEdges: Pick<ParsedEdge, "from" | "to">[],
  folderEdges: Pick<FolderEdge, "from" | "to">[],
): Highlight {
  if (selection === null) {
    return { fullFiles: [], fullFolders: [], fullFileEdges: [] };
  }
  const fullFiles = new Set<string>();
  const fullFolders = new Set<string>();
  const fullFileEdges = new Set<string>();

  if (selection.kind === "file") {
    fullFiles.add(selection.id);
    const home = fileToNode[selection.id];
    if (home !== undefined) fullFolders.add(home);
    for (const edge of fileEdges) {
      if (edge.from === selection.id || edge.to === selection.id) {
        fullFileEdges.add(edgeKey(edge.from, edge.to));
        fullFiles.add(edge.from);
        fullFiles.add(edge.to);
        const fromNode = fileToNode[edge.from];
        const toNode = fileToNode[edge.to];
        if (fromNode !== undefined) fullFolders.add(fromNode);
        if (toNode !== undefined) fullFolders.add(toNode);
      }
    }
  } else {
    fullFolders.add(selection.id);
    for (const edge of folderEdges) {
      if (edge.from === selection.id || edge.to === selection.id) {
        fullFolders.add(edge.from);
        fullFolders.add(edge.to);
      }
    }
    for (const [file, node] of Object.entries(fileToNode)) {
      if (fullFolders.has(node)) fullFiles.add(file);
    }
    for (const edge of fileEdges) {
      if (fullFiles.has(edge.from) && fullFiles.has(edge.to)) {
        fullFileEdges.add(edgeKey(edge.from, edge.to));
      }
    }
  }

  const sorted = (set: Set<string>): string[] => [...set].sort();
  return {
    fullFiles: sorted(fullFiles),
    fullFolders: sorted(fullFolders),
    fullFileEdges: sorted(fullFileEdges),
  };
}
