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

## Risks / Trade-offs

- A configured `shift+<letter>` binding stops firing. Such bindings only
  worked in Kitty or modifyOtherKeys terminals before, and Vim itself has no
  separate `<S-x>` for letters.
- Shift with Caps Lock on resolves to the uppercase letter, unlike typed text.
  Normal-mode commands do not depend on Caps Lock.
