import dagre from "dagre";

/**
 * Deterministic layout for the folded graph. dagre gets sorted nodes and
 * edges, so the same data produces the same picture every time. Sizes are
 * decided here so the layout and the renderer agree on them.
 */

/** Folded folder node: height carries fan-in, width comes from the label. */
export const FOLDED_MIN_WIDTH = 80;
const CHAR_WIDTH = 6.6;
const FOLDED_HORIZONTAL_PADDING = 24;

export function folderNodeWidth(label: string, fileCount: number): number {
  const text = `${label} · ${fileCount} files`;
  return Math.max(FOLDED_MIN_WIDTH, Math.round(text.length * CHAR_WIDTH + FOLDED_HORIZONTAL_PADDING));
}

/** Opened panel: one object on the canvas, files as rows inside it. */
export const PANEL_WIDTH = 248;
export const PANEL_HEADER_HEIGHT = 54;
export const PANEL_ROW_HEIGHT = 24;
export const PANEL_MORE_HEIGHT = 20;
export const PANEL_BOTTOM_PADDING = 8;
/** Rows shown before the panel says how many more instead of growing. */
export const PANEL_ROW_LIMIT = 10;

export function panelHeight(visibleRows: number, hasMore: boolean): number {
  return (
    PANEL_HEADER_HEIGHT +
    visibleRows * PANEL_ROW_HEIGHT +
    (hasMore ? PANEL_MORE_HEIGHT : 0) +
    PANEL_BOTTOM_PADDING
  );
}

/** Vertical centre of a row handle inside a panel node. */
export function panelRowCenter(index: number): number {
  return PANEL_HEADER_HEIGHT + index * PANEL_ROW_HEIGHT + PANEL_ROW_HEIGHT / 2;
}

/**
 * Handles are declared to React Flow rather than measured: a rebuilt node
 * object with no measurement is hidden, and its edges dropped, until the DOM
 * is measured again. The canvas CSS centres each handle on its anchor, so
 * declared bounds are the anchor minus half the size.
 */
export const HANDLE_SIZE = 6;

export interface DeclaredHandle {
  id: string;
  type: "source" | "target";
  position: "left" | "right";
  x: number;
  y: number;
  width: number;
  height: number;
}

function handlePair(base: string, width: number, anchorY: number): DeclaredHandle[] {
  const half = HANDLE_SIZE / 2;
  const box = { y: anchorY - half, width: HANDLE_SIZE, height: HANDLE_SIZE };
  return [
    { id: `${base}in`, type: "target", position: "left", x: -half, ...box },
    { id: `${base}out`, type: "source", position: "right", x: width - half, ...box },
  ];
}

export function folderHandles(width: number, height: number): DeclaredHandle[] {
  return handlePair("", width, height / 2);
}

export function panelHandles(height: number, visibleFiles: readonly string[]): DeclaredHandle[] {
  return [
    ...handlePair("", PANEL_WIDTH, height / 2),
    ...visibleFiles.flatMap((file, index) => handlePair(`${file}#`, PANEL_WIDTH, panelRowCenter(index))),
  ];
}

export interface LayoutNode {
  id: string;
  width: number;
  height: number;
}

export interface LayoutEdge {
  from: string;
  to: string;
}

export function layoutFolderGraph(
  nodes: LayoutNode[],
  edges: LayoutEdge[],
): Record<string, { x: number; y: number }> {
  const graph = new dagre.graphlib.Graph();
  graph.setGraph({ rankdir: "LR", nodesep: 36, ranksep: 80, marginx: 24, marginy: 24 });
  graph.setDefaultEdgeLabel(() => ({}));

  const sortedNodes = [...nodes].sort((a, b) => (a.id < b.id ? -1 : 1));
  for (const node of sortedNodes) {
    graph.setNode(node.id, { width: node.width, height: node.height });
  }
  const pairs = [...new Set(edges.filter((e) => e.from !== e.to).map((e) => `${e.from} ${e.to}`))].sort();
  for (const pair of pairs) {
    const [from, to] = pair.split(" ") as [string, string];
    graph.setEdge(from, to);
  }
  dagre.layout(graph);

  const positions: Record<string, { x: number; y: number }> = {};
  for (const node of sortedNodes) {
    const placed = graph.node(node.id);
    positions[node.id] = {
      x: placed.x - node.width / 2,
      y: placed.y - node.height / 2,
    };
  }
  return positions;
}
