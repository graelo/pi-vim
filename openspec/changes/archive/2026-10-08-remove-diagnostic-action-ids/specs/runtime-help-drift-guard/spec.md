## MODIFIED Requirements

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

## REMOVED Requirements

### Requirement: Drift guard validates diagnostic action metadata

**Reason**: The diagnostic action registry is removed, so there is no
metadata left to validate.
**Migration**: None; popup command coverage is still validated.

### Requirement: Runtime help topics classify diagnostic action metadata

**Reason**: The `pi-vim.*` IDs are removed; `:help diagnostics` shows the
runtime help entry for the diagnostics category instead.
**Migration**: Use `:help diagnostics` or `:help customization`.
