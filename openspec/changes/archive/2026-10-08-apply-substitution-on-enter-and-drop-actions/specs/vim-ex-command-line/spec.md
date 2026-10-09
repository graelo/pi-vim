## ADDED Requirements

### Requirement: Ex command-line input uses minimal editing controls and executes on Enter

The Vim editor SHALL keep Ex command-line editing finite, prompt-local,
cursor-aware, and separate from prompt-buffer editing while preserving shared
workbench history.

#### Scenario: Type Ex command text at end

- **WHEN** Ex command-line mode is active, the command cursor is at the end of
    the Ex command text, and the user types printable characters
- **THEN** those characters are appended to the Ex command text and are not
    inserted into the prompt buffer

#### Scenario: Type Ex command text at cursor

- **WHEN** Ex command-line mode is active, the user moves the command cursor
    left, and the user types printable characters
- **THEN** those characters are inserted at the command cursor, the command
    cursor advances after the inserted text, and prompt text remains unchanged

#### Scenario: Backspace edits Ex command text at cursor

- **WHEN** Ex command-line mode is active and the user presses `Backspace`
- **THEN** the editable Ex command character before the command cursor is
    removed when one exists, the command cursor is clamped to the edited command
    text, and prompt text remains unchanged

#### Scenario: Delete edits Ex command text at cursor

- **WHEN** Ex command-line mode is active and the user presses the resolved
    forward-delete key
- **THEN** the editable Ex command character after the command cursor is
    removed when one exists, and prompt text remains unchanged

#### Scenario: Cursor movement edits no prompt text

- **WHEN** Ex command-line mode is active and the user presses resolved
    command-line movement keys such as Left, Right, Home, End, word-left, or
    word-right
- **THEN** only the Ex command cursor moves within command-text bounds and
    prompt text remains unchanged

#### Scenario: Word deletion is bounded

- **WHEN** Ex command-line mode is active and the user presses the resolved
    command-line delete-word key
- **THEN** only the word or whitespace run adjacent to the Ex command cursor
    is removed from the Ex command text, and prompt text remains unchanged

#### Scenario: History recall updates command cursor

- **WHEN** Ex command-line input is active and history navigation replaces the
    pending Ex command text
- **THEN** the command cursor moves to the end of the recalled command and
    prompt text remains unchanged

#### Scenario: Enter executes Ex command text

- **WHEN** Ex command-line mode is active with a non-empty command, including a
    substitution, and the user presses `Enter` or `Return`
- **THEN** the editor parses and executes the Ex command text and exits Ex
    command-line mode

### Requirement: Ex substitution applies on Enter

The Vim editor SHALL apply a valid substitution when the user presses `Enter`,
as Vim does, and report the substitution count in the Ex row.

#### Scenario: Literal substitution applies

- **WHEN** the editor is in Ex command-line mode with `:%s/foo/bar/g` and the
    addressed range contains three literal matches
- **THEN** `Enter` replaces the three matches, exits Ex command-line mode,
    preserves documented cursor intent, and reports `3 substitutions`

#### Scenario: Regex substitution applies

- **WHEN** the editor is in Ex command-line mode with `:%s/TODO|FIXME/done/gr`
    and the addressed range contains two regex matches
- **THEN** `Enter` replaces the two matches and reports `2 substitutions`

#### Scenario: Cancel before Enter is safe

- **WHEN** a substitution command is pending in Ex command-line mode and the
    user presses `Esc`
- **THEN** Ex command-line mode closes according to the source mode's
    cancellation semantics and prompt text remains unchanged

#### Scenario: Pattern not found is safe

- **WHEN** the editor executes a valid substitution command whose pattern has
    no matches in the addressed range
- **THEN** the editor reports a readable pattern-not-found Ex error, exits Ex
    command-line mode, and prompt text remains unchanged

#### Scenario: Identical replacement reports success without editing

- **WHEN** the editor executes `:s/foo/foo/` and the addressed line contains
    `foo`
