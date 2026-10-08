## ADDED Requirements

### Requirement: Sentence motions participate in semantic keymap configuration

The Vim keymap configuration SHALL expose `sentenceBackward` (default `(`)
and `sentenceForward` (default `)`) as semantic motion actions, included in
the default operator-motion list of every motion-capable operator.

#### Scenario: Default sentence motion keymap is available

- **WHEN** Pi starts with no `piVim.keymap` setting
- **THEN** the resolved keymap binds `sentenceBackward` to `(` and
    `sentenceForward` to `)`, and `d)` deletes to the next sentence start

#### Scenario: Configured sentence motion key is used

- **WHEN** `piVim.keymap.motions.sentenceForward` or
    `piVim.keymap.motions.sentenceBackward` is set to a valid key sequence
- **THEN** that key performs the matching sentence motion in normal and
    visual modes and after operators

#### Scenario: Omitted sentence operator motion is disabled safely

- **WHEN** an explicit `piVim.keymap.operatorMotions.delete` list omits
    `sentenceForward`
- **THEN** `d)` clears the pending operator and leaves prompt text unchanged

### Requirement: Sentence text object participates in semantic keymap configuration

The Vim keymap configuration SHALL expose `sentence` as a text-object target,
default `s`, so `is` and `as` select sentences.

#### Scenario: Default sentence text object target is available

- **WHEN** Pi starts with no `piVim.keymap` setting
- **THEN** the resolved keymap binds `textObjects.targets.sentence` to `s`

#### Scenario: Configured sentence text object target is used

- **WHEN** `piVim.keymap.textObjects.targets.sentence` is set to a valid key
    sequence
- **THEN** pending operator text-object resolution uses that key as the
    sentence target

#### Scenario: Surround commands are unaffected

- **WHEN** the user presses `ds(` or `cs"'` with default keys
- **THEN** the surround commands run as before; the `s` target only applies
    after a text-object kind key such as `i` or `a`
