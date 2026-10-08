# runtime-help-drift-guard Specification

## Purpose

Define the finite, source-backed runtime help and feature discovery commands,
and the drift guard that ties each entry to its docs anchor, spec, and tests.

## Requirements

### Requirement: Runtime help is finite and source-backed

The Vim editor SHALL provide finite runtime help that describes supported
pi-vim behavior and explicit limitations without implying full Vim or Neovim
parity.

#### Scenario: General help lists entry points

- **WHEN** the editor executes `:help` with no topic
- **THEN** the editor shows a compact transient help message that names
    supported entry points such as `:help <topic>`, `:keybindings [query]`,
    `:messages`, `:keymap`, `:mapcheck`, and `:vimdoctor`

#### Scenario: Topic help describes supported behavior and limits

- **WHEN** the editor executes `:help search`, `:help ex`, or another
    supported topic
- **THEN** the editor shows a compact transient message based on source-backed
    help metadata that includes supported pi-vim behavior and at least one
    relevant limitation when the topic has known limits

#### Scenario: Unknown help topic is rejected without parity fallback

- **WHEN** the editor executes `:help vimscript` or another topic that has no
    supported help entry
- **THEN** the editor shows a transient no-match message and does not fall
    back to Vim help tags, Vimscript documentation, or external files

### Requirement: Runtime messages are inspectable

The Vim editor SHALL allow users to inspect recent runtime messages without
adding a pager or persistent log.

#### Scenario: Messages command reports recent message state

- **WHEN** the editor has emitted one or more transient runtime messages and
    then executes `:messages`
- **THEN** the editor shows a compact transient summary containing the
    retained message count and the most recent retained message

#### Scenario: Messages command handles empty history

- **WHEN** the editor executes `:messages` before any runtime messages have
    been retained
- **THEN** the editor shows a compact transient message indicating that no
    runtime messages are retained

#### Scenario: Messages history is bounded

- **WHEN** the editor emits more runtime messages than the retained history cap
- **THEN** older messages are discarded and `:messages` reports only bounded
    recent message state

#### Scenario: Messages introspection does not pollute history

- **WHEN** the editor executes `:messages` repeatedly
- **THEN** the `:messages` output itself is not appended to the retained
    message history

### Requirement: Runtime help commands preserve prompt editing state

Runtime help SHALL be read-only with respect to prompt editing state.

#### Scenario: Help command leaves editing state unchanged

- **WHEN** the editor executes `:help` or `:messages`
- **THEN** prompt text, cursor position, mode, visual selection, search
    highlights, registers, marks, macro slots, macro replay state, and
    dot-repeat state remain unchanged except for the transient informational
    message

#### Scenario: Help command from visual Ex restores visual state

- **WHEN** Ex command-line mode was opened from a visual selection, the user
    deletes the prefilled visual range marker, and the user executes `:help` or
    `:messages`
- **THEN** the command exits Ex mode without editing prompt text and restores
    the original visual mode state according to existing Ex cancellation
    behavior

### Requirement: Docs drift guard validates runtime help contracts

The project SHALL include development-time validation that fails when
user-facing docs, source-backed runtime help metadata, durable specs, or test
anchors contradict each other for supported pi-vim behavior.

#### Scenario: Supported command missing from docs fails validation

- **WHEN** source-backed help metadata lists a supported runtime command and
    `docs/features.md` lacks its required docs anchor
- **THEN** the docs drift guard fails in the normal validation path

#### Scenario: Stale unsupported claim fails validation

- **WHEN** user-facing docs claim `:noh`, `:nohlsearch`, or another
    source-supported command is unsupported
- **THEN** the docs drift guard fails with an actionable message identifying
    the contradictory claim

#### Scenario: Missing spec or test anchor fails validation

- **WHEN** a source-backed feature registry entry lacks a required OpenSpec
    spec anchor or test anchor without an explicit approved exception
- **THEN** the docs drift guard fails before the change is considered complete

### Requirement: Keybinding popup is bounded, width-safe, and locally scrollable

Runtime read-only popup output SHALL be bounded to the terminal overlay
viewport, SHALL avoid unbounded multi-line logs or Vim help-pager behavior, and
SHALL provide popup-local scrolling when bounded content overflows.

#### Scenario: Popup width fits viewport

- **WHEN** a runtime help, customization diagnostic, message,
    inspectability, or keybinding discovery popup is rendered in a
    narrow viewport that can fit the minimum popup
- **THEN** every rendered popup row is truncated or fitted to the available
    overlay width without overflowing

#### Scenario: Popup height is capped

- **WHEN** source-backed read-only popup content contains more lines than the
    popup can display
- **THEN** the popup keeps a bounded overlay height and shows an actionable
    scroll or range indicator for hidden content rather than emitting unbounded
    output

#### Scenario: Popup hidden rows are reachable

- **WHEN** the popup shows that additional rows are hidden below or above the
    current view
- **THEN** popup-local scroll controls such as `j`/`k` or arrow keys can
    reveal those rows without leaving the popup or editing prompt text

#### Scenario: Popup scroll is clamped

- **WHEN** the user scrolls beyond the first or last popup row
- **THEN** the popup keeps its scroll offset within valid bounds and continues
    rendering a bounded width-safe overlay

#### Scenario: Read-only runtime help uses popup

- **WHEN** the editor executes runtime help commands other than keybinding
    discovery, such as `:help search` or `:messages`
- **THEN** those commands use the read-only popup display path for successful
    bounded output rather than retaining compact inline output as their normal
    display path

### Requirement: Drift guard validates read-only Ex popup command coverage

