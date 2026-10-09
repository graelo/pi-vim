# Spec Delta

## MODIFIED Requirements

### Requirement: Mark behavior is configurable

The Vim editor SHALL allow mark behavior to be configured with
`marks.enabled`, `marks.slots`, and mark prefix keys under
`keymap.marks`.

#### Scenario: Disable mark controls

- **WHEN** `marks.enabled` is `false`
- **THEN** mark set and jump controls are ignored as mark controls and do not
    set pending mark state

#### Scenario: Restrict mark slots

- **WHEN** `marks.slots` is configured to `["x"]`
- **THEN** only local mark slot `x` can be set or jumped to and other slot
    targets are ignored as invalid mark targets

#### Scenario: Remap mark prefix keys

- **WHEN** `keymap.marks` configures set, exact-jump, and line-jump
    prefix keys
- **THEN** configured keys replace the default `m`, backtick, and single-quote
    mark prefixes for normal, visual, and operator mark behavior

### Requirement: Actual editor honors mark configuration

The Vim editor SHALL preserve configured mark behavior from construction through
the actual `VimEditor` adapter.

#### Scenario: VimEditor honors disabled marks

- **WHEN** `VimEditor` is constructed with `marks.enabled` resolved
    to `false`
- **THEN** mark set and jump controls are ignored as mark controls in the live
    editor and do not set pending mark state

#### Scenario: VimEditor honors restricted mark slots

- **WHEN** `VimEditor` is constructed with `marks.slots` resolved to
    `["x"]`
- **THEN** only local mark slot `x` can be set or jumped to in the live editor
    and other slot targets are ignored as invalid mark targets
