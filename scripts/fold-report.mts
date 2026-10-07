#!/usr/bin/env node
/**
 * Phase 4 acceptance counts, no browser involved. Loads a parser output
 * file, folds it, and reports: node count, smallest node, and whether every
 * edge terminates on a node that exists. Exits non-zero on any violation.
 * Usage: node scripts/fold-report.mts <parse-result.json>
 */
import { readFileSync } from "node:fs";
import { resolve as resolvePath } from "node:path";
import { deriveFolderEdges, FOLD_MAX_NODES, foldFiles, nodeHeight } from "../src/graph/fold.ts";
import { groupRenderEdges, visibleFilesFor } from "../src/graph/edges.ts";
import { computeHighlight } from "../src/graph/selection.ts";
import {
  folderHandles,
  folderNodeWidth,
  layoutFolderGraph,
  PANEL_ROW_LIMIT,
  panelHandles,
  panelHeight,
  type DeclaredHandle,
} from "../src/graph/layout.ts";
import type { RenderGroup } from "../src/graph/edges.ts";
import { shortestUniqueLabels } from "../src/graph/labels.ts";
import { parseResultFromJson } from "../src/parser/types.ts";

function main(): void {
  const input = process.argv[2];
  if (input === undefined) {
    console.error("usage: node scripts/fold-report.mts <parse-result.json>");
    process.exit(2);
  }
  const result = parseResultFromJson(JSON.parse(readFileSync(resolvePath(input), "utf8")) as unknown);
  const folded = foldFiles(result.files, result.edges);
  const folderEdges = deriveFolderEdges(result.edges, folded.fileToNode);
  const labels = shortestUniqueLabels(folded.nodes.map((node) => node.id));
  const nodeIds = new Set(folded.nodes.map((node) => node.id));

  console.log(`files: ${result.files.length} | file edges: ${result.edges.length}`);
  console.log(`threshold: ${folded.threshold} | nodes: ${folded.nodes.length} (max ${FOLD_MAX_NODES})`);
  let smallest = Number.POSITIVE_INFINITY;
  for (const node of folded.nodes) {
    smallest = Math.min(smallest, node.files.length);
    console.log(
      `  node ${labels[node.id]} [${node.id}]: ${node.files.length} files, fan-in ${node.fanIn}, fan-out ${node.fanOut}`,
    );
  }
  console.log(`smallest node holds ${smallest} file(s)`);
  console.log(`folder edges: ${folderEdges.length}`);

  let failed = false;
  if (folded.nodes.length > FOLD_MAX_NODES) {
    console.error(`FAIL: ${folded.nodes.length} nodes exceeds max ${FOLD_MAX_NODES}`);
    failed = true;
  }
  for (const node of folded.nodes) {
    if (node.files.length < 2) {
      console.error(`FAIL: node ${node.id} holds a single file`);
      failed = true;
    }
  }
  for (const edge of result.edges) {
    if (folded.fileToNode[edge.from] === undefined || folded.fileToNode[edge.to] === undefined) {
      console.error(`FAIL: file edge ${edge.from} -> ${edge.to} misses a node`);
      failed = true;
    }
  }
  for (const edge of folderEdges) {
    if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) {
      console.error(`FAIL: folder edge ${edge.from} -> ${edge.to} misses a node`);
      failed = true;
    }
  }
  // Labels must stay unique among what's on screen.
  const seen = new Set(Object.values(labels));
  if (seen.size !== folded.nodes.length) {
    console.error("FAIL: labels are not unique");
    failed = true;
  }
  // The fold must cover every file exactly once.
  const covered = Object.keys(folded.fileToNode).sort();
  const inputs = result.files.map((file) => file.id).sort();
  if (JSON.stringify(covered) !== JSON.stringify(inputs)) {
    console.error("FAIL: fold does not cover every file exactly once");
    failed = true;
  }
  // With every folder open, each rendered line must still terminate on a
  // handle that exists: a row handle for a visible file, else the node's own.
  const allOpen = new Set(folded.nodes.map((node) => node.id));
  const visible = visibleFilesFor(folded.nodes, allOpen, PANEL_ROW_LIMIT);
  const openGroups = groupRenderEdges(result.edges, folded.fileToNode, visible);
  console.log(`render groups (all open): ${openGroups.length}`);
  const nodeOf = new Map(folded.nodes.map((node) => [node.id, node]));
  for (const group of openGroups) {
    for (const [nodeId, handle, side] of [
      [group.fromNode, group.fromHandle, "out"],
      [group.toNode, group.toHandle, "in"],
    ] as const) {
      if (!nodeIds.has(nodeId)) {
        console.error(`FAIL: render group ${group.key} misses node ${nodeId}`);
        failed = true;
        continue;
      }
      if (handle === side) continue;
      const file = handle.endsWith(`#${side}`) ? handle.slice(0, -(side.length + 1)) : null;
      const owner = file === null ? undefined : nodeOf.get(folded.fileToNode[file] ?? "");
      if (
        file === null ||
        !visible.has(file) ||
        owner?.id !== nodeId ||
        !owner.files.includes(file)
      ) {
        console.error(`FAIL: render group ${group.key} misses handle ${handle}`);
        failed = true;
      }
    }
  }

  // Selection keeps the selected thing, its edges and their neighbours
  // bright, and dims everything else. Checked against the hub file (highest
  // fan-in) and its folder, in both selection kinds.
  if (result.files.length === 0) {
    console.error("FAIL: no files to select");
    failed = true;
  } else {
    const edgeByKey = new Map(result.edges.map((edge) => [`${edge.from} ${edge.to}`, edge]));
    const hub = [...result.files].sort((a, b) => b.fanIn - a.fanIn || (a.id < b.id ? -1 : 1))[0] as (typeof result.files)[number];

    const fileSel = computeHighlight(
      { kind: "file", id: hub.id },
      folded.fileToNode,
      result.edges,
      folderEdges,
    );
    const brightFiles = new Set(fileSel.fullFiles);
    const brightFileEdges = new Set(fileSel.fullFileEdges);
    if (!brightFiles.has(hub.id)) {
      console.error(`FAIL: selected file ${hub.id} is not bright`);
      failed = true;
    }
    let incident = 0;
    for (const edge of result.edges) {
      if (edge.from !== hub.id && edge.to !== hub.id) continue;
      incident += 1;
      if (!brightFileEdges.has(`${edge.from} ${edge.to}`)) {
        console.error(`FAIL: incident edge ${edge.from} -> ${edge.to} dims on file select`);
        failed = true;
      }
      const other = edge.from === hub.id ? edge.to : edge.from;
      if (!brightFiles.has(other)) {
        console.error(`FAIL: neighbour ${other} dims on file select`);
        failed = true;
      }
    }
    for (const key of brightFileEdges) {
      const edge = edgeByKey.get(key);
      if (!edge || (edge.from !== hub.id && edge.to !== hub.id)) {
        console.error(`FAIL: bright edge ${key} touches nothing selected`);
        failed = true;
      }
    }
    console.log(
      `selection file ${hub.id}: ${brightFiles.size} files, ${brightFileEdges.size} edges bright, ${result.files.length - brightFiles.size} dimmed (${incident} incident)`,
    );

    const home = folded.fileToNode[hub.id];
    if (home === undefined) {
      console.error(`FAIL: hub file ${hub.id} sits in no node`);
      failed = true;
    } else {
      const folderSel = computeHighlight(
        { kind: "folder", id: home },
        folded.fileToNode,
        result.edges,
        folderEdges,
      );
      const brightFolders = new Set(folderSel.fullFolders);
      if (!brightFolders.has(home)) {
        console.error(`FAIL: selected folder ${home} is not bright`);
        failed = true;
      }
      for (const edge of folderEdges) {
        if (edge.from !== home && edge.to !== home) continue;
        const other = edge.from === home ? edge.to : edge.from;
        if (!brightFolders.has(other)) {
          console.error(`FAIL: neighbour folder ${other} dims on folder select`);
          failed = true;
        }
      }
      for (const key of folderSel.fullFileEdges) {
        const edge = edgeByKey.get(key);
        const fromNode = edge ? folded.fileToNode[edge.from] : undefined;
        const toNode = edge ? folded.fileToNode[edge.to] : undefined;
        if (!edge || !fromNode || !toNode || !brightFolders.has(fromNode) || !brightFolders.has(toNode)) {
          console.error(`FAIL: bright edge ${key} escapes the bright folders`);
          failed = true;
        }
      }
      for (const file of folderSel.fullFiles) {
        const node = folded.fileToNode[file];
        if (!node || !brightFolders.has(node)) {
          console.error(`FAIL: bright file ${file} sits outside the bright folders`);
          failed = true;
        }
      }
      console.log(
        `selection folder ${home}: ${brightFolders.size} folders, ${folderSel.fullFiles.length} files, ${folderSel.fullFileEdges.length} edges bright`,
      );
    }
  }

  const maxFanIn = Math.max(...folded.nodes.map((node) => node.fanIn));
  const sizes = folded.nodes.map((node) => ({
    id: node.id,
    width: folderNodeWidth(labels[node.id] ?? node.id, node.files.length),
    height: nodeHeight(node.fanIn, maxFanIn),
  }));
  const closedGroups = groupRenderEdges(result.edges, folded.fileToNode, new Set());

  // Every line must end on a handle the canvas declares to React Flow, or
  // it is silently not drawn. Checked with every folder closed and open.
  const closedHandles = new Map(
    sizes.map((size) => [size.id, folderHandles(size.width, size.height)]),
  );
  const openHandles = new Map(
    folded.nodes.map((node) => {
      const shown = node.files.slice(0, PANEL_ROW_LIMIT);
      const height = panelHeight(shown.length, node.files.length > shown.length);
      return [node.id, panelHandles(height, shown)];
    }),
  );
  const checkDeclared = (
    label: string,
    groups: RenderGroup[],
    declared: Map<string, DeclaredHandle[]>,
  ): void => {
    for (const group of groups) {
      for (const [nodeId, handle, type] of [
        [group.fromNode, group.fromHandle, "source"],
        [group.toNode, group.toHandle, "target"],
      ] as const) {
        const found = declared.get(nodeId)?.some((h) => h.id === handle && h.type === type);
        if (!found) {
          console.error(`FAIL: ${label} render group ${group.key} has no declared ${type} handle ${handle}`);
          failed = true;
        }
      }
    }
  };
  checkDeclared("closed", closedGroups, closedHandles);
  checkDeclared("open", openGroups, openHandles);
  console.log(failed ? "declared handles: see failures" : "declared handles: ok");

  // Same inputs laid out twice must place every node identically.
  const pairs = closedGroups.map((group) => ({ from: group.fromNode, to: group.toNode }));
  const first = layoutFolderGraph(sizes, pairs);
  const second = layoutFolderGraph(sizes, pairs);
  if (JSON.stringify(first) !== JSON.stringify(second)) {
    console.error("FAIL: layout is not deterministic");
    failed = true;
  } else {
    console.log("layout deterministic: ok");
  }

  console.log(failed ? "RESULT: FAIL" : "RESULT: PASS");
  if (failed) process.exit(1);
}

main();
