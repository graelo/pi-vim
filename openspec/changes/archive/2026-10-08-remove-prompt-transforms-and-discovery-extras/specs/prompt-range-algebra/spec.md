# Spec Delta

## MODIFIED Requirements

### Requirement: Prompt range algebra returns typed range results

The Vim editor SHALL represent resolved range targets as typed results instead
of requiring callers to compose raw offsets, line clamps, or selection bounds.

#### Scenario: Return line range for Ex line commands

- **WHEN** an Ex delete, yank, put, substitution, join, copy, or move command
    resolves a valid line address or range
- **THEN** range algebra returns a typed inclusive line range using zero-based
    internal line indexes

#### Scenario: Return destination for Ex copy and move

- **WHEN** an Ex copy or move command resolves a valid destination address
- **THEN** range algebra returns a typed destination that preserves the
    existing destination-zero before-first-line sentinel behavior

#### Scenario: Return character and block range wrappers

- **WHEN** caller provides an already-resolved characterwise target or
    visual-block target
- **THEN** range algebra returns a typed character range or block range rather
    than collapsing it into a line range

#### Scenario: Preserve visual Ex line capture semantics

- **WHEN** Ex command-line mode was opened from visual, visual-line, or
    visual-block mode and `'<,'>` is used
- **THEN** range algebra resolves the captured lines touched at Ex entry time,
    not the editable Ex command text cursor and not only selected characters or
    block cells
