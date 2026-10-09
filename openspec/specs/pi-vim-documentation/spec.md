# pi-vim-documentation Specification

## Purpose

Define what the user-facing docs (README, features, settings and config guides)
must cover, which source each claim is checked against, and how documentation
stays aligned with runtime behavior.

## Requirements

### Requirement: Feature guide covers pi-vim behavior

The project SHALL provide `docs/features.md` as a user-facing guide that
explains every supported pi-vim feature area with concrete examples and
explicit limitations.

#### Scenario: User reads feature guide

- **WHEN** a user opens `docs/features.md`
- **THEN** the document covers activation, modes, normal motions, normal
    edits, character search, prompt search, visual character mode, visual line
    mode, visual block mode, Ex substitution, registers, marks, macros,
    UI/status rendering, terminal cursor hints, Pi shortcut compatibility,
    limitations, and validation commands

#### Scenario: User follows feature examples

- **WHEN** a user reads a feature section in `docs/features.md`
- **THEN** the section includes at least one practical example or workflow for
    the documented feature area

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

### Requirement: Documentation records source-of-truth policy

The project SHALL add an ADR under `docs/adr/` documenting where user-facing
pi-vim docs live and which implementation/spec files are authoritative for
future updates.

#### Scenario: Maintainer updates docs later

- **WHEN** a maintainer reads the new ADR
- **THEN** the ADR identifies `docs/features.md` and `docs/settings.md` as the
    user-facing docs and instructs maintainers to verify behavior against source
    files, OpenSpec specs, and tests before changing those docs

### Requirement: Documentation work stays focused

The change SHALL keep the primary documentation deliverables under `docs/` and
the OpenSpec change directory, while allowing small review-follow-up fixes to
source, tests, and durable OpenSpec specs when review finds documented behavior
would otherwise drift from implementation.

#### Scenario: Initial documentation implementation completes

- **WHEN** the initial documentation pass completes before review follow-up
- **THEN** the diff contains only new or changed files under `docs/` and the
    OpenSpec change directory

#### Scenario: Review finds behavior or durable-requirement drift

- **WHEN** documentation review identifies runtime behavior, test coverage, or
    durable OpenSpec specs that contradict the new canonical docs
- **THEN** the change may include minimal source, test, or durable-spec edits
    that directly resolve the drift and are validated with focused tests and
    OpenSpec validation

### Requirement: Feature guide covers customization diagnostics

The project SHALL document runtime customization diagnostics in
`docs/features.md` as part of the supported pi-vim behavior guide.

#### Scenario: User reads diagnostic command documentation

- **WHEN** a user opens `docs/features.md`
- **THEN** the document explains `:vimdoctor`, `:keymap`, and `:mapcheck` with
    practical examples and explicit limitations

#### Scenario: User troubleshoots vim warning status

- **WHEN** a user opens `docs/features.md` after a settings warning
    notification
- **THEN** the document explains that `:vimdoctor` reports retained settings
    diagnostics and that invalid fields are ignored without discarding valid
    siblings

#### Scenario: User checks non-goals

- **WHEN** a user reads the customization diagnostics section
- **THEN** the document states that pi-vim does not support `.vimrc`,
    recursive mappings, Vimscript, Neovim Lua, or a full interactive Vim command
    palette

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

- **WHEN** docs list protected Pi shortcuts or pi-vim-owned shortcuts
- **THEN** the list matches the protected shortcut catalog used by runtime
    diagnostics and validation

### Requirement: Feature guide documents runtime help and feature discovery

The project SHALL document runtime help and message introspection in
`docs/features.md` with practical examples and explicit limitations.

#### Scenario: User reads runtime help documentation

- **WHEN** a user opens `docs/features.md`
- **THEN** the document explains `:help [topic]` and `:messages` with
    practical examples and states that runtime help is finite, compact, and not
    a full Vim help system

#### Scenario: User reads feature discovery examples

