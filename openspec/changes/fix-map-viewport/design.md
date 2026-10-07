# Design

## Context

See proposal.md (Why) for the symptom and cause. The height chain today:

```
html h-full
 body       flex min-h-full flex-col      <- grows with content
  AppShell  flex min-h-full flex-1 col    <- grows with content
   content  flex min-h-0 flex-1 col
    MapShell  flex min-h-0 flex-1 row
     rail   overflow-y-auto   (no height bound, so never scrolls)
     map    relative flex-1   (stretches to the tallest sibling)
     pane   overflow-y-auto   (no height bound, so never scrolls)
```

Nothing in the chain has a fixed height, so `overflow-y-auto` on the asides
never engages. The tallest column sets the row height, and the map stretches
to match. Phase 4 had an empty right column, which is why this only appeared
in phase 5.

Measured on the fixture: 21 folder nodes and 61 drawn edges. The graph is
small. Responsiveness problems are redundant work per hover, not graph size.

## Goals / Non-Goals

**Goals:** the app is bounded by the viewport, the map is on screen at load,
and hover does no work that its result doesn't need.

**Non-Goals:** virtualising the pane's lists, per-node render caching,
`onlyRenderVisibleElements`, changing the fold threshold or layout maths. None
of these is warranted at 21 nodes.

## Decisions

**Bound the height in the app shell, not the root layout.** AppShell's root
becomes viewport-height (`h-dvh`) instead of `min-h-full`. Its content wrapper
gains `overflow-y-auto`, so the workspace page's analyses table still scrolls
inside it. MapShell is already `min-h-0 flex-1`, so it then fills exactly the
remaining height, and its asides' existing `overflow-y-auto` starts working.
Alternatives:

- Capping `body` would also clip the Clerk sign-in pages on short screens.
- A fixed pixel height on the map section breaks with the header height.

**Memoise the pane's derived data.** `repoSummary`, `fileNeighbours` and
`folderKinds` move behind `useMemo` keyed on their real inputs (result, file
id, folder id). Today they rerun on every hover because hover is state in the
shared parent.

**Memoise canvas nodes and edges, and keep callbacks stable.** `flowNodes`
and `flowEdges` go behind `useMemo`. The handlers MapView passes down
(select, clear, open, close, navigate) become `useCallback` so the memo deps
actually hold. Hover stays a dependency of `flowNodes`, because outlines
depend on it. Rebuilding 21 node objects on hover is cheap. The win is that
selection, zoom and unrelated parent renders stop rebuilding them, and edges
no longer rebuild on hover at all.

- Alternative: per-node identity caching, so React Flow skips unchanged
  nodes. Rejected for now. More code than the problem justifies at this size.

## Risks / Trade-offs

- [The layout fix alone may cure the "slow" feel, since part of it is the
  page scrolling under the wheel.] → Implement the layout fix first, then the
  memoisation. If anything still lags afterwards, profile before adding
  caching.
- [`h-dvh` on very old browsers.] → Not a target. This is a local
  developer tool.
- [The leftover `openspec/changes/phase-05-detail-pane/` directory, which
  has no `.openspec.yaml` and duplicates the archived change.] → Unrelated
  to this fix. Flagged, not touched.
