## MODIFIED Requirements

### Requirement: Feature guide covers customization diagnostics

The project SHALL document runtime customization diagnostics in
`docs/features.md` as part of the supported pi-vimmode behavior guide.

#### Scenario: User reads diagnostic command documentation

- **WHEN** a user opens `docs/features.md`
- **THEN** the document explains `:vimdoctor`, `:keymap`, and `:mapcheck` with
    practical examples and explicit limitations

#### Scenario: User troubleshoots vim warning status

- **WHEN** a user opens `docs/features.md` after a settings warning
    notification
- **THEN** the document explains that `:vimdoctor` reports retained settings
    diagnostics and that invalid fields are ignored without discarding valid
    siblings

#### Scenario: User checks non-goals

- **WHEN** a user reads the customization diagnostics section
- **THEN** the document states that pi-vimmode does not support `.vimrc`,
    recursive mappings, Vimscript, Neovim Lua, or a full interactive Vim command
    palette
