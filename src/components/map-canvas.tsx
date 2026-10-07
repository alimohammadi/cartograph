"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge as FlowEdge,
  type Node as FlowNode,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { deriveFolderEdges, foldFiles, nodeHeight, type FoldNode } from "@/graph/fold";
import { groupRenderEdges, visibleFilesFor } from "@/graph/edges";
import {
  HANDLE_SIZE,
  PANEL_ROW_LIMIT,
  PANEL_WIDTH,
  folderHandles,
  folderNodeWidth,
  layoutFolderGraph,
  panelHandles,
  panelHeight,
  panelRowCenter,
  type DeclaredHandle,
} from "@/graph/layout";
import { shortestUniqueLabels } from "@/graph/labels";
import { computeHighlight, type GraphSelection } from "@/graph/selection";
import type { ParsedEdge, ParsedFile } from "@/parser/types";

/**
 * The map itself, drawn from the parser's files and edges. Folders start
 * folded; clicking one opens it into a panel of file rows. Node height
 * carries fan-in, width comes from the label. Everything positional is
 * derived in useMemo from sorted inputs, so the same data draws the same
 * picture every time.
 *
 * Selection, hover and which folders are open belong to the parent. This
 * component only draws them and reports clicks. The zoom cap lives here
 * because reading it needs the flow instance; the parent calls the capture
 * function before it opens a folder.
 */

interface MapCanvasProps {
  files: ParsedFile[];
  edges: ParsedEdge[];
  selection: GraphSelection;
  hover: GraphSelection;
  openIds: ReadonlySet<string>;
  onOpenFolder: (id: string) => void;
  onCloseFolder: (id: string) => void;
  onSelectFile: (id: string) => void;
  onSelectFolder: (id: string) => void;
  onClearSelection: () => void;
  onHover: (hover: GraphSelection) => void;
  onZoomCap: (capture: () => void) => void;
}

const DIM_OPACITY = 0.25;

const handleStyle = {
  width: HANDLE_SIZE,
  height: HANDLE_SIZE,
  background: "var(--muted)",
  border: "none",
};

type FolderNodeData = {
  nodeId: string;
  label: string;
  fileCount: number;
  title: string;
  selected: boolean;
  outlined: boolean;
  dimmed: boolean;
  onHover: (hover: GraphSelection) => void;
};

function FolderNode({ data }: NodeProps<FlowNode<FolderNodeData>>) {
  return (
    <div
      title={data.title}
      onMouseEnter={() => data.onHover({ kind: "folder", id: data.nodeId })}
      onMouseLeave={() => data.onHover(null)}
      className="flex h-full w-full cursor-pointer items-center justify-center gap-1.5 rounded border bg-[var(--surface)] px-2 font-mono text-[11px]"
      style={{
        borderColor: data.selected ? "var(--accent)" : "var(--border)",
        boxShadow: data.outlined ? "inset 0 0 0 1px var(--accent)" : undefined,
        opacity: data.dimmed ? DIM_OPACITY : 1,
      }}
    >
      <Handle type="target" position={Position.Left} id="in" style={handleStyle} />
      <span className="truncate text-[var(--foreground)]">{data.label}</span>
      <span className="shrink-0 tabular-nums text-[var(--muted)]">{data.fileCount}</span>
      <Handle type="source" position={Position.Right} id="out" style={handleStyle} />
    </div>
  );
}

type PanelRowData = {
  file: string;
  base: string;
  selected: boolean;
  outlined: boolean;
  dimmed: boolean;
  top: number;
  onSelect: (event: React.MouseEvent) => void;
};

type PanelNodeData = {
  nodeId: string;
  label: string;
  subline: string;
  title: string;
  rows: PanelRowData[];
  hiddenCount: number;
  selected: boolean;
  outlined: boolean;
  dimmed: boolean;
  onClose: (event: React.MouseEvent) => void;
  onHover: (hover: GraphSelection) => void;
};

