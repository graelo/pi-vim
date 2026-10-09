---
title: Shift+Letter Input Must Resolve to the Uppercase Key
date: 2026-10-09
category: logic-errors
module: pi-vim
problem_type: logic_error
component: tooling
symptoms:
  - "Normal-mode X deleted the character under the cursor, like x"
  - "Normal-mode X did nothing under tmux"
  - "Modal tests with a literal X passed while the live editor failed"
root_cause: logic_error
resolution_type: code_fix
severity: medium
tags:
  - keybindings
  - terminal-escape-sequences
  - kitty-protocol
  - modify-other-keys
---

# Shift+Letter Input Must Resolve to the Uppercase Key

## Problem

`X` (and every other uppercase normal-mode key) worked in tests but not in
some terminals. The modal engine was correct; key decoding in
`src/modal/core.ts` was not.

## Symptoms

- With a Kitty-protocol terminal that leaves out the shifted key, `X` deleted
  forward like `x`.
- Under tmux, where pi falls back to xterm modifyOtherKeys, `X` did nothing.

## Root Cause

pi-tui decodes the same keypress differently depending on the encoding:

| Input             | `decodeKittyPrintable` | `parseKey`  |
| ----------------- | ---------------------- | ----------- |
| `X`               | none                   | `X`         |
| `CSI 120:88;2u`   | `X`                    | `shift+x`   |
| `CSI 120;2u`      | `x`                    | `shift+x`   |
| `CSI 27;2;88~`    | none                   | `shift+x`   |

`keySequence` tried `decodeKittyPrintable` first, so `CSI 120;2u` became `x`,
and fell back to `parseKey` for modifyOtherKeys, which yields `shift+x`, a
key no binding uses.

## Solution

Try a Shift+letter normalizer first in both `keySequence` and
`insertKeySequence`: when an escape sequence parses as `shift+<a-z>`, return
the uppercase letter.

## Prevention

- Modal tests that send a literal `X` do not cover terminal encodings. When
  adding a key decoding path, test the Kitty (with and without shifted key)
  and modifyOtherKeys forms too, as `test/modal/key-decoding.test.ts` does.
- See also
  `pi-vimmode-insert-mode-legacy-esc-alt-bindings-2026-06-23.md` for the
  legacy `ESC`-prefixed Alt encoding.
