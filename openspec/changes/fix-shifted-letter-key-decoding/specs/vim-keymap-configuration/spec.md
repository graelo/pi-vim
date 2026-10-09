# Spec Delta

## ADDED Requirements

### Requirement: Shift+letter input resolves to the uppercase key

The Vim editor SHALL resolve Shift+letter input to the uppercase letter
before keymap matching, whatever terminal encoding delivers it: a plain
uppercase character, a Kitty CSI-u event with or without the shifted-key
field, or an xterm modifyOtherKeys event.

#### Scenario: Kitty event without shifted key

- **WHEN** the editor is in normal mode on `abcd` with the cursor on `c` and
    receives `CSI 120;2u`
- **THEN** the input resolves to `X`, the prompt becomes `acd`, and the
    unnamed register holds `b`

#### Scenario: modifyOtherKeys event

- **WHEN** the editor is in normal mode on `abcd` with the cursor on `c` and
    receives `CSI 27;2;88~` or `CSI 27;2;120~`
- **THEN** the input resolves to `X` and the prompt becomes `acd`

#### Scenario: Character targets receive the uppercase letter

- **WHEN** a pending character target such as `f` or `r` receives a
    Shift+letter event in any of these encodings
- **THEN** the target is the uppercase letter

#### Scenario: Unshifted input is unchanged

- **WHEN** the editor receives a plain lowercase letter or a Kitty event
    without the Shift modifier
- **THEN** the input resolves to the lowercase letter as before
