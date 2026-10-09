# Spec Delta

## MODIFIED Requirements

### Requirement: Read-only Ex popup overlay is bounded and adapter-owned

The Vim editor SHALL display read-only Ex help and diagnostic output through a
bounded overlay owned by the Pi adapter rather than by prompt render rows.

#### Scenario: Read-only output is not appended to editor render rows

- **WHEN** a read-only Ex command such as `:help`, `:keybindings`, `:actions`,
    `:keymap`, `:mapcheck`, `:messages`, `:vimmode inspect`, or `:vimdoctor`
    completes successfully on a terminal that can show the overlay
- **THEN** the main editor render output remains focused on the
    prompt/status/workbench surface and the read-only command body appears in a
    centered bounded overlay

#### Scenario: Overlay close controls are local

- **WHEN** the read-only popup is visible and the user presses `Esc`,
    `Ctrl-C`, or `Ctrl-G`
- **THEN** the popup closes without editing prompt text, moving the prompt
    cursor, changing registers, changing marks, changing macros, changing search
    state, updating dot-repeat, or delegating those keys to Pi prompt editing

#### Scenario: Overlay scroll controls are local

- **WHEN** the read-only popup content overflows and the user presses `j`,
    `k`, Down, or Up
- **THEN** the popup scrolls within clamped bounds without editing prompt text
    or moving the prompt cursor

#### Scenario: Too-small viewport uses bounded fallback

- **WHEN** a valid read-only Ex command completes but the terminal cannot fit
    the minimum supported overlay viewport
- **THEN** the editor provides bounded visible feedback that the popup cannot
    be shown at the current size without silently dropping the command result or
    corrupting prompt editing state
