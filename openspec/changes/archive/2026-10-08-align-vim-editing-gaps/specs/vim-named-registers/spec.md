## ADDED Requirements

### Requirement: Register prefixes reach counted and multi-key operator targets

The Vim editor SHALL keep a pending register prefix while the following keys
are still a count, an operator, or an operator target, and SHALL apply the
register when the resulting yank, delete, change, or paste runs. As in Vim, a
command that does not use registers runs normally and consumes the prefix.

#### Scenario: Register prefix before a text-object delete

- **WHEN** the prompt is `alpha beta` with the cursor on `beta` and the user
    types `"adiw`
- **THEN** the prompt becomes `alpha` plus its trailing space, and named
    register `a` holds `beta`

#### Scenario: Register prefix before a count

- **WHEN** the prompt has three lines and the user types `"a2yy` on the first
    line
- **THEN** named register `a` holds the first two lines linewise

#### Scenario: Register prefix before a character-search target

- **WHEN** the prompt is `ab,c` with the cursor on `a` and the user types
    `"adt,`
- **THEN** the prompt becomes `,c` and named register `a` holds `ab`

#### Scenario: Register prefix before a counted command

- **WHEN** the prompt is `abc` with the cursor on `a` and the user types
    `"a2x`
- **THEN** the prompt becomes `c` and named register `a` holds `ab`

#### Scenario: Register prefix before a motion is ignored

- **WHEN** the user types `"aj` on the first of two lines
- **THEN** the cursor moves to the second line and the register prefix is
    cleared, so a later `yy` does not write register `a`

#### Scenario: Register prefix before a case operator is ignored

- **WHEN** the prompt is `abc def` with the cursor on `a` and the user types
    `"agUiw`
- **THEN** the prompt becomes `ABC def` and named register `a` is unchanged
