---
number: 4
title: Resolve leader mappings with one final effective leader
date: 2026-07-14
status: accepted
tags:
- config
- keymap
---

# 4. Resolve leader mappings with one final effective leader

Date: 2026-07-14

## Status

Accepted

## Context

A leader can be set in global JSON, trusted global JavaScript, and project JSON. Vim expands `mapleader` at declaration time, which would prevent project configuration from consistently changing or clearing inherited leader mappings.

## Decision

pi-vimmode will resolve one optional leader from global JSON, trusted global JavaScript, and project JSON in normal precedence order, then expand retained case-insensitive mappings that begin with `<leader>` using that final value. This deliberately differs from Vim's declaration-time `mapleader`.

## Consequences

Project configuration can change or clear inherited leader mappings consistently. Any accepted normal/visual leader mapping reserves its prefix across normal and visual keymap grammar because pi-vimmode has no timeout fallback for exact-prefix ambiguity; insert-only leader mappings do not activate that reservation. Expansion applies only to mapping keys, not replay RHS inputs; mappings without a configured leader, containing `<leader>` after another key, or consisting only of one `<leader>` are rejected with non-fatal warnings.
