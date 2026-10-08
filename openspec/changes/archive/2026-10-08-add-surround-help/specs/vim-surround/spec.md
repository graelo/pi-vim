## ADDED Requirements

### Requirement: Runtime help covers surround

The Vim editor SHALL answer `:help surround` with a compact source-backed
entry naming the surround keys, examples, and limits.

#### Scenario: Help topic for surround

- **WHEN** the editor executes `:help surround`, `:help ys`, or `:help cs`
- **THEN** the help popup shows the surround entry with `ys`, `yss`, `ds`,
    `cs`, and visual `S`, and states that tags and function surrounds are not
    supported
