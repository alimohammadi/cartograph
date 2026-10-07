# Proposal

Source of truth for behaviour and the acceptance check: `docs/specs/phase-05.md`.
This change does not restate it. It records what the phase touches and the two
decisions taken before building.

## Why

The map shows shape but not meaning. Phase 4 left the right column empty; phase
5 makes it the place where you learn what the repository is before clicking,
and what any file or folder is after clicking — all from data already in the
browser.

## What Changes

- The right pane gains a resting state: a repository summary (name, framework,
  counts of files, imports and routes, most-depended-on files, files nothing
  imports, and how many files no convention identified).
- Selecting a file fills the pane with its path, kind, length, and the full
  lists of what it imports and what imports it, under **Structure** and
  **Explanation** tabs. Explanation is an empty state this phase.
- Selecting a folder shows the same tabs; Structure lists the kinds of file
  inside it with counts.
- Every path in the pane is clickable and moves the map's selection to that
  file. If the file's folder is folded, it opens into its panel first (normal
  zoom-out-only refit), then the row is selected.
- Hover is linked both ways between pane rows and the map.
- Selection and hover state move out of the canvas so the pane and the map
  share one source.
- **BREAKING (parser contract):** parse output gains a `framework` field
  carrying the name of the adapter that ran (`"none"` for the fallback). The
  contract version goes from 1 to 2 and the checked-in fixture is regenerated.
  Routes are shown as none while the framework is none; no route data is added
  to the contract this phase.

## Capabilities

### New Capabilities

- `detail-pane`: the right-hand pane — repository summary, file and folder
  detail, tabs, path navigation, and hover linking with the map.
- `parse-output`: what the parser's output records about a run. This phase
  adds only the framework requirement; earlier contract behaviour is not
  backfilled here.

### Modified Capabilities

None. No capabilities exist in `openspec/specs/` yet.

## Impact

- Parser: output type, its JSON validator, and the fallback adapter's name.
  Still no framework branch inside parsing code.
- Fixture JSON under `src/data` regenerated from the same repository.
- Map canvas: selection, hover and opened-folder state lifted to a shared
  client parent; canvas reads and writes it rather than owning it.
- Preview route: the detail slot is filled.
- No new dependencies, no network, no database.
