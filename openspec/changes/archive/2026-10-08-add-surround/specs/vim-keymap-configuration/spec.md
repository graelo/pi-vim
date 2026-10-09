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

A binding that starts with a bound operator sequence and continues with keys
that are not a target of that operator SHALL coexist with the operator: it is
neither rejected as a strict-prefix conflict nor removed by an explicit binding
of the operator, and vice versa. Other bindings keep the existing conflict and
precedence rules.

#### Scenario: Count and target keys are not extensions

- **WHEN** a binding continues an operator sequence with a count, motion,
    text-object kind, character-search, search, mark, or line-form key
- **THEN** it is not treated as an operator extension

#### Scenario: Default extensions coexist with their operators

- **WHEN** default bindings are active
- **THEN** `ys`, `ds`, and `cs` resolve to surround actions while `yiw`, `yy`,
    `dw`, `dd`, `ciw`, and `cc` keep their existing meaning

#### Scenario: Explicit extension keeps its operator

- **WHEN** settings explicitly bind `deleteSurround` to `ds`
- **THEN** the `d` operator stays bound and no warning is recorded

#### Scenario: Binding that shadows an operator target is not an extension

- **WHEN** settings bind a command to `dw` in the same layer as the `d`
    operator
- **THEN** the command is rejected with a strict-prefix conflict warning and
    `dw` still deletes a word

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