- **WHEN** a user opens `docs/features.md`
- **THEN** the document includes examples for discovering supported commands
    or actions such as `:help ex`, `:keybindings redo`, or `:mapcheck ctrl+p`

#### Scenario: User reads message introspection limitations

- **WHEN** a user opens `docs/features.md`
- **THEN** the document explains that runtime messages are prompt-local,
    in-memory, bounded, and shown through the existing transient message row
    rather than a pager

### Requirement: Documentation drift guard protects feature docs

The project SHALL validate user-facing feature docs against source-backed
runtime help metadata, durable OpenSpec anchors, and test anchors before the
change is complete.

#### Scenario: Feature docs miss runtime help anchor

- **WHEN** a runtime help registry entry requires a `docs/features.md` anchor
    and that anchor is missing
- **THEN** the documentation drift guard fails with an actionable validation
    error

#### Scenario: Feature docs contradict supported Ex command

- **WHEN** `docs/features.md` or another user-facing docs file claims that a
    source-supported command such as `:noh` or `:nohlsearch` is unsupported
- **THEN** the documentation drift guard fails and identifies the stale
    unsupported claim

#### Scenario: Feature docs list unsupported runtime command as supported

- **WHEN** `docs/features.md` documents an Ex runtime help command as
    supported but the finite Ex parser or source-backed registry does not
    include that command
- **THEN** the documentation drift guard fails before the docs can be
    considered aligned

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

- **WHEN** docs describe `:keymap`, `:mapcheck`, `:help`,
    `:messages`, `:vim inspect`, and `:vimdoctor`
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
    `:mapcheck <key>`, `:messages`, `:vim inspect`, and `:vimdoctor`

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

### Requirement: README remains a quickstart and docs index

The README SHALL stay concise and point users to canonical feature/settings docs
rather than duplicating the full keybindings command reference.

#### Scenario: README does not become full keybindings reference

- **WHEN** this change updates documentation
- **THEN** README remains a quickstart/index and any detailed `:keybindings`
    behavior or config examples live in `docs/features.md` and
    `docs/settings.md`

### Requirement: Documentation explains WORD and previous-end motions

User-facing pi-vim documentation SHALL describe supported WORD and
previous-end word motions, including examples, configurable action names,
operator composition, and explicit non-goals.

#### Scenario: Feature guide documents motion behavior

- **WHEN** a user opens `docs/features.md`
- **THEN** the normal motions section documents `W`, `B`, `E`, `ge`, and `gE`,
    explains that WORD motions are whitespace-delimited, and gives at least one
    prompt-editing example involving paths, flags, URLs, or code-like tokens

#### Scenario: Feature guide documents operator composition

- **WHEN** a user opens `docs/features.md`
- **THEN** the operator-motion documentation includes examples or descriptions
    for delete, change, or yank with WORD and previous-end motions such as `dW`,
    `cE`, `dge`, or `ygE`

#### Scenario: Settings reference documents semantic action names

- **WHEN** a user opens `docs/settings.md`
- **THEN** the keymap motion reference lists `wordForwardBig`,
    `wordBackwardBig`, `wordEndBig`, `wordPreviousEnd`, and `wordPreviousEndBig`
    with their default bindings and notes that these actions can be used in
    `operatorMotions`

#### Scenario: Documentation states scope boundaries

- **WHEN** a user reads the motion limitations in `docs/features.md` or
    `docs/settings.md`
- **THEN** the docs state that this change does not add subword/camelCase
    navigation, display-line motions, recursive mappings, Vimscript, `.vimrc`,
    or full Vim/Neovim parity

#### Scenario: Documentation preserves lowercase word behavior claims

- **WHEN** docs describe `w`, `b`, `e`, `W`, `B`, `E`, `ge`, or `gE`
- **THEN** they do not claim that lowercase word motions were changed to a new
    punctuation-aware boundary model unless source behavior and tests actually
    implement that boundary model

### Requirement: Documentation drift metadata has one owner per registry

