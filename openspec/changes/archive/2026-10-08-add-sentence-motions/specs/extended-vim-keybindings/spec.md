## ADDED Requirements

### Requirement: Sentences follow Vim sentence boundaries

The Vim editor SHALL treat a sentence as ending at `.`, `!`, or `?`, followed
by any number of `)`, `]`, `"`, or `'`, then a space, tab, or line end.
Sentences may span lines within a paragraph. A blank line ends a sentence and
counts as a sentence boundary of its own, so sentences never cross paragraphs.

#### Scenario: Sentence end needs trailing whitespace

- **WHEN** the prompt is `See v1.2 now. Then go.`
- **THEN** the sentences start at `See` and `Then`, and the `.` inside `v1.2`
    does not end a sentence

#### Scenario: Closing characters belong to the sentence

- **WHEN** the prompt is `He said "stop." Then left.`
- **THEN** the first sentence ends after `"` and the second starts at `Then`

#### Scenario: Sentence spans a line break

- **WHEN** a sentence starts on one line and its terminating `.` is on the
    next line of the same paragraph
- **THEN** the editor treats both lines as one sentence

### Requirement: Normal and visual modes support sentence motions

The Vim editor SHALL support `)` to move to the next sentence start and `(` to
move to the current sentence start, or the previous sentence start when the
cursor is already there. Counts repeat the motion and clamp at prompt bounds.

#### Scenario: Forward sentence motion

- **WHEN** the editor is in normal mode inside a sentence and a later sentence
    exists, and the user presses `)`
- **THEN** the cursor moves to the first character of the next sentence

#### Scenario: Forward sentence motion stops at a blank line

- **WHEN** the cursor is in the last sentence of a paragraph followed by a
    blank line, and the user presses `)`
- **THEN** the cursor moves to the first column of the blank line

#### Scenario: Forward sentence motion reaches prompt end

- **WHEN** the cursor is in the last sentence of the prompt and the user
    presses `)`
- **THEN** the cursor moves to the prompt end, or stays there when already at
    the prompt end

#### Scenario: Backward sentence motion

- **WHEN** the cursor is inside a sentence after its first character and the
    user presses `(`
- **THEN** the cursor moves to the first character of that sentence

#### Scenario: Backward sentence motion from a sentence start

- **WHEN** the cursor is on the first character of a sentence that is not
    the first in the prompt, and the user presses `(`
- **THEN** the cursor moves to the first character of the previous sentence

#### Scenario: Counted sentence motion

- **WHEN** the user presses `2)` or `2(` in normal mode
- **THEN** the sentence motion repeats twice and clamps at the prompt bounds
    when fewer sentences exist

#### Scenario: Visual sentence motion extends selection

- **WHEN** the editor is in visual character, visual line, or visual block
    mode and the user presses `(` or `)`
- **THEN** the visual anchor stays put and the active cursor moves to the
    same target as in normal mode

### Requirement: Operators support sentence motions

The Vim editor SHALL allow motion-capable operators to target `(` and `)` as
exclusive characterwise motions: the range runs from the cursor up to, but
not including, the motion target.

#### Scenario: Delete to next sentence

- **WHEN** the prompt is `Foo bar. Baz qux.` with the cursor on `b` of `bar`
    and the user presses `d)`
- **THEN** the prompt becomes `Foo Baz qux.`, the deleted `bar.` is in the
    unnamed character register, and the editor stays in normal mode

#### Scenario: Change to sentence start

- **WHEN** the cursor is inside a sentence after its first character and the
    user presses `c(`
- **THEN** text from the sentence start up to the cursor is removed and
    copied to the unnamed register, and the editor enters insert mode at the
    sentence start

#### Scenario: Yank by sentence motion

- **WHEN** the user presses `y)` or `y(` in normal mode
- **THEN** the addressed range is copied to the unnamed character register
    without changing prompt text or mode

#### Scenario: Counted operator sentence motion

- **WHEN** the user presses `d2)` or `2d)`
- **THEN** text from the cursor up to the second following sentence start is
    deleted

#### Scenario: Sentence motion with no target is a no-op

- **WHEN** the cursor is at the prompt end and the user presses `d)`
- **THEN** prompt text, cursor, registers, and mode are unchanged and the
    pending operator clears

### Requirement: Operators support sentence text objects

The Vim editor SHALL support `is` and `as` sentence text objects. `is`
selects the sentence under the cursor without surrounding blanks, or the
blank run when the cursor is between sentences. `as` adds the trailing
blanks, or the leading blanks when there are none trailing.

#### Scenario: Delete inner sentence

- **WHEN** the prompt is `Foo bar. Baz qux.` with the cursor on `bar` and the
    user presses `dis`
- **THEN** the prompt becomes `Baz qux.` and `Foo bar.` is in the unnamed
    character register

#### Scenario: Delete around sentence

- **WHEN** the prompt is `Foo bar. Baz qux.` with the cursor on `bar` and the
    user presses `das`
- **THEN** the prompt becomes `Baz qux.`

#### Scenario: Around sentence uses leading blanks at paragraph end

- **WHEN** the cursor is in the last sentence of a paragraph, preceded by
    blanks and followed by no blanks on its line, and the user presses `das`
- **THEN** the sentence and the blanks before it are deleted

#### Scenario: Inner sentence on blanks between sentences

- **WHEN** the cursor is on the blanks between two sentences and the user
    presses `dis`
- **THEN** only that blank run is deleted

#### Scenario: Sentence object on a blank line is safe

- **WHEN** the cursor is on an empty prompt or a whitespace-only line and the
    user presses `dis` or `das`
- **THEN** prompt text, cursor, registers, and mode are unchanged and the
    pending operator clears

#### Scenario: Sentence objects work with other operators

- **WHEN** the user presses `cis`, `yas`, `gUis`, or `ysis)`
- **THEN** the operator applies to the same range `dis` or `das` would delete

### Requirement: Sentence changes are repeatable

The Vim editor SHALL record delete and change commands that use a sentence
motion or sentence text object for `.` repeat.

#### Scenario: Repeat a sentence delete

- **WHEN** `das` or `d)` changed prompt text and the user later presses `.`
    in normal mode at another sentence
- **THEN** the same sentence change applies at the new location with the
    recorded count

### Requirement: Sentence keybindings are documented and validated

The change SHALL include automated tests and user-facing documentation for
sentence motions and sentence text objects.

#### Scenario: Automated validation runs

- **WHEN** `npm test` is executed
- **THEN** tests cover sentence boundaries, sentence motions, counts, visual
    extension, operator sentence motions, sentence text objects, safe no-ops,
    and dot repeat

#### Scenario: Feature guide documents sentence behavior

- **WHEN** the user opens `docs/features.md`
- **THEN** it documents `(` / `)` motions, `is` / `as` objects, the sentence
    boundary rules, and the non-goals compared with Vim

#### Scenario: Runtime help covers sentences

- **WHEN** the user runs `:help sentence` or `:help motions`
- **THEN** the motions entry mentions sentence motions
