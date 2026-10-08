# Spec Delta

## MODIFIED Requirements

### Requirement: Feature guide documents runtime help and feature discovery

The project SHALL document runtime help and message introspection in `docs/features.md` with practical examples and explicit
limitations.

#### Scenario: User reads runtime help documentation

- **WHEN** a user opens `docs/features.md`
- **THEN** the document explains `:help [topic]` and `:messages` with practical examples and states that runtime help is finite,
    compact, and not a full Vim help system

#### Scenario: User reads feature discovery examples

- **WHEN** a user opens `docs/features.md`
- **THEN** the document includes examples for discovering supported commands
    or actions such as `:help ex`, `:keybindings redo`, or `:mapcheck ctrl+p`

#### Scenario: User reads message introspection limitations

- **WHEN** a user opens `docs/features.md`
- **THEN** the document explains that runtime messages are prompt-local,
    in-memory, bounded, and shown through the existing transient message row
    rather than a pager

### Requirement: Feature guide quickref classifies diagnostic and help surfaces

The project SHALL document a concise pi-vimmode quick reference that classifies
supported commands and actions by actual pi-vimmode behavior rather than
Vim/Neovim parity.

#### Scenario: Quickref separates supported surface categories

- **WHEN** a user opens `docs/features.md`
- **THEN** the quick reference groups modal motions/edits, Ex line commands,
    customization diagnostics, and runtime help/inspectability as distinct
    categories

#### Scenario: Quickref identifies metadata-only diagnostic actions

- **WHEN** a user reads quickref entries for `:vimdoctor`, `:actions`,
    `:keymap`, `:mapcheck`, `:help`, `:messages`, or `:vimmode inspect`
- **THEN** the document identifies them as finite read-only
    diagnostic/runtime-help commands and does not present their `vimmode.*`
    metadata IDs as configurable keybinding targets

#### Scenario: Quickref documents unsupported parity boundaries

- **WHEN** a user reads the quick reference or runtime-help documentation
- **THEN** it states that pi-vimmode does not provide a public plugin action
    API, diagnostic action keybinding dispatch, runtime `:map`, runtime
    `:action`, Vimscript, Neovim Lua, full Vim help tags, or broad quickref
    parity

### Requirement: Feature guide documents keybinding discovery popup

The project SHALL document the finite read-only Ex popup, including keybinding
discovery popup content, in user-facing feature docs.

#### Scenario: Docs explain popup entry point

- **WHEN** a user opens `docs/features.md`
- **THEN** the feature guide documents that read-only Ex help and diagnostic
    commands open a dedicated bounded read-only overlay popup, including
    `:keybindings` as the keybinding discovery entry point

#### Scenario: Docs explain popup contents

- **WHEN** a user reads the read-only popup documentation
- **THEN** it explains that popup content can include runtime help topics,
    effective keybindings, customization diagnostics, message history
    summaries, and inspectability summaries

#### Scenario: Docs explain popup scrolling

- **WHEN** a user reads the read-only popup documentation
- **THEN** it explains that overflowing popup content can be scrolled inside
    the popup with popup-local controls such as `j`/`k` or arrow keys

#### Scenario: Docs explain popup dismissal

- **WHEN** a user reads the read-only popup documentation
- **THEN** it explains the supported dismissal behavior such as `Esc`,
    `Ctrl-C`, `Ctrl-G`, or existing reset/cancel behavior when applicable

#### Scenario: Docs explain popup non-goals

- **WHEN** a user reads the read-only popup documentation
- **THEN** it states that the popup does not provide full Vim help tags, a
    command palette, runtime `:map`, runtime `:action`, recursive mappings,
    plugin API, diagnostic/help action keybinding dispatch, persistent logs, or
    an unbounded output log

### Requirement: Documentation keeps one-line and popup discovery distinct

User-facing docs SHALL distinguish popup-backed read-only Ex help/diagnostic
output from existing compact runtime feedback and edit-flow messages.

#### Scenario: Docs preserve compact edit feedback expectations

- **WHEN** docs describe `:actions`, `:keymap`, `:mapcheck`, `:help`,
    `:messages`, `:vimmode inspect`, and `:vimdoctor`
