# Design

## Context

Every modal state decodes raw input through `keySequence` or
`insertKeySequence` in `src/modal/core.ts`. Both try pi-tui's
`decodeKittyPrintable` first, then a single printable byte, then `parseKey`.

A probe of pi-tui 1.1.0 shows how Shift+x arrives:

| Input             | `decodeKittyPrintable` | `parseKey`  |
| ----------------- | ---------------------- | ----------- |
| `X`               | none                   | `X`         |
| `CSI 120:88;2u`   | `X`                    | `shift+x`   |
| `CSI 120;2u`      | `x`                    | `shift+x`   |
| `CSI 27;2;88~`    | none                   | `shift+x`   |
| `CSI 27;2;120~`   | none                   | `shift+x`   |

pi requests Kitty flags 7, which include alternate keys, but terminals that
leave out the shifted key still send `CSI 120;2u`. When Kitty is not
negotiated, pi enables modifyOtherKeys mode 2. pi's own editor uses
`decodePrintableKey`, which also decodes `CSI 27;2;120~` as `x`.

## Decisions

### D1. Normalize from `parseKey`, ahead of the printable decoders

`parseKey` reports `shift+<letter>` for every encoding in the table, so a
helper maps `/^shift\+([a-z])$/` to the uppercase letter, and both decoders
try it first. `ctrl+shift+x` parses as `shift+ctrl+x` and is left alone.

The helper only runs for escape sequences (`data[0] === ESC`, length > 2), so
plain printable bytes keep their current fast path.

### D2. Fix locally rather than upstream only

`decodeKittyPrintable` is right to return the unshifted codepoint for text
insertion when it cannot know the layout, and changing pi-tui would not help
users on current pi versions. The fix stays in pi-vim, where Vim semantics
(Shift+letter is the uppercase command) apply.

### D3. Warn on `shift+<letter>` bindings instead of rewriting them

After D1 a `shift+<letter>` binding can never match. Config parsing tokenizes
each binding (`shiftedLetterToken` in `src/mapping-scopes.ts`) and rejects one
with a `shift+<letter>` token, case-insensitively, with a warning that names
the uppercase letter. This follows the field-local rule: the binding is
ignored, valid siblings apply, and a list whose keys are all rejected keeps
the inherited bindings. JSON keymaps check in `parseStringArray`; trusted JS
checks in `compileMapping`, next to the protected-key check.

Rewriting to the uppercase letter silently was rejected: it would hide a
config that changed meaning, and the project prefers explicit warnings.

## Risks / Trade-offs

- A configured `shift+<letter>` binding stops firing. Such bindings only
  worked in Kitty or modifyOtherKeys terminals before; the D3 warning tells
  the user to bind the uppercase letter.
- A string-remap right-hand side such as `"<S-x>"` is not covered: it already
  replayed the literal text `shift+x` before this change.
- Shift with Caps Lock on resolves to the uppercase letter, unlike typed text.
  Normal-mode commands do not depend on Caps Lock.
