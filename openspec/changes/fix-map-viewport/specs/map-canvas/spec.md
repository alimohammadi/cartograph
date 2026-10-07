# Spec Delta

## Purpose

How the map's canvas behaves as a viewport: the graph is on screen when the
page loads, stays reachable while zooming and panning, and responds without
lag however much the pane beside it holds.

## ADDED Requirements

### Requirement: Map is the visible height
The map SHALL occupy exactly the visible area between the header and the bottom of the window. Its height SHALL NOT depend on how much content the rail or the detail pane holds. The page itself SHALL NOT scroll.

#### Scenario: Long pane content
- **WHEN** the repository summary lists more paths than fit in the window
- **THEN** the map is still exactly the window's remaining height and the page has no scrollbar

### Requirement: Graph is on screen at load
On first load the whole folded graph SHALL be fitted inside the map's visible area.

#### Scenario: First load
- **WHEN** the map loads and nothing has been clicked
- **THEN** every folder node is visible without scrolling the page, panning or zooming

### Requirement: Zoom keeps the graph reachable
Zooming SHALL centre on the pointer, within the map's visible area. Zooming in and back out SHALL return the graph to view.

#### Scenario: Zoom in and out
- **WHEN** the user zooms in over a node and then zooms back out
- **THEN** the graph is still on screen and that node is near the pointer

### Requirement: Map interaction is responsive
Hovering, zooming and panning SHALL respond with no perceptible delay on the checked-in fixture, whether the pane shows the summary or a selection.

#### Scenario: Sweep across nodes
- **WHEN** the user moves the pointer quickly across several folder nodes
- **THEN** the outline follows the pointer with no visible lag
