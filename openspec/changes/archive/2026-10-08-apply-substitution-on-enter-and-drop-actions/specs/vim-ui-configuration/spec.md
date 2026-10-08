## ADDED Requirements

### Requirement: Workbench messages render success and error states safely

The Vim editor SHALL render workbench feedback for search errors, Ex errors, and
Ex success counts without breaking visual selection, search highlights, or
cursor rendering.

#### Scenario: Substitution count is visible

- **WHEN** a substitution applies
- **THEN** the workbench row shows the Ex success count, such as
    `2 substitutions`

#### Scenario: Invalid regex search message is visible

- **WHEN** a pending regex search fails because the pattern is invalid or
    exceeds bounds
- **THEN** the workbench row shows a readable error message until the next
    handled input clears it

#### Scenario: Workbench message clears on next handled input

- **WHEN** a transient workbench error or success message is visible
- **THEN** the next handled input clears the message and restores the prompt
    viewport to its normal height unless workbench input is active again

#### Scenario: Visual selection composes with workbench row

- **WHEN** search or Ex workbench input was opened from a visual mode with an
    active selection
- **THEN** the prompt still renders the visual selection and the workbench row
    renders below the prompt box

#### Scenario: Search highlights compose with workbench row

- **WHEN** prompt search highlights are visible and search or Ex workbench
    input is active
- **THEN** search highlights remain visible in the prompt render and the
    workbench row renders below the prompt box

## MODIFIED Requirements

### Requirement: Shared workbench row renders search and Ex input width-safely

The Vim editor SHALL render pending `/`, `?`, and `:` workbench input in a
dedicated width-safe workbench area that composes with the prompt viewport,
configured row reservation, and existing Vim UI.

#### Scenario: Forward search workbench row is visible

- **WHEN** forward search input is pending
- **THEN** the rendered editor includes a width-safe workbench row showing the
    `/` prefix and current pending search text without inserting that text into
    the prompt buffer

#### Scenario: Backward search workbench row is visible

- **WHEN** backward search input is pending
- **THEN** the rendered editor includes a width-safe workbench row showing the
    `?` prefix and current pending search text without inserting that text into
    the prompt buffer

#### Scenario: Ex workbench row remains visible

- **WHEN** Ex command-line input is pending
- **THEN** the rendered editor includes a width-safe workbench row showing the
    `:` prefix and current pending Ex command text

#### Scenario: Workbench row shrinks prompt viewport by default

- **WHEN** a search or Ex workbench row is visible for active input, success,
    or error messaging and no workbench row reservation is configured
- **THEN** the prompt editor viewport uses one fewer terminal row so total
    rendering remains bounded

#### Scenario: Workbench row uses configured reserved rows

- **WHEN** `piVimMode.ui.workbench.reservedRows` is configured and a search,
    Ex, success, or error workbench row is visible
- **THEN** the prompt editor viewport uses the greater of one active workbench
    row and the configured reserved-row count so total rendering remains bounded
    and stable

#### Scenario: Reserved idle workbench area is width-safe

- **WHEN** `piVimMode.ui.workbench.reservedRows` is greater than zero and no
    search, Ex, success, or error workbench row is visible
- **THEN** the editor still reserves the configured blank workbench rows below
    the prompt while every rendered line fits within the provided width

#### Scenario: Long workbench text is truncated safely

- **WHEN** pending workbench text is longer than the available terminal width
- **THEN** the workbench row truncates or scrolls the displayed text without
    emitting lines wider than the terminal width

### Requirement: Workbench UI behavior is documented and validated

The change SHALL include automated rendering tests and user-facing documentation
for shared workbench display behavior, including configured reserved workbench
rows.

#### Scenario: Render validation runs

- **WHEN** `npm test` is executed
- **THEN** render tests cover `/`, `?`, and `:` workbench rows, long pending
    text, substitution success counts, transient regex
    errors, default viewport shrink behavior, configured reserved rows, idle
    reserved rows, visual selection composition, search highlight composition,
    and narrow terminal widths

#### Scenario: Typecheck runs

- **WHEN** `npm run check` is executed
- **THEN** the extension TypeScript compiles without type errors

#### Scenario: User docs describe workbench row

- **WHEN** the user opens `docs/features.md`
- **THEN** it documents where `/`, `?`, `:` workbench input, substitution
    counts, and errors appear and how active and configured
    reserved workbench rows affect prompt viewport height

### Requirement: Runtime informational messages are width-safe

The Vim editor SHALL render compact informational feedback and read-only popup
output without overflowing the editor viewport.

#### Scenario: Diagnostic output opens popup

- **WHEN** a read-only diagnostic command such as `:vimdoctor`, `:keymap`,
    or `:mapcheck` completes successfully
- **THEN** the diagnostic body is shown in a bounded read-only popup rather
    than appended only as one width-safe row below the prompt box

