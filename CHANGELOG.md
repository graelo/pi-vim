# Changelog

All notable changes to this project are documented in this file. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the
project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Fixed

- Uppercase normal-mode keys such as `X`, `A`, `O`, `G` and `P` now work in
  terminals that send Shift+letter as a Kitty event without the shifted key
  or as an xterm modifyOtherKeys event (pi's fallback under tmux). Before,
  `X` acted like `x` or did nothing.

## [1.0.0] - 2026-10-09

Hard fork of [pekochan069/pi-vimmode](https://github.com/pekochan069/pi-vimmode)
at v0.9.0, published as `@graelo/pi-vim`. Apart from the changes below,
editor behavior is unchanged from 0.9.0.

### Added

- Surround, following vim-surround: `ys{motion}{char}`, `yss{char}`,
  `ds{char}`, `cs{old}{new}`, and visual `S{char}`. Supports counts, `.`
  repeat, and the vim-surround pair rules (`(` adds spaces, `)` and `b` do
  not). Keys are configurable under `keymap.operators.surround` and
  `keymap.commands`. See the Surround section of `docs/features.md`.
- `guu`, `gUU`, and `g~~` line forms, next to `gugu`, `gUgU`, and `g~g~`.
- `iW` and `aW` text objects for whitespace-delimited WORDs (target
  `bigWord`, default `W`).
- `` i` `` and `` a` `` text objects for backtick-quoted strings (target
  `backtick`).
- Counted paste: `3p` and `3P` paste three copies, including from named and
  clipboard registers.
- Sentence motions `(` and `)`, with counts, in normal and visual modes and
  after operators (`d)`, `c(`, `y)`), and `is`/`as` sentence text objects.
  Sentences follow `:help sentence`. Keys are configurable under
  `keymap.motions.sentenceBackward`, `sentenceForward`, and
  `keymap.textObjects.targets.sentence`. Explicit `keymap.operatorMotions`
  lists need the new motions added to allow `d)` and friends.
- Mode label colors: `ui.mode.colors.<mode>` takes `{ "bg", "fg" }`, each a
  256-color palette index (`0`–`255`, following the terminal theme) or a
  `"#rrggbb"` hex string, and draws the mode label as a padded colored block.
  `visualLine` and `visualBlock` fall back to the `visual` colors. Off by
  default; also settable from trusted JS as `vim.ui.mode.colors`.

### Changed

- **Breaking:** options moved out of Pi's `settings.json` into pi-vim's own
  files (via `@graelo/pi-ext-config`); the old locations are ignored. Move,
  without the `piVimMode` wrapper:
  - global options to `<agent-dir>/extensions/pi-vim/config.json`
    (`<agent-dir>` is `~/.pi/agent`, or `PI_CODING_AGENT_DIR`);
  - project options to `<repo-root>/.pi/extensions/pi-vim/config.json`, read
    only in a trusted git repository;
  - `~/.pi/agent/pi-vimmode.config.js` to
    `<agent-dir>/extensions/pi-vim/config.js`, with its JSDoc type import set
    to `../../npm/node_modules/@graelo/pi-vim/config`.
- Editing now follows Vim in these cases:
  - leaving insert mode moves the cursor one character left, unless it is at
    the start of the line;
  - `iw`/`aw` use Vim word classes, so `iw` stops at punctuation (use `iW` for
    the previous whitespace-delimited behavior);
  - quote text objects pair quotes as Vim does, so `ci"` works with the cursor
    on a quote or before the first string, and skip backslash-escaped quotes;
    `a"` and `a'` include surrounding blanks;
  - bracket text objects work with the cursor on the closing bracket;
  - `dt,` right before a comma deletes the character under the cursor, and
    `F`/`T` operator targets no longer include it;
  - a register prefix works before counts, text objects, and character
    searches (`"adiw`, `"a2yy`, `"adt,`), and commands that do not use
    registers run and consume it (`"aj` moves down) instead of being
    cancelled.
- Published as `@graelo/pi-vim`; install with `pi install npm:@graelo/pi-vim`.
  `/vimmode` is now `/vim`, `:vimmode inspect` is now `:vim inspect`, and
  diagnostic metadata IDs moved from `vimmode.*` to `pi-vim.*`.
- The package now ships TypeScript sources directly; there is no bundled
  `dist/` build anymore.
- `RELEASE.md` is replaced by this `CHANGELOG.md`.
- Development toolchain moved from Bun, rolldown, oxlint, oxfmt and lefthook
  to npm, tsc, vitest, tsx, biome and rumdl.
- `:s` and `:&` apply on the first `Enter`, as in Vim, instead of first showing
  a match preview that needed a second `Enter`. Use the `n` flag
  (`:s/old/new/gn`) to count matches without editing.
- The `vim` / `vim ⚠` / `vim off` Pi footer status is gone, so the extension
  no longer takes a footer line. New settings warnings show a one-time
  notification pointing to `:vimdoctor` instead.

### Removed

- Prompt transforms: the `:quote`, `:unquote`, `:bulletize`, `:fence`,
  `:indent`, `:dedent`, and `:reflow` Ex commands, the `prompt.transform.*`
  actions, and their `vim.prompt.*` and `vim.action.prompt.transform.*`
  factories in trusted JavaScript config. Use Vim line shifts (`>>`, `<<`,
  visual `>`/`<`) for indentation.
- The action keymap layer and its presets: `keymap.actions`,
  `keymap.actionPresets`, and `promptTransforms`. These
  settings now produce a "removed in 1.0.0" warning (see `:vimdoctor`) and are
  ignored.
- `:features`; use `:help`, `:keybindings`, and `:mapcheck`.
- `:changelog` and its Markdown popup renderer.
- `:actions`; use `:keymap <query>` to search actions and their bindings.
- The `pi-vim.*` diagnostic action IDs (`pi-vim.doctor`, `pi-vim.help`, and
  so on). `:keymap` and `:help` searches no longer list them; use
  `:help customization` for the diagnostic commands.

### Fixed

- Configured `easymotion` options (such as `labelColor`) are no longer dropped
  when resolved editor options are cloned.
- An empty array under `keymap.insert.<action>` now clears that
  action's inherited bindings, including ones added by global JS config, as it
  already did for other keymap groups.

## [0.9.0] - 2026-07-23

### What's new

- Added manual `:changelog` display of packaged current-version release notes
    in the existing read-only popup, with semantic Markdown rendering,
    width-safe prose wrapping, preserved code indentation, rendered-row
    scrolling, and explicit unavailable fallback.

- Added trusted JavaScript configuration via
    `~/.pi/agent/pi-vimmode.config.js`. Configure presets, leader, cursor mode,
    UI, macros, marks, search, Ex command, prompt structures/transforms, action
    presets, prompt/insert actions, replay mappings, and scoped unmaps with a
    small `vim` API. Configuration writes are validated and staged atomically;
    defaults, global JSON, JavaScript, and project JSON compile into one
    immutable scoped plan before activation. Project JSON remains final
    authority, and failed config files leave existing settings unchanged.

```js
/** @type {import("./npm/node_modules/pi-vimmode/config").VimConfig} */
export default (vim) => {
  vim.g.mapleader = " ";
  vim.keymap.set("n", "<leader>q", vim.prompt.quote());
  vim.keymap.set("n", "zq", null);
};
```

- Added declaration-only JavaScript/TypeScript definitions for trusted config
    through `pi-vimmode/config`. `VimConfig` types synchronous or asynchronous
    root exports, while `VimConfigApi` types imported helpers and presets.
    Because the global config lives outside Pi's npm directory, use the exact
    relative JSDoc import shown above for editor completion and type checking.
    No runtime config helper or module is added.

- Added scoped action-keymap descriptors for trusted JavaScript.
    `vim.keymap.set` accepts finite actions in normal, visual, insert, or
    operator-pending scopes; supports compatibility mode aliases, scoped
    `unmap`, deterministic conflict resolution, protected-shortcut overrides,
    and bounded replay mappings. Project settings remain final authority.

- Added configurable Vim leader mappings. Set `piVimMode.leader` in JSON or
    `vim.g.mapleader` in trusted JavaScript, then use `<leader>` at the start of
    mapping keys. Project settings can override or clear inherited leaders.

```json
{
  "piVimMode": {
    "leader": " ",
    "keymap": {
      "commands": {
        "visualBlock": ["<leader>v"]
      }
    }
  }
}
```

- Added `piVimMode.ui.status.position` to place the complete editor-border
    status group on the left or right side of the editor.
    [#21](https://github.com/pekochan069/pi-vimmode/pull/21)
    [@alanpog](https://github.com/alanpog)

```json
{
  "piVimMode": {
    "ui": {
      "status": {
        "position": "right"
      }
    }
  }
}
```

- Added configurable EasyMotion-style character jumps. Bind the `easymotion`
    command, enter a target character, then press one of up to 52
    case-insensitive labels to jump across the prompt. Set
    `piVimMode.easymotion.labelColor` to customize the ANSI label color.
    [#49](https://github.com/pekochan069/pi-vimmode/pull/49)
    [@tecfu](https://github.com/tecfu)

```json
{
  "piVimMode": {
    "keymap": {
      "commands": {
        "easymotion": ["<leader><leader>"]
      }
    },
    "easymotion": {
      "labelColor": "\u001b[31m"
    }
  }
}
```

### Bug fixes

- Fixed character-search repeats: `,` now keeps opposite original `f`, `F`,
    `t`, or `T` direction, and `;` now advances `t` and `T` searches.
- Fixed normal-mode `a` crossing into the next logical line when invoked at
    end of line, including on wrapped prompts followed by a blank line.