- **THEN** they identify those valid read-only help/diagnostic outputs as
    popup-backed while preserving compact inline/workbench expectations for
    mutating Ex commands, parser errors, edit-flow success/errors, `:noh`,
    search input, substitution preview/apply feedback, and
    optional no-op feedback

#### Scenario: Docs keep settings reference separate

- **WHEN** docs describe read-only popup contents
- **THEN** detailed setting shapes, defaults, and validation rules remain in
    `docs/settings.md`, while `docs/features.md` summarizes only the behavior
    needed to discover and understand read-only popup output

### Requirement: Feature guide documents read-only Ex popup output

The project SHALL document the generic read-only Ex help/diagnostic popup in
user-facing feature docs.

#### Scenario: Docs list popup-backed commands

- **WHEN** a user opens `docs/features.md`
- **THEN** the feature guide lists popup-backed read-only Ex commands
    including `:help`, `:help <topic>`, `:keybindings`, `:actions <query>`, `:keymap <action>`, `:mapcheck <key>`, `:messages`,
    `:vimmode inspect`, and `:vimdoctor`

#### Scenario: Docs explain popup controls

- **WHEN** a user reads the read-only Ex popup documentation
- **THEN** it explains popup dismissal with `Esc`, `Ctrl-C`, or `Ctrl-G` and
    popup-local scrolling with `j`/`k` or arrow keys

#### Scenario: Docs explain compact feedback boundary

- **WHEN** a user reads the Ex command-line or runtime help documentation
- **THEN** it explains that mutating Ex commands, parser errors, edit-flow
    success/errors, `:noh`, and optional no-op feedback keep
    compact inline/workbench behavior rather than opening the read-only popup

#### Scenario: Docs explain popup history behavior

- **WHEN** a user reads the runtime message or inspectability documentation
- **THEN** it explains that popup content and popup scroll/dismiss actions do
    not create retained runtime message history entries, and that `:messages`
    output itself is not retained as message history

### Requirement: User-facing docs document keybindings command

The user-facing feature guide SHALL document the dedicated keybindings popup
command, query behavior, read-only state boundaries, and current limitations.

#### Scenario: Feature guide names keybindings command

- **WHEN** the user opens `docs/features.md`
- **THEN** it documents `:keybindings` as the direct read-only popup entry
    point for effective keybinding discovery

#### Scenario: Feature guide documents keybindings query behavior

- **WHEN** the user opens `docs/features.md`
- **THEN** it documents `:keybindings <query>` examples for action lookup, key
    ownership lookup, protected shortcuts, or finite no-match behavior

#### Scenario: Feature guide documents popup controls and boundaries

- **WHEN** the user opens `docs/features.md`
- **THEN** it documents that the keybindings popup is bounded, width-safe,
    locally scrollable, dismissible, and read-only with respect to prompt
    editing state

#### Scenario: Feature guide documents keybindings non-goals

- **WHEN** the user opens `docs/features.md`
- **THEN** it states that keybinding discovery does not provide runtime
    `:map`, recursive mappings, Vimscript, a command palette, plugin dispatch,
    or diagnostic/help action keybinding dispatch

### Requirement: Settings docs document keybindings popup command binding

The settings reference SHALL document how users can configure an optional
normal-mode keybinding for the dedicated keybindings popup command.

#### Scenario: Settings reference lists command path

- **WHEN** the user opens `docs/settings.md`
- **THEN** it lists `piVimMode.keymap.commands.showKeybindings`, its default
    empty binding list, and its effect of opening the keybindings popup

#### Scenario: Settings reference documents validation rules

- **WHEN** the user opens `docs/settings.md`
- **THEN** it explains that `showKeybindings` follows normal semantic keymap
    validation, including protected shortcut rejection, conflict rejection,
    finite multi-key matching, and insert-mode Pi delegation

#### Scenario: Settings reference keeps metadata boundary clear

- **WHEN** the user opens `docs/settings.md`
- **THEN** it clarifies that `vimmode.*` diagnostic/help metadata IDs cannot
    be bound to keys, and users should configure
    `piVimMode.keymap.commands.showKeybindings` for a shortcut to the
    keybindings popup

