## 1. Runtime

- [x] 1.1 Delete transform registry, recipes/presets, release notes, Markdown popup, and modal action modules
- [x] 1.2 Remove the action keymap layer from config resolution, command resolution, and plan compilation
- [x] 1.3 Replace the transform engine with a private line-shift helper for `>>`/`<<`
- [x] 1.4 Remove transform, `:features`, and `:changelog` Ex commands and suggestions
- [x] 1.5 Remove transform factories, `keymap.actionPresets`, and `promptTransforms` from trusted JS config and public types
- [x] 1.6 Warn on removed settings without dropping valid siblings

## 2. Diagnostics and help

- [x] 2.1 Remove transforms from `:actions`, `:keymap`, `:keybindings`, and `:mapcheck`
- [x] 2.2 Remove `:features` runtime help and `vimmode.features` metadata

## 3. Docs and examples

- [x] 3.1 Update `docs/features.md`, `docs/settings.md`, README, CONTEXT.md, and regenerate `docs/config.md`
- [x] 3.2 Rewrite examples to use `vim.action.*` descriptors and prompt structures
- [x] 3.3 Remove obsolete solution docs and dangling links

## 4. Validation

- [x] 4.1 Remove tests for deleted behavior; retarget mapping tests to operator descriptors
- [x] 4.2 `npm test`, `npm run check`, `npm run lint`, `npm run check:config-reference`
- [x] 4.3 `openspec validate --specs --strict`
