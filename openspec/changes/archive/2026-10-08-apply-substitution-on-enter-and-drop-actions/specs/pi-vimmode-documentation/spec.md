## MODIFIED Requirements

### Requirement: Feature guide covers customization diagnostics

The project SHALL document runtime customization diagnostics in
`docs/features.md` as part of the supported pi-vimmode behavior guide.

#### Scenario: User reads diagnostic command documentation

- **WHEN** a user opens `docs/features.md`
- **THEN** the document explains `:vimdoctor`, `:keymap`, and `:mapcheck` with
    practical examples and explicit limitations

#### Scenario: User troubleshoots vim warning status

- **WHEN** a user opens `docs/features.md` after seeing `vim ⚠`
- **THEN** the document explains that `:vimdoctor` reports retained settings
    diagnostics and that invalid fields are ignored without discarding valid
    siblings

#### Scenario: User checks non-goals

- **WHEN** a user reads the customization diagnostics section
- **THEN** the document states that pi-vimmode does not support `.vimrc`,
    recursive mappings, Vimscript, Neovim Lua, or a full interactive Vim command
    palette

### Requirement: Documentation stays aligned with customization source of truth

User-facing customization docs SHALL be validated against source behavior,
OpenSpec requirements, and tests before the change is complete.

#### Scenario: Docs mention diagnostic commands

- **WHEN** docs mention `:vimdoctor`, `:keymap`, or `:mapcheck`
- **THEN** parser, modal, and rendering tests cover the documented command
    behavior

#### Scenario: Docs mention settings

- **WHEN** docs mention presets, feedback settings, protected shortcuts, or
    keymap merge precedence
- **THEN** config tests cover the documented accepted values, invalid fallback
    behavior, and field-by-field preservation

#### Scenario: Docs mention protected shortcuts

- **WHEN** docs list protected Pi shortcuts or pi-vimmode-owned shortcuts
- **THEN** the list matches the protected shortcut catalog used by runtime
    diagnostics and validation

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

- **WHEN** a user reads quickref entries for `:vimdoctor`, `:keymap`,
    `:mapcheck`, `:help`, `:messages`, or `:vimmode inspect`
- **THEN** the document identifies them as finite read-only
    diagnostic/runtime-help commands and does not present their `vimmode.*`
    metadata IDs as configurable keybinding targets

#### Scenario: Quickref documents unsupported parity boundaries

- **WHEN** a user reads the quick reference or runtime-help documentation
- **THEN** it states that pi-vimmode does not provide a public plugin action
    API, diagnostic action keybinding dispatch, runtime `:map`, runtime
    `:action`, Vimscript, Neovim Lua, full Vim help tags, or broad quickref
    parity

### Requirement: Documentation keeps one-line and popup discovery distinct

User-facing docs SHALL distinguish popup-backed read-only Ex help/diagnostic
output from existing compact runtime feedback and edit-flow messages.

#### Scenario: Docs preserve compact edit feedback expectations

- **WHEN** docs describe `:keymap`, `:mapcheck`, `:help`,
    `:messages`, `:vimmode inspect`, and `:vimdoctor`
- **THEN** they identify those valid read-only help/diagnostic outputs as
    popup-backed while preserving compact inline/workbench expectations for
    mutating Ex commands, parser errors, edit-flow success/errors, `:noh`,
    search input, substitution feedback, and
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
    including `:help`, `:help <topic>`, `:keybindings`, `:keymap <action>`,
    `:mapcheck <key>`, `:messages`, `:vimmode inspect`, and `:vimdoctor`

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

### Requirement: Documentation drift metadata stays out of runtime help paths

The project SHALL keep documentation drift guard metadata for runtime help
entries, diagnostic actions, and read-only popup command examples in
test/dev-owned sources that are not imported by runtime modules, while
preserving public runtime help and discovery behavior.

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
    `:help`, `:keybindings`, `:keymap`, `:mapcheck`, `:vimdoctor`, `:messages`,
    or `:vimmode inspect`
- **THEN** the commands keep their existing bounded prompt-local popup or
    message behavior, finite topic coverage, non-goals, and read-only
    prompt-editing state boundaries

#### Scenario: Published runtime source excludes docs/test-only metadata

- **WHEN** the package is packed with its `src/` runtime sources
- **THEN** the runtime modules do not include metadata strings that exist only
    for drift validation, such as OpenSpec spec paths, test file paths,
    `specAnchor`, `testAnchors`, or parser examples moved to test/dev metadata
