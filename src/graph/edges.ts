import type { ParsedEdge } from "../parser/types.ts";
import type { FoldNode } from "./fold.ts";

/**
 * Which files get row handles when their folder is open. Shared by the
 * canvas and the terminal acceptance check, so both agree on it.
 */
export function visibleFilesFor(
  nodes: FoldNode[],
  openIds: ReadonlySet<string>,
  rowLimit: number,
): Set<string> {
  const visible = new Set<string>();
  for (const node of nodes) {
    if (!openIds.has(node.id)) continue;
    for (const file of node.files.slice(0, rowLimit)) visible.add(file);
  }
  return visible;
}

export interface RenderGroup {
  key: string;
  fromNode: string;
  fromHandle: string;
  toNode: string;
  toHandle: string;
  pairs: [string, string][];
}

/**
 * File edges grouped into drawable lines. Endpoints inside an open panel
 * attach to the file's row handle; everything else attaches to the folder
 * node's own handles. Edges with both ends in one node are internal to it
 * and draw nothing. Sorted, so the same data draws the same lines.
 */
export function groupRenderEdges(
  edges: Pick<ParsedEdge, "from" | "to">[],
  fileToNode: Record<string, string>,
  visibleFiles: ReadonlySet<string>,
): RenderGroup[] {
  const byKey = new Map<string, RenderGroup>();
  for (const edge of edges) {
    const fromNode = fileToNode[edge.from];
    const toNode = fileToNode[edge.to];
    if (fromNode === undefined || toNode === undefined || fromNode === toNode) continue;
    const fromHandle = visibleFiles.has(edge.from) ? `${edge.from}#out` : "out";
    const toHandle = visibleFiles.has(edge.to) ? `${edge.to}#in` : "in";
    const key = `${fromNode} ${fromHandle} ${toNode} ${toHandle}`;
    let group = byKey.get(key);
    if (!group) {
      group = { key, fromNode, fromHandle, toNode, toHandle, pairs: [] };
      byKey.set(key, group);
    }
    group.pairs.push([edge.from, edge.to]);
  }
  return [...byKey.values()].sort((a, b) => (a.key < b.key ? -1 : 1));
}
