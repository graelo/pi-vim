## MODIFIED Requirements

### Requirement: Golden modal effect tests guard behavior-preserving extraction

The change SHALL add golden semantic tests that lock modal state/effect behavior
before and during feature-module extraction.

#### Scenario: Golden tests cover high-risk feature families

- **WHEN** `npm test` is executed
- **THEN** tests cover normalized state/effect output for prompt search, Ex
    command-line entry/cancel/history/apply/error behavior, visual
    char/line/block operations, macro record/play behavior, register/mark
    interactions, protected Pi delegation, and message/highlight state

#### Scenario: Golden tests normalize stable contract details

- **WHEN** golden modal effect tests assert modal updates
- **THEN** they compare stable semantic fields such as effect type/order,
    changed text, cursor target, register type/count, message kind/text, and
    relevant state flags rather than brittle raw internal
    dumps

#### Scenario: Adapter tests stay focused after extraction

- **WHEN** behavior is covered by parser, buffer, modal feature, and golden
    effect tests
- **THEN** adapter-level tests verify live editor construction, effect
    application, render/workbench integration, cursor restoration, and Pi
    delegation smoke behavior without duplicating every feature edge case
