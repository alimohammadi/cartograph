# Spec Delta

## Purpose

What a single parser run records about itself in its output, so anything
downstream can report facts about the run without re-deriving or guessing them.

## ADDED Requirements

### Requirement: Output records the framework adapter
Every parse output SHALL carry a framework value naming the adapter that classified its files. A run with the fallback adapter SHALL record none. The output's contract version SHALL change when this field is introduced, and reading output that lacks the field SHALL fail, naming the problem.

#### Scenario: Fallback run
- **WHEN** the parser runs against a directory with no framework adapter
- **THEN** the output's framework is none

#### Scenario: Written and read back
- **WHEN** the parser writes its output to a file and reads it back
- **THEN** the framework value survives the round trip and the types hold

#### Scenario: Old output
- **WHEN** output written under the previous contract version is read
- **THEN** reading fails with a message naming the version mismatch
