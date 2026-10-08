## RENAMED Requirements

<!-- rumdl-disable MD013 -->
- FROM: `### Requirement: Documentation drift metadata stays out of runtime help paths`
- TO: `### Requirement: Documentation drift metadata has one owner per registry`
<!-- rumdl-enable MD013 -->

## MODIFIED Requirements

### Requirement: Documentation drift metadata has one owner per registry

The project SHALL keep each piece of documentation drift metadata in exactly
one source: runtime help entries carry their own docs, spec, and test anchors
in the runtime help registry, and read-only popup command examples stay in
test/dev-owned sources that runtime modules do not import, while preserving
public runtime help and discovery behavior.

#### Scenario: Runtime registries expose only runtime-needed fields

- **WHEN** read-only popup builders and other runtime modules are imported by
    the extension runtime
- **THEN** they omit docs/test-only fields such as parser-only examples and
    popup documentation anchors, and the runtime help registry is the only
    runtime source of drift anchors

#### Scenario: Drift guard preserves coverage through dev metadata

- **WHEN** `npm test` runs the documentation drift guard
- **THEN** every runtime help entry is validated through its registry-owned
    anchors, and every read-only popup command through matching test/dev
    metadata that validates feature-doc anchors and parser examples

#### Scenario: Public runtime discovery behavior is unchanged

- **WHEN** users execute supported read-only discovery commands such as
    `:help`, `:keybindings`, `:keymap`, `:mapcheck`, `:vimdoctor`, `:messages`,
    or `:vim inspect`
- **THEN** the commands keep their existing bounded prompt-local popup or
    message behavior, finite topic coverage, non-goals, and read-only
    prompt-editing state boundaries

#### Scenario: Published runtime source excludes docs/test-only metadata

- **WHEN** the package is packed with its `src/` runtime sources
- **THEN** the runtime modules include no drift metadata other than the
    runtime help registry anchors, and in particular no popup parser examples
    or popup docs anchors moved to test/dev metadata
