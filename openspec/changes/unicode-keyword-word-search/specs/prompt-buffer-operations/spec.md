# Spec Delta

## ADDED Requirements

### Requirement: Prompt buffer shares Unicode-aware small-word classification
The prompt buffer SHALL use one Unicode-aware keyword-word classification for
small-word navigation, word text objects, operator ranges, and configured
insert word actions. Keyword words include Unicode alphabetic characters,
decimal digits, and `_`; punctuation and whitespace remain separate classes.

#### Scenario: Accented word navigation remains contiguous
- **WHEN** a caller moves with a lowercase word motion through `création suivante`
- **THEN** `é` is part of `création`, so the motion does not stop before, on, or after that character

#### Scenario: Small-word punctuation boundaries remain distinct
- **WHEN** a caller moves with a lowercase word motion through `foo/bar`
- **THEN** the keyword runs and `/` remain separate small-word targets

#### Scenario: WORD navigation remains whitespace-delimited
- **WHEN** a caller moves with an uppercase WORD motion through accented or punctuation-heavy text
- **THEN** each contiguous non-whitespace span remains one target

#### Scenario: Shared word operations preserve Unicode classification
- **WHEN** a caller uses an operator motion, `iw` or `aw`, or a configured insert word action on an accented keyword word
- **THEN** its range treats the full accented word as one keyword run and preserves the command's existing cursor, register, and mode semantics
