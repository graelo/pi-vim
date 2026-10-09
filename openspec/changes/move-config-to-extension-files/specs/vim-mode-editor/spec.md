# Spec Delta

## MODIFIED Requirements

### Requirement: Mode feedback is visible and width-safe

The Vim editor SHALL render Vim status feedback according to the resolved UI
configuration and MUST keep every rendered line within the terminal width. With
no UI configuration, the current `INSERT`, `NORMAL`, `VISUAL`, and `V-LINE`
feedback remains visible, including while Pi autocomplete or slash-command
completion is active.

#### Scenario: Mode label updates

- **WHEN** the editor switches between insert, normal, characterwise visual,
    and visual line modes with default UI configuration
- **THEN** the rendered editor shows `INSERT`, `NORMAL`, `VISUAL`, or `V-LINE`
    feedback matching the active mode

#### Scenario: Configured mode label updates

- **WHEN** the editor switches modes and `ui.mode.labels` configures
    labels for those modes
- **THEN** the rendered editor shows the configured active-mode label where
    the mode status item is enabled and width permits

#### Scenario: Status group can be right-aligned

- **WHEN** `ui.status.position` is set to `"right"`
- **THEN** the complete ordered status group, including mode, pending state,
    visual selection status, cursor position, and macro recording, renders at
    the right edge

#### Scenario: Mode status can be hidden by config

- **WHEN** `ui.mode.enabled` is set to `false` or the status item
    list omits `mode`
- **THEN** the rendered editor omits mode feedback from both border slots
    while preserving prompt editing behavior

#### Scenario: Render width respected

- **WHEN** Pi renders the editor with any supported terminal width and any
    supported UI configuration
- **THEN** every rendered line from the editor fits within the provided width

#### Scenario: Visual selection status shown

- **WHEN** the editor is in visual mode with a non-empty selection and the
    selection status item is enabled
- **THEN** the rendered feedback includes a visible indication of visual mode
    and selection size, range, or preview according to UI configuration

#### Scenario: Visual selection status hidden by config

- **WHEN** the editor is in visual mode with a non-empty selection and
    `ui.selection.enabled` is set to `false`
- **THEN** visual highlighting remains active but visual selection summary
    text is omitted from the status UI

#### Scenario: Autocomplete popup does not hide mode feedback

- **WHEN** the editor is in insert mode, Pi autocomplete or slash-command
    completion is active, and the resolved UI configuration shows the mode
    status item
- **THEN** the rendered editor keeps the active mode feedback visible without
    hiding the completion UI

#### Scenario: Single-row autocomplete keeps insert feedback visible

- **WHEN** the editor is in insert mode and Pi autocomplete or slash-command
    completion has only one visible completion row
- **THEN** the rendered editor still shows `INSERT` feedback where width permits

### Requirement: Configured escape aliases leave insert, visual, and Ex command-line states

The Vim editor SHALL treat configured `keymap.escape` sequences as
aliases for physical `Esc` in insert mode when autocomplete is inactive, in
visual modes, and while an Ex command-line is pending, while preserving default
insert-mode delegation for all unrelated input.

#### Scenario: Configured alias exits insert mode

- **WHEN** `keymap.escape` includes `<D-j>`, autocomplete is
    inactive, and the editor is in insert mode
- **THEN** pressing the corresponding modified `j` key enters normal mode and
    does not insert text into the prompt

#### Scenario: Physical escape remains supported

- **WHEN** the editor is in insert mode and the user presses physical `Esc`
- **THEN** the editor follows existing behavior and enters normal mode when
    autocomplete is inactive

#### Scenario: Unrelated insert text remains delegated

- **WHEN** `keymap.escape` includes `<D-j>` and the editor receives
    ordinary insert-mode text
- **THEN** the text is delegated to Pi's default editor behavior and inserted
    normally

#### Scenario: Raw text chords remain text

- **WHEN** `keymap.escape` is configured with raw text such as `jk`
- **THEN** the invalid alias is ignored, typing `j` followed by `k` inserts
    `jk`, and the editor remains in insert mode

#### Scenario: Alias does not fire while autocomplete is open

- **WHEN** `keymap.escape` includes `<D-j>`, Pi autocomplete is
    open, and the editor is in insert mode
- **THEN** pressing the configured modified key delegates to Pi
    autocomplete/default editing behavior instead of entering normal mode

#### Scenario: Configured alias exits visual modes

- **WHEN** `keymap.escape` includes `<D-j>` and the editor is in
    visual, visual-line, or visual-block mode
- **THEN** pressing the corresponding modified key cancels visual selection
    and enters normal mode like physical `Esc`

#### Scenario: Configured alias cancels pending Ex command-line

- **WHEN** `keymap.escape` includes `<D-j>` and the editor has a
    pending `:` Ex command-line
- **THEN** pressing the corresponding modified key cancels the pending Ex
    command-line like physical `Esc` without delegating to Pi

