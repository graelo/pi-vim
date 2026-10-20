# Proposal

## Why

pi-vim currently classifies keyword characters for small-word operations and
`*`/`#` searches with an ASCII-only rule. Consequently, words such as
`création` are split at `é`; `*`/`#` also search substrings rather than complete
keyword words. This diverges from practical Vim/Neovim behavior and produces
surprising cursor stops and search results in ordinary accented prompt text.

## What Changes

- Define a shared Unicode-aware keyword-word model for pi-vim small-word
  operations, word text objects, configured insert word actions, and normal-mode
  `*`/`#`.
- Preserve lowercase small-word punctuation boundaries and uppercase `WORD`
  whitespace-only boundaries.
- Make `*`/`#` find complete keyword-word matches, not embedded literal
  substrings; preserve their existing prompt-local repeat, history, highlight,
  and no-op behavior.
- Correct user-facing documentation and OpenSpec requirements that currently
  describe word-under-cursor search as ASCII-only.

### Non-goals

- Adding Vim's configurable `'iskeyword'` option or general `.vimrc` parity.
- Changing literal `/` and `?` search semantics, or adding regex syntax beyond
  the existing explicit opt-in mode.
- Changing Pi-owned default insert behavior when no opt-in insert word binding
  is configured.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `prompt-buffer-operations`: small-word navigation, operators, text objects,
  and opt-in insert word actions use a shared Unicode-aware keyword model while
  retaining punctuation and `WORD` semantics.
- `vim-search`: normal-mode word-under-cursor search uses Unicode-aware complete
  keyword-word extraction and matching rather than ASCII substring matching.
- `pi-vim-documentation`: document the corrected keyword-word and `*`/`#`
  behavior.

## Impact

- Affected seams: pure word and search helpers in `src/buffer.ts`, search state
  and matcher use in `src/modal/search.ts`, and existing modal integration.
- Affected tests: focused buffer, search, modal, configured insert-action, and
  documentation-drift tests.
- Affected documentation: `docs/features.md` and, where its word-action wording
  changes, `docs/settings.md`.
- No new settings, runtime dependencies, peer dependency changes, or adapter
  APIs are needed.
- This is a behavior correction. Existing ASCII word behavior, punctuation
  boundaries, literal search, registers, and Pi shortcut ownership remain
  compatible.
