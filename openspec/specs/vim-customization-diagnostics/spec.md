# vim-customization-diagnostics Specification

## Purpose

Define the read-only customization diagnostics (`:keymap`, `:mapcheck`,
`:vimdoctor`, no-op feedback) that explain the effective configuration without
changing prompt state.

## Requirements

### Requirement: Runtime customization diagnostics are available

The Vim editor SHALL provide runtime diagnostics that explain the current
customization state without requiring users to inspect settings files or source
code.

#### Scenario: Doctor reports healthy customization state

- **WHEN** the editor executes `:vimdoctor` with no retained settings warnings
    and no detected keymap conflicts
- **THEN** the editor shows a transient message indicating customization is
    healthy

#### Scenario: Doctor reports settings warnings

- **WHEN** the editor executes `:vimdoctor` after settings resolution recorded
    invalid fields, protected keys, or keymap conflicts
- **THEN** the editor shows a transient message that includes the warning
    count and the highest-priority actionable warning

#### Scenario: Doctor does not reread settings files

- **WHEN** the editor executes `:vimdoctor`
- **THEN** diagnostics are based on the options and warnings retained for that
    editor instance rather than re-reading global or project settings files

### Requirement: Customization commands preserve prompt editing state

Runtime customization diagnostics SHALL be read-only with respect to prompt
editing state.

#### Scenario: Diagnostic command leaves prompt text unchanged

- **WHEN** the editor executes `:vimdoctor`, `:keymap`, or `:mapcheck`
- **THEN** prompt text, cursor position, mode, visual selection, search
    highlights, registers, marks, macro slots, and dot-repeat state remain
    unchanged except for the transient diagnostic message

#### Scenario: Diagnostic command from visual Ex mode preserves selection

- **WHEN** Ex command-line mode was opened from a visual selection and the
    user executes a diagnostic command
- **THEN** the command exits Ex mode without editing prompt text and restores
    the original visual mode state according to existing Ex cancellation
    behavior

### Requirement: Map checking explains keys and conflicts

The Vim editor SHALL explain whether a key or key sequence is mapped, unmapped,
protected, conflicting, or unsupported.

#### Scenario: Mapped key is explained

- **WHEN** the editor executes `:mapcheck ctrl+r` and `ctrl+r` resolves to
    redo in the current normal-mode keymap
- **THEN** the editor shows the matched action, action kind, and current binding

#### Scenario: Protected shortcut is explained

- **WHEN** the editor executes `:mapcheck ctrl+p` or another Pi-owned
    protected shortcut
- **THEN** the editor shows that the shortcut is protected, names the Pi
    behavior it preserves when known, and does not treat it as a configurable
    pi-vim binding

#### Scenario: Conflicting configured sequence is explained

- **WHEN** settings contain a keymap conflict that was ignored during
    resolution and the editor executes `:mapcheck` for the conflicting sequence
- **THEN** the editor shows that the sequence was rejected or ignored because
    of the conflict and identifies at least one conflicting action when known

### Requirement: Optional no-op feedback is scoped and quiet by default

The Vim editor SHALL support optional feedback for confusing no-op inputs while
preserving quiet default modal editing.

#### Scenario: No-op feedback defaults to off

- **WHEN** no no-op feedback setting is enabled and the user presses an
    unmapped normal-mode key
- **THEN** the editor preserves existing quiet no-op behavior and does not
    show a new transient feedback message

#### Scenario: Enabled feedback explains protected delegation

- **WHEN** no-op feedback is enabled and the user presses a protected Pi
    shortcut in normal mode
- **THEN** the editor delegates or handles the shortcut according to existing
    ownership rules and shows a transient explanation when the shortcut is not
    owned by pi-vim

#### Scenario: Enabled feedback avoids message floods

- **WHEN** no-op feedback is enabled and repeated invalid or unmapped inputs
    occur
- **THEN** the editor keeps feedback bounded to transient single messages and
    does not accumulate a multi-line log

### Requirement: Inspect and message diagnostics are effective-runtime views

Runtime diagnostics SHALL report the effective editor state and configuration
available to the current prompt editor rather than raw settings tables or stale
implementation defaults.

#### Scenario: Inspect reflects resolved feature availability

- **WHEN** `:vim inspect` runs with a preset or resolved options that
    disable macros, marks, search highlights, or status items
- **THEN** the diagnostic reflects the effective enabled/disabled state
    instead of advertising unavailable actions as active behavior

#### Scenario: Messages reflects retained runtime events

- **WHEN** `:messages` runs after diagnostics, Ex errors, Ex successes, or
    enabled no-op feedback have occurred in the current editor session
- **THEN** it reports retained runtime message events rather than rereading
    settings files or reconstructing messages from raw config

#### Scenario: Diagnostics include existing warnings when relevant

- **WHEN** retained settings diagnostics contain invalid fields, protected key
    warnings, or keymap conflicts and the user runs `:vim inspect`
- **THEN** the inspect output includes a bounded warning summary without
    replacing `:vimdoctor` as the detailed customization health command

