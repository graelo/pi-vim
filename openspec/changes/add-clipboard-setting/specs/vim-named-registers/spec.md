# Spec Delta

## ADDED Requirements

### Requirement: Clipboard setting redirects unnamed register traffic

The Vim editor SHALL support a `clipboard` setting with values `none`,
`unnamed`, and `unnamedplus`. With `unnamed` or `unnamedplus`, yank, delete,
and change writes that target only the unnamed register SHALL also write the
`*` or `+` clipboard register mirror and request a host clipboard copy, and
unprefixed normal-mode paste SHALL read the host clipboard.

#### Scenario: Unprefixed yank copies to host clipboard

- **WHEN** `clipboard` is `unnamedplus`, the editor is in normal mode, and the
    user presses `yy`
- **THEN** the current line is copied to the unnamed register and to the `+`
    clipboard register mirror as linewise text, and one host clipboard copy is
    requested with that text

#### Scenario: Unnamed value uses the star register

- **WHEN** `clipboard` is `unnamed` and the user presses `yy`
- **THEN** the `*` clipboard register mirror receives the line and the host
    clipboard copy names register `*`

#### Scenario: Ex line commands without operands copy

- **WHEN** `clipboard` is `unnamedplus` and the editor executes `:%yank`
- **THEN** the unnamed register and `+` mirror receive the addressed lines and
    a host clipboard copy is requested

#### Scenario: Named, black-hole, and clipboard targets are unchanged

- **WHEN** `clipboard` is `unnamedplus` and the user presses `"ayy`, `"_dd`,
    or `"*yy`
- **THEN** `"ayy` writes only named register `a` and the unnamed register,
    `"_dd` writes no register, `"*yy` writes the `*` mirror with exactly one
    host copy request, and none of them write the `+` mirror

#### Scenario: Edits without register writes do not copy

- **WHEN** `clipboard` is `unnamedplus` and the user changes case with `gUiw`
- **THEN** no clipboard mirror is written and no host clipboard copy is
    requested

#### Scenario: Unprefixed paste reads host clipboard

- **WHEN** `clipboard` is `unnamedplus` and the user presses `p` in normal mode
- **THEN** the editor requests a host clipboard read for register `+`, falling
    back to the `+` mirror and then the unnamed register if the host read fails

#### Scenario: Named paste ignores the setting

- **WHEN** `clipboard` is `unnamedplus` and the user presses `"ap`
- **THEN** named register `a` is pasted without reading the host clipboard

#### Scenario: Default keeps registers prompt-local

- **WHEN** `clipboard` is `none` or absent and the user presses `yy` then `p`
- **THEN** no clipboard mirror is written, no host clipboard copy or read is
    requested, and `p` pastes the unnamed register

#### Scenario: Invalid clipboard value warns

- **WHEN** settings set `clipboard` to an unsupported value such as
    `unnamed,autoselect`
- **THEN** the value is ignored with a warning naming `clipboard`, and the
    inherited value stays in effect

### Requirement: Host clipboard paste keeps the type of the prompt's own copy

The Vim editor SHALL paste host clipboard text with the clipboard register
mirror's type when the host text equals the mirror text, and charwise
otherwise.

#### Scenario: Linewise yank round-trips through host clipboard

- **WHEN** the user presses `"+yy` on `one`, the host clipboard returns `one`,
    and the user presses `"+p`
- **THEN** `one` is pasted as a new line below the current line

#### Scenario: Foreign host text pastes charwise

- **WHEN** the host clipboard returns text that differs from the `+` mirror and
    the user presses `"+p`
- **THEN** the text is pasted charwise after the cursor and the `+` mirror is
    refreshed as charwise text
