# Spec Delta

## MODIFIED Requirements

### Requirement: Status UI items are configurable

The Vim editor SHALL read `ui.status` to determine which status items
are rendered and in what order while preserving the current status UI by
default.

#### Scenario: Default status UI preserved

- **WHEN** no `ui` setting is configured
- **THEN** the editor shows the current mode label, pending operator when
    present, and visual selection summary when visual selection is active

#### Scenario: Status item order configured

- **WHEN** `ui.status.items` is set to a valid ordered list of
    supported items
- **THEN** the editor renders those enabled status items in the configured
    order when each item has content

#### Scenario: Status UI disabled

- **WHEN** `ui.status.enabled` is set to `false`
- **THEN** the editor omits Vim status items while preserving prompt editing
    behavior and terminal-width safety

#### Scenario: Invalid status item falls back

- **WHEN** `ui.status.items` contains an unsupported item name
- **THEN** the unsupported item is ignored, a warning is recorded, and
    supported status items remain usable

#### Scenario: Status position defaults left

- **WHEN** no `ui.status.position` setting is configured
- **THEN** the complete ordered status group remains left-aligned

#### Scenario: Status position configured right

- **WHEN** `ui.status.position` is set to `"right"`
- **THEN** the complete ordered status group, including mode, pending state,
    selection, cursor position, and macro recording, renders in the right border
    slot

#### Scenario: Invalid status position falls back

- **WHEN** `ui.status.position` is neither `"left"` nor `"right"`
- **THEN** settings resolution records a warning, retains the inherited status
    position, and preserves valid sibling UI fields

### Requirement: Mode labels are configurable

The Vim editor SHALL support configured labels for insert, normal, characterwise
visual, and visual line modes.

#### Scenario: Mode labels configured

- **WHEN** `ui.mode.labels.normal` is set to a non-empty string and
    the editor is in normal mode
- **THEN** the rendered mode status uses the configured normal-mode label when
    width permits

#### Scenario: Narrow mode labels configured

- **WHEN** `ui.mode.narrowLabels.visualLine` is set to a non-empty
    string and available status width is narrow
- **THEN** the rendered visual-line mode status uses the configured narrow label

#### Scenario: Mode status disabled

- **WHEN** `ui.mode.enabled` is set to `false`
- **THEN** the mode label item is omitted from the Vim status UI

#### Scenario: Invalid mode label falls back

- **WHEN** a configured mode label is empty or not a string
- **THEN** that mode uses the default label and the rest of the UI config
    remains usable

### Requirement: Cursor position display is configurable

The Vim editor SHALL support optional line and column display in the Vim status
UI.

#### Scenario: Cursor position enabled

- **WHEN** `ui.cursorPosition.enabled` is set to `true`
- **THEN** the status UI includes the current cursor line and column using the
    configured base and format

#### Scenario: Cursor position base configured

- **WHEN** `ui.cursorPosition.base` is set to `0`
- **THEN** line and column values are rendered with zero-based coordinates

#### Scenario: Cursor position format configured

- **WHEN** `ui.cursorPosition.format` contains `{line}` and
    `{column}` placeholders
- **THEN** the status UI replaces those placeholders with the current cursor
    line and column values

#### Scenario: Invalid cursor position config falls back

- **WHEN** cursor position config has an unsupported base or invalid format
- **THEN** the invalid field falls back to default behavior and does not fail
    rendering

### Requirement: Visual selection status is configurable

The Vim editor SHALL support UI config for visual selection summaries without
changing selection semantics.

#### Scenario: Selection preview length configured

- **WHEN** `ui.selection.previewMaxChars` is set to a supported
    non-negative integer
- **THEN** visual selection preview text is truncated to that configured
    display width

#### Scenario: Selection status disabled

- **WHEN** `ui.selection.enabled` is set to `false`
- **THEN** active visual selections still highlight and operate normally, but
    selection summary text is omitted from the status UI

### Requirement: UI config is the only status configuration surface

The Vim editor SHALL use `ui` as the single source of truth for status
display and SHALL warn when legacy `vimOptions` aliases are
configured.