- **THEN** the editor reports `1 substitution` without applying a text-change
    effect

### Requirement: Ex command-line supports read-only customization diagnostics

The Vim editor SHALL parse and execute finite read-only Ex commands for
customization diagnostics, displaying successful diagnostic output in a bounded
read-only popup.

#### Scenario: Vimdoctor command executes

- **WHEN** Ex command-line mode is active and the user executes `:vimdoctor`
- **THEN** the editor exits Ex command-line mode and opens a bounded read-only
    popup containing the customization diagnostic output

#### Scenario: Keymap command executes with optional query

- **WHEN** Ex command-line mode is active and the user executes `:keymap` or
    `:keymap redo`
- **THEN** the editor exits Ex command-line mode and opens a bounded read-only
    popup describing matching effective keymap entries

#### Scenario: Mapcheck command requires a query

- **WHEN** Ex command-line mode is active and the user executes
    `:mapcheck ctrl+p`
- **THEN** the editor exits Ex command-line mode and opens a bounded read-only
    popup explaining the queried key or key sequence

### Requirement: Ex line ranges support finite address offsets for all range commands

The Vim editor SHALL support signed line offsets on finite Ex line addresses for
supported line-oriented Ex commands.

#### Scenario: Offset from current line executes

- **WHEN** the editor is on prompt line 2 of a four-line prompt and executes
    `:.,.+1delete`
- **THEN** prompt lines 2 and 3 are deleted, the unnamed register receives
    those lines as linewise text, and the Ex row reports the deleted line count

#### Scenario: Offset from last line executes

- **WHEN** the editor executes `:$-1,$join` in a prompt with at least two lines
- **THEN** the last two prompt lines are joined according to existing Ex join
    whitespace and message semantics

#### Scenario: Offset from numeric line executes

- **WHEN** the editor executes `:3+1yank` in a prompt with at least four lines
- **THEN** prompt line 4 is copied to the unnamed register as linewise text
    and prompt text remains unchanged

#### Scenario: Offset range applies to substitution

- **WHEN** the editor executes `:2,2+1s/foo/bar/g` in a prompt where lines 2
    and 3 contain matches
- **THEN** the substitution replaces matches only on prompt lines 2 and 3

#### Scenario: Out-of-bounds offset is rejected

- **WHEN** the editor executes an Ex command with an offset resolving outside
    prompt-buffer lines such as `:1-1delete` or `:$+1yank`
- **THEN** the editor reports an Ex range error, prompt text remains
    unchanged, and registers remain unchanged

#### Scenario: Repeated offset is rejected in v1

- **WHEN** the editor executes an Ex command with repeated offset syntax such
    as `:.+1-2delete`
- **THEN** the editor reports a readable Ex range error, prompt text remains
    unchanged, and registers remain unchanged

### Requirement: Ex semicolon ranges reset the second address base for all range commands

The Vim editor SHALL support a finite Ex semicolon range form where the first
resolved single-line address becomes the current-line base for resolving the
second single-line address.

#### Scenario: Semicolon relative range executes

- **WHEN** the editor executes `:2;.+2delete` in a prompt with at least four
    lines
- **THEN** prompt lines 2 through 4 are deleted and the unnamed register
    receives those lines as linewise text

#### Scenario: Semicolon range can use current-line start

- **WHEN** the editor is on prompt line 3 and executes `:.;.-1yank`
- **THEN** the editor reports an Ex range error because the resolved range is
    reversed and prompt text and registers remain unchanged

#### Scenario: Semicolon range composes with substitution

- **WHEN** the editor executes `:2;.+1s/foo/bar/g` in a prompt where lines 2
    and 3 contain matches
- **THEN** the substitution replaces matches only on prompt lines 2 and 3

#### Scenario: Unsupported semicolon forms are rejected

- **WHEN** the editor executes a semicolon range using unsupported broad
    syntax such as repeated separators, expression ranges, or a missing second
    address
- **THEN** the editor reports a readable Ex range error and prompt text
    remains unchanged

