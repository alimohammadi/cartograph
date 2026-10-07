# Proposal

## Why

Clicking or hovering on the map sometimes makes it blink, and sometimes
everything disappears. `fix-map-viewport` fixed the canvas height but not
this. The cause is in how the canvas hands nodes to React Flow.

Every render builds fresh node objects with no measured size. React Flow
then treats each node as new and unmeasured. It discards the node's size and
handle positions, renders the node with `visibility: hidden`, and skips every
edge. On a later frame it measures the DOM again and redraws. Hover changes
state on every node the pointer crosses, so sweeping or zooming over the map
keeps knocking the whole graph back into this hidden state.

## What Changes

- The canvas tells React Flow each node's size and handle positions up front,
  instead of leaving them to be measured. Both are already computed: sizes in
  the layout module, row offsets by `panelRowCenter`.
- Rebuilding nodes on hover, selection, open or close no longer hides
  anything. Only outlines, dimming and colours change.
- No new dependencies. No change to the parser, fold, layout or graph data.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `map-canvas`: adds that the graph stays drawn through every interaction.
  The capability is introduced by the in-flight `fix-map-viewport` change,
  and this delta adds to it.

## Impact

- Map canvas: node construction gains explicit `width`, `height` and
  `handles`.
- Layout module: exports handle geometry next to the sizes it already owns,
  so the renderer and React Flow agree on it.
