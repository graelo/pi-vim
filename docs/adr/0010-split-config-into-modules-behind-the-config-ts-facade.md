---
number: 10
title: Split config into modules behind the config.ts facade
date: 2026-10-09
status: accepted
tags:
- config
- architecture
links:
- target: 2
  kind: amends
---

# 10. Split config into modules behind the config.ts facade

Date: 2026-10-09

## Status

Accepted

## Context

`src/config.ts` had grown to about 3,000 lines, mixing several concerns:

- defaults and action sets;
- key-sequence normalization;
- field validators and per-area parsers;
- keymap layering and leader expansion;
- conflict detection;
- the trusted JS layer;
- plan compilation;
- file loading;
- per-option accessors.

ADR-0002 and ADR-0003 name `src/config.ts` as the owner of JSON settings
behavior, and `openspec/config.yaml` lists it as an architecture seam. Most of
`src/` and the tests import from it.

## Decision

- The implementation lives in `src/config/`, one module per concern:
  - `defaults.ts`: defaults and action sets;
  - `types.ts`: shared internal and plan types;
  - `clone.ts`: option cloning;
  - `key-normalization.ts`;
  - `fields.ts`: generic field validators;
  - `keymap-parsers.ts`, `ui-parsers.ts` and `settings-parsers.ts`;
  - `merge.ts`: option merging and presets;
  - `keymap-layers.ts`: keymap layering and project precedence;
  - `leader.ts`;
  - `conflicts.ts`;
  - `js-layer.ts`;
  - `plan.ts`;
  - `resolve.ts`: resolution and file loading;
  - `accessors.ts`: the `*ForOptions` helpers.
- `src/config.ts` stays as a re-export facade and remains the seam. Code
  outside `src/config/` imports config from `src/config.ts`, never from a
  module inside `src/config/`.
- The split is a pure move with no behavior change. Helpers that other
  modules need gained an `export`, and they are not re-exported by the facade.

This amends ADR-0002: "`src/config.ts` owns JSON settings behavior" now means
the facade and the modules behind it.

## Consequences

- Each concern can be read and reviewed on its own. The largest module is
  under 400 lines.
- The facade's export list is the public config API. A new export has to be
  added there deliberately.
- Modules import each other directly, so the internal layout must avoid
  initialization cycles between top-level constants.