### Requirement: Ex repeat-substitution commands reuse the last applied substitution

The Vim editor SHALL support finite repeat-substitution commands that reuse the
last successfully applied substitution semantics.

#### Scenario: Repeat substitution applies

- **WHEN** the editor has previously applied `:%s/foo/bar/g`, Ex command-line
    mode is active on a prompt containing `foo`, and the user executes `:&`
- **THEN** the editor applies the repeated substitution over the resolved
    current range and reports the substitution count

#### Scenario: Range-qualified repeat substitution executes

- **WHEN** the editor has previously applied a substitution and then executes
    `:%&`
- **THEN** the repeated substitution resolves the explicit percent range and
    applies over the whole prompt

#### Scenario: Double-ampersand repeat is accepted as finite alias

- **WHEN** the editor has previously applied a substitution and executes `:&&`
- **THEN** the editor repeats the same stored substitution semantics as `:&`
    using the current resolved range

#### Scenario: No previous substitution is safe

- **WHEN** the editor executes `:&` before any substitution has successfully
    applied in the current editor session
- **THEN** the editor reports a readable Ex error, leaves prompt text
    unchanged, and does not add the repeat command to Ex history

#### Scenario: Repeat source updates after successful apply

- **WHEN** the editor applies a new substitution after an older substitution
    exists
- **THEN** later repeat-substitution commands use the newer applied
    substitution semantics

#### Scenario: Repeat substitution keeps bounded side effects

- **WHEN** a repeated substitution applies successfully
- **THEN** it preserves existing Ex substitution side-effect rules for cursor
    intent, registers, dot-repeat, search highlights, Ex messages, and history
    recording

## MODIFIED Requirements

### Requirement: Ex substitution parser is finite and explicit

The Vim editor SHALL parse Ex substitution syntax with literal default behavior
and explicit bounded regex pattern opt-in, without recursive mappings, Vimscript
evaluation, or replacement backreference expansion.

#### Scenario: Alternate delimiter executes

- **WHEN** the editor executes `:%s#old/path#new/path#g`
- **THEN** `#` is used as the substitution delimiter and literal slashes in
    the pattern and replacement need no escaping

#### Scenario: Invalid delimiter is rejected

- **WHEN** the editor executes a substitution using whitespace, an
    alphanumeric character, a control character, or backslash as the delimiter
- **THEN** the editor reports an Ex error and prompt text remains unchanged

#### Scenario: Delimiter and backslash escapes are decoded

- **WHEN** the editor executes `:%s#old\#value#new\\value#g`
- **THEN** the pattern is treated as literal `old#value` and the replacement
    as literal `new\value`

#### Scenario: Empty replacement is valid

- **WHEN** the editor executes `:%s/old//g`
- **THEN** all addressed literal matches are removed according to the `g` flag

#### Scenario: Empty pattern is rejected

- **WHEN** the editor executes `:%s//new/g`
- **THEN** the editor reports an Ex error and prompt text remains unchanged

#### Scenario: Omitted final delimiter is allowed without flags

- **WHEN** the editor executes `:s/old/new`
- **THEN** the substitution applies as if the final delimiter were present and
    no flags were provided

#### Scenario: Omitted final delimiter is not allowed with flags

- **WHEN** the editor executes `:s/old/newg`
- **THEN** the trailing `g` is treated as replacement text, not as a flag

#### Scenario: Regex flag enables bounded regex pattern mode

- **WHEN** the editor executes `:%s/TODO|FIXME/done/gr` in a prompt containing
    `TODO` and `FIXME`
- **THEN** the `r` flag treats `TODO|FIXME` as a bounded regex pattern, the
    `g` flag applies all non-overlapping regex matches per addressed line, and
    replacement text is inserted literally

#### Scenario: Regex flag composes with ignore-case flag

- **WHEN** the editor executes `:%s/todo/done/ri` in a prompt containing `TODO`
- **THEN** the `r` flag enables regex pattern mode and the `i` flag makes the
    regex match case-insensitive

