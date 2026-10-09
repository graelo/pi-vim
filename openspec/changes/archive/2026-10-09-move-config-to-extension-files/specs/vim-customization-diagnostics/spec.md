# Spec Delta

## MODIFIED Requirements

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
    editor instance rather than re-reading global or project config files

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
    `keymap.commands.redo`
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

## REMOVED Requirements

### Requirement: Pre-rename configuration is ignored with warnings

**Reason**: pi-vim no longer reads Pi `settings.json` files or
`~/.pi/agent/*.config.js`, so the old `piVimMode` key and
`pi-vimmode.config.js` file are never looked at, and pi-vim has no release
whose users would need the hint.
**Migration**: Move options into `<agent-dir>/extensions/pi-vim/config.json`
(or the project `.pi/extensions/pi-vim/config.json`) without a wrapper key, and
the JS config to `<agent-dir>/extensions/pi-vim/config.js`.
