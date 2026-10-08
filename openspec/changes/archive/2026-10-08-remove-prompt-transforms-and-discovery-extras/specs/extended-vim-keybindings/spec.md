# Spec Delta

## MODIFIED Requirements

### Requirement: Normal mode supports line shift operators

The Vim editor SHALL support finite line-only indent and dedent shift operators
in normal mode.

#### Scenario: Indent current line

- **WHEN** the editor is in normal mode and the user presses `>>`
- **THEN** two spaces are added to the start of the current prompt line, the
    editor remains in normal mode, and no register is written

#### Scenario: Dedent current line

- **WHEN** the editor is in normal mode and the user presses `<<` on a line
    that starts with indentation
- **THEN** at most one tab, two spaces, or one leading space is removed from
    that line, the editor remains in normal mode, and no register is written

#### Scenario: Dedent unindented line is safe

- **WHEN** the editor is in normal mode and the user presses `<<` on a line
    without leading indentation
- **THEN** prompt text and registers remain unchanged and the editor remains
    in normal mode

#### Scenario: Counted indent shifts consecutive lines

- **WHEN** the editor is in normal mode and the user presses `3>>`
- **THEN** the current line and the next two prompt lines, when present, are
    indented by two spaces

#### Scenario: Counted dedent shifts available lines

- **WHEN** the editor is in normal mode and the user presses `2<<` near the
    end of the prompt
- **THEN** the current line and the next available prompt line are dedented
    by at most one indentation step, clamped to the prompt length

#### Scenario: Dot repeat repeats normal line shift

- **WHEN** a normal-mode `>>` or `<<` command successfully changes prompt text
    and the user later presses `.` in normal mode
- **THEN** the same shift action and count are applied again at the current
    cursor line

#### Scenario: Unsupported shift target is safe

- **WHEN** the editor is in normal mode with a pending shift operator and the
    user enters an unsupported target such as `w`, `iw`, `/query`, or a mark
    jump
- **THEN** the pending operator clears, prompt text is unchanged, registers
    are unchanged, and the unmatched key is not inserted into the prompt

### Requirement: Visual modes support selected line shifts

The Vim editor SHALL support indenting and dedenting all prompt lines touched by
the active visual selection.

#### Scenario: Visual character selection indents touched lines

- **WHEN** the editor is in visual character mode with a selection that
    touches one or more prompt lines and the user presses `>`
- **THEN** every touched line is indented by two spaces, the selection clears,
    and the editor returns to normal mode

#### Scenario: Visual line selection dedents selected lines

- **WHEN** the editor is in visual line mode with one or more lines selected
    and the user presses `<`
- **THEN** every selected line is dedented by at most one indentation step,
    the selection clears, and the editor returns to normal mode

#### Scenario: Visual block selection shifts touched lines

- **WHEN** the editor is in visual block mode with a rectangular selection and
    the user presses `>` or `<`
- **THEN** every line touched by the block selection is shifted, regardless of
    the selected columns, and the editor returns to normal mode

#### Scenario: Counted visual shift changes depth

- **WHEN** the editor is in visual mode with one or more lines selected and
    the user presses `2>`
- **THEN** every touched line is indented by two shift levels of two spaces
    each

#### Scenario: Visual shift does not write registers

- **WHEN** a visual `>` or `<` command changes prompt text
- **THEN** unnamed and named registers remain unchanged by the shift command
