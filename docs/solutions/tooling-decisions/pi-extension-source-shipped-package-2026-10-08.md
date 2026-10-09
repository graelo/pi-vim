---
title: Pi extension package that ships TypeScript sources
date: 2026-10-08
category: docs/solutions/tooling-decisions
module: pi-vimmode
problem_type: tooling_decision
component: tooling
severity: low
applies_when:
  - "Pi extension supports both git and npm installs"
  - "Package exposes declaration-only subpaths such as config types"
  - "Release notes are read from a packaged file at runtime"
tags:
  - pi-extension
  - package-json
  - npm-publish
  - git-install
supersedes: pi-extension-root-source-dist-publish-fields-2026-06-04
---

# Pi extension package that ships TypeScript sources

## Context

Upstream pi-vimmode bundled the extension into `dist/index.js` with rolldown and
generated a second, dist-local `package.json` so that git installs (root,
TypeScript) and npm installs (dist, JavaScript) could point `pi.extensions` at
different entrypoints. It also generated `release-notes.json` for `:changelog`
and ran a package-verification script against the built output.

Pi loads TypeScript extensions directly, so the hard fork (ADR-0005) dropped the
build and ships `src/` as-is. One `package.json` now serves git and npm
installs.

## Guidance

Point `pi.extensions` and the package entry at the source, and expose the
declaration-only config types as a type-only subpath:

```json
{
  "name": "@graelo/pi-vimmode",
  "type": "module",
  "main": "src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./config": { "types": "./src/vim-config.d.ts" }
  },
  "files": [
    "src",
    "docs/config.md",
    "docs/features.md",
    "docs/settings.md",
    "examples",
    "README.md",
    "CHANGELOG.md",
    "LICENSE"
  ],
  "pi": { "extensions": ["./src/index.ts"] }
}
```

- Keep Pi packages (`@earendil-works/pi-coding-agent`, `@earendil-works/pi-tui`)
  as peer dependencies with `*` ranges so the extension uses the host's
  runtime classes.
- Ship `CHANGELOG.md`; `src/release-notes.ts` resolves the package root from
  `import.meta.url` and parses the current version's section at runtime.
- Keep tests, benchmarks, OpenSpec and solution docs out of `files`.

## Why This Matters

- Git and npm installs load the same code, so there is no build artifact to
  drift from source and no second manifest to keep in sync.
- Stack traces point at readable source.
- The trade-off is a larger, unminified package.

## Verification

```sh
npm run check
npm test
npm pack --dry-run
```

Inspect the dry-run file list: `src/`, `CHANGELOG.md`, the user docs and
`examples/` must be present; `test/`, `benchmark/`, `openspec/` and
`docs/solutions/` must not.

## Related

- `docs/adr/0005-hard-fork-and-node-toolchain.md`
