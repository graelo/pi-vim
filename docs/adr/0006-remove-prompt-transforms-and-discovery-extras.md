---
number: 6
title: Remove prompt transforms, :features, and :changelog
date: 2026-10-08
status: accepted
tags:
- scope
- ex
- keymap
---

# 6. Remove prompt transforms, :features, and :changelog

Date: 2026-10-08

## Status

Accepted

## Context

Upstream pi-vimmode grew a second editing vocabulary next to Vim: prompt
transforms (`:quote`, `:unquote`, `:bulletize`, `:fence`, `:indent`, `:dedent`,
`:reflow`) plus a generic action keymap (`piVimMode.keymap.actions`) with
recipes and presets that existed only to bind those transforms. It also added
`:features`, which overlapped `:help`, `:keybindings`, `:actions`, and
`:mapcheck`, and `:changelog`, which rendered packaged release notes in a
Markdown popup. The fork (ADR-0005) wants a focused Vim editor, and the
upcoming surround feature belongs in operator grammar, not in a separate action
layer.

## Decision

Remove prompt transforms end to end, including the action keymap layer, its
presets and recipes, `piVimMode.promptTransforms`, and the transform factories
in trusted JavaScript config. Remove `:features` and `:changelog`, along with
the Markdown popup renderer only `:changelog` used. Keep Vim line shifts
(`>>`, `<<`, visual `>`/`<`) on a private indent/dedent helper.

Removed settings produce a "removed in 1.0.0" warning instead of the silent
ignore that unknown keys get, so `:vimdoctor` shows them to upgrading users.

## Consequences

- A smaller config surface and less resolution code in `src/config.ts` and
  `src/commands.ts`; new behavior has one place to go (operators, motions, text
  objects).
- Users who bound `gq`, `g>`, or similar through recipes lose them, with a
  warning and a CHANGELOG entry as the migration path.
- The OpenSpec capability `prompt-transform-action-keybindings` is retired.
- `CHANGELOG.md` is ordinary documentation again, with no runtime parser.
