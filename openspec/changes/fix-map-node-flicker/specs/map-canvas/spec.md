# Spec Delta

## Purpose

How the map's canvas behaves as a viewport: the graph is on screen when the
page loads, stays reachable while zooming and panning, and responds without
lag however much the pane beside it holds.

## ADDED Requirements

### Requirement: Graph stays drawn through interaction
Hovering, selecting, clearing a selection, opening a folder and closing a folder SHALL NOT hide any node or edge, even for a single frame. Only outline, dimming and edge colour SHALL change. Opening or closing a folder changes the shape of that one node, and every other node and edge stays drawn.

#### Scenario: Sweep across nodes
- **WHEN** the user moves the pointer quickly across several folder nodes and panel rows
- **THEN** no node or edge blinks out, and only the outline moves

#### Scenario: Click a file row
- **WHEN** the user clicks a file row in an open panel
- **THEN** the map dims around the selection without any node or edge disappearing

#### Scenario: Zoom over nodes
- **WHEN** the user zooms with the pointer over nodes
- **THEN** the graph stays drawn the whole time
