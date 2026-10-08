## MODIFIED Requirements

### Requirement: Keybinding popup uses customization diagnostics vocabulary

The keybinding discovery popup SHALL describe bindings using the same finite
boundaries as existing customization diagnostics.

#### Scenario: Metadata-only diagnostic actions remain non-bindable

- **WHEN** the popup or `:keymap` search runs for a diagnostic command name
    such as `vimdoctor` or `pi-vim.doctor`
- **THEN** no `pi-vim.*` action row is shown and no diagnostic command is
    presented as a configurable keybinding target; the result is a bounded
    no-match message unless a configurable action matches the query

#### Scenario: Protected shortcuts remain protected

- **WHEN** the popup mentions protected Pi shortcuts or directs users to
    `:mapcheck <key>`
- **THEN** it preserves the protected shortcut catalog boundary and does not
    present protected Pi shortcuts as available pi-vim bindings

## REMOVED Requirements

### Requirement: Diagnostic action metadata preserves diagnostic command boundaries

**Reason**: The `pi-vim.*` diagnostic action IDs are removed.
**Migration**: Use the Ex commands directly; `:help customization` lists them.

### Requirement: Diagnostic help actions have metadata-only entries searchable through keymap

**Reason**: The IDs only restated existing Ex commands and cannot be bound.
**Migration**: Use `:help customization` or `:help diagnostics`.
