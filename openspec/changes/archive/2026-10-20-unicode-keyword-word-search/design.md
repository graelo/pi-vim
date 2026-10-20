# Design

## Context

See [proposal.md](proposal.md) for motivation. `src/buffer.ts` currently owns
both the ASCII-only keyword predicate and the generic literal/regex search
matchers. `src/modal/search.ts` extracts a word then passes it through the
literal matcher, so it cannot distinguish a standalone word match from an
embedded substring. Prompt cursor columns remain UTF-16 offsets.

## Goals / Non-Goals

**Goals:**

- Give all pi-vim small-word consumers one Unicode-aware keyword model.
- Give `*`/`#` a finite complete-keyword-word matcher that survives `n`/`N`,
  history, and highlighting.
- Preserve all existing prompt-local side effects and generic literal search.

**Non-Goals:**

- Expose configurable `'iskeyword'`, emulate user-local Vim settings, or claim
  full Vim/Neovim compatibility.
- Rework generic search into a regex-first engine or change `/` and `?`.
- Change register writes, marks, dot-repeat, visual state, Ex messages, cursor
  placement, or Pi input delegation outside the affected word behavior.

## Decisions

### One pure Unicode keyword classifier in the buffer seam

`src/buffer.ts` will define the keyword class once: Unicode alphabetic
characters, decimal digits, and `_`. Small-word movement, word text objects,
operator ranges, configured insert word actions, and word extraction will
consume it; punctuation and whitespace remain distinct, and uppercase WORD
continues to use non-whitespace runs.

The classifier/traversal will consume complete Unicode code points while
returning existing UTF-16 offsets. This preserves the current position API and
avoids splitting surrogate pairs.

**Alternatives considered:** retain ASCII plus Latin-1 exceptions, or delegate
to Pi's native word movement. The first is an unbounded compatibility list and
the second already caused lowercase Vim-motion drift; both are rejected.

### Represent `*`/`#` as a dedicated finite matcher

The buffer search layer will add a keyword-word matcher that accepts a query
only when the character before and after it are not keyword characters. Generic
literal and explicit regex matchers retain their existing behavior. Search
state will retain the matcher kind so `n`/`N`, history de-duplication, and
highlight ranges reuse the same complete-word predicate.

`src/modal/search.ts` will select that matcher only for `*`/`#`; typed `/` and
`?` input remains literal unless the existing explicit regex prefix is used.

**Alternatives considered:** build Vim `\\<...\\>` regex strings, or widen the
literal matcher globally. Vim regex syntax is not this project's search
contract, and global literal boundaries would break ordinary prompt search, so
both are rejected.

### Keep matching, highlights, and effects aligned

The buffer matcher APIs will supply both navigation and highlight ranges for
the keyword-word matcher. Successful `*`/`#` retains current cursor restoration,
search history, and highlight state; it does not edit prompt text or affect
registers, marks, dot-repeat, visual selections, Ex messages, or Pi shortcut
ownership. Missing words and missing matches remain safe no-ops.

**Alternative considered:** use the existing literal highlight API after
boundary-aware navigation. It would highlight embedded substrings that `*`/`#`
do not navigate to, so it is rejected.

### No configuration surface

This correction adds no option. It defines a documented extension default,
not a partial implementation of Vim's configurable `'iskeyword'`; therefore it
does not require `src/config/`, `src/types.ts`, option cloning, or new live
configuration propagation tests.

## Risks / Trade-offs

- [Unicode categories differ from a user's customized Vim `'iskeyword'`] →
  Document the fixed default and test the requested accented-word behavior;
  defer configurability rather than imply parity.
- [UTF-16 offsets can be corrupted by naïve character indexing] → Traverse
  code-point spans in the new boundary-sensitive helpers and add a surrogate
  pair regression fixture where relevant.
- [Matcher-state change could make `n`/`N` or highlights fall back to literal]
  → Cover forward/backward repeat, history, highlights, and literal-search
  preservation with focused tests.

## Migration Plan

No persisted state or user configuration migrates. Reloading the extension
adopts the corrected behavior. Reverting the code restores the former behavior
without prompt-buffer conversion or cleanup.

## Open Questions

None.
