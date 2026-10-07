# Proposal

## Why

Since phase 5 filled the right pane, `/preview` shows an empty map. Zooming
makes the graph vanish, and interacting with it feels sluggish. The cause is
layout, not the graph. Neither the body nor the app shell caps its height
(`min-h-full` only). So the pane's long "Nothing imports" list stretches the
whole row, and the map column stretches with it to roughly the pane's
height. React Flow fits the 21-node graph into that tall box, centred far
below the visible screen. On top of that, every hover re-renders the whole
canvas and the pane, and recomputes the repository summary.

## What Changes

- The app occupies exactly the viewport. The map column is the visible
  height, never taller, so the initial fit puts the graph on screen.
- The detail pane and rail scroll inside their own columns. The page itself
  does not scroll.
- Hover, selection and zoom stop doing redundant work. The pane's derived
  data (summary, neighbours, folder kinds) is computed once per input rather
  than on every render. Canvas nodes and edges are rebuilt only when what
  they show changes.
- No new dependencies. No change to the parser, the fold, the layout maths,
  or the graph data.

## Capabilities

### New Capabilities

- `map-canvas`: the map's own viewport behaviour. The graph is visible on
  load, stays reachable through zoom and pan, and responds without lag.

### Modified Capabilities

- `detail-pane`: "One layout" gains that the pane scrolls within its own
  column and never changes the height of the map beside it.

## Impact

- Root layout and app shell: height chain becomes viewport-bounded.
- Map shell: columns keep their own scroll.
- Map canvas and map view: memoised node/edge construction, stable
  callbacks.
- Detail pane: memoised derived data.
