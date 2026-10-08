# Changelog

All notable changes to this project are documented in this file. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the
project uses [Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-10-08

Hard fork of [pekochan069/pi-vimmode](https://github.com/pekochan069/pi-vimmode)
at v0.9.0, published as `@graelo/pi-vimmode`. Editor behavior is unchanged
from 0.9.0 apart from the fix below.

### Changed

- Published as `@graelo/pi-vimmode`. Install with
  `pi install npm:@graelo/pi-vimmode`, and update the JSDoc import of trusted
  JavaScript config to `./npm/node_modules/@graelo/pi-vimmode/config`.
- The package now ships TypeScript sources directly; there is no bundled
  `dist/` build anymore.
- `:changelog` reads release notes from the packaged `CHANGELOG.md`, which
  replaces `RELEASE.md`.
- Development toolchain moved from Bun, rolldown, oxlint, oxfmt and lefthook
  to npm, tsc, vitest, tsx, biome and rumdl.

### Fixed

- Configured `easymotion` options (such as `labelColor`) are no longer dropped
  when resolved editor options are cloned.

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
