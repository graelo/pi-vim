# Spec Delta

## ADDED Requirements

### Requirement: Ex command-line runs finite runtime help commands

The Vim editor SHALL parse and execute finite read-only runtime help commands
from Ex command-line mode, displaying successful runtime help output in a
bounded read-only popup.

#### Scenario: Help command executes

- **WHEN** the editor executes `:help` or `:help search`
- **THEN** the editor exits Ex command-line mode and opens a bounded read-only
    popup for the requested help entry or help index

#### Scenario: Messages command executes

- **WHEN** the editor executes `:messages`
- **THEN** the editor exits Ex command-line mode and opens a bounded read-only
    popup describing retained runtime messages without adding the popup output
    to retained message history

#### Scenario: Unsupported runtime help abbreviation is rejected

- **WHEN** the editor executes an unsupported abbreviation such as `:h` or
    `:mes`
- **THEN** the editor reports a readable Ex error and prompt text remains
    unchanged

#### Scenario: Unexpected messages arguments are rejected

- **WHEN** the editor executes `:messages noisy` or another `:messages`
    command with unsupported trailing arguments
- **THEN** the editor reports a readable Ex error and prompt text remains
    unchanged

### Requirement: Removed prompt transform and discovery commands are unsupported

The Ex command-line SHALL treat `:quote`, `:unquote`, `:bulletize`, `:fence`,
`:indent`, `:dedent`, `:reflow`, `:features`, and `:changelog` as unsupported
commands.

#### Scenario: Removed command reports unsupported

- **WHEN** the editor executes `:quote`, `:reflow 72`, `:features`, or
    `:changelog`
- **THEN** the editor reports an unsupported Ex command error and prompt text
    remains unchanged

#### Scenario: Removed commands are not suggested

- **WHEN** the user requests Ex command suggestions for a prefix such as `qu`
    or `fe`
- **THEN** the suggestions do not include removed commands

## MODIFIED Requirements

### Requirement: Runtime help Ex commands are read-only

Runtime help Ex commands SHALL not edit the prompt buffer or mutate modal
editing side effects beyond bounded read-only popup display and existing
successful Ex command history semantics.

#### Scenario: Runtime help command preserves normal-mode state

- **WHEN** the editor executes `:help` or `:messages` from normal Ex
    command-line mode
- **THEN** prompt text, cursor position, registers, marks, search highlights,
    macro state, and dot-repeat state remain unchanged except for the read-only
    popup display

#### Scenario: Runtime help command preserves visual Ex state

- **WHEN** Ex command-line mode was opened from a visual selection, the user
    deletes the prefilled visual range marker, and executes `:help` or
    `:messages`
- **THEN** the command exits Ex mode without editing prompt text, restores the
    original visual mode, anchor, cursor, and highlight according to existing
    visual Ex restoration behavior, and opens the read-only popup

#### Scenario: Runtime help command does not update dot repeat

- **WHEN** the editor executes `:help` or `:messages` after a repeatable
    normal-mode edit
- **THEN** pressing `.` later repeats the previous supported normal-mode edit
    rather than replaying the runtime help command

#### Scenario: Runtime help popup does not pollute retained messages

- **WHEN** runtime help output opens in a read-only popup and the user scrolls
    or dismisses that popup
- **THEN** retained runtime message history does not grow solely because the
    popup content was shown, scrolled, or dismissed

### Requirement: Read-only Ex output opens a popup

The Vim editor SHALL display successful read-only Ex help, runtime discovery,
customization diagnostic, and inspectability output in a bounded read-only popup
instead of the inline workbench/message row.

#### Scenario: Read-only popup opens after normal Ex command

- **WHEN** Ex command-line mode was opened from normal mode and the user
    executes a valid read-only command such as `:help`, `:keybindings redo`,
    `:actions search`, `:keymap redo`, `:mapcheck ctrl+p`, `:vimdoctor`,
    `:messages`, or `:vimmode inspect`