#### Scenario: Unsupported flag is rejected

- **WHEN** the editor executes `:%s/old/new/c`
- **THEN** the editor reports an Ex error and prompt text remains unchanged

#### Scenario: Replacement tokens are literal

- **WHEN** the editor executes `:%s/(old)/&-$1-\1/gr`
- **THEN** replacement text inserts literal `&-$1-\1` rather than matched text
    or backreferences

#### Scenario: Invalid regex pattern is rejected

- **WHEN** the editor executes a substitution with the `r` flag and invalid
    regex pattern syntax
- **THEN** the editor reports an Ex error and prompt text remains unchanged

#### Scenario: Regex bound exceeded is rejected

- **WHEN** a regex substitution pattern, addressed prompt text, or match count
    exceeds the documented regex substitution bounds
- **THEN** the editor reports an Ex error and prompt text remains unchanged

#### Scenario: Zero-length regex substitution is rejected

- **WHEN** a regex substitution would match zero-length text in the addressed
    range
- **THEN** the editor reports an Ex error and prompt text remains unchanged

### Requirement: Ex command-line uses shared workbench history

The Vim editor SHALL keep finite in-memory history for successfully executed Ex
command lines and expose it while Ex command-line input is active.

#### Scenario: Successful Ex command enters history

- **WHEN** the user executes a supported Ex command successfully
- **THEN** the executed command text is added to Ex history without changing
    registers, marks, dot-repeat state, or search state beyond the command's
    documented side effects

#### Scenario: Failed Ex command does not enter history

- **WHEN** the user executes an unsupported Ex command, invalid range, invalid
    regex, no-match substitution, or command that exceeds documented bounds
- **THEN** that command text is not added to Ex history

#### Scenario: Substitution enters history after apply

- **WHEN** the user executes a substitution that matches at least once
- **THEN** the substitution command text is added to Ex history once the
    substitution applies

#### Scenario: Ex history previous recalls entry

- **WHEN** Ex command-line input is active and Ex history contains an older
    entry
- **THEN** pressing the resolved history-previous key replaces the pending Ex
    command text with that history entry and leaves prompt text unchanged

#### Scenario: Ex history next restores newer entry or draft

- **WHEN** Ex command-line input is active after history-previous navigation
- **THEN** pressing the resolved history-next key moves toward newer history
    entries and eventually restores the draft command text that existed before
    history navigation

#### Scenario: Visual Ex history preserves captured selection on cancel

- **WHEN** Ex command-line mode was opened from a visual mode, the user
    navigates Ex history, and then presses `Esc`
- **THEN** Ex command-line mode closes, prompt text remains unchanged, and the
    original visual mode, visual anchor, and visual cursor are restored
    according to existing visual Ex cancellation semantics

### Requirement: Ex workbench behavior is documented and validated

The change SHALL include automated tests and user-facing documentation for Ex
history, cursor-aware Ex command-line editing, regex substitution mode, repeat
substitution, substitution flags, register operands, and current limitations.

#### Scenario: Automated validation runs

- **WHEN** `npm test` is executed
- **THEN** tests cover Ex workbench typing, cursor movement, cursor-aware
    deletion, command-line word deletion, cancellation, history navigation,
    visual Ex cancellation after history navigation, literal substitution,
    regex substitution, count-only
    substitutions, no-error substitutions, repeat substitution, invalid regex
    safety, regex bounds, unsupported flags, no-match behavior, identical
    replacement behavior, register operands, and history recording rules

#### Scenario: Typecheck runs

- **WHEN** `npm run check` is executed
- **THEN** the extension TypeScript compiles without type errors

#### Scenario: Feature guide describes Ex workbench

- **WHEN** the user opens `docs/features.md`
- **THEN** it documents Ex command history, cursor-aware command-line editing,
    substitution on `Enter`, literal default behavior, regex `r`
    flag, count-only `n` flag, no-error `e` flag, repeat-substitution commands,
    regex bounds, literal replacement tokens, Ex register operands, and current
    Ex limitations

