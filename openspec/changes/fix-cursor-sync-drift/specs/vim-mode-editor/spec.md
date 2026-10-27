# Spec Delta

## MODIFIED Requirements

### Requirement: Normal mode supports core Vim navigation

The Vim editor SHALL support core normal-mode cursor movement across the
current prompt using Vim directional keys and physical arrow-key aliases.
Movement SHALL operate on logical prompt lines and columns, independent of
display wrapping, and SHALL clamp at line and buffer boundaries instead of
wrapping onto adjacent lines.

#### Scenario: Character navigation

- **WHEN** the editor is in normal mode and the user presses `h`, `j`, `k`,
    `l`, `Left`, `Down`, `Up`, or `Right`
- **THEN** the cursor moves one character left or right (stepping over
    multi-unit characters as one, never landing inside one) or one logical
    line down or up respectively when movement is possible

#### Scenario: Navigation on wrapped lines

- **WHEN** a logical line is wider than the display and wraps onto multiple
    display rows, and the user presses `j` or `k`
- **THEN** the cursor moves to the next or previous logical line, not to the
    next display row of the same logical line
- **WHEN** a modal command targets a logical position after any motion, and
    the prompt contains wrapped lines
- **THEN** edits and cursor restoration land on the targeted logical line and
    column

#### Scenario: Horizontal clamping at line boundaries

- **WHEN** the cursor is at the start of a line and the user presses `h`, or
    at the end of a line and the user presses `l`
- **THEN** the cursor stays on the same logical line and column instead of
    wrapping to the end of the previous line or the start of the next line
- **WHEN** a multi-unit character such as an emoji sits between the cursor
    and the line boundary
- **THEN** `h`/`l` step over it as one character

#### Scenario: Vertical clamping at buffer boundaries

- **WHEN** the cursor is on the first logical line and the user presses `k`,
    or on the last logical line and the user presses `j`
- **THEN** the cursor stays at its current position and the prompt text is
    unchanged; up movement SHALL NOT trigger prompt-history navigation

#### Scenario: Counted arrow navigation

- **WHEN** the editor is in normal mode and the user enters a numeric count
    before an arrow key
- **THEN** the cursor moves by that count using the same bounds and
    logical-line behavior as the matching `h`, `j`, `k`, or `l` motion

#### Scenario: Line boundary navigation

- **WHEN** the editor is in normal mode and the user presses `0` or `$`
- **THEN** the cursor moves to the current line start or line end respectively

#### Scenario: Word navigation

- **WHEN** the editor is in normal mode and the user presses `w` or `b`
- **THEN** the cursor moves to the next or previous word boundary respectively

#### Scenario: Unmapped printable key

- **WHEN** the editor is in normal mode and the user presses an unmapped
    printable key
- **THEN** the key is ignored and no text is inserted