### Requirement: Documentation drift metadata stays out of runtime help paths

The project SHALL keep documentation drift guard metadata for runtime help
entries, diagnostic actions, and read-only popup command examples in
test/dev-owned sources that are not imported by runtime modules, while preserving public runtime help and discovery behavior.

#### Scenario: Runtime registries expose only runtime-needed fields

- **WHEN** runtime help entries, diagnostic action entries, and read-only
    popup builders are imported by the extension runtime
- **THEN** those runtime objects omit docs/test-only fields such as OpenSpec
    spec paths, test file paths, parser-only examples, and documentation anchor
    fields unless a field is required for displayed user-facing output

#### Scenario: Drift guard preserves coverage through dev metadata

- **WHEN** `npm test` runs the documentation drift guard
- **THEN** every runtime help entry, diagnostic action, and read-only popup
    command has matching test/dev metadata that validates feature-doc anchors,
    spec files, parser examples, and excluded bindability boundaries

#### Scenario: Public runtime discovery behavior is unchanged

- **WHEN** users execute supported read-only discovery commands such as
    `:help`, `:keybindings`, `:actions`, `:keymap`, `:mapcheck`,
    `:vimdoctor`, `:messages`, or `:vimmode inspect`
- **THEN** the commands keep their existing bounded prompt-local popup or
    message behavior, finite topic coverage, non-goals, and read-only
    prompt-editing state boundaries

#### Scenario: Published runtime source excludes docs/test-only metadata

- **WHEN** the package is packed with its `src/` runtime sources
- **THEN** the runtime modules do not include metadata strings that exist only
    for drift validation, such as OpenSpec spec paths, test file paths,
    `specAnchor`, `testAnchors`, or parser examples moved to test/dev metadata

### Requirement: Documentation explains safe insert editing layer

User-facing pi-vimmode documentation SHALL explain the opt-in safe insert
editing layer, including supported actions, examples, validation behavior, and
explicit non-goals.

#### Scenario: Settings reference lists insert action options

- **WHEN** the user opens `docs/settings.md`
- **THEN** the settings reference lists each `piVimMode.keymap.insert` action,
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
- **THEN** they state that insert word actions reuse pi-vimmode lowercase
    small-word semantics where keyword runs, punctuation runs, and whitespace
    are separate groups

#### Scenario: Documentation keeps action surfaces separate

- **WHEN** docs describe safe insert bindings
- **THEN** they state that `piVimMode.keymap.insert` owns only physical insert
    edits and movement

#### Scenario: Documentation states insert mapping non-goals

- **WHEN** docs describe insert keybinding limitations
- **THEN** they exclude raw printable mappings such as `jk`, `jj`, and `oo`,
    multi-key insert sequences, insert abbreviations, recursive mappings,
    `.vimrc`, Vimscript, Neovim Lua, default insert presets, and full Vim/Neovim
    parity

## REMOVED Requirements

### Requirement: Documentation explains action keybindings and non-goals

**Reason**: Prompt transforms (`:quote`, `:unquote`, `:bulletize`, `:fence`,
`:indent`, `:dedent`, `:reflow`), their `prompt.transform.*` action keybindings,
and the recipe/preset bundles built on them were removed in 1.0.0.
**Migration**: Use Vim line shifts (`>>`, `<<`, visual `>`/`<`) and case
operators, or edit prompt text directly. `piVimMode.keymap.actions`,
`piVimMode.keymap.actionPresets`, and `piVimMode.promptTransforms` now warn and
are ignored.

### Requirement: Documentation explains action keybinding presets

**Reason**: Prompt transforms (`:quote`, `:unquote`, `:bulletize`, `:fence`,
`:indent`, `:dedent`, `:reflow`), their `prompt.transform.*` action keybindings,
and the recipe/preset bundles built on them were removed in 1.0.0.
**Migration**: Use Vim line shifts (`>>`, `<<`, visual `>`/`<`) and case
operators, or edit prompt text directly. `piVimMode.keymap.actions`,
`piVimMode.keymap.actionPresets`, and `piVimMode.promptTransforms` now warn and
are ignored.
