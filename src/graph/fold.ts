import type { ParsedEdge, ParsedFile } from "../parser/types.ts";

/**
 * Folder folding for the canvas. Pure functions over a file list and an edge
 * list: no filesystem, no framework, no database. The parser's shape is the
 * contract here; the canvas derives everything below from it.
 */

/** "Fewer than a couple of files" merges into its parent. */
export const FOLD_START_THRESHOLD = 2;

/** Folding stops at the lowest threshold landing at or under this. */
export const FOLD_MAX_NODES = 24;

export interface FoldNode {
  /** Directory path, e.g. "src/parser". The node's stable id. */
  id: string;
  /** Ids of files directly in this directory, sorted. */
  files: string[];
  /** Distinct files outside the node importing anything inside it. */
  fanIn: number;
  /** Distinct files outside the node imported by anything inside it. */
  fanOut: number;
}

export interface FoldResult {
  nodes: FoldNode[];
  /** Every file id to the node holding it. Covers all input files. */
  fileToNode: Record<string, string>;
  /** The threshold that produced this result. */
  threshold: number;
}

function parentDir(dir: string): string | null {
  if (dir === ".") return null;
  const slash = dir.lastIndexOf("/");
  return slash === -1 ? "." : dir.slice(0, slash);
}

function depthOf(dir: string): number {
  return dir === "." ? 0 : dir.split("/").length;
}

/** Every directory on the ancestor chains, root included. */
function allDirs(files: Pick<ParsedFile, "directory">[]): Set<string> {
  const dirs = new Set<string>();
  for (const file of files) {
    let dir: string | null = file.directory;
    while (dir !== null && !dirs.has(dir)) {
      dirs.add(dir);
      dir = parentDir(dir);
    }
  }
  return dirs;
}

/**
 * One folding pass at a fixed threshold, computed fresh. Directories are
 * visited deepest-first; all merges at one depth see the same snapshot, so
 * no merge changes what another merge at the same depth sees. Merges only
 * move files upward, so deeper merges are already settled when a shallower
 * depth is decided.
 */
function foldAtThreshold(
  files: Pick<ParsedFile, "id" | "directory">[],
  threshold: number,
): Map<string, string[]> {
  const direct = new Map<string, string[]>();
  for (const dir of allDirs(files)) direct.set(dir, []);
  for (const file of files) direct.get(file.directory)?.push(file.id);
  for (const ids of direct.values()) ids.sort();

  const depths = [...new Set([...direct.keys()].map(depthOf))].sort((a, b) => b - a);
  for (const depth of depths) {
    if (depth === 0) continue; // the root has no parent to merge into
    const snapshot = new Map<string, number>();
    for (const [dir, ids] of direct) snapshot.set(dir, ids.length);
    const merging = [...direct.keys()]
      .filter((dir) => depthOf(dir) === depth && (snapshot.get(dir) ?? 0) < threshold)
      .sort();
    for (const dir of merging) {
      const ids = direct.get(dir);
      if (ids === undefined) continue;
      // Nearest surviving ancestor: same-depth merges never remove
      // ancestors, so one always exists and the root always survives.
      let target = parentDir(dir);
      while (target !== null && !direct.has(target)) target = parentDir(target);
      if (target === null) continue;
      direct.get(target)?.push(...ids);
      direct.delete(dir);
    }
  }
  for (const ids of direct.values()) ids.sort();
  return direct;
}

function nodeFans(
  nodeFiles: Map<string, string[]>,
  fileToNode: Map<string, string>,
  edges: Pick<ParsedEdge, "from" | "to">[],
): Map<string, { fanIn: number; fanOut: number }> {
  const incoming = new Map<string, Set<string>>();
  const outgoing = new Map<string, Set<string>>();
  for (const id of nodeFiles.keys()) {
    incoming.set(id, new Set());
    outgoing.set(id, new Set());
  }
  for (const edge of edges) {
    const from = fileToNode.get(edge.from);
    const to = fileToNode.get(edge.to);
    if (from === undefined || to === undefined || from === to) continue;
    // Distinct neighbouring files, not edge counts: importing and
    // re-exporting the same file is still one neighbour.
    outgoing.get(from)?.add(edge.to);
    incoming.get(to)?.add(edge.from);
  }
  const fans = new Map<string, { fanIn: number; fanOut: number }>();
  for (const id of nodeFiles.keys()) {
    fans.set(id, {
      fanIn: incoming.get(id)?.size ?? 0,
      fanOut: outgoing.get(id)?.size ?? 0,
    });
  }
  return fans;
}