- **THEN** Ex command-line mode closes, the editor remains in normal mode,
    prompt text and cursor remain unchanged, and a centered bounded read-only
    popup shows the command output

#### Scenario: Read-only popup opens after visual Ex command

- **WHEN** Ex command-line mode was opened from visual, visual-line, or
    visual-block mode and the user executes a valid read-only help, diagnostic,
    runtime discovery, message, or inspect command
- **THEN** Ex command-line mode closes, the original visual mode and captured
    selection are restored, prompt text remains unchanged, and a centered
    bounded read-only popup shows the command output

#### Scenario: Popup command output handles no-match result

- **WHEN** the user executes a valid read-only command that returns a bounded
    no-match or empty-state result such as `:help vimscript`,
    `:keybindings unsupported-query`, or `:messages` with no retained messages
- **THEN** the no-match or empty-state result is shown in the read-only popup
    and prompt text remains unchanged

#### Scenario: Unsupported command stays inline error

- **WHEN** the user executes an unsupported Ex command or unsupported
    abbreviation such as `:h`, `:mes`, `:map`, or `:vimmode status`
- **THEN** the editor reports the existing bounded Ex error through compact
    command-line feedback, does not open a read-only popup, and leaves prompt
    text unchanged

#### Scenario: Mutating Ex commands keep existing behavior

- **WHEN** the user executes a mutating or editing Ex command such as `:s`,
    `:d`, `:y`, `:put`, `:copy`, `:move`, `:join`, or `:noh`
- **THEN** the command follows its existing edit, no-op, preview, success, or
    error behavior and does not route normal edit feedback through the read-only
    popup

### Requirement: Ex command suggestion behavior is documented and validated

The change SHALL include automated tests and user-facing documentation for
finite Ex command suggestions.

#### Scenario: Automated suggestion validation runs

- **WHEN** `npm test` is executed
- **THEN** tests cover suggestion candidate filtering, range-prefixed command
    suggestions, `Tab` completion behavior, existing history/execution keys, side-effect
    preservation, and render composition with host autocomplete rows

#### Scenario: Feature guide describes suggestion scope

- **WHEN** the user opens `docs/features.md`
- **THEN** it documents Ex command suggestions as finite command-name hints
    for supported commands and states that full Vimscript, file/path/shell,
    command-argument, and runtime command completion are intentionally
    unsupported

## REMOVED Requirements

### Requirement: Ex command-line supports finite runtime help commands

**Reason**: Some scenarios described `:features`, `:changelog`, or prompt
transform surfaces removed in 1.0.0; the remaining behavior moves unchanged to
"Ex command-line runs finite runtime help commands".
**Migration**: None; see "Ex command-line runs finite runtime help commands".

### Requirement: Ex transform args share action validation

**Reason**: Prompt transforms (`:quote`, `:unquote`, `:bulletize`, `:fence`,
`:indent`, `:dedent`, `:reflow`), their `prompt.transform.*` action keybindings,
and the recipe/preset bundles built on them were removed in 1.0.0.
**Migration**: Use Vim line shifts (`>>`, `<<`, visual `>`/`<`) and case
operators, or edit prompt text directly. `piVimMode.keymap.actions`,
`piVimMode.keymap.actionPresets`, and `piVimMode.promptTransforms` now warn and
are ignored.

### Requirement: Ex command suggestions mirror configured transform commands

**Reason**: Prompt transforms (`:quote`, `:unquote`, `:bulletize`, `:fence`,
`:indent`, `:dedent`, `:reflow`), their `prompt.transform.*` action keybindings,
and the recipe/preset bundles built on them were removed in 1.0.0.
**Migration**: Use Vim line shifts (`>>`, `<<`, visual `>`/`<`) and case
operators, or edit prompt text directly. `piVimMode.keymap.actions`,
`piVimMode.keymap.actionPresets`, and `piVimMode.promptTransforms` now warn and
are ignored.
