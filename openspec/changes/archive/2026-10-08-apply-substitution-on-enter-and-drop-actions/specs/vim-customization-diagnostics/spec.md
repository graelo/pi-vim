## ADDED Requirements

### Requirement: Diagnostic help actions have metadata-only entries searchable through keymap

The Vim editor SHALL expose finite metadata for diagnostic and runtime-help
actions without making those actions keybindable or plugin-dispatchable.

#### Scenario: Keymap search finds diagnostic metadata

- **WHEN** the editor executes `:keymap vimmode.doctor` or another supported
    diagnostic/help action ID
- **THEN** it shows the matching metadata entry with its canonical `vimmode.*`
    ID, command name, diagnostic/runtime-help classification, and metadata-only
    or non-bindable status

#### Scenario: Unsupported diagnostic action remains unsupported

- **WHEN** the editor executes `:keymap vimmode.dump` or another unsupported
    diagnostic-like action query
- **THEN** it shows a bounded no-match message rather than inventing a
    command, action, plugin API, or keybinding target

## MODIFIED Requirements

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

### Requirement: Diagnostic command registry remains finite

The customization diagnostic surface SHALL add inspectability commands
explicitly rather than turning diagnostics into arbitrary action or command
execution.

#### Scenario: Supported diagnostics are explicit

- **WHEN** the user searches or inspects supported diagnostic commands through
    runtime help or keymap diagnostics
- **THEN** `vimdoctor`, `keymap`, `mapcheck`, `vimmode inspect`, and
    `messages` are presented as finite supported diagnostics when available

#### Scenario: Unsupported diagnostic names remain unsupported

- **WHEN** the user executes unsupported diagnostic-like commands such as
    `:map`, `:actions`, `:actionspalette`, `:vimmode dump`, or
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

- **WHEN** a metadata entry names `vimmode.doctor`, `vimmode.keymap`,
    `vimmode.keybindings`, `vimmode.mapcheck`, `vimmode.help`,
    `vimmode.messages`, or `vimmode.inspect`
- **THEN** the described command is one of the explicit supported
    diagnostic/runtime-help Ex commands and no additional dispatch path is
    implied

#### Scenario: Metadata lookup is read-only

- **WHEN** the editor executes `:keymap vimmode.help` or another metadata
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

## REMOVED Requirements

### Requirement: Action search is discoverable and finite

**Reason**: `:actions` duplicated `:keymap <query>` and `:keybindings <query>`.

**Migration**: Use `:keymap <query>` to search actions and their bindings, or
`:keybindings <query>` for the effective keybinding catalog.

### Requirement: Diagnostic help actions have metadata-only registry entries

**Reason**: Some scenarios described `:actions`, which was removed.

**Migration**: None; see "Diagnostic help actions have metadata-only entries
searchable through keymap".
