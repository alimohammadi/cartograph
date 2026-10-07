# Spec Delta

## MODIFIED Requirements

### Requirement: One layout
The pane SHALL stay the fixed right-hand column at every viewport size. It SHALL NOT become a modal, drawer or overlay. When its content is taller than the window, the pane SHALL scroll within its own column, and its content SHALL NOT change the height of the map beside it.

#### Scenario: Narrow window
- **WHEN** the browser window is narrowed
- **THEN** the pane remains a column beside the map

#### Scenario: Pane taller than the window
- **WHEN** the summary lists more paths than fit in the window
- **THEN** the pane scrolls on its own, the map does not move, and the page has no scrollbar
