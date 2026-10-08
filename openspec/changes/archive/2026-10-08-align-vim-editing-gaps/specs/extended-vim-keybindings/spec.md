## ADDED Requirements

### Requirement: Paste accepts a count

The Vim editor SHALL paste `count` copies for `p` and `P` in normal mode, from
the unnamed, named, or clipboard register: charwise copies are joined, and
linewise copies are stacked as lines.

#### Scenario: Counted charwise paste

- **WHEN** the unnamed register holds `ab`, the prompt is `-` with the cursor
    on `-`, and the user types `3p`
- **THEN** the prompt becomes `-ababab` with the cursor on the last `b`

#### Scenario: Counted linewise paste

- **WHEN** the unnamed register holds the line `x`, the prompt is `a` and `b`
    on two lines with the cursor on `a`, and the user types `2P`
- **THEN** two `x` lines are inserted above `a`

## MODIFIED Requirements

### Requirement: Operators support prompt text objects

The Vim editor SHALL support operator targets for inner and around word, inner
and around WORD, quote text objects, and bracket text objects, with Vim's
ranges:

- a word is a run of keyword characters (`A-Z`, `a-z`, `0-9`, `_`), a run of
  other non-blank characters, or a run of blanks, within one line;
- a WORD is a run of non-blank characters or a run of blanks, within one line;
- `aw` and `aW` add the blanks after the word, or the blanks before it when
  there are none after; on blanks they select the blanks and the following
  word;
- quotes (`"`, `'`, and backticks) pair up from the start of the line when the
    cursor is on a quote; otherwise the nearest quote before the cursor opens
    the string and the next one closes it, and when there is none before, the
    first quoted string after the cursor is used; quotes escaped with a
    backslash are skipped; `a"` and `a'` add trailing blanks, or leading blanks
    when there are none trailing;
- a cursor on either bracket of a pair selects that pair.

#### Scenario: Change inner word

- **WHEN** the editor is in normal mode with the cursor inside a word and the
    user presses `ciw`
- **THEN** the word contents are removed, copied to the unnamed character
    register, and the editor enters insert mode

#### Scenario: Inner word stops at punctuation

- **WHEN** the prompt is `say "world"` with the cursor on `w` and the user
    presses `diw`
- **THEN** the prompt becomes `say ""`

#### Scenario: Inner word on blanks selects the blanks

- **WHEN** the prompt is `a   b` with the cursor on the second character and
    the user presses `diw`
- **THEN** the prompt becomes `ab`

#### Scenario: Inner WORD spans punctuation

- **WHEN** the prompt is `say "world"` with the cursor on `w` and the user
    presses `diW`
- **THEN** the prompt becomes `say` with its trailing space

#### Scenario: Delete around word

- **WHEN** the editor is in normal mode with the cursor inside or adjacent to
    a word and the user presses `daw`
- **THEN** the word plus its text-object boundary whitespace is removed and
    copied to the unnamed character register

#### Scenario: Change inner quotes

- **WHEN** the editor is in normal mode with the cursor inside a double-quoted
    phrase and the user presses `ci"`
- **THEN** the quoted contents are removed, the surrounding quote characters
    remain, the removed text is copied to the unnamed character register, and
    the editor enters insert mode

#### Scenario: Cursor on the opening quote

- **WHEN** the prompt is `x "hi" y` with the cursor on the first `"` and the
    user presses `di"`
- **THEN** the prompt becomes `x "" y`

#### Scenario: Cursor before the first quoted string

- **WHEN** the prompt is `say "hi"` with the cursor on `s` and the user
    presses `di"`
- **THEN** the prompt becomes `say ""`

#### Scenario: Escaped quotes are skipped

- **WHEN** the prompt is `"a\"b"` with the cursor on `a` and the user presses
    `di"`
- **THEN** the prompt becomes `""`

#### Scenario: Around quotes includes trailing blanks

- **WHEN** the prompt is `x "hi" y` with the cursor on `h` and the user
    presses `da"`
