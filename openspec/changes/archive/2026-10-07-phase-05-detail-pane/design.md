# Design

## Context

The canvas currently owns all interaction state: selection, opened folders and
the zoom cap for refits live in `MapCanvasInner`. The preview page is a server
component that hands the fixture to `MapCanvas` and passes `detail={null}` into
`MapShell`. The pane needs the same selection the map has, and both directions
of hover, so that state can no longer live inside the canvas.

The parser output carries per-file `role`, `fanIn`, `fanOut` and the edge list.
It does not say which adapter ran, and it has no routes. File "kind" exists
today only as the language categories in `src/graph/file-kinds.ts`, which the
rail uses.

## Goals / Non-Goals

**Goals:**
- One owner for selection, hover, opened folders and the active tab, shared by
  the map and the pane.
- Every number in the pane comes from a pure function over files and edges,
  checked from the terminal.

**Non-Goals:**
- Route data in the contract. Routes read "none" because the framework is none,
  not because something counted them.
- Showing `role` per file. It is "unknown" everywhere until an adapter
  exists; the summary's unidentified count already says so.
- Bringing rows past the panel's row limit into view (see Risks).
- Rail clicks, blast radius, dependency chains, explanation content.

## Decisions

**Lift state into one client parent that renders the shell.** A new client
component takes the parse result and the rail, owns `selection`, `hover`,
`openIds`, the zoom cap and `tab`, and renders `MapShell` with the canvas and
the pane as its slots. `MapCanvas` becomes controlled: it receives those values
and reports clicks and hovers through callbacks. The page stays a server
component. Alternative: a React context around the shell. Rejected because it
adds a second way to reach the same state, for a tree only two levels deep.

**The refit stays in the canvas.** It needs `useReactFlow`, so the canvas keeps
the effect that refits when `openIds` grows. The parent only sets the zoom cap
before opening, through a callback the canvas provides. Opening from the pane
then follows exactly the same zoom-out-only path as opening from a click.

**Pane derivations are pure functions in `src/graph`.** There are three:
- the repository summary: counts, the top 10 files by importer count (zero
  excluded), the files with zero importers sorted by path, and the unidentified
  count;
- a file's neighbours: distinct files it imports and distinct files importing
  it, each sorted;
- a folder's kinds, by reusing `languageCategories` on the folder's files.

Counts shown in the pane are the lengths of the lists shown under them, never
`fanIn`/`fanOut` read separately. That makes "says seven, lists seven" true by
construction. The terminal check then asserts the list lengths equal the
parser's `fanIn`/`fanOut` for every file, which catches any disagreement
between the two.

**"Kind" means the language category**, with the same swatch as the rail.
That way the colour on a pane row means the same thing it means in the rail.

**"Imports" in the summary is the edge count.** Those are the resolved
connections drawn on the map. Coverage totals (external, unresolved) are a
different question and stay out of this pane.

**Navigating to a file from the pane.** Look up the file's folder node. If
it's closed, set the zoom cap and add it to `openIds`. Then set the selection
to the file. This differs from the canvas's own folder click, which selects the
folder. This path selects the file.

**Hover is separate from selection.** `hover` is `{kind:"file"|"folder", id} |
null`. On the map, a hovered file draws an accent outline on its row if that
row is shown. Otherwise the outline goes on the node holding it. A hovered
folder outlines that node. Dimming still follows selection only, so hovering
never changes what's dim. In the pane, a row is highlighted when its path
equals the hovered file or sits inside the hovered folder.

**The tab lives in the parent and nothing resets it.** The summary shows no
tabs, but the stored tab is kept, so coming back from the summary restores it.

**Framework in the contract.** `fallbackAdapter.name` becomes `"none"`. The
parser writes `framework: adapter.name` into its output.
`PARSE_RESULT_VERSION` goes to 2. The validator requires the field, and its
existing version check rejects v1 files by name. The CLI prints the framework.
The fixture is regenerated rather than hand-edited, so it stays the parser's
verbatim output. Alternative: recording a null framework. Rejected because a
missing value and "no framework" would then mean the same thing.

## Risks / Trade-offs

- **A selected file past the row limit has no visible row.** Its panel and
  neighbours still light up through the existing folder-level highlight, and
  the pane shows the file. Mitigation: none this phase. Scrolling the panel to
  the row is a phase 4 behaviour change, not something to slip in here.
- **Hover re-renders the canvas node list on every enter and leave.** At about
  two dozen nodes this is cheap, so nothing is memoised specially until it
  measurably lags.
- **Regenerating the fixture needs the original tRPC server checkout on
  disk.** Re-cloning may land on a newer commit and change the numbers. That's
  acceptable: phase 4's counts get re-run against the new fixture as part of
  this change.
