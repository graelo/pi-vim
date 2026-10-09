## ADDED Requirements

### Requirement: Lifecycle installation refreshes settings and notifies warnings

The Vim extension lifecycle SHALL refresh Vim options during each install
attempt by loading settings for the active context `cwd`. It MUST NOT set a Pi
footer status entry. When the retained settings diagnostics change and contain
warnings, it SHALL show one transient warning notification with the warning
count that points to `:vimdoctor`.

#### Scenario: Settings load uses context cwd

- **WHEN** installation runs for a context with `cwd`
- **THEN** the lifecycle calls the Vim settings loader with that `cwd`

#### Scenario: Lifecycle sets no footer status

- **WHEN** installation, `/vimmode off`, or `/vimmode on` runs
- **THEN** the lifecycle MUST NOT call `setStatus`, so the extension adds no
    line to the Pi footer

#### Scenario: New settings warnings notify once

- **WHEN** the Vim settings loader returns warnings that differ from the
    retained diagnostics
- **THEN** the lifecycle notifies `pi-vimmode: N settings warnings; run
    :vimdoctor` at warning level

#### Scenario: Unchanged settings warnings stay quiet

- **WHEN** a later install returns the same warnings
- **THEN** the lifecycle shows no further notification

#### Scenario: Config module remains free of lifecycle behavior

- **WHEN** the lifecycle module is extracted
- **THEN** `src/config.ts` remains responsible for resolving/loading Vim
    options only and MUST NOT register Pi hooks, install editor components,
    schedule reload work, or track editor instances

## MODIFIED Requirements

### Requirement: Lifecycle hooks install the Vim editor component

The Vim extension lifecycle SHALL register Pi hooks that keep the Vim editor
component installed across session start, resource discovery, agent end, and
session shutdown events.

#### Scenario: Session start installs editor immediately and schedules reinstall

- **WHEN** Pi emits `session_start` with an extension context
- **THEN** the lifecycle installs the Vim editor component for that context
    immediately and schedules one delayed reinstall for the same context

#### Scenario: Resource discovery installs editor immediately and schedules reinstall

- **WHEN** Pi emits `resources_discover` with an extension context
- **THEN** the lifecycle installs the Vim editor component for that context
    immediately and schedules one delayed reinstall for the same context

#### Scenario: Agent end reinstalls editor immediately

- **WHEN** Pi emits `agent_end` with an extension context
- **THEN** the lifecycle installs the Vim editor component for that context
    without scheduling a delayed reinstall

#### Scenario: Existing Vim component is not churned

- **WHEN** the active UI editor component is already the lifecycle's Vim
    editor factory
- **THEN** installation refreshes Vim options but MUST NOT call
    `setEditorComponent` again

#### Scenario: Non-Vim component is replaced

- **WHEN** the active UI editor component is missing or different from the
    lifecycle's Vim editor factory
- **THEN** installation sets the UI editor component to the lifecycle's Vim
    editor factory

### Requirement: Delayed reinstall tolerates stale reload contexts

The Vim extension lifecycle SHALL tolerate stale context failures from delayed
reinstall callbacks while preserving immediate install failures.

#### Scenario: Delayed reinstall catches stale context failure

- **WHEN** a scheduled delayed reinstall throws because its context is stale
- **THEN** the lifecycle catches the error and allows later lifecycle hooks to
    reinstall the editor

#### Scenario: Immediate install failure surfaces

- **WHEN** an immediate install triggered by `session_start`,
    `resources_discover`, or `agent_end` throws
- **THEN** the lifecycle does not swallow the error before the delayed
    callback boundary

#### Scenario: Delayed reinstall refreshes settings again

- **WHEN** a scheduled delayed reinstall runs successfully
- **THEN** it refreshes Vim options before checking or setting the
    editor component

### Requirement: Lifecycle extraction is validated

The change SHALL include automated validation for the extracted lifecycle
behavior and preserve existing config/editor validation.

#### Scenario: Lifecycle tests run

- **WHEN** `npm test` is executed
- **THEN** tests cover lifecycle hook registration, immediate install, delayed
    reinstall scheduling, factory identity, settings refresh and warning
    notices, stale delayed context handling, and shutdown cleanup

#### Scenario: Existing tests continue to pass

- **WHEN** `npm test` is executed
- **THEN** existing Vim config, buffer, command, render, modal, and editor
    tests pass without behavior changes

#### Scenario: Typecheck runs

- **WHEN** the repository typecheck command is executed
- **THEN** the Vim mode extension compiles without TypeScript errors

### Requirement: Agent cursor lifecycle is validated

The lifecycle change SHALL include automated coverage for busy/idle cursor
coordination while preserving existing lifecycle installation behavior.

#### Scenario: Lifecycle tests cover busy and idle transitions

- **WHEN** `npm test` is executed
- **THEN** lifecycle tests cover `agent_start`, `agent_end`, editor creation
    before and during busy state, shutdown cleanup, and `/vimmode off` cleanup

#### Scenario: Existing install behavior remains stable

- **WHEN** lifecycle install hooks run for `session_start`,
    `resources_discover`, and `agent_end`
- **THEN** stable factory identity, settings refresh, delayed reinstall,
    warning notices, and stale delayed-context handling continue to satisfy
    existing lifecycle requirements

## REMOVED Requirements

### Requirement: Settings refresh is owned by lifecycle installation

**Reason**: pi-vimmode no longer sets a Pi footer status; the
`vim`/`vim ⚠`/`vim off` line wasted a row.

**Migration**: Settings warnings now show a one-time notification pointing to
`:vimdoctor`. See "Lifecycle installation refreshes settings and notifies
warnings".
