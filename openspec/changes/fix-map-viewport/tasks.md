# Tasks

## 1. Viewport-bounded layout

- [x] 1.1 In the app shell, make the root viewport-height (`h-dvh`) instead of `min-h-full`, and give the content wrapper `overflow-y-auto`. Verify that `pnpm exec tsc --noEmit`, `pnpm lint` and `pnpm build` pass.
- [x] 1.2 Confirm the map shell's columns need no change: the map section is `min-h-0 flex-1` inside a bounded parent, and the asides keep `overflow-y-auto`. Verify by reading the computed height chain against design.md (browser check is the user's).

## 2. Remove redundant work on hover

- [x] 2.1 In the detail pane, put `repoSummary`, `fileNeighbours` and `folderKinds` behind `useMemo` keyed on their inputs. Verify that types and lint pass.
- [x] 2.2 In the map view, wrap the handlers passed to the canvas and pane in `useCallback` (open, close, navigate, select file, select folder, clear). Verify that types and lint pass, and that `react-hooks/exhaustive-deps` reports nothing.
- [x] 2.3 In the map canvas, put `flowNodes` and `flowEdges` behind `useMemo`, with hover a dependency of nodes only. Verify that types, lint and `pnpm build` pass.

## 3. Hand-off

- [x] 3.1 Tell the user what to check in the browser on `/preview`. The graph is on screen at load. The page has no scrollbar and the pane scrolls on its own. Zooming in and out keeps the graph in view. Sweeping the pointer across nodes has no visible lag.
