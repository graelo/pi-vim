## ADDED Requirements

### Requirement: Prompt buffer exposes sentence navigation

The prompt buffer module SHALL expose pure, prompt-local sentence navigation
using Vim sentence boundaries, with blank lines acting as sentence boundaries.

#### Scenario: Forward sentence navigation

- **WHEN** caller requests forward sentence navigation from inside a sentence
    and a later sentence or blank line exists
- **THEN** the prompt buffer returns the position of the next sentence start
    or the first column of the blank line

#### Scenario: Backward sentence navigation

- **WHEN** caller requests backward sentence navigation
- **THEN** the prompt buffer returns the current sentence start, or the
    previous sentence start when the cursor is already at a sentence start

#### Scenario: Counted sentence navigation clamps

- **WHEN** caller requests counted sentence navigation past the available
    sentences
- **THEN** the prompt buffer clamps at the prompt start or prompt end

#### Scenario: Empty or blank prompt is safe

- **WHEN** caller requests sentence navigation on an empty prompt or one with
    only whitespace lines
- **THEN** the prompt buffer returns a normalized position and does not
    corrupt text

### Requirement: Prompt buffer owns operator ranges for sentence motions

The prompt buffer module SHALL resolve delete, change, and yank ranges for
sentence motions as exclusive characterwise ranges between the cursor and the
sentence target.

#### Scenario: Forward sentence operator range

- **WHEN** caller requests an operator range from inside a sentence through a
    forward sentence target
- **THEN** the prompt buffer returns the range from the cursor up to, but not
    including, the next sentence start

#### Scenario: Empty sentence operator range is safe

- **WHEN** the resolved sentence target equals the cursor position
- **THEN** the prompt buffer returns a no-op edit result or no register and
    does not corrupt prompt text

### Requirement: Prompt buffer resolves sentence text-object ranges

The prompt buffer module SHALL resolve inner and around sentence text-object
ranges using the same sentence model as sentence navigation.

#### Scenario: Inner sentence range

- **WHEN** caller requests an inner sentence range with the cursor inside a
    sentence
- **THEN** the prompt buffer returns the sentence from its first character
    through its last closing character, without surrounding blanks

#### Scenario: Around sentence range

- **WHEN** caller requests an around sentence range
- **THEN** the prompt buffer returns the inner range plus trailing blanks, or
    plus leading blanks when no trailing blanks exist before the line or
    paragraph end

#### Scenario: Sentence range on a blank line

- **WHEN** caller requests a sentence range on a whitespace-only line or an
    empty prompt
- **THEN** the prompt buffer returns no range