/**
 * Fold files into directory nodes. Tries the starting threshold, then raises
 * it until the node count lands at or under FOLD_MAX_NODES. The repository's
 * own shape decides the depth: nothing about it is picked in advance.
 *
 * Two guarantees for the acceptance check: every surviving node holds more
 * than one file, and folder edges only ever reference surviving nodes.
 * The root is exempt from merging (it has no parent), so a final sweep folds
 * a tiny root into the largest node, or drops it when it holds nothing.
 */
export function foldFiles(
  files: Pick<ParsedFile, "id" | "directory">[],
  edges: Pick<ParsedEdge, "from" | "to">[],
): FoldResult {
  let threshold = FOLD_START_THRESHOLD;
  let folded = foldAtThreshold(files, threshold);
  while (folded.size > FOLD_MAX_NODES && threshold <= files.length + 1) {
    threshold += 1;
    folded = foldAtThreshold(files, threshold);
  }

  const rootFiles = folded.get(".") ?? [];
  if (folded.has(".") && rootFiles.length < FOLD_START_THRESHOLD) {
    const others = [...folded.keys()].filter((dir) => dir !== ".").sort();
    if (rootFiles.length === 0 || others.length === 0) {
      if (rootFiles.length === 0) folded.delete(".");
    } else {
      // The root's own files join the largest node; ties break by id so
      // the same data always produces the same picture.
      let largest = others[0] as string;
      for (const dir of others) {
        const ids = folded.get(dir) ?? [];
        const best = folded.get(largest) ?? [];
        if (ids.length > best.length) largest = dir;
      }
      folded.get(largest)?.push(...rootFiles);
      folded.get(largest)?.sort();
      folded.delete(".");
    }
  }

  const fileToNode = new Map<string, string>();
  for (const [dir, ids] of folded) {
    for (const id of ids) fileToNode.set(id, dir);
  }
  const fans = nodeFans(folded, fileToNode, edges);

  const nodes: FoldNode[] = [...folded.entries()].map(([id, ids]) => ({
    id,
    files: [...ids].sort(),
    fanIn: fans.get(id)?.fanIn ?? 0,
    fanOut: fans.get(id)?.fanOut ?? 0,
  }));
  nodes.sort((a, b) => (a.id < b.id ? -1 : 1));

  return {
    nodes,
    fileToNode: Object.fromEntries(fileToNode),
    threshold,
  };
}

export interface FolderEdge {
  from: string;
  to: string;
  /** How many file edges this folder edge carries. */
  weight: number;
}

/**
 * Folder-level edges derived from the file edge list, never guessed: a
 * folder edge exists because a real import resolves between two files in
 * different folders. Self-loops (both ends in one folder) are dropped.
 */
export function deriveFolderEdges(
  edges: Pick<ParsedEdge, "from" | "to">[],
  fileToNode: Record<string, string>,
): FolderEdge[] {
  const weights = new Map<string, number>();
  for (const edge of edges) {
    const from = fileToNode[edge.from];
    const to = fileToNode[edge.to];
    if (from === undefined || to === undefined || from === to) continue;
    const key = `${from} ${to}`;
    weights.set(key, (weights.get(key) ?? 0) + 1);
  }
  return [...weights.entries()]
    .map(([key, weight]) => {
      const [from, to] = key.split(" ") as [string, string];
      return { from, to, weight };
    })
    .sort((a, b) => {
      if (a.from !== b.from) return a.from < b.from ? -1 : 1;
      return a.to < b.to ? -1 : a.to > b.to ? 1 : 0;
    });
}

/**
 * Node height carries fan-in: how many things depend on it. Linear between a
 * readable minimum and a cap, so one hub folder cannot flatten the rest.
 * Width stays the renderer's business (it comes from the label).
 */
export const NODE_MIN_HEIGHT = 28;
export const NODE_MAX_HEIGHT = 132;

export function nodeHeight(fanIn: number, maxFanIn: number): number {
  if (maxFanIn <= 0) return NODE_MIN_HEIGHT;
  return Math.round(
    NODE_MIN_HEIGHT + ((NODE_MAX_HEIGHT - NODE_MIN_HEIGHT) * fanIn) / maxFanIn,
  );
}
