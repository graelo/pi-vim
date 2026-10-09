# Spec Delta

## MODIFIED Requirements

### Requirement: Macro controls and behavior are configurable

The editor SHALL allow users to configure macro control keys and macro behavior
while preserving Vim-compatible defaults.

#### Scenario: Configure macro record and play keys

- **WHEN** `keymap.macros.record` is configured to `m` and
    `keymap.macros.play` is configured to `r`
- **THEN** normal-mode `m{slot}` starts/stops recording and `r{slot}` / `rr`
    plays macros instead of the default `q` / `@` controls

#### Scenario: Disable macros

- **WHEN** `macros.enabled` is `false`
- **THEN** macro recording and playback controls are ignored as macro controls

#### Scenario: Restrict macro slots

- **WHEN** `macros.slots` is configured to `["x"]`
- **THEN** only macro slot `x` can be recorded or played and other slot
    targets are ignored as invalid macro targets

#### Scenario: Cap macro replay steps

- **WHEN** `macros.maxReplaySteps` is configured
- **THEN** macro playback replays at most that many stored input tokens for
    one invocation
