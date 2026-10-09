## ADDED Requirements

### Requirement: Pre-rename configuration is ignored with warnings

The settings loader SHALL ignore the pre-1.0.0 `piVimMode` settings key and
the pre-1.0.0 `pi-vimmode.config.js` file, and SHALL add a retained warning for
each one it finds so `:vimdoctor` shows the rename.

#### Scenario: Old settings key warns

- **WHEN** global or project settings contain a `piVimMode` object
- **THEN** its values are not applied and the warnings include
    `<source> settings: piVimMode was renamed to piVim in 1.0.0 and is ignored`

#### Scenario: Old JS config file warns

- **WHEN** `pi-vimmode.config.js` exists next to the expected
    `pi-vim.config.js`
- **THEN** it is not loaded and the warnings include
    `<path> was renamed to pi-vim.config.js in 1.0.0 and is ignored`
