# Spec Delta

## Purpose

The right-hand pane of the map: it tells you what the repository is before
anything is selected, and what a selected file or folder is afterwards, using
only data already in the browser.

## ADDED Requirements

### Requirement: Repository summary is the resting state
With nothing selected, the pane SHALL show the repository's name, the framework recorded in the parse output, and counts of files, imports and routes. Imports are the resolved connections drawn on the map. Routes SHALL show as none when the framework is none. Deselecting SHALL return the pane to this summary.

#### Scenario: First load
- **WHEN** the map loads and nothing has been clicked
- **THEN** the pane shows the repository name, framework, and file, import and route counts, and no prompt asking the user to select something

#### Scenario: Deselect
- **WHEN** a file is selected and the user clicks empty canvas
- **THEN** the pane shows the repository summary again

#### Scenario: No framework detected
- **WHEN** the parse output's framework is none
- **THEN** the framework reads none and routes read none, not zero

### Requirement: Summary ranks what the repository leans on
The summary SHALL list the files with the most importers, ordered by importer count, highest first, ties broken by path. Files with zero importers SHALL NOT appear in this list.

#### Scenario: Most depended-on files
- **WHEN** the summary is showing
- **THEN** the files with the highest importer counts appear first, each with its count

### Requirement: Summary lists where reading starts
The summary SHALL list every file that no other file imports, and state how many there are.

#### Scenario: Files nothing imports
- **WHEN** the summary is showing
- **THEN** every file with zero importers is listed, and the stated count equals the number listed

### Requirement: Summary counts unidentified files
The summary SHALL state how many files no convention identified, meaning files whose role in the parse output is unknown.

#### Scenario: Fallback adapter
- **WHEN** the parse ran with no framework adapter
- **THEN** the unidentified count equals the total file count

### Requirement: File detail
Selecting a file SHALL fill the pane with its path, its kind, its line count, the number of files it imports and the number of files importing it, followed by the full list of each. Each stated count SHALL equal the number of paths listed under it.

#### Scenario: Counts match rows
- **WHEN** a file that imports seven files is selected
- **THEN** the pane says seven and lists exactly seven paths

#### Scenario: Leaf file
- **WHEN** a file that imports nothing is selected
- **THEN** its import count reads zero and no import rows are listed

### Requirement: Folder detail
Selecting a folder SHALL show the folder's path and, under Structure, each kind of file inside it with how many of each, the counts summing to the folder's file total.

#### Scenario: Folder kinds
- **WHEN** a folder holding TypeScript and TSX files is selected
- **THEN** Structure lists both kinds with counts that add up to the folder's file count

### Requirement: Structure and Explanation tabs
When a file or folder is selected, the pane SHALL show two tabs, Structure and Explanation. Explanation SHALL show an empty state stating that nothing has explained this yet. It SHALL NOT show placeholder or invented text.

#### Scenario: Explanation empty state
- **WHEN** the user opens the Explanation tab on any selection
- **THEN** it shows an empty state and no generated content

### Requirement: Open tab survives selection changes
The open tab SHALL stay open when the selection changes between files, between folders, or between a file and a folder, and when the selection goes back to the summary and returns.

#### Scenario: Comparing explanations
- **WHEN** the Explanation tab is open and the user selects a different file
- **THEN** the Explanation tab is still the one showing

### Requirement: Paths navigate the map
Every file path shown in the pane SHALL be clickable. Clicking one SHALL make that file the map's selection. If the file's folder is folded, the folder SHALL open into its panel first, refitting only by zooming out, and the file's row SHALL be selected.

#### Scenario: Jump to a neighbour in a folded folder
- **WHEN** the user clicks a dependent's path whose folder is folded
- **THEN** that folder opens, the file becomes the selection, and the pane shows that file

#### Scenario: Jump from the summary
- **WHEN** the user clicks a path in the summary's ranked lists
- **THEN** the map selects that file and the pane leaves the summary for that file's detail

### Requirement: Hover linking from pane to map
Hovering a file path in the pane SHALL highlight that file on the map: its row if its folder is open and the row is shown, otherwise the node holding it. Leaving the path SHALL remove the highlight.

#### Scenario: Hover a neighbour
- **WHEN** the user hovers a dependency path in the pane
- **THEN** the corresponding row or node on the map is highlighted with no perceptible delay

### Requirement: Hover linking from map to pane
Hovering a file row on the map SHALL highlight that path wherever it is listed in the pane. Hovering a folder node SHALL highlight every listed path inside that folder.

#### Scenario: Hover a node
- **WHEN** the user hovers a folder node whose files appear in the pane's lists
- **THEN** those paths are highlighted in the pane

### Requirement: Pane is local
Selecting, hovering, switching tabs and navigating from the pane SHALL make no network request.

#### Scenario: Zero requests on select
- **WHEN** the user selects a file with the browser's network tab open
- **THEN** no new request is recorded

### Requirement: One layout
The pane SHALL stay the fixed right-hand column at every viewport size. It SHALL NOT become a modal, drawer or overlay.

#### Scenario: Narrow window
- **WHEN** the browser window is narrowed
- **THEN** the pane remains a column beside the map