The project SHALL keep each piece of documentation drift metadata in exactly
one source: runtime help entries carry their own docs, spec, and test anchors
in the runtime help registry, and read-only popup command examples stay in
test/dev-owned sources that runtime modules do not import, while preserving
public runtime help and discovery behavior.

#### Scenario: Runtime registries expose only runtime-needed fields

- **WHEN** read-only popup builders and other runtime modules are imported by
    the extension runtime
- **THEN** they omit docs/test-only fields such as parser-only examples and
    popup documentation anchors, and the runtime help registry is the only
    runtime source of drift anchors

#### Scenario: Drift guard preserves coverage through dev metadata

- **WHEN** `npm test` runs the documentation drift guard
- **THEN** every runtime help entry is validated through its registry-owned
    anchors, and every read-only popup command through matching test/dev
    metadata that validates feature-doc anchors and parser examples

#### Scenario: Public runtime discovery behavior is unchanged

- **WHEN** users execute supported read-only discovery commands such as
    `:help`, `:keybindings`, `:keymap`, `:mapcheck`, `:vimdoctor`, `:messages`,
    or `:vim inspect`
- **THEN** the commands keep their existing bounded prompt-local popup or
    message behavior, finite topic coverage, non-goals, and read-only
    prompt-editing state boundaries

#### Scenario: Published runtime source excludes docs/test-only metadata

- **WHEN** the package is packed with its `src/` runtime sources
- **THEN** the runtime modules include no drift metadata other than the
    runtime help registry anchors, and in particular no popup parser examples
    or popup docs anchors moved to test/dev metadata

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

### Requirement: Config property and action references are generated from canonical metadata

The project SHALL commit generated property and action reference blocks in
`docs/config.md`, derived from canonical finite source metadata without
introducing a competing config or action registry.

#### Scenario: Property reference is complete

- **WHEN** trusted-config property references are generated
- **THEN** every public config property appears exactly once with an explicit
    stable anchor, accepted type or value shape, built-in default, assignment or
    replacement semantics, and corresponding JSON path where one exists

#### Scenario: Property alias remains one entry

- **WHEN** a public config property has a compatibility alias such as
    `vim.g.mapleader`
- **THEN** generated reference identifies alias on canonical property entry
    instead of creating duplicate property entry

#### Scenario: Action reference is complete

- **WHEN** trusted-config action references are generated
- **THEN** every public finite action appears exactly once with an explicit
    stable anchor, canonical factory path, supported mapping scopes, accepted
    arguments, and compatibility aliases
- **AND** non-bindable diagnostic metadata is not presented as public action
    factory

#### Scenario: Generated blocks are readable in repository

- **WHEN** user opens `docs/config.md` from repository without running build
- **THEN** committed generated blocks contain complete current property and
    action references
- **AND** `docs/settings.md` remains canonical source for detailed JSON
    configuration behavior

#### Scenario: Regeneration is deterministic

- **WHEN** canonical metadata and committed references match and generator runs
- **THEN** generated file content remains unchanged and working tree stays clean

#### Scenario: Metadata coverage failure is actionable

- **WHEN** canonical metadata has duplicate public entries, omits public
    declaration entry, lacks required reference fields, or maps multiple entries
    to same anchor
- **THEN** validation fails and identifies offending property, action, field,
    or anchor

#### Scenario: Committed output drift fails validation

- **WHEN** canonical metadata changes without regenerating committed reference
    blocks
- **THEN** validation fails with command or guidance needed to regenerate
    references

#### Scenario: Generated anchors resolve

- **WHEN** validation checks links and explicit anchors in generated reference
    blocks
- **THEN** every generated local reference resolves and duplicate or missing
    anchor fails validation

#### Scenario: Declaration-only contract remains compatible

- **WHEN** generated metadata coverage is checked against public `VimConfig`
    and `VimConfigApi` declarations
- **THEN** property paths, accepted shapes, action factories, arguments,
    scopes, and compatibility aliases agree with declaration-only contract
- **AND** no runtime config helper, descriptor constructor, registry export,
    or config behavior change is introduced
