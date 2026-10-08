# vim-surround Specification

## Purpose

Add, delete, and change the pair of characters around prompt text, with the
keys and pair rules of vim-surround, in normal and visual modes.

## Requirements

### Requirement: Surround operator wraps a motion or text-object target

The Vim editor SHALL provide a surround operator, bound to `ys` by default,
that accepts the same motion, text-object, and character-search targets as
other motion operators, then reads one surround character and wraps the
addressed text with the pair that character selects. For a characterwise
target, trailing whitespace in the addressed text SHALL stay outside the pair.

#### Scenario: Wrap a word with a text object

- **WHEN** the prompt is `say hello world`, the cursor is on `hello` in normal
    mode, and the user types `ysiw)`
- **THEN** the prompt becomes `say (hello) world` and the cursor is on the
    inserted `(`

#### Scenario: Wrap a motion target without its trailing space

- **WHEN** the prompt is `hello world`, the cursor is on `h`, and the user
    types `ysw"`
- **THEN** the prompt becomes `"hello" world`

#### Scenario: Wrap up to a character-search target

- **WHEN** the prompt is `call ab, c`, the cursor is on `a`, and the user types
    `yst,]`
- **THEN** the prompt becomes `call [ab], c`

#### Scenario: Wrap with a prompt-native text object

- **WHEN** the cursor is inside a Markdown list item and the user types
    `ysil` followed by a surround character
- **THEN** the list item text addressed by `il` is wrapped with that pair

#### Scenario: Unsupported target is a safe no-op

- **WHEN** the user types `ys` followed by a key that is not a motion,
    text-object, character-search, or line-form key
- **THEN** the pending operator clears, the prompt is unchanged, and the key is
    not inserted

### Requirement: Surround line form wraps the line content

The Vim editor SHALL treat `yss{char}` as a characterwise surround from the
first non-blank character of the cursor line to the end of that line. A count
`N` SHALL extend the target to the end of the `N`th line, counting the cursor
line as the first.

#### Scenario: Wrap the current line

- **WHEN** the cursor line is `fix the bug` and the user types `yss)`
- **THEN** the line becomes `(fix the bug)`

#### Scenario: Wrap several lines inline

- **WHEN** the cursor is on the first of the lines `one` and `two` and the
    user types `2yss"`
- **THEN** the text becomes `"one` and `two"`, with the line break kept between
    them

### Requirement: Linewise targets place the pair on their own lines

When the surround target is linewise, such as `j`, `k`, or the `ip` text
object, the Vim editor SHALL insert the opening character on a new line before
the first addressed line and the closing character on a new line after the last
addressed line, without reindenting the addressed lines.

#### Scenario: Wrap a paragraph

- **WHEN** the cursor is in a paragraph of lines `a` and `b` and the user
    types `ysip}`
- **THEN** the paragraph becomes the four lines `{`, `a`, `b`, `}`

### Requirement: Surround characters select pairs like vim-surround

The Vim editor SHALL map the surround character to a pair with the rules of
vim-surround: opening brackets add inner spaces, closing brackets and their
letter aliases do not, and quotes and other punctuation wrap with the same
character on both ends. Letters, digits, whitespace, `<`, and non-printable
keys SHALL be rejected.

#### Scenario: Opening character adds inner spaces

- **WHEN** the user types `ysiw` followed by `(`, `{`, or `[` on the word `x`
- **THEN** the word becomes `( x )`, `{ x }`, or `[ x ]`

#### Scenario: Closing character adds no inner space

- **WHEN** the user types `ysiw` followed by `)`, `}`, `]`, or `>` on the word
    `x`
- **THEN** the word becomes `(x)`, `{x}`, `[x]`, or `<x>`

#### Scenario: Alias selects a pair

- **WHEN** the user types `ysiw` followed by `b`, `B`, `r`, or `a` on the word
    `x`
- **THEN** the word becomes `(x)`, `{x}`, `[x]`, or `<x>`

#### Scenario: Quotes and punctuation wrap symmetrically

- **WHEN** the user types `ysiw` followed by `"`, `'`, a backtick, or `*` on
    the word `x`
- **THEN** that character is added before and after `x`

#### Scenario: Rejected character is a safe no-op

- **WHEN** the editor is waiting for a surround character and the user types
    a letter that is not an alias, a digit, a space, or `<`
- **THEN** the pending surround clears, the prompt is unchanged, and the key is
    not inserted

#### Scenario: Esc cancels a pending surround

- **WHEN** the editor is waiting for a surround character or a `ds`/`cs`
    target and the user presses Esc
- **THEN** the pending surround clears, the editor stays in normal mode, and
    the prompt is unchanged

### Requirement: Visual surround wraps the selection

The Vim editor SHALL provide visual surround, bound to `S` in visual modes by
default. In characterwise visual mode it SHALL wrap the selected characters
inline. In linewise visual mode it SHALL place the pair on their own lines like
a linewise target. In both cases the editor SHALL return to normal mode.
Visual block surround SHALL be a safe no-op.

#### Scenario: Characterwise selection

- **WHEN** `hello` is selected in characterwise visual mode and the user types
    `S'`
- **THEN** the selection becomes `'hello'` and the editor is in normal mode

#### Scenario: Linewise selection

- **WHEN** the lines `a` and `b` are selected in linewise visual mode and the
    user types `S)`
- **THEN** the lines become `(`, `a`, `b`, `)`

#### Scenario: Visual block selection is unchanged

