## ADDED Requirements

### Requirement: Leaving insert mode moves the cursor left

The Vim editor SHALL move the cursor one character left when it leaves insert
mode through `Esc` or a configured escape alias, unless the cursor is at the
start of its line, as Vim does. Block insert and autocomplete handling keep
their own cursor behavior.

#### Scenario: Escape after appending at line end

- **WHEN** the prompt is `hello`, the user presses `A`, types `!`, and presses
    `Esc`
- **THEN** the editor is in normal mode with the cursor on `!`

#### Scenario: Escape at line start keeps the column

- **WHEN** the cursor is at the start of a line in insert mode and the user
    presses `Esc`
- **THEN** the editor is in normal mode with the cursor still at the start of
    that line

#### Scenario: Escape alias moves the cursor left

- **WHEN** `piVim.keymap.escape` includes `<D-j>`, the cursor is after `abc`
    in insert mode, and the user presses `<D-j>`
- **THEN** the editor is in normal mode with the cursor on `c`

#### Scenario: Wide characters are not split

- **WHEN** the cursor is right after an emoji in insert mode and the user
    presses `Esc`
- **THEN** the cursor lands on the start of that emoji
