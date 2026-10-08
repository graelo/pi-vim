---
number: 7
title: Apply Ex substitution on Enter
date: 2026-10-08
status: accepted
tags:
- ex
---

# 7. Apply Ex substitution on Enter

Date: 2026-10-08

## Status

Accepted

## Context

Upstream pi-vimmode made `:s` two-phase: the first `Enter` highlighted matches
and showed "N matches found; Enter applies, Esc cancels", and a second `Enter`
applied the substitution. `:&` and its variants behaved the same way. Vim
applies on the first `Enter`, and every other Ex command here does too, so the
extra step is unexpected for Vim users, and it required its own preview state in
the modal engine, workbench, renderer, and inspect output.

## Decision

`Enter` applies a substitution immediately and reports the substitution count,
as in Vim. Remove the preview state and its rendering. Users who want to check
the match count first use the `n` flag (`:s/old/new/gn`), and `u` undoes an
applied substitution.

## Consequences

- `:s`, `:&`, `:&&`, and `:%&` behave like Vim.
- No visual confirmation of matches before editing; undo is the safety net.
- Less modal state: `PendingExCommand` no longer carries a preview, and Ex
  editing and history navigation no longer need to clear one.
