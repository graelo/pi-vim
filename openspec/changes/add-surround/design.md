## Context

Normal-mode keys go through `resolveNormalCommand` in `src/commands.ts`, which
returns a semantic result (`operatorMotion`, `operatorTextObject`,
`operatorCharSearch`, `lineCommand`, `command`, `pending`). Pending parser state
is an encoded string in `ModalState.pending`. Features that need input after a
command resolves (marks, registers, macros, easymotion) keep their own typed
pending field in `ModalState` and are handled in `src/modal/engine.ts`.

`src/modal/normal.ts` applies operator results through pure `src/buffer.ts`
helpers (`deleteByMotion`, `transformCaseTextObject`, ...) and records
`lastRepeatableChange` for `.`. Range computation already exists:
`motionLineRange`/`motionOffsetRange` for motions, `textObjectRange` for text
objects, and the character-search range used by `deleteByCharSearch`.
Delimiter finders (`bracketRangeAtOffset`, `quoteRangeAtOffset`) are private
to `src/buffer.ts` and generic over the delimiter characters.

Keymap compilation in `src/config.ts` rejects strict-prefix conflicts per mode
scope, so `ys` would be rejected because `y` is a bound operator. Multi-key
operators only accept the doubled line form today (`gugu`), so `yss` has no
existing path.

## Goals / Non-Goals

**Goals:**

- Reuse the existing target grammar for `ys`, so every motion and text object
  (including prompt-native ones) works without a parallel parser.
- Keep text changes in one pure, unit-testable module.
- Make every entry point a descriptor-backed semantic action.

**Non-Goals:**

- A general mechanism for operators that read extra characters; surround is
  the only such operator, so its pending state stays specific.
- Changing how existing operators or the `S`, `s`, `y`, `d`, `c` keys behave.

## Decisions

### 1. Surround is a motion operator; the character is read by the modal engine

Add `surround` to `VimMotionOperatorAction`. The parser then resolves
`ys{target}` with the existing `operatorMotion`, `operatorTextObject`, and
`operatorCharSearch` results. When `src/modal/normal.ts` receives one of those
results for `surround`, it does not edit; it stores a typed
`pendingSurround: { kind: "add", target, count }` in `ModalState`. The engine
routes the next key to surround handling, as it does for `pendingMark`.

`ds` and `cs` are commands (`deleteSurround`, `changeSurround`) that set
`pendingSurround` with `kind: "delete"` or `kind: "change"`; `cs` reads two
characters. Visual `S` is the command `surroundSelection`, which captures the
selection range and sets `kind: "addRange"`.

- Alternative: encode the resolved target and the awaited character in the
  parser's pending string, like `r{char}`. Rejected: targets are structured
  values (text objects, char searches with counts), and the string encoding
  is already the hardest part of `src/commands.ts` to read.
- Alternative: separate `surroundWord`-style commands per target. Rejected:
  it duplicates the target grammar and loses text objects.

Search (`ys/foo`), repeat char search (`ys;`), and mark targets are not
accepted: `supportsSearchTargets` stays limited to delete, change, and yank,
and character-search support is extended to include `surround`.

### 2. Pure helper module `src/surround.ts`

New module with:

- `surroundPairFor(char)`: returns `{ open, close }` or `undefined` (rules in
  the spec).
- `surroundTargetFor(char)`: returns the delete/change target (bracket pair,
  quote, or punctuation) and whether to trim inner whitespace.
- `addSurround(text, range, pair, linewise)`, `deleteSurround(text, cursor,
  target, count)`, `changeSurround(text, cursor, target, pair, count)`, each
  returning an `EditResult` with the cursor on the opening character.

Range resolution stays in `src/buffer.ts`: export a `surroundRangeFor` helper
there that turns a motion, text object, or character search into an offset
range plus a linewise flag (wrapping the existing private helpers), and export
the bracket and quote finders with an optional count for nested pairs. This
keeps `src/surround.ts` free of motion logic and avoids duplicating finders.