### Requirement: Inspect and message diagnostics preserve customization state boundaries

Inspectability diagnostics SHALL follow the same read-only state boundaries as
existing customization diagnostics.

#### Scenario: Inspect does not mutate effective keymaps or options

- **WHEN** the user executes `:vim inspect`
- **THEN** resolved options, effective keymaps, feature enablement, protected
    shortcut handling, and retained diagnostics remain unchanged

#### Scenario: Messages does not mutate effective keymaps or options

- **WHEN** the user executes `:messages`
- **THEN** resolved options, effective keymaps, feature enablement, protected
    shortcut handling, and retained diagnostics remain unchanged

#### Scenario: Diagnostic output remains bounded with large state

- **WHEN** prompt text, registers, search history, Ex history, macro slots,
    marks, or diagnostics are large
- **THEN** `:vim inspect` and `:messages` truncate or summarize output so
    the diagnostic feedback remains bounded and width-safe

### Requirement: Diagnostic command registry remains finite

The customization diagnostic surface SHALL add inspectability commands
explicitly rather than turning diagnostics into arbitrary action or command
execution.

#### Scenario: Supported diagnostics are explicit

- **WHEN** the user searches or inspects supported diagnostic commands through
    runtime help or keymap diagnostics
- **THEN** `vimdoctor`, `keymap`, `mapcheck`, `vim inspect`, and
    `messages` are presented as finite supported diagnostics when available

#### Scenario: Unsupported diagnostic names remain unsupported

- **WHEN** the user executes unsupported diagnostic-like commands such as
    `:map`, `:actions`, `:actionspalette`, `:vim dump`, or
    `:messages clear`
- **THEN** the editor reports a bounded unsupported-command error and leaves
    prompt editing state unchanged

#### Scenario: Diagnostic docs reject broad parity claims

- **WHEN** user-facing docs describe customization and inspectability
    diagnostics
- **THEN** they identify the finite command set and do not imply full Vim
    `:messages`, `:map`, `:verbose`, or Vimscript support

### Requirement: Diagnostic action metadata preserves diagnostic command boundaries

Diagnostic/help action metadata SHALL describe existing finite diagnostics
without changing execution or editing side effects.

#### Scenario: Metadata entry points to existing Ex command

- **WHEN** a metadata entry names `pi-vim.doctor`, `pi-vim.keymap`,
    `pi-vim.keybindings`, `pi-vim.mapcheck`, `pi-vim.help`,
    `pi-vim.messages`, or `pi-vim.inspect`
- **THEN** the described command is one of the explicit supported
    diagnostic/runtime-help Ex commands and no additional dispatch path is
    implied

#### Scenario: Metadata lookup is read-only

- **WHEN** the editor executes `:keymap pi-vim.help` or another metadata
    lookup from normal or visual Ex mode
- **THEN** prompt text, cursor position, mode restoration, visual selection,
    search highlights, registers, marks, macro slots, and dot-repeat state
    remain unchanged except for the transient diagnostic message and existing
    message-history rules

#### Scenario: Keymap diagnostics do not treat metadata-only actions as bindable

- **WHEN** the editor explains a metadata-only diagnostic/help action through
    keymap-oriented diagnostics
- **THEN** it reports that the action is metadata-only or not bindable rather
    than showing it as an unbound configurable action waiting for a user
    keybinding

### Requirement: Keybinding discovery popup preserves customization state boundaries

Runtime keybinding discovery popup display, popup-local scrolling, and dismissal
SHALL be read-only with respect to prompt editing state and effective
customization state.

#### Scenario: Popup display is read-only

- **WHEN** the editor executes `:keybindings` from normal mode
- **THEN** prompt text, cursor position, mode, search highlights, registers,
    marks, macro slots, dot-repeat state, resolved options, effective keymaps,
    and retained diagnostics remain unchanged except for displaying the popup

#### Scenario: Popup from visual Ex restores visual state

- **WHEN** Ex command-line mode was opened from a visual selection and the
    user executes `:keybindings`
- **THEN** the command exits Ex mode without editing prompt text and restores
    the original visual mode state while displaying the popup

#### Scenario: Popup scrolling is read-only

- **WHEN** the keybinding discovery popup is visible and the user scrolls
    inside it with popup-local controls
- **THEN** only the popup scroll position changes, while prompt text, cursor
    position, mode, visual selection, search highlights, registers, marks, macro
    slots, dot-repeat state, resolved options, effective keymaps, retained
    diagnostics, and retained messages remain unchanged

#### Scenario: Popup dismissal is read-only

- **WHEN** the keybinding discovery popup is visible and the user dismisses it
    with `Esc` or existing reset behavior
- **THEN** prompt text, cursor position, mode, visual selection, search
    highlights, registers, marks, macro slots, dot-repeat state, resolved
    options, effective keymaps, and retained diagnostics remain unchanged except
    for removing the popup

### Requirement: Keybinding catalog describes effective bindings

The Vim editor SHALL provide a source-backed keybinding catalog that describes
the current editor's effective resolved keybindings without requiring users to
inspect settings files or source code.

