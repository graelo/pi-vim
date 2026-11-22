# Spec Delta

## ADDED Requirements

### Requirement: Documentation describes the clipboard setting

The settings reference and feature guide SHALL document the `clipboard`
setting, its accepted values and default, which operations it redirects, and
which operations keep using prompt-local registers.

#### Scenario: User reads the settings reference

- **WHEN** a user reads `docs/settings.md`
- **THEN** it lists `clipboard` with default `"none"` and values `"none"`,
    `"unnamed"`, and `"unnamedplus"`, and explains redirected yank, delete,
    change, and paste, the fallback order, and unaffected named, black-hole,
    explicit clipboard, visual-line paste, and Ex `:put` behavior

#### Scenario: User reads the register feature guide

- **WHEN** a user reads the registers section of `docs/features.md`
- **THEN** it describes the `clipboard` setting and that host clipboard paste
    keeps the mirror type for text the prompt copied itself
