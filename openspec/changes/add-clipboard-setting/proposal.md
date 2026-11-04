# Proposal

## Why

Copying text between a Pi prompt and other applications is a common prompt
workflow, but pi-vim reaches the host clipboard only through explicit `"+` and
`"*` prefixes. Users coming from Vim with `:set clipboard=unnamedplus` expect
plain `yy`, `dd`, and `p` to use the system clipboard, and forgetting the
prefix silently keeps text prompt-local. A literal-replay workaround
(`vim.keymap.set("n", "y", '"+y')`) does not fit pi-vim's mapping rules:
mappings are non-recursive and same-scope prefix conflicts are rejected, so
`y`, `yy`, and operator-pending forms cannot all be remapped cleanly.

## What Changes

- Add a top-level `clipboard` setting (`"none"`, `"unnamed"`, `"unnamedplus"`;
  default `"none"`) in JSON settings and trusted JavaScript config, modelled on
  Vim's `'clipboard'`.
- With `"unnamed"` / `"unnamedplus"`, register writes that would go only to the
  unnamed register (no prefix or an explicit `""`, including Ex `:yank` and
  `:delete` without an operand) also write the `"*` / `"+` clipboard mirror and
  request a host clipboard copy.
- With the setting enabled, unprefixed and `""`-prefixed normal-mode `p`/`P`
  read the host clipboard like `"+p`, falling back to the clipboard mirror and
  then the unnamed register.
- Host clipboard paste keeps the clipboard mirror's register type when the host
  text equals the mirror text, so a linewise yank pastes linewise after a
  round trip through the host clipboard. This also applies to explicit
  `"+p`/`"*p`.

### Non-goals

- Comma-separated Vim values (`unnamed,unnamedplus`), `autoselect`, or
  `exclude:`.
- Routing visual-line `p` or Ex `:put` through the host clipboard; they keep
  reading the unnamed register, as explicit clipboard prefixes do today.
- Distinguishing X11 PRIMARY from CLIPBOARD; both slots keep using Pi's one host
  clipboard helper.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `vim-named-registers`: the `clipboard` setting redirects unnamed-register
  writes and normal-mode paste to a clipboard register; host paste keeps the
  mirror's type for the prompt's own copies.
- `pi-vim-documentation`: settings and feature guides document the setting.

## Impact

- Affected seams: `src/types.ts` and `src/config/` (defaults, parsing, merge,
  clone), `src/config-property-paths.ts`, `src/config-metadata.ts`,
  `src/vim-config.d.ts`, `src/modal/registers.ts`, `src/modal/engine.ts`,
  `src/modal/normal.ts`, and `src/vim-editor.ts` clipboard paste.
- Affected tests: config parsing and trusted JS, config metadata and type
  fixtures, modal register tests, live editor clipboard tests, generated
  config reference.
- Affected documentation: `docs/settings.md`, `docs/features.md`, generated
  `docs/config.md`, runtime help summary.
- No new runtime dependencies or peer dependency changes. Default `"none"`
  keeps existing behavior; compatible, not breaking.
