## MODIFIED Requirements

### Requirement: Runtime help is finite and source-backed

The Vim editor SHALL provide finite runtime help that describes supported
pi-vimmode behavior and explicit limitations without implying full Vim or Neovim
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
    help metadata that includes supported pi-vimmode behavior and at least one
    relevant limitation when the topic has known limits

#### Scenario: Unknown help topic is rejected without parity fallback

- **WHEN** the editor executes `:help vimscript` or another topic that has no
    supported help entry
- **THEN** the editor shows a transient no-match message and does not fall
    back to Vim help tags, Vimscript documentation, or external files

### Requirement: Drift guard validates read-only Ex popup command coverage

The project SHALL validate that source-backed runtime help, diagnostic action
metadata, user docs, specs, and tests agree on which read-only Ex commands open
the generic popup.

#### Scenario: Popup command missing from docs fails validation

- **WHEN** source-backed popup metadata lists a read-only Ex command such as
    `:help`, `:keybindings`, `:keymap`, `:mapcheck`, `:messages`,
    `:vimmode inspect`, or `:vimdoctor` and `docs/features.md` lacks the
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