#### Scenario: Legacy Vim option aliases are ignored

- **WHEN** `vimOptions.showmode`, `showcmd`, or `ruler` is configured
- **THEN** the editor records a warning, ignores `vimOptions`, and renders
    status from `ui` and defaults only

### Requirement: UI configuration is width-safe, documented, and validated

The Vim editor MUST keep rendered output width-safe for every supported UI
configuration.

#### Scenario: Width safety preserved

- **WHEN** Pi renders the editor at any supported terminal width with
    configured status items, labels, selection preview, cursor position, and
    status position
- **THEN** every rendered line from the Vim editor fits within the provided
    width

#### Scenario: Aligned status group fits narrow widths

- **WHEN** the configured status group cannot fit within the provided width
- **THEN** the aligned group is truncated and the rendered border never
    exceeds the provided width

#### Scenario: Automated validation runs

- **WHEN** `npm test` is executed
- **THEN** tests cover default UI, configured labels, disabled items, item
    ordering, cursor position formatting, legacy Vim option rejection, invalid
    config fallback, and narrow-width rendering

#### Scenario: Settings reference documents UI config

- **WHEN** the user opens `docs/settings.md`
- **THEN** it documents `ui`, supported status items, label
    examples, cursor position examples, and unsupported full Vimscript/Neovim
    Lua import

### Requirement: Search highlight behavior is configurable

The Vim editor SHALL read `search` to control prompt search
highlighting while preserving safe defaults when settings are absent or invalid.

#### Scenario: Search highlighting defaults are enabled

- **WHEN** no `search` setting is configured
- **THEN** successful prompt search renders all literal matches and distinctly
    renders the current match

#### Scenario: Search highlighting disabled

- **WHEN** `search.highlight` is set to `false`
- **THEN** successful prompt search moves the cursor and updates repeat search
    state without rendering search highlights

#### Scenario: Current match highlight disabled

- **WHEN** `search.highlightCurrent` is set to `false`
- **THEN** successful prompt search renders matches with one search style
    instead of a distinct current-match style

#### Scenario: Highlight count is bounded

- **WHEN** `search.maxHighlights` is configured with a supported
    non-negative integer
- **THEN** rendered non-current search matches are limited to that count while
    search motion behavior remains unchanged

#### Scenario: Invalid search config falls back

- **WHEN** `search` contains invalid field types or unsupported values
- **THEN** invalid fields fall back to defaults, warnings are recorded, and
    the rest of the configuration remains usable

### Requirement: Search highlights clear on configured events

The Vim editor SHALL clear visible search highlights on configured cancellation
or editing events without corrupting repeat search state.

#### Scenario: Cancelled search clears highlights when configured

- **WHEN** search highlights are visible, `search.clearOnCancel` is
    `true`, and the user starts `/` then presses `Esc`
- **THEN** visible search highlights clear and prompt text remains unchanged

#### Scenario: Cancelled search preserves highlights when configured

- **WHEN** search highlights are visible, `search.clearOnCancel` is
    `false`, and the user starts `/` then presses `Esc`
- **THEN** existing visible search highlights remain

#### Scenario: Insert mode clears highlights when configured

- **WHEN** search highlights are visible, `search.clearOnInsert` is
    `true`, and the editor enters insert mode
- **THEN** visible search highlights clear while the previous search can still
    be repeated after returning to normal mode

#### Scenario: Insert mode preserves highlights when configured

- **WHEN** search highlights are visible, `search.clearOnInsert` is
    `false`, and the editor enters insert mode
- **THEN** visible search highlights remain until another configured clear
    event or successful search changes them

### Requirement: Ex command-line row is width-safe and composes with Vim UI

The Vim editor SHALL render the dedicated Ex command-line row without breaking
width safety, prompt viewport bounds, status UI, visual selection rendering,
search highlight rendering, or configured workbench row reservation.

#### Scenario: Ex row respects terminal width

- **WHEN** Ex command-line mode is active and Pi renders the editor at any
    supported terminal width
- **THEN** every rendered line, including the dedicated Ex row, fits within
    the provided width

#### Scenario: Ex row shrinks viewport while preserving status UI by default

