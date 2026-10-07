# Tasks

## 1. Framework in the parse output

- [x] 1.1 Rename the fallback adapter to `"none"`, add `framework` to `ParseResult` (written from `adapter.name`), bump `PARSE_RESULT_VERSION` to 2, and require the field in `parseResultFromJson`. Verify with `pnpm parse . --out <tmp>.json`: it prints `framework: none` and the read-back passes.
- [x] 1.2 Verify that reading a version 1 file fails, naming the version mismatch. Run the read-back against the current fixture before regenerating it.
- [x] 1.3 Regenerate `src/data/trpc-server.parse.json` by re-running the parser against the tRPC server package (re-clone if the checkout is gone). Verify `node scripts/fold-report.mts src/data/trpc-server.parse.json` still prints `RESULT: PASS`, and report its node count.

## 2. Pane derivations

- [x] 2.1 Add pure functions in `src/graph` for the repository summary (counts, the top 10 by importers, files with zero importers, the unidentified count), file neighbours (distinct imports and importers, sorted), and folder kinds (via `languageCategories`). Verify types and lint pass.
- [x] 2.2 Add `scripts/pane-report.mts`. For every file, it asserts that neighbour list lengths equal the parser's `fanOut`/`fanIn`. It also asserts that the zero-importer count equals its list length, that folder kind counts sum to the folder's file count, and that the unidentified count equals the file count under framework none. It exits non-zero on any failure. Verify it prints `RESULT: PASS` against the fixture.

## 3. Shared interaction state

- [x] 3.1 Add a client parent that owns selection, hover, opened folders, the zoom cap and the active tab, and renders `MapShell` with the canvas and pane as slots. Make `MapCanvas` controlled through props and callbacks, keeping its refit effect. Verify phase 4 behaviour is unchanged: folder click opens, header click closes, row click selects, empty canvas deselects.
- [x] 3.2 Add hover reporting and outlines on the map. Hovering a file outlines its row if shown, otherwise its node. Hovering a folder outlines that node. Dimming still follows selection only. Verify with types, lint and build.
- [x] 3.3 Add navigate-to-file. It opens the file's folder if closed, through the same zoom-out-only refit, then selects the file. Verify with types, lint and build.

## 4. Detail pane

- [x] 4.1 Build the summary view: name, framework, file/import/route counts (routes read none under framework none), the top-depended-on list with counts, the zero-importer list with its count, and the unidentified count. Verify the preview route renders it on load with nothing selected.
- [x] 4.2 Build the file view under Structure: path, kind swatch and label, line count, then "Imports N" and "Imported by N", each followed by its N paths. Verify with types, lint and build.
- [x] 4.3 Build the folder view under Structure: folder path and its kinds with counts. Verify with types, lint and build.
- [x] 4.4 Add the Structure/Explanation tabs, with the tab state held by the parent and never reset on selection change. Explanation shows a plain empty state. Verify with types, lint and build.
- [x] 4.5 Make every pane path clickable (navigate-to-file) and hoverable (sets hover). Highlight pane rows matching the hovered file or folder. Verify with types, lint and build.
- [x] 4.6 Wire the preview page to the new parent, so the rail stays as it is and the detail slot is filled. Verify `pnpm build` passes and the page has no fetch or server action on interaction.

## 5. Integration

- [x] 5.1 Run types, `pnpm lint`, `pnpm build`, `scripts/fold-report.mts` and `scripts/pane-report.mts`, and report the results. Then hand the phase 5 acceptance check (`docs/specs/phase-05.md`) to the user to run in the browser.

## Workflow follow-up

- Phases 3 and 4 are uncommitted. Commit them, once they pass, before applying this change, so phase 5 has a clean reset point.
- Archive this change after the user's acceptance check passes.
