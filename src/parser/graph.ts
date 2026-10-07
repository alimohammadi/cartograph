import type { ParsedEdge } from "./types.ts";

/**
 * Pure graph math over a file list and an edge list. No filesystem, no
 * fetching, nothing to mock. The parser calls these; the canvas will too.
 */

/** Drop duplicate (from, to, kind) triples, sorted for deterministic output. */
export function dedupeEdges(edges: ParsedEdge[]): ParsedEdge[] {
  const seen = new Set<string>();
  const unique: ParsedEdge[] = [];
  for (const edge of edges) {
    const key = `${edge.from} ${edge.kind} ${edge.to}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(edge);
  }
  unique.sort((a, b) => {
    if (a.from !== b.from) return a.from < b.from ? -1 : 1;
    if (a.kind !== b.kind) return a.kind < b.kind ? -1 : 1;
    return a.to < b.to ? -1 : a.to > b.to ? 1 : 0;
  });
  return unique;
}

export interface FanCounts {
  fanIn: number;
  fanOut: number;
}

/**
 * Fan-out is the count of distinct files a file points at; fan-in the count
 * of distinct files pointing at it. Kinds do not multiply the count: importing
 * and re-exporting the same file is still one neighbour.
 */
export function computeFanCounts(fileIds: string[], edges: ParsedEdge[]): Record<string, FanCounts> {
  const outgoing = new Map<string, Set<string>>();
  const incoming = new Map<string, Set<string>>();
  for (const id of fileIds) {
    outgoing.set(id, new Set());
    incoming.set(id, new Set());
  }
  for (const edge of edges) {
    // Edges only ever reference known nodes; guard anyway so a bad caller
    // cannot produce counts for files that do not exist.
    if (!outgoing.has(edge.from) || !incoming.has(edge.to)) continue;
    outgoing.get(edge.from)?.add(edge.to);
    incoming.get(edge.to)?.add(edge.from);
  }
  const counts: Record<string, FanCounts> = {};
  for (const id of fileIds) {
    counts[id] = {
      fanIn: incoming.get(id)?.size ?? 0,
      fanOut: outgoing.get(id)?.size ?? 0,
    };
  }
  return counts;
}
