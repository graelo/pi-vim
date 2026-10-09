# Spec Delta

## MODIFIED Requirements

### Requirement: EasyMotion labels are render-only

The Vim editor SHALL render EasyMotion labels as transient visual substitutions
over target cells and MUST NOT write label text into the prompt buffer.

#### Scenario: Highlight state displays labels without editing

- **WHEN** EasyMotion enters highlight state for one or more targets
- **THEN** the rendered prompt displays each target label while the prompt
    text remains byte-identical

#### Scenario: Configured label color is applied

- **WHEN** EasyMotion labels are visible and `easymotion.labelColor`
    specifies an ANSI color
- **THEN** each non-cursor, non-selected target label uses that color followed
    by an ANSI reset

#### Scenario: Target occupies a wide cell

- **WHEN** an EasyMotion target occupies a terminal cell wider than its label
- **THEN** the renderer preserves the target cell's visible width and all
    rendered rows remain terminal-width safe

#### Scenario: Label overlaps cursor or visual selection

- **WHEN** an EasyMotion target coordinate also contains the cursor or active
    visual-selection styling
- **THEN** the target label remains visible while existing cursor or selection
    styling retains precedence over EasyMotion label color

#### Scenario: Label overlaps search highlight

- **WHEN** an EasyMotion target coordinate also has search highlighting
- **THEN** the EasyMotion label is rendered at that coordinate without
    changing stored search state or prompt text
