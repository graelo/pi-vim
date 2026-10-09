## Context

Paragraph motions are the closest existing feature and set the pattern:

- `KEYMAP_MOTION_DESCRIPTORS` in `src/keymap-descriptors.ts` declares each
  motion with its default keys and legacy key. The default
  `operatorMotions` lists in `src/config.ts` are derived from it (every
  motion except the half-page scrolls), and so is the legacy `VimMotion`
  set in `src/commands.ts`.
- `src/modal/normal.ts` dispatches `paragraphForward` and
  `paragraphBackward` to pure position helpers in `src/buffer.ts`.
- `motionOffsetRange` in `src/buffer.ts` special-cases `{`/`}` to build
  operator ranges.
- `baseTextObjectRange`, `yankTextObject`, `deleteTextObject`, and
  `transformCaseTextObject` special-case the `paragraph` target, and
  `isPromptStructureTarget` excludes it.

Visual mode has no text objects, so only the motions reach it.

## Goals / Non-Goals

**Goals:**

- One pure sentence scanner in `src/buffer.ts` shared by `(`, `)`,
  operator ranges, and `is`/`as`.
- Wire sentences through the same descriptor-driven seams as paragraphs, so
  config, docs generation, `:keymap`, and the operator-motion matrix pick
  them up without extra code.

**Non-Goals:**

- A general text-object counting mechanism.
- Changing the paragraph model.

## Decisions

### Sentence model: a list of sentence starts per prompt

`sentenceStarts(text)` returns sorted offsets of every sentence start:

- the first non-blank character of the prompt;
- the first non-blank character after each sentence end (the terminator,
  any closers, then at least one space, tab, or newline);
- the start of each blank line that follows a non-blank line (Vim stops
  there);
- the first non-blank character after a blank-line run.

`)` picks the first start greater than the cursor; `(` picks the last start
less than the cursor. Counts repeat; with no candidate the target clamps to
the prompt end or prompt start.

Alternative: step character by character like `paragraphForwardStep`.
Rejected because sentence ends depend on look-ahead past closers and
whitespace, and a start list makes `(`, `)`, `is`, and `as` agree by
construction. Prompts are small, so scanning the whole text per keypress
is cheap; the benchmark smoke run guards against regressions.

### Text objects derive from the start list

For a cursor in a sentence, the sentence runs from its start to the end of
its terminator and closers (or to the last non-blank before the next start).
The gap between that end and the next start is its trailing blank run.

- `is`: the sentence, or the blank run when the cursor is in one.
- `as`: the sentence plus its trailing blank run. When that run is empty or
  only a newline into a blank line or prompt end, use the leading blank run
  instead. When the cursor is in a blank run, `as` is the run plus the
  following sentence.
- A whitespace-only line yields no range.

Sentence ranges are character ranges, so they go through the existing
offset-range helpers (`deleteOffsetRange`, `transformCaseOffsetRange`),
handled next to the `paragraph` special case. `sentence` is added to the
`isPromptStructureTarget` exclusion list.

Alternative: treat `is` like a delimiter object. Rejected; delimiter objects
strip one character from each end, which does not apply here.

### Operator ranges are exclusive characterwise

`motionOffsetRange` gains a `(`/`)` branch that returns
`[min(cursor, target), max(cursor, target))`. This matches Vim except for
Vim's rule that turns an exclusive motion ending at column 0 into a
linewise or inclusive one; `{`/`}` already skip that rule.

### Keys and naming

- Motions `sentenceBackward` / `sentenceForward`, legacy keys `(` / `)`,
  added to `VimMotionAction`, `VimMotion`, and `vim-config.d.ts`.
- Target `sentence`, default `s`, added to `VimTextObjectTarget` and
  `KEYMAP_TEXT_OBJECT_TARGET_DESCRIPTORS`.
- Descriptions in `src/customization.ts`.

`(` and `)` are already `paren` targets, but those only resolve after a
text-object kind key (`i`/`a`), so `d)` and `di)` stay distinct.

### Side effects

- Registers: deletes and changes write the unnamed character register, and
  honor a register prefix, like other motion and text-object operators.
- Dot repeat: sentence motions and objects record through the existing
  operator-motion and text-object repeat paths.
- Visual state: `(` and `)` move the active end only.
- No effect on marks, search highlights, Ex messages, or Pi delegation.

## Risks / Trade-offs

- [Abbreviations such as `e.g. foo` end a sentence] → Vim behaves the same
  way; documented as a limit.
- [Config propagation: new motions must reach live editors] → They flow
  through the existing descriptor tables and resolved keymap, so
  `VimEditor` option cloning needs no change. A live-editor test binds a
  custom `sentenceForward` key to confirm.
- [Users with explicit `operatorMotions` lists] → Their lists omit the new
  motions, so `d)` stays disabled for them until they add them. This is the
  existing rule for explicit lists, and `docs/settings.md` already says so.
- [Docs drift] → `docs/config.md` is regenerated; `docs/settings.md` and
  `docs/features.md` updated in the same change so `test/docs-drift.test.ts`
  stays green.

## Migration Plan

Additive. No setting is renamed or removed; rollback is a revert.