- **WHEN** a visual block selection is active and the user types `S)`
- **THEN** the prompt is unchanged and the editor returns to normal mode

### Requirement: Delete surround removes the nearest pair

The Vim editor SHALL provide delete surround, bound to `ds` by default, that
reads one target character and removes the nearest pair of that kind around
the cursor. An opening-bracket target SHALL also remove whitespace just inside
each end of the pair. The cursor SHALL move to where the opening character
was.

#### Scenario: Delete parentheses

- **WHEN** the prompt is `f(a, b)` with the cursor on `a` and the user types
    `ds)`
- **THEN** the prompt becomes `fa, b`

#### Scenario: Bracket targets and aliases

- **WHEN** the user types `ds` followed by `b`, `B`, `r`, or `a`, or by either
    character of `()`, `{}`, `[]`, or `<>`
- **THEN** the nearest enclosing pair of that bracket kind is removed, even
    when it spans lines or contains nested pairs

#### Scenario: Opening target trims inner whitespace

- **WHEN** the prompt is `( a )` with the cursor on `a` and the user types
    `ds(`
- **THEN** the prompt becomes `a`

#### Scenario: Delete quotes

- **WHEN** the prompt is `say "hi" now` with the cursor on `h` and the user
    types `ds"`
- **THEN** the prompt becomes `say hi now`

#### Scenario: Quote and punctuation pairs follow Vim quote pairing

- **WHEN** the target is a quote or other punctuation character
- **THEN** the pair is found as Vim's quote text objects find it: with the
    cursor on that character, occurrences pair up from the start of the line;
    otherwise the nearest occurrence before the cursor opens the pair, or the
    first pair after the cursor is used when there is none before

#### Scenario: Cursor on the opening quote

- **WHEN** the prompt is `"hi"` with the cursor on the first `"` and the user
    types `cs"'`
- **THEN** the prompt becomes `'hi'`

#### Scenario: Missing pair is a safe no-op

- **WHEN** no pair matching the target surrounds the cursor
- **THEN** the prompt is unchanged and the pending surround clears

### Requirement: Change surround replaces the nearest pair

The Vim editor SHALL provide change surround, bound to `cs` by default, that
reads a target character with the same rules as delete surround and then a
replacement character with the same rules as the surround operator, and
replaces the nearest pair. An opening-bracket target SHALL trim inner
whitespace before the replacement pair is applied.

#### Scenario: Change quotes

- **WHEN** the prompt is `"hi"` with the cursor on `h` and the user types
    `cs"'`
- **THEN** the prompt becomes `'hi'`

#### Scenario: Change brackets and add spaces

- **WHEN** the prompt is `[x]` with the cursor on `x` and the user types
    `cs]{`
- **THEN** the prompt becomes `{ x }`

#### Scenario: Rejected replacement keeps the pair

- **WHEN** the user types `cs"` followed by a rejected replacement character
- **THEN** the prompt is unchanged and the pending surround clears

### Requirement: Surround supports counts

The Vim editor SHALL apply counts to surround like Vim: a count before `ys` or
inside its target multiplies the motion or text-object count, and a count
before `ds` or `cs` selects the `N`th enclosing bracket pair. Counts on quote
and punctuation targets of `ds` and `cs` SHALL be ignored.

#### Scenario: Count on the motion

- **WHEN** the prompt is `a b c` with the cursor on `a` and the user types
    `ys2w)`
- **THEN** the prompt becomes `(a b) c`

#### Scenario: Count selects an outer pair

- **WHEN** the prompt is `(a (b))` with the cursor on `b` and the user types
    `2ds)`
- **THEN** the prompt becomes `a (b)`

### Requirement: Surround edits repeat and undo as single changes

Each normal-mode surround that changes the prompt SHALL be one undo step and
SHALL be recorded as the last repeatable change, including its surround and
target characters, so `.` repeats it at the cursor. Visual surround SHALL not
replace the last repeatable change. Surround SHALL never write the unnamed,
named, or clipboard registers.

#### Scenario: Undo a surround

- **WHEN** the user types `ysiw)` and then `u`
- **THEN** the prompt returns to its text before the surround in one step

#### Scenario: Repeat a surround

- **WHEN** the user types `ysiw"` on one word, moves to another word, and
    presses `.`
- **THEN** the second word is wrapped in double quotes

#### Scenario: Repeat a change surround

- **WHEN** the user types `cs"'` inside one quoted string, moves inside another
    double-quoted string, and presses `.`
- **THEN** the second string's double quotes become single quotes

#### Scenario: Registers are unchanged

- **WHEN** the unnamed register holds `keep` and the user runs `ysiw)`,
    `ds)`, and `cs])`
- **THEN** the unnamed register still holds `keep`

### Requirement: Pending surround is visible

While the editor waits for a surround character or target, the pending
operator status item SHALL show the keys typed so far, as it does for other
pending operators.

#### Scenario: Pending display

- **WHEN** the pending operator status item is enabled and the user has typed
    `ysiw`
- **THEN** the status shows `ysiw` until the surround character is entered or
    the surround is cancelled

### Requirement: Surround is documented

The feature guide SHALL document `ys`, `yss`, `ds`, `cs`, and visual `S`, the
pair-character rules, counts, repeat, and the non-goals (tags, newline
variants, function surrounds, visual block). The settings reference SHALL list
the surround keymap entries.

#### Scenario: User reads the surround section

- **WHEN** a user opens `docs/features.md`
- **THEN** a surround section lists the keys, pair rules, and non-goals with
    examples
