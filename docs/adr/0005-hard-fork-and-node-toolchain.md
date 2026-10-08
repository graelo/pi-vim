---
number: 5
title: Hard fork as @graelo/pi-vimmode on a Node toolchain
date: 2026-10-08
status: accepted
tags:
- fork
- packaging
- tooling
---

# 5. Hard fork as @graelo/pi-vimmode on a Node toolchain

Date: 2026-10-08

## Status

Accepted

## Context

Upstream [pekochan069/pi-vimmode](https://github.com/pekochan069/pi-vimmode) is
no longer actively maintained and has few users. We need features it lacks
(surround first) and a leaner package that matches the other `@graelo/*` pi
extensions.

Upstream builds a minified `dist/` with rolldown and then generates a second
`package.json` and `release-notes.json` there. It uses Bun for tests and
scripts, and oxlint, oxfmt and lefthook for linting, formatting and git hooks.
It also ships editor settings for Zed and VS Code.

## Decision

Hard fork at v0.9.0 and publish as `@graelo/pi-vimmode`, starting at 1.0.0.

- Ship TypeScript sources directly. `pi.extensions` points at
    `./src/index.ts`, and the declaration-only config types are exported as
    `@graelo/pi-vimmode/config` from `src/vim-config.d.ts`. There is no build
    step and no `dist/`.
- Use npm, `tsc --noEmit`, vitest and tsx. Vitest keeps the existing
    `expect`-style suites intact with a one-line import change.
- Use biome for linting and formatting, configured to the existing style (2
    spaces, 100 columns), and rumdl for Markdown.
- Replace `RELEASE.md` and the generated `release-notes.json` with a Keep a
    Changelog `CHANGELOG.md`. `:changelog` parses it at runtime.
- Keep the benchmark harness, running it on Node via tsx.
- Drop editor settings, git hooks and the `dist` package-verification pipeline.
- Record decisions as ADRs managed with `adrs` in NextGen mode. Keep OpenSpec
    for behavior specs.

## Consequences

- Installs need a new package name and a new JSDoc import path for trusted
    config (`./npm/node_modules/@graelo/pi-vimmode/config`).
- The published package is larger because it is unminified source, but it can
    be debugged directly and matches git installs.
- Benchmark results recorded under Bun (`benchmark/version/0.9.0.json`) are
    not directly comparable to Node results.
- The OpenSpec `package-artifact-verification` capability is retired, and
    built-package requirements in `vim-trusted-javascript-configuration` now
    refer to the source package.
- Upstream changes are no longer merged automatically; anything worth taking
    is cherry-picked deliberately.
