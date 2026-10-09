# Design

## Context

The motivation is in proposal.md. The current loader in `src/config.ts` works
in three steps:

- `loadVimOptions(paths)` reads `~/.pi/agent/settings.json` and
  `<cwd>/.pi/settings.json` through its own `readJsonFile`, then unwraps each
  file's `piVim` key.
- It loads the trusted JS config from `DEFAULT_JS_CONFIG_PATH`
  (`src/config-js.ts`). That load is seeded with the options resolved from the
  global layer.
- `resolveVimOptions(global, project, js)` layers global JSON, then JS, then
  project JSON. Presets apply per tier, project exact mappings take precedence
  (`applyProjectLayer`) and the leader resolves once at the end.

`src/lifecycle.ts` calls the loader with `{ cwd: ctx.cwd }` on each install
attempt. Warning texts carry a source label and a `piVim.`-prefixed option
path, for example `global settings: piVim.ui.status.enabled must be a
boolean`.

## Goals / Non-Goals

**Goals:**

- Locate and read files the same way the other `@graelo` extensions do.
- Keep `resolveVimOptions` layering byte-for-byte equivalent apart from labels
  and paths.

**Non-Goals:**

- The `src/config/` module split. It follows as a separate refactor on top of
  this change.
- Watching config files for changes. Reload still happens on install attempts.

## Decisions

### D1. `@graelo/pi-ext-config` locates and reads, pi-vim merges

`src/config.ts` reads each tier on its own:

- **Global tier:** `loadConfig("pi-vim", {}, { cwd, agentDir,
  includeProject: false })`.
- **Project tier:** `loadConfig("pi-vim", {}, { cwd, agentDir,
  includeProject: true })`, used only when trusted. The default `first-match`
  strategy returns the project file when it is readable. The project value is
  taken only when `sources[0]` equals the project candidate, which is
  `candidates[0]` when `candidates.length === 2`. Otherwise that tier is
  empty, because the result fell through to the global file.
- The two results' `diagnostics` are concatenated and de-duplicated. A
  malformed global file would otherwise be reported twice.

The raw objects feed the existing `resolveVimOptions(global, project, js)`,
which now parses the root object instead of its `piVim` member.

*Alternatives:*

- `deep-merge` in the library breaks preset-per-tier, project exact-mapping
  precedence, and the JS layer sitting between the two JSON tiers.
- Reading the project file with pi-vim's own `readJsonFile` would duplicate
  the library's read and parse diagnostics with different wording.

### D2. Trust is passed in, not looked up

The loader signature becomes
`loadVimOptions({ cwd, agentDir?, isProjectTrusted?, jsConfigPath? })`:

- `isProjectTrusted` defaults to `false`, which matches pi-searxng: with no
  trust decision, there is no project tier.
- `lifecycle.ts` passes `ctx.isProjectTrusted()`.
- `agentDir` and `jsConfigPath` exist for tests. Without `agentDir`, the
  library's `getAgentDir()` applies.

`VimConfigPaths` loses `globalSettingsPath` and `projectSettingsPath`, and
`defaultVimConfigPaths` is removed. Tests point `agentDir` and `cwd` at temp
directories with a `.git` marker.

*Alternative rejected:* reading trust from a module-level pi handle. That
would couple `src/config.ts` to the runtime, which the lifecycle spec
forbids.

### D3. JS config path derives from the agent dir

`DEFAULT_JS_CONFIG_PATH` becomes a function of the agent dir:
`join(agentDir ?? getAgentDir(), "extensions", "pi-vim", "config.js")`.

- `getAgentDir` is imported from `@earendil-works/pi-coding-agent`, already a
  peer of pi-vim.
- Using it in both places keeps the JSON and JS files side by side, even under
  `PI_CODING_AGENT_DIR` or a rebranded build.
- `JS_CONFIG_FILE_NAME` becomes `config.js`.
- `renamedJsConfigWarnings` and `warnRenamedSettingsKey` are deleted.

### D4. Option paths and source labels

- Warning paths drop `piVim.`: `${sourceLabel}: ui.status.enabled must be a
  boolean`.
- Source labels become `global config`, `global JS config` and
  `project config`.
- The `piVim.` prefix also appears in `src/config-metadata.ts`
  (settings-path metadata), `src/customization.ts`, `src/runtime-help.ts`,
  `scripts/generate-config-reference.ts` and the JS-config rule message
  fallback (`unsupported piVim.${path}`). `parsePiVim` already receives the
  inner options object, so only its labels change.
- `test/docs-drift.test.ts` matches settings paths in `docs/settings.md`. Its
  path pattern drops the prefix in step with the docs.

### D5. Docs and ADR

- `docs/settings.md`: the "Settings files and precedence" section lists the
  two JSON files, the trust gate, the git-root rule and the JS path. Examples
  lose the `piVim` wrapper.
- `docs/config.md` is regenerated.
- `README.md` quickstart and `docs/features.md` get matching path updates.
- A new ADR, created with `adrs new --link "8:Amends:Amended by"`, records
  the file layout and the library choice. ADR-0008's rename of the settings
  key no longer applies, but the rest of ADR-0008 stands, so it is amended
  rather than superseded.

## Risks / Trade-offs

- **The lifecycle forgets the trust flag:** the default is "untrusted", so
  this fails safe. The project tier just silently does nothing. → A lifecycle
  test asserts that the loader receives `isProjectTrusted` from the context.
- **The project root moved from `cwd` to the git root:** a user who starts pi
  in a subdirectory now gets the repo-level file, and no project config
  outside git. → The new behavior is documented in `docs/settings.md` and
  covered by a scenario.
- **Two library calls read the global file twice:** this is negligible, since
  it runs once per install attempt. → Diagnostics are de-duplicated (D1).
- **A new runtime dependency:** `@graelo/pi-ext-config` is small, owned by the
  same maintainer and already used by pi-searxng. → The `^0.2.0` range is
  pinned in `package.json` and the lockfile is regenerated with
  `npm install`.
- **Wide docs and spec churn:** most of it is mechanical prefix removal. →
  The docs-drift and config-reference checks catch misses.

## Migration Plan

There is no runtime migration. The CHANGELOG `[Unreleased]` entry tells users
to:

1. move the `piVim` object from `settings.json` into
   `<agent-dir>/extensions/pi-vim/config.json`, unwrapped;
2. move a project's `piVim` object into
   `<repo-root>/.pi/extensions/pi-vim/config.json`, unwrapped;
3. rename `~/.pi/agent/pi-vim.config.js` to
   `<agent-dir>/extensions/pi-vim/config.js`.

Rollback is a revert of the change commits.
