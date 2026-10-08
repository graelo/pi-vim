## ADDED Requirements

### Requirement: Surround actions participate in semantic keymap configuration

The Vim editor SHALL expose surround as semantic actions configurable through
`piVim.keymap`:

- operator `surround`, default `ys`, in normal mode only;
- command `deleteSurround`, default `ds`, in normal mode;
- command `changeSurround`, default `cs`, in normal mode;
- command `surroundSelection`, default `S`, in the visual modes only.

`piVim.keymap.operatorMotions.surround` SHALL control which motions the
surround operator accepts, with the same default allow-list as `yank`.

#### Scenario: Default surround keymap is available

- **WHEN** Pi starts with no `piVim.keymap` setting
- **THEN** the resolved keymap binds `surround` to `ys`, `deleteSurround` to
    `ds`, `changeSurround` to `cs`, and `surroundSelection` to `S` in visual
    modes

#### Scenario: Normal-mode S keeps its meaning

- **WHEN** the editor is in normal mode with default bindings and the user
    types `S`
- **THEN** `substituteLine` runs, not visual surround

#### Scenario: Configured surround operator works

- **WHEN** `piVim.keymap.operators.surround` is set to `gs` and the user types
    `gsiw)` in normal mode
- **THEN** the word under the cursor is wrapped in parentheses

#### Scenario: Surround can be unbound

- **WHEN** `piVim.keymap.commands.deleteSurround` is set to `[]`
- **THEN** `ds` no longer deletes surrounding pairs, and `d` followed by `s`
    behaves as an unsupported operator target

#### Scenario: Invalid surround binding falls back safely

- **WHEN** a surround keymap entry contains an unsupported type, a protected
    key, or a conflicting key sequence
- **THEN** the invalid field is ignored, a warning is recorded, and sibling
    keymap fields remain usable

#### Scenario: Live editor uses configured surround binding

- **WHEN** a live `VimEditor` is constructed with resolved keymap options that
    include a configured surround binding
- **THEN** the editor uses that binding without dropping other command,
    motion, operator, macro, mark, search, or UI options

### Requirement: Bindings may extend an operator sequence

A binding whose key sequence starts with a complete bound operator sequence in
the same mode SHALL NOT be rejected as a strict-prefix conflict with that
operator, provided the remaining keys are not a motion, text-object kind,
character-search, search, mark, or line-form target of that operator. When the
remaining keys are such a target, the extending binding SHALL be rejected with
a warning and the operator grammar SHALL keep its meaning. Other strict-prefix
conflicts SHALL still be rejected.

#### Scenario: Default extensions coexist with their operators

- **WHEN** default bindings are active
- **THEN** `ys`, `ds`, and `cs` resolve to surround actions while `yiw`, `yy`,
    `dw`, `dd`, `ciw`, and `cc` keep their existing meaning

#### Scenario: Extension that shadows an operator target is rejected

- **WHEN** a command is bound to `dw`
- **THEN** that binding is rejected with a warning and `dw` still deletes a
    word

#### Scenario: Non-operator strict prefixes are still rejected

- **WHEN** one command is bound to `x` and another to `xy`
- **THEN** the longer binding is rejected with a strict-prefix conflict
    warning, as before

### Requirement: Multi-key operators accept the last-key line form

A multi-key operator SHALL treat its sequence followed by its own last key as
the line form, as Vim does for `guu`, `gUU`, and `g~~`, in addition to the
doubled sequence. Single-key operators keep their doubled line form.

#### Scenario: Case operator last-key line form

- **WHEN** the cursor line is `Hello` and the user types `guu`
- **THEN** the line becomes `hello`

#### Scenario: Doubled line form still works

- **WHEN** the cursor line is `Hello` and the user types `gUgU`
- **THEN** the line becomes `HELLO`

#### Scenario: Surround line form follows the rule

- **WHEN** `piVim.keymap.operators.surround` is set to `gs` and the user types
    `gss)`
- **THEN** the cursor line content is wrapped in parentheses
