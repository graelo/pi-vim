## MODIFIED Requirements

### Requirement: Feature guide quickref classifies diagnostic and help surfaces

The project SHALL document a concise pi-vim quick reference that classifies
supported commands and actions by actual pi-vim behavior rather than
Vim/Neovim parity.

#### Scenario: Quickref separates supported surface categories

- **WHEN** a user opens `docs/features.md`
- **THEN** the quick reference groups modal motions/edits, Ex line commands,
    customization diagnostics, and runtime help/inspectability as distinct
    categories

#### Scenario: Quickref identifies metadata-only diagnostic actions

- **WHEN** a user reads quickref entries for `:vimdoctor`, `:keymap`,
    `:mapcheck`, `:help`, `:messages`, or `:vim inspect`
- **THEN** the document identifies them as finite read-only
    diagnostic/runtime-help commands and does not name `pi-vim.*` action IDs
    or present the commands as configurable keybinding targets

#### Scenario: Quickref documents unsupported parity boundaries

- **WHEN** a user reads the quick reference or runtime-help documentation
- **THEN** it states that pi-vim does not provide a public plugin action
    API, runtime `:map`, runtime `:action`, Vimscript, Neovim Lua, full Vim
    help tags, or broad quickref parity

### Requirement: Documentation drift metadata stays out of runtime help paths

The project SHALL keep documentation drift guard metadata for runtime help
entries and read-only popup command examples in test/dev-owned sources that
are not imported by runtime modules, while preserving public runtime help and
discovery behavior.

#### Scenario: Runtime registries expose only runtime-needed fields

- **WHEN** runtime help entries and read-only popup builders are imported by
    the extension runtime
- **THEN** those runtime objects omit docs/test-only fields such as OpenSpec
    spec paths, test file paths, parser-only examples, and documentation anchor
    fields unless a field is required for displayed user-facing output

#### Scenario: Drift guard preserves coverage through dev metadata

- **WHEN** `npm test` runs the documentation drift guard
- **THEN** every runtime help entry and read-only popup command has matching
    test/dev metadata that validates feature-doc anchors, spec files, and
    parser examples

#### Scenario: Public runtime discovery behavior is unchanged

- **WHEN** users execute supported read-only discovery commands such as
    `:help`, `:keybindings`, `:keymap`, `:mapcheck`, `:vimdoctor`, `:messages`,
    or `:vim inspect`
- **THEN** the commands keep their existing bounded prompt-local popup or
    message behavior, finite topic coverage, non-goals, and read-only
    prompt-editing state boundaries

#### Scenario: Published runtime source excludes docs/test-only metadata

- **WHEN** the package is packed with its `src/` runtime sources
- **THEN** the runtime modules do not include metadata strings that exist only
    for drift validation, such as OpenSpec spec paths, test file paths,
    `specAnchor`, `testAnchors`, or parser examples moved to test/dev metadata
