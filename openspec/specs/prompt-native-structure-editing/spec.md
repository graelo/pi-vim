# prompt-native-structure-editing Specification

## Purpose

Define prompt-native structures (Markdown blocks, lists, tags, error blocks)
and the text objects that operate on them.

## Requirements

### Requirement: Prompt-native structures resolve to deterministic ranges

The Vim editor SHALL resolve prompt-native structures in the current prompt
using deterministic, line-oriented rules for Markdown code fences, Markdown
heading sections, list items, XML-ish tags, and pasted error blocks.

#### Scenario: Markdown code fence range resolves

- **WHEN** the cursor is inside a Markdown triple-backtick or triple-tilde
    code fence
- **THEN** the editor resolves an inner range containing the fenced content
    and an around range containing the opening fence, content, and closing fence

#### Scenario: Markdown heading section range resolves

- **WHEN** the cursor is on a Markdown ATX heading or inside the content under
    that heading
- **THEN** the editor resolves an inner range from the first body line through
    the line before the next heading of the same or higher level, and an around
    range that also includes the heading line

#### Scenario: Markdown list item range resolves

- **WHEN** the cursor is on a Markdown bullet, ordered-list marker, task-list
    marker, or continuation line belonging to that item
- **THEN** the editor resolves an inner range for the item content and an
    around range containing the marker line and continuation lines

#### Scenario: XML-ish tag range resolves

- **WHEN** the cursor is inside matching XML-ish opening and closing tags with
    the same tag name
- **THEN** the editor resolves an inner range between the tags and an around
    range including both tags

#### Scenario: Pasted error block range resolves

- **WHEN** the cursor is inside a contiguous pasted error block containing an
    error headline, stack frames, traceback lines, log severity lines, or
    file-location lines
- **THEN** the editor resolves a range containing that contiguous error block
    without including unrelated prose before or after it

#### Scenario: Missing or malformed structure is safe

- **WHEN** the cursor is not inside the requested prompt-native structure or
    the structure is malformed
- **THEN** the editor leaves prompt text, cursor position, registers, and mode
    unchanged

### Requirement: Operators support prompt-native text objects

The Vim editor SHALL support prompt-native text objects after delete, change,
and yank operators using the existing inner and around text-object flow.

#### Scenario: Delete around code fence

- **WHEN** the editor is in normal mode with the cursor inside a Markdown code
    fence and the user presses `daf`
- **THEN** the full code fence is removed, copied to the unnamed character
    register, and the editor remains in normal mode

#### Scenario: Change inner heading section

- **WHEN** the editor is in normal mode with the cursor inside a Markdown
    heading section and the user presses `cih`
- **THEN** the section body excluding the heading line is removed, copied to
    the unnamed character register, and the editor enters insert mode

#### Scenario: Yank around list item

- **WHEN** the editor is in normal mode with the cursor inside a Markdown list
    item and the user presses `yal`
- **THEN** the marker line and continuation lines for that list item are
    copied to the unnamed character register without changing prompt text

#### Scenario: Delete inner XML-ish tag

- **WHEN** the editor is in normal mode with the cursor inside matching
    XML-ish tags and the user presses `dit`
- **THEN** the tag contents are removed, copied to the unnamed character
    register, and the surrounding tags remain

#### Scenario: Yank around error block

- **WHEN** the editor is in normal mode with the cursor inside a pasted error
    block and the user presses `yae`
- **THEN** the contiguous error block is copied to the unnamed character
    register without changing prompt text

#### Scenario: Prompt-native text object miss clears pending operator safely

- **WHEN** the editor is in normal mode with a pending operator and the
    requested prompt-native text object does not exist around the cursor
- **THEN** prompt text, cursor position, registers, and mode are unchanged,
    and pending operator state clears

#### Scenario: Prompt-native text object keys are configurable

- **WHEN** settings configure `keymap.textObjects.kinds` or
    `keymap.textObjects.targets`
- **THEN** operators use the configured text-object kind and target keys while
    preserving existing default behavior for unspecified keys

#### Scenario: Prompt-native structure targets can be disabled

- **WHEN** settings disable `promptStructures.enabled` or an
    individual `promptStructures.targets.*` entry
- **THEN** the corresponding prompt-native text object acts as a safe no-op
    without changing prompt text, cursor, registers, or mode

### Requirement: Prompt-native structure editing is documented and validated

The change SHALL include automated validation and user-facing documentation for
prompt-native structures.

#### Scenario: Automated validation runs

- **WHEN** `npm test` is executed
- **THEN** tests cover structure range resolution, operator text objects, safe
    no-op behavior, and existing Vim behavior

#### Scenario: Typecheck runs

- **WHEN** `npm run check` is executed
- **THEN** the extension TypeScript compiles without type errors

#### Scenario: Feature guide documents prompt-native editing

- **WHEN** the user opens `docs/features.md`
- **THEN** it documents prompt-native text objects, examples, limitations, and
    validation commands