#### Scenario: Catalog groups supported binding categories

- **WHEN** the editor displays the keybindings catalog
- **THEN** it lists finite supported categories such as commands, motions,
    operators, text objects, macros, marks, searches, and protected Pi shortcuts
    when those categories are available

#### Scenario: Catalog reflects configured overrides

- **WHEN** resolved settings change a semantic binding such as
    `piVim.keymap.commands.redo`
- **THEN** the keybindings catalog reports the effective configured binding
    rather than only built-in defaults or raw settings text

#### Scenario: Catalog reflects disabled effective features

- **WHEN** resolved options disable macros or marks
- **THEN** the keybindings catalog does not present disabled bindings as
    active behavior and reports bounded disabled or unavailable state when
    relevant

#### Scenario: Catalog rows show mode scope

- **WHEN** the editor displays the keybindings catalog
- **THEN** each binding row is rendered as a fixed grid with key, supported
    mode scope, action ID, and source-backed description

#### Scenario: Ex commands and metadata are not catalog keybindings

- **WHEN** the editor displays the keybindings catalog
- **THEN** it excludes Ex commands and diagnostic/runtime-help metadata IDs
    because they are not keybindings and are covered by other diagnostic/help
    commands

#### Scenario: Protected shortcuts remain protected

- **WHEN** the keybindings catalog or detail output mentions Pi-owned
    shortcuts such as `ctrl+p`, `tab`, or `enter`
- **THEN** it preserves the protected shortcut vocabulary and does not present
    protected Pi shortcuts as available pi-vim bindings

### Requirement: Keybinding detail search is finite and source-backed

The Vim editor SHALL search keybinding catalog metadata across finite supported
fields without inventing unsupported Vim mapping behavior.

#### Scenario: Detail search finds action by ID or description

- **WHEN** the editor displays `:keybindings redo` or `:keybindings wordForward`
- **THEN** the popup shows matching action ID, action kind, current key
    sequence, and source-backed description when a match exists

#### Scenario: Detail search finds key ownership

- **WHEN** the editor displays `:keybindings ctrl+p` or another key sequence
    query
- **THEN** the popup reports whether the key is mapped, unmapped, protected,
    rejected by retained diagnostics, or otherwise unsupported using the same
    vocabulary as customization diagnostics

#### Scenario: Detail search rejects unsupported parity queries

- **WHEN** the editor displays `:keybindings vimscript`, `:keybindings nmap`,
    or another query with no finite supported match
- **THEN** the popup shows a bounded no-match result rather than inventing
    Vimscript, recursive mapping, or command-palette behavior

### Requirement: Keybinding popup uses customization diagnostics vocabulary

The keybinding discovery popup SHALL describe bindings using the same finite
metadata boundaries as existing customization diagnostics.

#### Scenario: Metadata-only diagnostic actions remain non-bindable

- **WHEN** the popup explains diagnostic or runtime-help action metadata such
    as `pi-vim.doctor` or `pi-vim.help`
- **THEN** it identifies those IDs as metadata-only or non-bindable rather
    than presenting them as configurable keybinding targets

#### Scenario: Protected shortcuts remain protected

- **WHEN** the popup mentions protected Pi shortcuts or directs users to
    `:mapcheck <key>`
- **THEN** it preserves the protected shortcut catalog boundary and does not
    present protected Pi shortcuts as available pi-vim bindings

### Requirement: Diagnostic help actions have metadata-only entries searchable through keymap

The Vim editor SHALL expose finite metadata for diagnostic and runtime-help
actions without making those actions keybindable or plugin-dispatchable.

#### Scenario: Keymap search finds diagnostic metadata

- **WHEN** the editor executes `:keymap pi-vim.doctor` or another supported
    diagnostic/help action ID
- **THEN** it shows the matching metadata entry with its canonical `pi-vim.*`
    ID, command name, diagnostic/runtime-help classification, and metadata-only
    or non-bindable status

#### Scenario: Unsupported diagnostic action remains unsupported

- **WHEN** the editor executes `:keymap pi-vim.dump` or another unsupported
    diagnostic-like action query
- **THEN** it shows a bounded no-match message rather than inventing a
    command, action, plugin API, or keybinding target

### Requirement: Pre-rename configuration is ignored with warnings

The settings loader SHALL ignore the pre-1.0.0 `piVimMode` settings key and
the pre-1.0.0 `pi-vimmode.config.js` file, and SHALL add a retained warning for
each one it finds so `:vimdoctor` shows the rename.

#### Scenario: Old settings key warns

- **WHEN** global or project settings contain a `piVimMode` object
- **THEN** its values are not applied and the warnings include
    `<source> settings: piVimMode was renamed to piVim in 1.0.0 and is ignored`

#### Scenario: Old JS config file warns

- **WHEN** `pi-vimmode.config.js` exists next to the expected
    `pi-vim.config.js`
- **THEN** it is not loaded and the warnings include
    `<path> was renamed to pi-vim.config.js in 1.0.0 and is ignored`