- Alternative: put everything in `src/buffer.ts`. Rejected: it is already
  2.5k lines, and surround has its own vocabulary (pairs, targets, trimming).

### 3. Operator-extension exception in keymap compilation

In `compilePlanScope` (`src/config.ts`), a candidate that strictly extends an
accepted operator sequence in the same scope is accepted when the remainder is
not a target of that operator in the compiled grammar. Otherwise it is
rejected with a warning that names the shadowed target. In
`resolveAfterOperator` (`src/commands.ts`), before resolving targets, check
whether the operator sequence plus the new keys is an exact binding or a
longer prefix of one; if so, resolve that binding.

- Alternative: bind surround in operator-pending scope as "`s` after `y`".
  Rejected: users would configure a suffix rather than the sequence they
  type, and `gs`-style rebinding would not be expressible.
- Alternative: hard-code `ys`/`ds`/`cs` outside the keymap. Rejected: it
  bypasses descriptors, diagnostics, `:keymap`, and unbinding.

### 4. Last-key line form for multi-key operators

`resolveAfterOperator` treats a key equal to the last key of a multi-key
operator sequence as the line form, besides the doubled sequence. For
surround, the line form is not linewise: it targets the first non-blank of
the cursor line through the end of the `count`th line, charwise, so `yss)`
stays inline as in vim-surround. For case operators it is the existing
linewise transform. The extension check from decision 3 runs first, so a
binding that extends the operator still wins.

### 5. Scopes and descriptors

`KEYMAP_OPERATOR_DESCRIPTORS` gains `surround: { defaults: ["ys"],
motionOperator: true }`; `KEYMAP_COMMAND_DESCRIPTORS` gains `deleteSurround`,
`changeSurround`, and `surroundSelection`. `src/mapping-scopes.ts` limits the
surround operator to `normal` and `surroundSelection` to the visual scopes, so
normal-mode `S` (`substituteLine`) and visual `S` never conflict. The
`operatorMotions.surround` default copies the `yank` allow-list. Config
metadata, `src/vim-config.d.ts`, and the generated `docs/config.md` blocks
follow from the descriptors.

### 6. Side effects

- Registers: none written; pending named-register prefixes are cleared.
- Repeat: new `RepeatableChange` variants `surround` (target, count, pair
  character), `deleteSurround`, and `changeSurround` (characters and count).
  `repeatChange` replays them without re-reading keys. Visual surround does
  not record a repeat, matching other visual operators here.
- Undo: each surround is one `edit` effect, so one undo step.
- Cursor: on the opening character after every edit; unchanged on no-op.
- Search highlights, marks, and visual state: unchanged, except that visual
  surround clears the selection and returns to normal mode like other visual
  operators, and stores `lastVisualSelection` for `gv`.
- Pending display: `pendingDisplay` includes the keys typed while
  `pendingSurround` is set (`ysiw`, `cs"`).
- Esc and rejected characters clear `pendingSurround` with a no-op effect;
  the key is never inserted.

## Risks / Trade-offs

- [Operator-extension exception weakens strict-prefix validation] → limited to
  sequences that start with a full operator sequence, checked against the
  compiled target grammar, with tests for shadowing (`dw`) and unchanged
  non-operator conflicts.
- [User-defined motions or text-object kinds bound to `s`] → the exception
  rejects the surround binding with a warning, so existing configs keep their
  behavior; the user can rebind surround.
- [Last-key line form could shadow a user binding] → it applies only when the
  key is not already an extension, target, or doubled form, and only to
  sequences that were invalid before.
- [Linewise surround inserts lines without reindenting] → documented
  non-goal; prompts rarely need indentation-aware wrapping.
- [Quote pair selection differs from Vim in edge cases] → reuse the existing
  quote text-object finder so `ds"` and `ci"` always agree.

## Migration Plan

Additive. No settings migration; the new keymap keys get defaults. Rollback is
reverting the change; no persisted state depends on it.
