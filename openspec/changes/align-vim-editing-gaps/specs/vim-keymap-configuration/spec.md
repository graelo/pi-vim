## ADDED Requirements

### Requirement: WORD text object participates in semantic keymap configuration

The Vim keymap configuration SHALL expose `bigWord` as a text-object target,
default `W`, so `iW` and `aW` select whitespace-delimited WORDs.

#### Scenario: Default WORD text object target is available

- **WHEN** Pi starts with no `piVim.keymap` setting
- **THEN** the resolved keymap binds `textObjects.targets.bigWord` to `W`

#### Scenario: Configured WORD text object target is used

- **WHEN** `piVim.keymap.textObjects.targets.bigWord` is set to a valid key
    sequence
- **THEN** pending operator text-object resolution uses that key as the WORD
    target
