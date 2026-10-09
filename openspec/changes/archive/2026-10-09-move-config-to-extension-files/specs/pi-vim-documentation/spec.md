# Spec Delta

## RENAMED Requirements

- FROM: `### Requirement: Settings reference covers every piVim option`
- TO: `### Requirement: Settings reference covers every pi-vim option`

## MODIFIED Requirements

### Requirement: Settings reference covers every pi-vim option

The project SHALL provide `docs/settings.md` as a complete reference for the
options read from pi-vim's `config.json` files.

#### Scenario: User checks a setting

- **WHEN** a user opens `docs/settings.md`
- **THEN** the document lists every supported option key, nested key,
    default value, accepted value shape, behavior, and relevant validation or
    fallback behavior

#### Scenario: User configures pi-vim

- **WHEN** a user reads `docs/settings.md`
- **THEN** the document explains the global and project `config.json`
    locations, the project trust requirement, the trusted JS config location,
    merge precedence, warning behavior, protected key handling, Vim-style key
    notation, and practical JSON examples

### Requirement: Settings reference covers presets and feedback

The project SHALL document every new pi-vim customization setting in
`docs/settings.md`.

#### Scenario: User reads preset settings

- **WHEN** a user opens `docs/settings.md`
- **THEN** the document lists supported preset names, preset intent, merge
    precedence, fallback behavior for invalid presets, and examples of explicit
    fields overriding preset defaults

#### Scenario: User reads no-op feedback settings

- **WHEN** a user opens `docs/settings.md`
- **THEN** the document lists the no-op feedback setting, default quiet
    behavior, accepted values, and examples of feedback messages when enabled

#### Scenario: User reads protected shortcut settings

- **WHEN** a user opens `docs/settings.md`
- **THEN** the document includes protected Pi shortcut explanations and tells
    users to use `:mapcheck` for runtime key ownership details

### Requirement: Settings reference remains aligned with config source

The project SHALL keep `docs/settings.md` aligned with supported pi-vim
settings, defaults, accepted value shapes, and validation behavior when runtime
help or drift guard metadata references settings.

#### Scenario: Settings docs key is missing from source metadata

- **WHEN** `docs/settings.md` lists a setting path that is neither
    supported by source config/types metadata nor listed as an approved ignored
    legacy setting
- **THEN** the documentation drift guard fails with the unexpected setting path

#### Scenario: Settings docs default contradicts source metadata

- **WHEN** a setting default documented in `docs/settings.md` contradicts the
    source-backed config metadata available to the drift guard
- **THEN** the documentation drift guard fails with the setting path and
    conflicting default

#### Scenario: Runtime help references setting docs

- **WHEN** a runtime help or feature registry entry references a
    setting-controlled feature area
- **THEN** the corresponding setting path is documented in `docs/settings.md`
    or the registry entry declares that no user setting controls the feature

### Requirement: Settings docs document keybindings popup command binding

The settings reference SHALL document how users can configure an optional
normal-mode keybinding for the dedicated keybindings popup command.

#### Scenario: Settings reference lists command path

- **WHEN** the user opens `docs/settings.md`
- **THEN** it lists `keymap.commands.showKeybindings`, its default
    empty binding list, and its effect of opening the keybindings popup

#### Scenario: Settings reference documents validation rules

- **WHEN** the user opens `docs/settings.md`
- **THEN** it explains that `showKeybindings` follows normal semantic keymap
    validation, including protected shortcut rejection, conflict rejection,
    finite multi-key matching, and insert-mode Pi delegation

#### Scenario: Settings reference keeps metadata boundary clear

- **WHEN** the user opens `docs/settings.md`
- **THEN** it clarifies that `pi-vim.*` diagnostic/help metadata IDs cannot
    be bound to keys, and users should configure
    `keymap.commands.showKeybindings` for a shortcut to the
    keybindings popup

### Requirement: Documentation covers visual reselection

The project SHALL document `gv` visual reselection in user-facing feature and
settings references.

#### Scenario: Feature guide documents visual reselection

- **WHEN** a user opens `docs/features.md`
- **THEN** the visual mode documentation explains that `gv` reselects the last
    valid visual selection, preserves characterwise/linewise/blockwise selection
    kind, and no-ops when no valid stored selection exists

#### Scenario: Settings reference documents visual reselection keymap

- **WHEN** a user opens `docs/settings.md`
- **THEN** the keymap command reference lists
    `keymap.commands.reselectVisual`, its default `gv` binding, and
    its normal-mode behavior

### Requirement: Documentation explains safe insert editing layer

User-facing pi-vim documentation SHALL explain the opt-in safe insert
editing layer, including supported actions, examples, validation behavior, and
explicit non-goals.

#### Scenario: Settings reference lists insert action options

- **WHEN** the user opens `docs/settings.md`
- **THEN** the settings reference lists each `keymap.insert` action,
    its empty default, accepted key shape, protected-key allow-list behavior,
    duplicate binding diagnostics, autocomplete delegation, and raw printable
    rejection

#### Scenario: Feature guide shows readline-style examples

- **WHEN** the user opens `docs/features.md`
- **THEN** the feature guide includes a copy-pasteable readline-style example
    for insert-mode word/line deletion and movement using chords such as
    `ctrl+w`, `ctrl+u`, `ctrl+k`, `ctrl+a`, `ctrl+e`, `alt+b`, and `alt+f`

#### Scenario: Feature guide shows home-row-mod examples separately

- **WHEN** the user opens `docs/features.md`
- **THEN** the feature guide includes a separate home-row-mod example for
    insert-mode line opening and explains that `ctrl+k` cannot be assigned to
    both readline `deleteLineForward` and home-row `openLineAbove` in the same
    insert keymap

#### Scenario: Documentation names word semantics

- **WHEN** docs describe insert word movement or deletion
- **THEN** they state that insert word actions reuse pi-vim lowercase
    small-word semantics where keyword runs, punctuation runs, and whitespace
    are separate groups

#### Scenario: Documentation keeps action surfaces separate

- **WHEN** docs describe safe insert bindings
- **THEN** they state that `keymap.insert` owns only physical insert
    edits and movement

#### Scenario: Documentation states insert mapping non-goals

- **WHEN** docs describe insert keybinding limitations
- **THEN** they exclude raw printable mappings such as `jk`, `jj`, and `oo`,
    multi-key insert sequences, insert abbreviations, recursive mappings,
    `.vimrc`, Vimscript, Neovim Lua, default insert presets, and full Vim/Neovim
    parity
