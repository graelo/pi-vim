# Spec Delta

## MODIFIED Requirements

### Requirement: Lifecycle installation refreshes settings and notifies warnings

The Vim extension lifecycle SHALL refresh Vim options during each install
attempt by loading settings for the active context `cwd` and the context's
project trust decision. It MUST NOT set a Pi
footer status entry. When the retained settings diagnostics change and contain
warnings, it SHALL show one transient warning notification with the warning
count that points to `:vimdoctor`.

#### Scenario: Settings load uses context cwd

- **WHEN** installation runs for a context with `cwd`
- **THEN** the lifecycle calls the Vim settings loader with that `cwd` and
    with the result of the context's `isProjectTrusted()`

#### Scenario: Trust change applies on the next install

- **WHEN** the user trusts a project after a session started and a later
    install attempt runs
- **THEN** that install reads the project config

#### Scenario: Lifecycle sets no footer status

- **WHEN** installation, `/vim off`, or `/vim on` runs
- **THEN** the lifecycle MUST NOT call `setStatus`, so the extension adds no
    line to the Pi footer

#### Scenario: New settings warnings notify once

- **WHEN** the Vim settings loader returns warnings that differ from the
    retained diagnostics
- **THEN** the lifecycle notifies `pi-vim: N settings warnings; run
    :vimdoctor` at warning level

#### Scenario: Unchanged settings warnings stay quiet

- **WHEN** a later install returns the same warnings
- **THEN** the lifecycle shows no further notification

#### Scenario: Config module remains free of lifecycle behavior

- **WHEN** the lifecycle module is extracted
- **THEN** `src/config.ts` remains responsible for resolving/loading Vim
    options only and MUST NOT register Pi hooks, install editor components,
    schedule reload work, or track editor instances
