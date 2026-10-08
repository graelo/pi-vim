---
number: 8
title: Rename to pi-vim
date: 2026-10-08
status: accepted
tags:
- packaging
- naming
links:
- target: 5
  kind: amends
---

# 8. Rename to pi-vim

Date: 2026-10-08

## Status

Accepted

## Context

ADR-0005 published the fork as `@graelo/pi-vimmode`, keeping upstream's name.
The npm scope keeps the package apart on npm, but in conversation and search
the fork and upstream look the same. The name is also long, and it was spread
over the user-facing surface: the `piVimMode` settings key, the
`pi-vimmode.config.js` file, the `/vimmode` command, `:vimmode inspect`, and
the `vimmode.*` diagnostic IDs. 1.0.0 is unreleased and already breaking.

## Decision

Rename the project to pi-vim, published as `@graelo/pi-vim`, and rename every
user-facing surface with it:

- settings key `piVimMode` becomes `piVim`;
- `~/.pi/agent/pi-vimmode.config.js` becomes `~/.pi/agent/pi-vim.config.js`;
- `/vimmode` becomes `/vim`, and `:vimmode inspect` becomes `:vim inspect`;
- diagnostic IDs move from `vimmode.*` to `pi-vim.*`, not `vim.*`, because
  trusted JS config already receives a `vim` object and `vim.doctor` would read
  like a config property.

The old settings key and config file are not read. When either is present, a
"renamed in 1.0.0" warning is shown, like the removed settings in ADR-0006.
The GitHub repository moves to `graelo/pi-vim`. Historical records (earlier
ADRs, archived OpenSpec changes, `docs/solutions/`, and pre-1.0.0 CHANGELOG
entries) keep the old name.

## Consequences

- Upgrading users must rename one settings key and, if they use it, one file;
  `:vimdoctor` tells them which.
- The name says "Vim" without promising parity; the product boundary in
  ADR-0005 still applies.
- `:vim` shadows Vim's `:vim[grep]` abbreviation, which pi-vim does not
  support.