#### Scenario: Normal mode keeps existing key behavior

- **WHEN** `keymap.escape` includes `<D-j>` and the editor is in
    normal mode
- **THEN** existing normal-mode behavior remains unchanged and the escape
    alias is not evaluated

### Requirement: Insert escape aliases preserve modal side effects

The Vim editor SHALL integrate insert escape alias handling with existing modal
state, adapter fast-path, macro, redo, and render boundaries without changing
default behavior when aliases are absent.

#### Scenario: Fast path remains safe

- **WHEN** `keymap.escape` includes `<D-j>`
- **THEN** ordinary insert text may still use the guarded insert fast path,
    while configured alias input is routed through modal handling

#### Scenario: Macro recording preserves alias behavior

- **WHEN** macro recording is active and the user records insert text followed
    by a configured insert escape alias
- **THEN** replaying the macro reproduces the same inserted text and mode
    transition without inserting escape alias text

#### Scenario: Redo and search state remain consistent

- **WHEN** insert escape alias handling routes input through modal handling
- **THEN** redo history, search highlights, transient messages, visual state,
    registers, marks, and cursor styling follow the same side-effect rules as
    equivalent existing insert-mode delegation and physical `Esc` transitions

#### Scenario: Default behavior is unchanged without aliases

- **WHEN** no `keymap.escape` setting is configured
- **THEN** insert-mode typing, physical `Esc`, autocomplete, Pi shortcuts,
    macro recording/replay, and fast-path delegation behave as they did before
    this change

#### Scenario: Automated validation covers insert escape behavior

- **WHEN** `npm test` is executed
- **THEN** tests cover alias success, raw text rejection, autocomplete
    preservation, visual mode escape, normal-mode non-participation, macro
    recording/replay, fast-path guarding, and default behavior without aliases

### Requirement: Insert mode supports configured line opening

The Vim editor SHALL support opt-in insert-mode line-opening commands that open
a blank prompt line above or below the current line while preserving insert mode
and default Pi delegation for unconfigured input.

#### Scenario: Default insert mode remains delegated

- **WHEN** the editor is in insert mode with no configured insert newline
    binding and receives a non-escape key such as `Ctrl+J`
- **THEN** the input delegates to Pi/default insert behavior and prompt text
    is not changed by pi-vim line-opening logic

#### Scenario: Configured insert command opens line below

- **WHEN** the editor is in insert mode, autocomplete is inactive,
    `keymap.insert.openLineBelow` includes `ctrl+j`, and the user
    presses `Ctrl+J`
- **THEN** a blank line is inserted below the current prompt line, the cursor
    moves to that blank line, and the editor remains in insert mode

#### Scenario: Configured insert command opens line above

- **WHEN** the editor is in insert mode, autocomplete is inactive,
    `keymap.insert.openLineAbove` includes `ctrl+k`, and the user
    presses `Ctrl+K`
- **THEN** a blank line is inserted above the current prompt line, the cursor
    moves to that blank line, and the editor remains in insert mode

#### Scenario: Empty prompt stays editable

- **WHEN** the editor is in insert mode with an empty prompt and receives a
    configured insert newline binding
- **THEN** the prompt remains editable with the cursor on a blank line in
    insert mode

#### Scenario: Autocomplete keeps Pi ownership

- **WHEN** the editor is in insert mode, Pi autocomplete or slash-command
    completion is active, and the user presses a configured insert newline
    binding
- **THEN** the input delegates to Pi/default autocomplete behavior instead of
    opening a prompt line through pi-vim

#### Scenario: Insert line opening preserves modal side state boundaries

- **WHEN** a configured insert newline binding successfully changes prompt text
- **THEN** search highlights clear like other prompt text edits, and
    registers, marks, visual state, macro slots, dot-repeat state, and mode
    remain otherwise unchanged

### Requirement: Leaving insert mode moves the cursor left

The Vim editor SHALL move the cursor one character left when it leaves insert
mode through `Esc` or a configured escape alias, unless the cursor is at the
start of its line, as Vim does. Block insert and autocomplete handling keep
their own cursor behavior.

#### Scenario: Escape after appending at line end

- **WHEN** the prompt is `hello`, the user presses `A`, types `!`, and presses
    `Esc`
- **THEN** the editor is in normal mode with the cursor on `!`

#### Scenario: Escape at line start keeps the column

- **WHEN** the cursor is at the start of a line in insert mode and the user
    presses `Esc`
- **THEN** the editor is in normal mode with the cursor still at the start of
    that line

#### Scenario: Escape alias moves the cursor left

- **WHEN** `keymap.escape` includes `<D-j>`, the cursor is after `abc`
    in insert mode, and the user presses `<D-j>`
- **THEN** the editor is in normal mode with the cursor on `c`

#### Scenario: Wide characters are not split

- **WHEN** the cursor is right after an emoji in insert mode and the user
    presses `Esc`
- **THEN** the cursor lands on the start of that emoji
