---
number: 9
title: Store pi-vim config in extension config files
date: 2026-10-09
status: accepted
tags:
- config
links:
- target: 8
  kind: amends
---

# 9. Store pi-vim config in extension config files

Date: 2026-10-09

## Status

Accepted

## Context

pi-vim read its options from a `piVim` key in Pi's global and project
`settings.json`, and its trusted JS config from `~/.pi/agent/pi-vim.config.js`
(ADR-0008). The maintainer's other pi extensions instead keep a `config.json`
per extension, located by the shared `@graelo/pi-ext-config` library. pi-vim's
own paths were built from `homedir()`, so they ignored `PI_CODING_AGENT_DIR`.
It also read project settings without asking whether Pi trusts the project.
Nothing has been released under the pi-vim name yet.

## Decision

- Global options live in `<agent-dir>/extensions/pi-vim/config.json`, where
  `<agent-dir>` is Pi's `getAgentDir()`.
- Project options live in `<repo-root>/.pi/extensions/pi-vim/config.json`.
  pi-vim reads them only when `ctx.isProjectTrusted()` is true and the session
  `cwd` is inside a git repository.
- Each file holds the options object at its root, with no wrapper key. Option
  paths in warnings and docs drop the old `piVim.` prefix.
- The trusted JS config moves to `<agent-dir>/extensions/pi-vim/config.js` and
  stays global-only.
- `@graelo/pi-ext-config` only locates and parses the files. pi-vim still
  layers global JSON, JS config and project JSON itself. The library's
  `first-match` and merge strategies cannot express per-tier presets, project
  exact-mapping precedence, or the JS layer between the two JSON tiers.
- pi-vim no longer reads Pi `settings.json`, and no migration warnings remain
  for the old locations.

This amends ADR-0008, which named the `piVim` settings key and the
`pi-vim.config.js` file. The rest of ADR-0008 is unchanged.

## Consequences

- pi-vim configuration sits beside the other extensions' config and follows
  `PI_CODING_AGENT_DIR`.
- Untrusted repositories cannot change the editor's behavior.
- Anyone with a `piVim` key in `settings.json` must move it by hand; the old
  key is ignored silently.
- `src/config.ts` gains a runtime dependency on `@graelo/pi-ext-config`.
