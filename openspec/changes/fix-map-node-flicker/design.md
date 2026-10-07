# Design

## Context

See proposal.md (Why). Traced in the installed `@xyflow/react` 12.12.0 and
`@xyflow/system` 0.0.83:

```
our render --> new node object (no `measured`, no `handles`)
   |
   v
adoptUserNodes: object !== cached userNode
   -> measured = { undefined, undefined }
   -> handleBounds = parseHandles(): no handles, no measured -> undefined
   |
   v
NodeWrapper: nodeHasDimensions() false -> visibility: hidden
EdgeWrapper: source/target handleBounds missing -> edge not drawn
   |
   v  (effect, next frame)
ResizeObserver re-observes -> updateNodeInternals -> visible again
```

The canvas never passes `onNodesChange`, so React Flow's measurements never
reach our node objects, and any rebuild wipes them. `fix-map-viewport`
memoised the node list, but hover is a real dependency of it, so hover still
rebuilds every node.

## Goals / Non-Goals

**Goals:** a rebuilt node is drawable on the frame it arrives, with no
measurement round-trip.

**Non-Goals:** keeping node object identity across hovers (per-node caching),
taking control of node state with `onNodesChange` and `applyNodeChanges`, and
the minimap or controls.

## Decisions

**Declare size and handles on each node instead of having them measured.**
`nodeHasDimensions` accepts `node.width` and `node.height`. `parseHandles`
builds handle bounds straight from `node.handles` when it is present. With
both set, a fresh node object is visible and its edges resolve immediately.
Every number is already decided in our code:

- Folder node: `folderNodeWidth`, `nodeHeight`. Handles `in` (left) and
  `out` (right) at half height.
- Panel node: `PANEL_WIDTH`, `panelHeight`. Handles `in` and `out` at half
  height, plus `<file>#in` and `<file>#out` per visible row at
  `panelRowCenter(index)`.
- React Flow's CSS centres a 6×6 handle on its anchor: a left handle on
  `(0, top)` and a right one on `(width, top)`. So a handle's bounds are
  `x = anchorX - 3` and `y = anchorY - 3`, with width and height 6.

The handle-geometry helper goes in the layout module beside the sizes, and
the `Handle` elements render from the same constants, so the declared and the
drawn positions cannot drift. `style.width` and `style.height` become
`width` and `height`; React Flow applies those to the wrapper itself.

Alternatives:

- Controlled nodes (`onNodesChange` + `applyNodeChanges`) merged with derived
  data. That keeps `measured` around, but it reconciles two sources of truth
  for something we already know exactly.
- Caching node objects per id so unchanged ones keep identity. That cuts
  rebuild cost, not the blink: any node that does change (the hovered one)
  would still blink.

**Keep the refit effect as is.** With declared sizes, `getNodesBounds` is
accurate on the render where a folder opens. Before, it could read a
just-reset node. No change is needed there.

## Risks / Trade-offs

- [The declared handle positions drift from the CSS if someone restyles
  handles.] → The helper and the `Handle` style read the same size constant.
  React Flow still measures the DOM afterwards and corrects any drift on its
  next pass, so drift shows as a slightly off edge end, never a blink.
- [A folder label wider than `folderNodeWidth` estimates.] → Already true
  today, since the style width uses the same estimate. No change.
