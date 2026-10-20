# Spec Delta

## MODIFIED Requirements

### Requirement: Normal mode searches word under cursor

The Vim editor SHALL support normal-mode word-under-cursor prompt search
commands that derive a complete Unicode-aware keyword-word query from the
current prompt cursor and use existing prompt search repeat state. A keyword
word is a contiguous run of Unicode alphabetic characters, decimal digits, and
`_`. A cursor on a keyword character uses that containing word; a cursor
immediately after a keyword word, including at line end, uses that preceding
word.

#### Scenario: Star searches current word forward

- **WHEN** the editor is in normal mode, the cursor is on a keyword word, and
    the user presses `*`
- **THEN** the cursor moves to the next wrapped complete keyword-word match
    and the last search is recorded with that query, forward direction, and
    keyword-word matcher mode

#### Scenario: Hash searches current word backward

- **WHEN** the editor is in normal mode, the cursor is on a keyword word, and
    the user presses `#`
- **THEN** the cursor moves to the previous wrapped complete keyword-word
    match and the last search is recorded with that query, backward direction,
    and keyword-word matcher mode

#### Scenario: Star treats accented characters as keyword characters

- **WHEN** the editor is on `création` and the prompt also contains another
    standalone `création`
- **THEN** pressing `*` uses `création` as one query and moves to the
    standalone match

#### Scenario: Word search excludes embedded keyword matches

- **WHEN** the editor searches `création` with `*` or `#` and the prompt also
    contains `recréation`
- **THEN** the embedded occurrence in `recréation` is not a match

#### Scenario: Cursor at word end searches preceding word

- **WHEN** the editor is in normal mode and the prompt cursor is immediately
    after a keyword word
- **THEN** pressing `*` or `#` uses that preceding keyword word as the complete
    keyword-word query

#### Scenario: Word search on a unique word records search without moving

- **WHEN** the editor is in normal mode, the cursor resolves to a keyword word
    that has no other complete keyword-word match in the prompt, and the user
    presses `*` or `#`
- **THEN** the cursor stays on that word, and the last search, search history,
    and visible highlights are recorded with that word query so `n` and `N`
    repeat consistently

#### Scenario: Missing word is safe

- **WHEN** the editor is in normal mode and the cursor is not on or
    immediately after a keyword word
- **THEN** pressing `*` or `#` leaves prompt text, cursor position, visible
    search highlight, search history, and last-search state unchanged

#### Scenario: Repeat search follows star direction

- **WHEN** the user presses `*` on a matching keyword word and then presses `n`
- **THEN** repeat search moves to the next complete keyword-word match for that
    same word

#### Scenario: Reverse repeat search follows star direction

- **WHEN** the user presses `*` on a matching keyword word and then presses `N`
- **THEN** repeat search moves to the previous complete keyword-word match for
    that same word

#### Scenario: Repeat search follows hash direction

- **WHEN** the user presses `#` on a matching keyword word and then presses `n`
- **THEN** repeat search moves to the previous complete keyword-word match for
    that same word

#### Scenario: Word search updates prompt-local search history

- **WHEN** `*` or `#` successfully moves to a complete keyword-word match
- **THEN** the normalized query and its keyword-word matcher mode are added to
    the current editor instance search history without changing prompt text

#### Scenario: Word search updates visible highlights when enabled

- **WHEN** search highlighting is enabled and `*` or `#` successfully moves to
    a complete keyword-word match
- **THEN** visible search highlights mark only complete keyword-word matches and
    the current match at the restored cursor position

## ADDED Requirements

### Requirement: Word-under-cursor search regression coverage

The implementation SHALL validate Unicode keyword extraction and complete
keyword-word matching for `*` and `#` without changing ordinary literal prompt
search behavior.

#### Scenario: Automated word-search regression tests run

- **WHEN** `npm test` is executed
- **THEN** tests cover accented keyword extraction, exclusion of embedded
    matches, repeat direction, highlights, and unchanged literal `/` and `?`
    substring matching
