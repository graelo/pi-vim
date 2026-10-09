## Context

Prompt transforms reached users three ways: Ex commands, a generic action
keymap (`piVimMode.keymap.actions`) with presets and recipes, and trusted JS
descriptors. The action keymap had its own scoping, conflict rejection, leader
expansion, and plan compilation, but prompt transforms were its only consumers.
`:changelog` depended on a packaged `CHANGELOG.md` parser and a Markdown popup
renderer used nowhere else.

## Goals / Non-Goals

**Goals:** remove the transform surface end to end, remove `:features` and
`:changelog`, keep every remaining Vim behavior and diagnostic unchanged, and
tell upgrading users what happened to their settings.

**Non-Goals:** a replacement formatting feature; reworking the remaining
read-only popups.

## Decisions

- **Remove the whole action keymap layer**, not just the transform IDs. Keeping
  an empty generic layer would leave dead scoping and conflict code in
  `src/config.ts` and `src/commands.ts`. Alternative considered: keep it for
  future surround actions; rejected because surround will be a Vim operator
  with its own grammar, not an arbitrary action.
- **Keep line shifts on a private helper.** `>>`/`<<` reused the transform
  engine's indent/dedent; they now call a two-function helper in
  `src/buffer.ts` with identical results.
- **Warn on removed settings.** `keymap.actions`, `keymap.actionPresets`, and
  `promptTransforms` produce "removed in 1.0.0" warnings surfaced by
  `:vimdoctor`, instead of the silent ignore that unknown keys get.
- **Drop the Markdown popup renderer** with `:changelog`; every remaining popup
  renders plain lines.

## Risks / Trade-offs

- Users relying on `:reflow` or `gq` recipes lose them; the warning and the
  CHANGELOG entry point that out.
- Several upstream tests used transforms as arbitrary mapping targets; they were
  retargeted to operator descriptors so JS-builder, leader, and unmap coverage
  stays.

## Migration Plan

Ship in 1.0.0 with a CHANGELOG "Removed" section. No settings migration
beyond the warnings.

## Open Questions

None.