- **WHEN** the Ex row is visible, status UI is enabled, and no workbench row
    reservation is configured
- **THEN** the prompt box and status UI render with one fewer viewport row
    while the Ex row renders below them

#### Scenario: Ex row uses configured reserved viewport

- **WHEN** the Ex row is visible and `ui.workbench.reservedRows` is
    greater than one
- **THEN** the prompt box and status UI render with the configured
    reserved-row count removed from the prompt viewport while the Ex row renders
    within the reserved workbench area

#### Scenario: Ex row composes with visual selection rendering

- **WHEN** Ex command-line mode was opened from a visual mode with an active
    selection
- **THEN** the prompt still renders the visual selection and the dedicated Ex
    row renders the editable Ex command text below the prompt box

#### Scenario: Ex row composes with search highlights

- **WHEN** prompt search highlights are visible and Ex command-line mode is
    active
- **THEN** search highlights remain visible in the prompt render and the
    dedicated Ex row renders below the prompt box

#### Scenario: Transient Ex message clears on next input

- **WHEN** a transient Ex error or success message is visible in the dedicated
    Ex row
- **THEN** the next handled input clears the message and restores the prompt
    viewport to its normal or configured reserved height unless Ex command-line
    mode is active again

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

- **WHEN** `ui.workbench.reservedRows` is configured and a search,
    Ex, success, or error workbench row is visible
- **THEN** the prompt editor viewport uses the greater of one active workbench
    row and the configured reserved-row count so total rendering remains bounded
    and stable

#### Scenario: Reserved idle workbench area is width-safe

- **WHEN** `ui.workbench.reservedRows` is greater than zero and no
    search, Ex, success, or error workbench row is visible
- **THEN** the editor still reserves the configured blank workbench rows below
    the prompt while every rendered line fits within the provided width

#### Scenario: Long workbench text is truncated safely

- **WHEN** pending workbench text is longer than the available terminal width
- **THEN** the workbench row truncates or scrolls the displayed text without
    emitting lines wider than the terminal width

### Requirement: Workbench row reservation is configurable

The Vim editor SHALL support `ui.workbench.reservedRows` as the
Pi-native configuration surface for reserving bounded workbench rows below the
prompt.

#### Scenario: Default workbench reservation preserves current layout

- **WHEN** no `ui.workbench.reservedRows` setting is configured and
    no workbench input or message is active
- **THEN** the editor reserves no idle workbench rows and preserves the
    existing prompt viewport height

#### Scenario: Active workbench row still appears with default reservation

- **WHEN** no `ui.workbench.reservedRows` setting is configured and
    search input, Ex input, success, or error feedback is active
- **THEN** the editor reserves one workbench row for active feedback according
    to existing behavior

#### Scenario: Reserved rows keep idle command area visible

- **WHEN** `ui.workbench.reservedRows` is set to `2` and no
    workbench input or message is active
- **THEN** the editor reserves two width-safe rows below the prompt and the
    prompt viewport uses two fewer terminal rows

#### Scenario: Active feedback renders within reserved rows

- **WHEN** `ui.workbench.reservedRows` is set to `2` and Ex
    command-line mode is active
- **THEN** the Ex command text renders in the reserved workbench area without
    subtracting an additional row beyond the configured two rows

#### Scenario: Reserved rows are bounded

- **WHEN** `ui.workbench.reservedRows` is configured with an
    unsupported value such as a negative number, non-integer, non-number, or
    value greater than the documented maximum
- **THEN** settings resolution records a warning, ignores the invalid field,
    preserves valid sibling UI settings, and uses the default workbench
    reservation

#### Scenario: Live editor honors workbench reservation

- **WHEN** a live `VimEditor` is constructed with resolved
    `ui.workbench.reservedRows`
- **THEN** rendering uses the resolved reserved-row count rather than silently
    falling back to defaults

#### Scenario: Settings reference documents workbench reservation

- **WHEN** the user opens `docs/settings.md`
- **THEN** it documents `ui.workbench.reservedRows`, default
    behavior, supported bounds, examples, and the relationship between reserved
    rows and active workbench feedback
