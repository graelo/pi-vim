# Spec Delta

## ADDED Requirements

### Requirement: Documentation describes Unicode keyword-word behavior

The user-facing feature and settings guides SHALL describe Unicode-aware
small-word behavior and complete keyword-word matching for `*` and `#` without
claiming full configurable Vim `'iskeyword'` parity.

#### Scenario: User reads word-motion documentation

- **WHEN** a user reads the small-word motion, text-object, or configured
    insert word-action documentation
- **THEN** it states that accented alphabetic characters remain within a
    keyword word while punctuation and whitespace retain their existing
    boundaries

#### Scenario: User reads word-under-cursor search documentation

- **WHEN** a user reads the `*` and `#` prompt-search documentation
- **THEN** it states that searches use the whole Unicode-aware keyword word
    and do not match that word as a substring of a larger keyword word

#### Scenario: Documentation states configuration boundary

- **WHEN** a user reads the word-behavior limitations
- **THEN** it does not imply that pi-vim exposes Vim's configurable
    `'iskeyword'` option