### Requirement: Diagnostic Ex command parsing stays finite

The Ex parser SHALL support customization diagnostics through explicit command
names rather than Vimscript evaluation, recursive mappings, or arbitrary command
dispatch.

#### Scenario: Supported diagnostic command names parse

- **WHEN** the parser receives `vimdoctor`, `keymap`, or `mapcheck` with valid
    arguments
- **THEN** it returns a finite parse result for that diagnostic command

#### Scenario: Unsupported diagnostic abbreviation is rejected

- **WHEN** the parser receives an unsupported abbreviation or unknown command
    such as `:vimd`, `:map`, `:actions`, or `:actionspalette`
- **THEN** it returns an Ex error and prompt text remains unchanged

#### Scenario: Diagnostic command arguments are bounded

- **WHEN** a diagnostic command receives an empty required argument,
    unsupported key notation, or an over-broad query
- **THEN** the editor reports a bounded Ex error or no-match diagnostic and
    prompt text remains unchanged

### Requirement: Diagnostic Ex commands are side-effect bounded

Read-only diagnostic Ex commands SHALL NOT perform prompt-buffer edits or
editing-state mutations beyond bounded popup display and existing successful Ex
command history semantics.

#### Scenario: Diagnostic command does not write registers

- **WHEN** the user executes `:keymap`, `:mapcheck`, or `:vimdoctor`
- **THEN** unnamed and named edit registers keep their previous values

#### Scenario: Diagnostic command does not affect search state

- **WHEN** search highlights or a previous search query exist and the user
    executes a diagnostic Ex command
- **THEN** search query state, repeat search direction, and visible search
    highlights remain unchanged

#### Scenario: Diagnostic command does not participate in repeat change

- **WHEN** the user executes a diagnostic Ex command and then presses the
    repeat-change command
- **THEN** repeat-change behavior uses the previous real edit when one exists
    and does not repeat the diagnostic command

#### Scenario: Diagnostic popup does not pollute retained runtime messages

- **WHEN** a diagnostic Ex command opens a read-only popup and the user
    scrolls or dismisses that popup
- **THEN** retained runtime message history does not grow solely because the
    popup content was shown, scrolled, or dismissed

### Requirement: Ex range algebra behavior is documented and validated

The change SHALL include automated tests and user-facing documentation for
visible Ex offset and semicolon range behavior.

#### Scenario: Automated range validation runs

- **WHEN** `npm test` is executed
- **THEN** tests cover Ex address offsets, semicolon base semantics,
    destination offsets, destination zero preservation, visual range
    preservation, invalid offset safety, substitution ranges, and
    non-substitution command ranges

#### Scenario: Feature guide describes finite Ex ranges

- **WHEN** the user opens `docs/features.md`
- **THEN** it documents supported Ex offsets, semicolon range behavior,
    destination offset behavior, destination zero behavior, and unsupported
    range syntax limits

### Requirement: Read-only Ex output opens a popup

The Vim editor SHALL display successful read-only Ex help, runtime discovery,
customization diagnostic, and inspectability output in a bounded read-only popup
instead of the inline workbench/message row.

#### Scenario: Read-only popup opens after normal Ex command

- **WHEN** Ex command-line mode was opened from normal mode and the user
    executes a valid read-only command such as `:help`, `:keybindings redo`,
    `:keymap redo`, `:mapcheck ctrl+p`, `:vimdoctor`,
    `:messages`, or `:vimmode inspect`
- **THEN** Ex command-line mode closes, the editor remains in normal mode,
    prompt text and cursor remain unchanged, and a centered bounded read-only
    popup shows the command output

#### Scenario: Read-only popup opens after visual Ex command

- **WHEN** Ex command-line mode was opened from visual, visual-line, or
    visual-block mode and the user executes a valid read-only help, diagnostic,
    runtime discovery, message, or inspect command