function PanelNode({ data }: NodeProps<FlowNode<PanelNodeData>>) {
  return (
    <div
      data-pane={data.nodeId}
      title={data.title}
      onMouseEnter={() => data.onHover({ kind: "folder", id: data.nodeId })}
      onMouseLeave={() => data.onHover(null)}
      className="flex h-full w-full flex-col overflow-hidden rounded border bg-[var(--surface)] font-mono text-[11px]"
      style={{
        borderColor: data.selected ? "var(--accent)" : "var(--border)",
        boxShadow: data.outlined ? "inset 0 0 0 1px var(--accent)" : undefined,
        opacity: data.dimmed ? DIM_OPACITY : 1,
      }}
    >
      <Handle type="target" position={Position.Left} id="in" style={{ ...handleStyle, opacity: 0 }} />
      <Handle type="source" position={Position.Right} id="out" style={{ ...handleStyle, opacity: 0 }} />
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          data.onClose(event);
        }}
        title="Close folder"
        className="flex h-[54px] w-full shrink-0 cursor-pointer flex-col justify-center gap-0.5 border-b border-[var(--border)] px-2 text-left hover:bg-[var(--background)]"
      >
        <span className="truncate text-[var(--foreground)]">{data.label}</span>
        <span className="text-[10px] tabular-nums text-[var(--muted)]">{data.subline}</span>
      </button>
      <div className="min-h-0 flex-1">
        {data.rows.map((row) => (
          <div
            key={row.file}
            data-file={row.file}
            onClick={(event) => {
              event.stopPropagation();
              row.onSelect(event);
            }}
            onMouseEnter={() => data.onHover({ kind: "file", id: row.file })}
            onMouseLeave={(event) => {
              const next = event.relatedTarget;
              if (next instanceof Element && next.closest("[data-file]")) return;
              const panel = event.currentTarget.closest("[data-pane]");
              if (panel && next instanceof Node && panel.contains(next)) {
                data.onHover({ kind: "folder", id: data.nodeId });
                return;
              }
              data.onHover(null);
            }}
            title={row.file}
            className="flex w-full cursor-pointer items-center px-2"
            style={{
              height: 24,
              opacity: row.dimmed ? DIM_OPACITY : 1,
              boxShadow: row.outlined ? "inset 0 0 0 1px var(--accent)" : undefined,
              background: row.selected
                ? "color-mix(in srgb, var(--accent) 14%, transparent)"
                : "transparent",
            }}
          >
            <Handle
              type="target"
              position={Position.Left}
              id={`${row.file}#in`}
              style={{ ...handleStyle, top: row.top }}
            />
            <span className="truncate text-[var(--foreground)]">{row.base}</span>
            <Handle
              type="source"
              position={Position.Right}
              id={`${row.file}#out`}
              style={{ ...handleStyle, top: row.top }}
            />
          </div>
        ))}
        {data.hiddenCount > 0 ? (
          <div className="flex h-5 items-center px-2 text-[10px] tabular-nums text-[var(--muted)]">
            +{data.hiddenCount} more
          </div>
        ) : null}
      </div>
    </div>
  );
}

const nodeTypes = { folder: FolderNode, panel: PanelNode };

function baseName(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1);
}

function toFlowHandles(handles: DeclaredHandle[]): NonNullable<FlowNode["handles"]> {
  return handles.map((handle) => ({
    ...handle,
    position: handle.position === "left" ? Position.Left : Position.Right,
  }));
}

type SizedNode =
  | { kind: "folder"; id: string; node: FoldNode; label: string; width: number; height: number }
  | {
      kind: "panel";
      id: string;
      node: FoldNode;
      label: string;
      width: number;
      height: number;
      visible: string[];
      hidden: number;
    };

