# Spec Delta

## MODIFIED Requirements

### Requirement: Prompt-native structure editing is documented and validated

The change SHALL include automated validation and user-facing documentation for
prompt-native structures.

#### Scenario: Automated validation runs

- **WHEN** `npm test` is executed
- **THEN** tests cover structure range resolution, operator text objects, safe
    no-op behavior, and existing Vim behavior

#### Scenario: Typecheck runs

- **WHEN** `npm run check` is executed
- **THEN** the extension TypeScript compiles without type errors

#### Scenario: Feature guide documents prompt-native editing

- **WHEN** the user opens `docs/features.md`
- **THEN** it documents prompt-native text objects, examples, limitations, and
    validation commands

## REMOVED Requirements

### Requirement: Ex transforms reshape prompt ranges safely

**Reason**: Prompt transforms (`:quote`, `:unquote`, `:bulletize`, `:fence`,
`:indent`, `:dedent`, `:reflow`), their `prompt.transform.*` action keybindings,
and the recipe/preset bundles built on them were removed in 1.0.0.
**Migration**: Use Vim line shifts (`>>`, `<<`, visual `>`/`<`) and case
operators, or edit prompt text directly. `piVimMode.keymap.actions`,
`piVimMode.keymap.actionPresets`, and `piVimMode.promptTransforms` now warn and
are ignored.

### Requirement: Prompt transforms can be invoked by action keybindings

**Reason**: Prompt transforms (`:quote`, `:unquote`, `:bulletize`, `:fence`,
`:indent`, `:dedent`, `:reflow`), their `prompt.transform.*` action keybindings,
and the recipe/preset bundles built on them were removed in 1.0.0.
**Migration**: Use Vim line shifts (`>>`, `<<`, visual `>`/`<`) and case
operators, or edit prompt text directly. `piVimMode.keymap.actions`,
`piVimMode.keymap.actionPresets`, and `piVimMode.promptTransforms` now warn and
are ignored.