The project SHALL validate that source-backed runtime help, user docs, specs,
and tests agree on which read-only Ex commands open the generic popup.

#### Scenario: Popup command missing from docs fails validation

- **WHEN** source-backed popup metadata lists a read-only Ex command such as
    `:help`, `:keybindings`, `:keymap`, `:mapcheck`, `:messages`,
    `:vim inspect`, or `:vimdoctor` and `docs/features.md` lacks the
    corresponding popup documentation anchor
- **THEN** the docs drift guard fails with an actionable message identifying
    the missing command or docs anchor

#### Scenario: Popup command missing from finite parser fails validation

- **WHEN** source-backed popup metadata lists a command-backed read-only Ex
    popup entry
- **THEN** automated validation verifies that the finite Ex parser supports
    that exact command syntax or the metadata declares an explicit non-command
    exception

#### Scenario: Stale compact-output claim fails validation

- **WHEN** docs, runtime help metadata, or tests claim that a successful
    read-only Ex help or diagnostic command still uses only the compact inline
    row as its normal display path
- **THEN** docs drift validation fails before the change is considered complete

### Requirement: Drift guard validates keybindings popup command coverage

The project SHALL validate that the dedicated keybindings popup command stays
aligned across parser support, popup metadata, runtime help, user docs, specs,
and tests.

#### Scenario: Keybindings command missing from docs fails validation

- **WHEN** source-backed popup command metadata lists `:keybindings` and
    `docs/features.md` lacks the corresponding read-only popup documentation
    anchor or command mention
- **THEN** docs drift validation fails with an actionable message identifying
    the missing keybindings command coverage

#### Scenario: Keybindings command missing from finite parser fails validation

- **WHEN** source-backed popup command metadata lists `:keybindings`
- **THEN** automated validation verifies that the finite Ex parser supports
    `keybindings` with optional query syntax

#### Scenario: Keybindings command missing from tests fails validation

- **WHEN** runtime help, diagnostic metadata, or popup metadata references
    `:keybindings`
- **THEN** automated validation verifies that at least one test anchor covers
    parser/runtime popup behavior and one test anchor covers docs or metadata
    drift

#### Scenario: Keybindings non-goals stay documented

- **WHEN** user-facing docs describe `:keybindings`
- **THEN** docs state that it is finite read-only discovery and does not
    provide runtime `:map`, recursive mappings, Vimscript, a command palette,
    or plugin dispatch

#### Scenario: Keybinding catalog references registry-backed actions

- **WHEN** keybindings popup output references `pi-vim.*` diagnostic/help
    metadata IDs
- **THEN** automated validation verifies that those IDs remain backed by the
    appropriate source registry and docs anchors

### Requirement: Runtime help registry owns drift anchors

Runtime help drift validation SHALL read docs, spec, and test anchors for
runtime help entries from the runtime help registry instead of a separate
test-support metadata table.

#### Scenario: Registry entry supplies drift anchors

- **WHEN** a source-backed runtime help entry is included in drift validation
- **THEN** its required docs anchor, spec anchor, and test anchor are
    available from the runtime help registry entry or an explicit registry-owned
    exception

#### Scenario: Docs drift validation reads one runtime help source

- **WHEN** docs drift tests validate runtime help command coverage
- **THEN** they read runtime help entry IDs and drift anchors from the runtime
    help registry rather than joining registry IDs to a separate runtime docs
    metadata table

#### Scenario: Missing registry-owned docs anchor fails validation

- **WHEN** a runtime help registry entry names a required `docs/features.md`
    anchor that is absent
- **THEN** docs drift validation fails with an actionable message naming the
    entry and missing anchor

#### Scenario: Missing registry-owned spec or test anchor fails validation

- **WHEN** a runtime help registry entry lacks a required OpenSpec spec anchor
    or test anchor without an explicit registry-owned exception
- **THEN** docs drift validation fails before the change is considered complete

#### Scenario: Runtime help output remains unchanged

- **WHEN** `:help`, `:messages`, or keybinding discovery output
    is exercised after anchor co-location
- **THEN** user-facing runtime help behavior remains finite, source-backed,
    and unchanged except for validation source ownership

### Requirement: Drift guard validates read-only popup documentation

The project SHALL validate that generic read-only popup runtime output,
keybinding popup output, source-backed metadata, specs, tests, and user-facing
docs stay aligned.

#### Scenario: Popup docs anchor missing fails validation

- **WHEN** read-only popup source metadata, keybinding popup source metadata,
    or runtime-help entry references a user-facing docs anchor and
    `docs/features.md` lacks that anchor
- **THEN** the docs drift guard fails with an actionable message identifying
    the missing popup docs anchor

#### Scenario: Popup non-goals stay documented

- **WHEN** user-facing docs describe the read-only Ex popup or keybinding
    discovery popup
- **THEN** docs state that the popup is finite and does not provide full Vim
    help tags, a command palette, runtime `:map`, runtime `:action`, recursive
    mappings, plugin API, or diagnostic/help action keybinding dispatch

### Requirement: Runtime help names the dedicated keybindings command

Runtime help SHALL identify `:keybindings` as the dedicated source-backed
keybinding discovery entry point.

#### Scenario: General help lists keybindings entry point

- **WHEN** the editor displays general runtime help
- **THEN** the output names `:keybindings` as a finite read-only popup command
    for effective keybinding discovery

#### Scenario: Unsupported mapping queries remain finite

- **WHEN** runtime help receives unsupported mapping-oriented queries such as
    `vimscript mappings`, `runtime map`, or `nmap`
- **THEN** it returns finite no-match output and does not imply full Vim
    mapping support