#### Scenario: Compact feedback still shrinks prompt viewport

- **WHEN** a compact diagnostic, parser error, edit success, edit error, or
    optional feedback message row is visible
- **THEN** the prompt editor viewport uses one fewer terminal row so total
    rendering remains bounded

#### Scenario: Long popup diagnostic message is fitted

- **WHEN** read-only diagnostic output is longer than the available overlay
    width or height
- **THEN** the popup truncates or fits rows to the available overlay width,
    caps visible height, and exposes local scrolling for hidden rows without
    corrupting prompt text rendering

#### Scenario: Compact long message is fitted

- **WHEN** a compact feedback message remains on the workbench row and is
    longer than the available terminal width
- **THEN** the rendered row is truncated or fitted according to existing
    width-safety behavior without corrupting prompt text rendering

### Requirement: Workbench row reservation is configurable

The Vim editor SHALL support `piVimMode.ui.workbench.reservedRows` as the
Pi-native configuration surface for reserving bounded workbench rows below the
prompt.

#### Scenario: Default workbench reservation preserves current layout

- **WHEN** no `piVimMode.ui.workbench.reservedRows` setting is configured and
    no workbench input or message is active
- **THEN** the editor reserves no idle workbench rows and preserves the
    existing prompt viewport height

#### Scenario: Active workbench row still appears with default reservation

- **WHEN** no `piVimMode.ui.workbench.reservedRows` setting is configured and
    search input, Ex input, success, or error feedback is active
- **THEN** the editor reserves one workbench row for active feedback according
    to existing behavior

#### Scenario: Reserved rows keep idle command area visible

- **WHEN** `piVimMode.ui.workbench.reservedRows` is set to `2` and no
    workbench input or message is active
- **THEN** the editor reserves two width-safe rows below the prompt and the
    prompt viewport uses two fewer terminal rows

#### Scenario: Active feedback renders within reserved rows

- **WHEN** `piVimMode.ui.workbench.reservedRows` is set to `2` and Ex
    command-line mode is active
- **THEN** the Ex command text renders in the reserved workbench area without
    subtracting an additional row beyond the configured two rows

#### Scenario: Reserved rows are bounded

- **WHEN** `piVimMode.ui.workbench.reservedRows` is configured with an
    unsupported value such as a negative number, non-integer, non-number, or
    value greater than the documented maximum
- **THEN** settings resolution records a warning, ignores the invalid field,
    preserves valid sibling UI settings, and uses the default workbench
    reservation

#### Scenario: Live editor honors workbench reservation

- **WHEN** a live `VimEditor` is constructed with resolved
    `piVimMode.ui.workbench.reservedRows`
- **THEN** rendering uses the resolved reserved-row count rather than silently
    falling back to defaults

#### Scenario: Settings reference documents workbench reservation

- **WHEN** the user opens `docs/settings.md`
- **THEN** it documents `piVimMode.ui.workbench.reservedRows`, default
    behavior, supported bounds, examples, and the relationship between reserved
    rows and active workbench feedback

### Requirement: Read-only Ex popup overlay is bounded and adapter-owned

The Vim editor SHALL display read-only Ex help and diagnostic output through a
bounded overlay owned by the Pi adapter rather than by prompt render rows.

#### Scenario: Read-only output is not appended to editor render rows

- **WHEN** a read-only Ex command such as `:help`, `:keybindings`, `:keymap`,
    `:mapcheck`, `:messages`, `:vimmode inspect`, or `:vimdoctor` completes
    successfully on a terminal that can show the overlay
- **THEN** the main editor render output remains focused on the
    prompt/status/workbench surface and the read-only command body appears in a
    centered bounded overlay

#### Scenario: Overlay close controls are local

- **WHEN** the read-only popup is visible and the user presses `Esc`,
    `Ctrl-C`, or `Ctrl-G`
- **THEN** the popup closes without editing prompt text, moving the prompt
    cursor, changing registers, changing marks, changing macros, changing search
    state, updating dot-repeat, or delegating those keys to Pi prompt editing

#### Scenario: Overlay scroll controls are local

- **WHEN** the read-only popup content overflows and the user presses `j`,
    `k`, Down, or Up
- **THEN** the popup scrolls within clamped bounds without editing prompt text
    or moving the prompt cursor

#### Scenario: Too-small viewport uses bounded fallback

- **WHEN** a valid read-only Ex command completes but the terminal cannot fit
    the minimum supported overlay viewport
- **THEN** the editor provides bounded visible feedback that the popup cannot
    be shown at the current size without silently dropping the command result or
    corrupting prompt editing state

## REMOVED Requirements

### Requirement: Workbench messages render preview, success, and error states safely

**Reason**: Some scenarios described the substitution confirm-preview step,
which was removed.

**Migration**: None; see "Workbench messages render success and error states
safely".