function MapCanvasInner({
  files,
  edges,
  selection,
  hover,
  openIds,
  onOpenFolder,
  onCloseFolder,
  onSelectFile,
  onSelectFolder,
  onClearSelection,
  onHover,
  onZoomCap,
}: MapCanvasProps) {
  const { fitView, getNodesBounds, getZoom } = useReactFlow();
  const wrapRef = useRef<HTMLDivElement>(null);
  // Zoom from before the last open: refitting may only ever zoom out from it.
  const zoomCapRef = useRef(1);
  const prevOpenCount = useRef(0);

  useEffect(() => {
    onZoomCap(() => {
      zoomCapRef.current = getZoom();
    });
  }, [onZoomCap, getZoom]);

  const folded = useMemo(() => foldFiles(files, edges), [files, edges]);
  const labels = useMemo(
    () => shortestUniqueLabels(folded.nodes.map((node) => node.id)),
    [folded],
  );
  const folderEdges = useMemo(
    () => deriveFolderEdges(edges, folded.fileToNode),
    [edges, folded],
  );
  const maxFanIn = useMemo(
    () => folded.nodes.reduce((max, node) => Math.max(max, node.fanIn), 0),
    [folded],
  );
  const highlight = useMemo(
    () => computeHighlight(selection, folded.fileToNode, edges, folderEdges),
    [selection, folded, edges, folderEdges],
  );
  const fullFiles = useMemo(() => new Set(highlight.fullFiles), [highlight]);
  const fullFolders = useMemo(() => new Set(highlight.fullFolders), [highlight]);
  const fullFileEdges = useMemo(() => new Set(highlight.fullFileEdges), [highlight]);

  const visibleFiles = useMemo(
    () => visibleFilesFor(folded.nodes, openIds, PANEL_ROW_LIMIT),
    [folded, openIds],
  );

  const groups = useMemo(
    () => groupRenderEdges(edges, folded.fileToNode, visibleFiles),
    [edges, folded, visibleFiles],
  );

  const sized = useMemo<SizedNode[]>(
    () =>
      folded.nodes.map((node) => {
        const label = labels[node.id] ?? node.id;
        if (!openIds.has(node.id)) {
          return {
            kind: "folder" as const,
            id: node.id,
            node,
            label,
            width: folderNodeWidth(label, node.files.length),
            height: nodeHeight(node.fanIn, maxFanIn),
          };
        }
        const visible = node.files.slice(0, PANEL_ROW_LIMIT);
        const hidden = node.files.length - visible.length;
        return {
          kind: "panel" as const,
          id: node.id,
          node,
          label,
          width: PANEL_WIDTH,
          height: panelHeight(visible.length, hidden > 0),
          visible,
          hidden,
        };
      }),
    [folded, openIds, labels, maxFanIn],
  );

  const positions = useMemo(
    () =>
      layoutFolderGraph(
        sized.map((node) => ({ id: node.id, width: node.width, height: node.height })),
        groups.map((group) => ({ from: group.fromNode, to: group.toNode })),
      ),
    [sized, groups],
  );

  // Where the pointer went down, so a pan that starts on a node and ends
  // on it is not mistaken for a click. Keyboard clicks carry no position
  // (detail 0) and are always intentional.
  const downPos = useRef<{ x: number; y: number } | null>(null);

  const isPanRelease = useCallback((event: React.MouseEvent): boolean => {
    if (event.detail === 0) return false;
    const down = downPos.current;
    return down !== null && Math.hypot(event.clientX - down.x, event.clientY - down.y) > 4;
  }, []);

  // The single routing point for node clicks. Passing any onNodeClick is
  // also what keeps pointer events on: without it, a non-selectable,
  // non-draggable node renders pointer-events none and clicks fall through
  // to the pane.
  function handleNodeClick(event: React.MouseEvent, node: FlowNode): void {
    if (isPanRelease(event)) return;
    if (node.type === "folder") {
      onOpenFolder(node.id);
    } else {
      onSelectFolder(node.id);
    }
  }

  const flowNodes = useMemo<FlowNode[]>(() => {
    const hasSelection = selection !== null;
    return sized.map((entry) => {
      const position = positions[entry.id] ?? { x: 0, y: 0 };
      const hoveredFile =
        hover?.kind === "file" && folded.fileToNode[hover.id] === entry.id ? hover.id : null;
      const rowShown =
        hoveredFile !== null && entry.kind === "panel" && entry.visible.includes(hoveredFile);
      const outlined =
        (hover?.kind === "folder" && hover.id === entry.id) || (hoveredFile !== null && !rowShown);
      if (entry.kind === "folder") {
        const { node, label } = entry;
        return {
          id: entry.id,
          type: "folder",
          position,
          width: entry.width,
          height: entry.height,
          handles: toFlowHandles(folderHandles(entry.width, entry.height)),
          data: {
            nodeId: entry.id,
            label,
            fileCount: node.files.length,
            title: `${node.id} · ${node.files.length} files · ${node.fanIn} in · ${node.fanOut} out`,
            selected: selection?.kind === "folder" && selection.id === entry.id,
            outlined,
            dimmed: hasSelection && !fullFolders.has(entry.id),
            onHover,
          } satisfies FolderNodeData,
        };
      }
      const { node, label } = entry;
      return {
        id: entry.id,
        type: "panel",
        position,
        width: entry.width,
        height: entry.height,
        handles: toFlowHandles(panelHandles(entry.height, entry.visible)),
        data: {
          nodeId: entry.id,
          label,
          subline: `${node.files.length} files · in ${node.fanIn} · out ${node.fanOut}`,
          title: `${node.id} · ${node.files.length} files · ${node.fanIn} in · ${node.fanOut} out`,
          rows: entry.visible.map(
            (file, index): PanelRowData => ({
              file,
              base: baseName(file),
              selected: selection?.kind === "file" && selection.id === file,
              outlined: hover?.kind === "file" && hover.id === file,
              dimmed: hasSelection && !fullFiles.has(file),
              top: panelRowCenter(index),
              onSelect: (event) => {
                if (isPanRelease(event)) return;
                onSelectFile(file);
              },
            }),
          ),
          hiddenCount: entry.hidden,
          selected: selection?.kind === "folder" && selection.id === entry.id,
          outlined,
          dimmed: hasSelection && !fullFolders.has(entry.id),
          onClose: (event) => {
            if (isPanRelease(event)) return;
            onCloseFolder(entry.id);
          },
          onHover,
        } satisfies PanelNodeData,
      };
    });
  }, [
    sized,
    positions,
    hover,
    selection,
    folded,
    fullFiles,
    fullFolders,
    onHover,
    onSelectFile,
    onCloseFolder,
    isPanRelease,
  ]);

  const flowEdges = useMemo<FlowEdge[]>(() => {
    const hasSelection = selection !== null;
    return groups.map((group, index) => {
      const fullPairs = group.pairs.filter(([from, to]) => fullFileEdges.has(`${from} ${to}`));
      let status: "plain" | "dim" | "full" | "in" | "out" = "plain";
      if (hasSelection) {
        if (fullPairs.length === 0) {
          status = "dim";
        } else if (
          selection?.kind === "file" &&
          fullPairs.every(([, to]) => to === selection.id)
        ) {
          status = "in";
        } else if (
          selection?.kind === "file" &&
          fullPairs.every(([from]) => from === selection.id)
        ) {
          status = "out";
        } else if (selection?.kind === "folder" && group.fromNode === selection.id) {
          status = "out";
        } else if (selection?.kind === "folder" && group.toNode === selection.id) {
          status = "in";
        } else {
          status = "full";
        }
      }
      const stroke =
        status === "in"
          ? "var(--in)"
          : status === "out"
            ? "var(--out)"
            : status === "full"
              ? "var(--foreground)"
              : "var(--muted)";
      return {
        id: `e${index}`,
        source: group.fromNode,
        sourceHandle: group.fromHandle,
        target: group.toNode,
        targetHandle: group.toHandle,
        style: {
          stroke,
          strokeWidth: status === "in" || status === "out" ? 1.5 : 1,
          opacity: status === "dim" ? DIM_OPACITY : 1,
        },
        markerEnd:
          status === "in" || status === "out"
            ? { type: MarkerType.ArrowClosed, color: stroke }
            : undefined,
      };
    });
  }, [groups, fullFileEdges, selection]);

  // Refit after an open, against the state after the change, and only ever
  // zooming out: capped at the zoom from before the click. Skipped when the
  // new picture already fits, so nothing moves needlessly.
  useEffect(() => {
    if (openIds.size > prevOpenCount.current) {
      const element = wrapRef.current;
      if (element) {
        const rect = element.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          const bounds = getNodesBounds(flowNodes.map((node) => node.id));
          const need =
            Math.max(bounds.width / rect.width, bounds.height / rect.height) * 1.15;
          if (need > zoomCapRef.current) {
            fitView({ maxZoom: zoomCapRef.current, padding: 0.12 });
          }
        }
      }
    }
    prevOpenCount.current = openIds.size;
  });

  return (
    <div
      ref={wrapRef}
      className="absolute inset-0"
      onPointerDownCapture={(event) => {
        downPos.current = { x: event.clientX, y: event.clientY };
      }}
    >
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        fitView
        fitViewOptions={{ padding: 0.12 }}
        minZoom={0.15}
        maxZoom={2}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        onPaneClick={() => onClearSelection()}
        style={{ background: "var(--background)" }}
      />
    </div>
  );
}

export function MapCanvas(props: MapCanvasProps) {
  return (
    <ReactFlowProvider>
      <MapCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
