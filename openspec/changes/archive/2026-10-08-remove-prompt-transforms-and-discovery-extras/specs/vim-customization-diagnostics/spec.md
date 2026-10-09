# Spec Delta

## ADDED Requirements

### Requirement: Keybinding popup uses customization diagnostics vocabulary

The keybinding discovery popup SHALL describe bindings using the same finite
metadata boundaries as existing customization diagnostics.

#### Scenario: Metadata-only diagnostic actions remain non-bindable

- **WHEN** the popup explains diagnostic or runtime-help action metadata such
    as `vimmode.doctor` or `vimmode.help`
- **THEN** it identifies those IDs as metadata-only or non-bindable rather
    than presenting them as configurable keybinding targets

#### Scenario: Protected shortcuts remain protected

- **WHEN** the popup mentions protected Pi shortcuts or directs users to
    `:mapcheck <key>`
- **THEN** it preserves the protected shortcut catalog boundary and does not
    present protected Pi shortcuts as available pi-vimmode bindings

## MODIFIED Requirements

### Requirement: Action search is discoverable and finite

The Vim editor SHALL expose a searchable list of supported semantic actions
without implying support for arbitrary Vim commands.

#### Scenario: Actions command lists supported categories

- **WHEN** the editor executes `:actions` without a query
- **THEN** the editor shows a compact summary of supported action categories
    such as commands, motions, operators, text objects, macros, marks, and
    searches

#### Scenario: Actions command searches metadata

- **WHEN** the editor executes `:actions redo` or another query matching an
    action id, description, or current binding
- **THEN** the editor shows the best matching supported action and its current
    binding when one exists

#### Scenario: Actions command rejects unsupported parity claims

- **WHEN** the editor executes `:actions vimscript` or another query that
    matches no supported finite action
- **THEN** the editor shows a transient no-match message rather than inventing
    unsupported Vim behavior

### Requirement: Inspect and message diagnostics are effective-runtime views

Runtime diagnostics SHALL report the effective editor state and configuration
available to the current prompt editor rather than raw settings tables or stale
implementation defaults.

#### Scenario: Inspect reflects resolved feature availability

- **WHEN** `:vimmode inspect` runs with a preset or resolved options that
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
    warnings, or keymap conflicts and the user runs `:vimmode inspect`
- **THEN** the inspect output includes a bounded warning summary without
    replacing `:vimdoctor` as the detailed customization health command

### Requirement: Diagnostic help actions have metadata-only registry entries

The Vim editor SHALL expose finite metadata for diagnostic and runtime-help
actions without making those actions keybindable or plugin-dispatchable.

#### Scenario: Actions search finds diagnostic metadata

- **WHEN** the editor executes `:actions vimmode.doctor`,
    `:actions vimmode.actions`, or another supported diagnostic/help action ID
- **THEN** it shows the matching metadata entry with its canonical `vimmode.*`
    ID, command name, diagnostic/runtime-help classification, and metadata-only
    or non-bindable status

#### Scenario: Actions summary separates metadata-only diagnostics

- **WHEN** the editor executes `:actions` without a query
- **THEN** diagnostic/help metadata entries are summarized separately from
    bindable actions and are not counted as motions, operators, text objects,
    macros, marks, searches, or editing commands

#### Scenario: Unsupported diagnostic action remains unsupported

- **WHEN** the editor executes `:actions vimmode.dump`,
    `:actions actionspalette`, or another unsupported diagnostic-like action
    query
- **THEN** it shows a bounded no-match message rather than inventing a
    command, action, plugin API, or keybinding target

### Requirement: Diagnostic action metadata preserves diagnostic command boundaries

Diagnostic/help action metadata SHALL describe existing finite diagnostics
without changing execution or editing side effects.

#### Scenario: Metadata entry points to existing Ex command

- **WHEN** a metadata entry names `vimmode.doctor`, `vimmode.actions`,
    `vimmode.keymap`, `vimmode.mapcheck`, `vimmode.help`, `vimmode.messages`,
    or `vimmode.inspect`
- **THEN** the described command is one of the explicit supported
    diagnostic/runtime-help Ex commands and no additional dispatch path is
    implied

#### Scenario: Metadata lookup is read-only

- **WHEN** the editor executes `:actions vimmode.help` or another metadata
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
    `piVimMode.keymap.commands.redo`
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
    protected Pi shortcuts as available pi-vimmode bindings

## REMOVED Requirements

### Requirement: Customization metadata supports runtime feature discovery

**Reason**: `:features` duplicated `:help`, `:keybindings`, `:actions`, and
`:mapcheck`, and was removed in 1.0.0.
**Migration**: Use `:help <topic>` for behavior and limits, `:keybindings` or
`:actions <query>` for bindings, and `:mapcheck <key>` for key ownership.

### Requirement: Feature discovery reflects effective customization state

**Reason**: `:features` duplicated `:help`, `:keybindings`, `:actions`, and
`:mapcheck`, and was removed in 1.0.0.
**Migration**: Use `:help <topic>` for behavior and limits, `:keybindings` or
`:actions <query>` for bindings, and `:mapcheck <key>` for key ownership.

### Requirement: Diagnostics describe prompt transform action keybindings

**Reason**: Prompt transforms (`:quote`, `:unquote`, `:bulletize`, `:fence`,
`:indent`, `:dedent`, `:reflow`), their `prompt.transform.*` action keybindings,
and the recipe/preset bundles built on them were removed in 1.0.0.
**Migration**: Use Vim line shifts (`>>`, `<<`, visual `>`/`<`) and case
operators, or edit prompt text directly. `piVimMode.keymap.actions`,
`piVimMode.keymap.actionPresets`, and `piVimMode.promptTransforms` now warn and
are ignored.

### Requirement: Keybinding popup reuses customization diagnostics vocabulary

**Reason**: Some scenarios described `:features`, `:changelog`, or prompt
transform surfaces removed in 1.0.0; the remaining behavior moves unchanged to
"Keybinding popup uses customization diagnostics vocabulary".
**Migration**: None; see "Keybinding popup uses customization diagnostics vocabulary".