- **THEN** the prompt becomes `x y`

#### Scenario: Yank around brackets

- **WHEN** the editor is in normal mode with the cursor inside a
    parenthesized, bracketed, or braced range and the user presses the yank
    operator followed by the matching around-object target
- **THEN** the enclosing delimiters and contents are copied to the unnamed
    character register without changing prompt text

#### Scenario: Cursor on the closing bracket

- **WHEN** the prompt is `f(a) x` with the cursor on `)` and the user presses
    `di(`
- **THEN** the prompt becomes `f() x`

#### Scenario: Missing text object target is safe

- **WHEN** the editor is in normal mode with a pending operator and the
    requested text object does not exist around the cursor
- **THEN** prompt text, cursor position, registers, and mode are unchanged,
    and pending operator state clears

### Requirement: Operators support line-local character search targets

The Vim editor SHALL allow motion-capable normal-mode operators to target
current-line character search commands using the resolved `findCharForward`,
`findCharBackward`, `tillCharForward`, and `tillCharBackward` bindings.

#### Scenario: Delete through forward character search target

- **WHEN** the editor is in normal mode and the user presses `df)` while a
    later `)` exists on the current line
- **THEN** text from the cursor through that `)` is removed, copied to the
    unnamed character register, and the editor remains in normal mode

#### Scenario: Delete until forward character search target

- **WHEN** the editor is in normal mode and the user presses `dt,` while a
    later `,` exists on the current line after at least one intervening
    character
- **THEN** text from the cursor up to but not including that `,` is removed,
    copied to the unnamed character register, and the editor remains in normal
    mode

#### Scenario: Delete until an adjacent character

- **WHEN** the editor is in normal mode and the user presses `dt,` while the
    next character is `,`
- **THEN** the character under the cursor is removed and copied to the
    unnamed character register, as in Vim

#### Scenario: Change through backward character search target

- **WHEN** the editor is in normal mode and the user presses `cF:` while an
    earlier `:` exists on the current line
- **THEN** text from that `:` up to but not including the cursor is removed,
    copied to the unnamed character register, and the editor enters insert
    mode at the removed range start

#### Scenario: Yank until backward character search target

- **WHEN** the editor is in normal mode and the user presses `yT[` while an
    earlier `[` exists on the current line before at least one intervening
    character
- **THEN** text after that `[` up to but not including the cursor is copied
    to the unnamed character register without changing prompt text or mode

#### Scenario: Counted operator character search target

- **WHEN** the editor is in normal mode and the user presses `d2f,` while at
    least two later `,` characters exist on the current line
- **THEN** text from the cursor through the second later `,` is removed and
    copied to the unnamed character register

#### Scenario: Empty till range is safe

- **WHEN** the editor is in normal mode and the user presses `dT,` while the
    previous character is `,`
- **THEN** prompt text, cursor position, registers, and mode are unchanged,
    and pending operator state clears

#### Scenario: Missing character search target is safe

- **WHEN** the editor is in normal mode with a pending delete, change, or yank
    operator and the requested character search target does not exist in the
    addressed direction on the current line
- **THEN** prompt text, cursor position, registers, and mode are unchanged,
    and pending operator state clears

#### Scenario: Successful operator character search updates repeat state

- **WHEN** a delete or change operator successfully uses a character search
    target and the user later presses `.` in normal mode at another valid
    location
- **THEN** the same operator character-search change is applied again using
    the recorded target command and character

#### Scenario: Successful operator character search updates last character search

- **WHEN** an operator successfully uses `f`, `F`, `t`, or `T` with a target
    character
- **THEN** subsequent `;` and `,` commands repeat that character search using
    the same rules as a normal-mode character search

#### Scenario: Operators target repeated character search

- **WHEN** a previous character search exists and the user presses `d;`, `c,`,
    or `y;` in normal mode
- **THEN** the operator uses the repeated character-search target, with
    delete/change writing the unnamed character register and change entering
    insert mode on a changed range