- **THEN** Ex command-line mode closes, the original visual mode and captured
    selection are restored, prompt text remains unchanged, and a centered
    bounded read-only popup shows the command output

#### Scenario: Popup command output handles no-match result

- **WHEN** the user executes a valid read-only command that returns a bounded
    no-match or empty-state result such as `:help vimscript`,
    `:keybindings unsupported-query`, or `:messages` with no retained messages
- **THEN** the no-match or empty-state result is shown in the read-only popup
    and prompt text remains unchanged

#### Scenario: Unsupported command stays inline error

- **WHEN** the user executes an unsupported Ex command or unsupported
    abbreviation such as `:h`, `:mes`, `:map`, or `:vimmode status`
- **THEN** the editor reports the existing bounded Ex error through compact
    command-line feedback, does not open a read-only popup, and leaves prompt
    text unchanged

#### Scenario: Mutating Ex commands keep existing behavior

- **WHEN** the user executes a mutating or editing Ex command such as `:s`,
    `:d`, `:y`, `:put`, `:copy`, `:move`, `:join`, or `:noh`
- **THEN** the command follows its existing edit, no-op, success, or error
    behavior and does not route normal edit feedback through the read-only
    popup

### Requirement: Ex command-line applies suggestions with minimal completion behavior

The Vim editor SHALL allow a user to apply command-name suggestions from Ex
command-line mode without adding selection-menu state or changing execution
semantics.

#### Scenario: Tab completes a single matching command

- **WHEN** Ex command-line mode is active, the command cursor is in the
    command word, and exactly one supported command matches the typed prefix
- **THEN** pressing `Tab` completes the command word to that supported
    command, moves the command cursor after the completed word, and leaves
    prompt text unchanged

#### Scenario: Tab extends to common prefix

- **WHEN** Ex command-line mode is active and multiple supported commands
    share a longer common prefix than the typed command word
- **THEN** pressing `Tab` extends the command word to the common prefix and
    leaves prompt text unchanged

#### Scenario: Tab no-ops when completion cannot improve input

- **WHEN** Ex command-line mode is active and matching suggestions do not
    provide a longer common prefix or single completion
- **THEN** pressing `Tab` leaves the pending Ex command text, prompt text, and
    editor state unchanged

#### Scenario: History and execution keys keep existing behavior

- **WHEN** Ex command-line suggestions are visible
- **THEN** `Up` and `Down` continue to navigate Ex history, `Enter` continues
    to execute the command, and `Esc` continues to cancel Ex
    command-line mode

## REMOVED Requirements

### Requirement: Ex command-line input uses minimal editing controls

**Reason**: Some scenarios described the substitution confirm-preview step,
which was removed.

**Migration**: None; see "Ex command-line input uses minimal editing controls
and executes on Enter".

### Requirement: Ex substitution preview is required before prompt mutation

**Reason**: The two-step preview (first `Enter` previews, second applies)
differed from Vim.

**Migration**: `Enter` applies the substitution immediately; see "Ex
substitution applies on Enter". Use the `n` flag (`:s/old/new/gn`) to count
matches without editing.

### Requirement: Ex command-line supports read-only customization commands

**Reason**: Some scenarios described `:actions`, which was removed.

**Migration**: None; see "Ex command-line supports read-only customization
diagnostics".

### Requirement: Ex line ranges support finite address offsets

**Reason**: Some scenarios described the substitution confirm-preview step,
which was removed.

**Migration**: None; see "Ex line ranges support finite address offsets for all
range commands".

### Requirement: Ex semicolon ranges reset the second address base

**Reason**: Some scenarios described the substitution confirm-preview step,
which was removed.

**Migration**: None; see "Ex semicolon ranges reset the second address base for
all range commands".

### Requirement: Ex repeat-substitution commands reuse the last applied substitution safely

**Reason**: Some scenarios described the substitution confirm-preview step,
which was removed.

**Migration**: None; see "Ex repeat-substitution commands reuse the last applied
substitution".
