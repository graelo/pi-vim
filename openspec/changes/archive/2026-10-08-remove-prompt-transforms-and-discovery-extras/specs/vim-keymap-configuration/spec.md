# Spec Delta

## ADDED Requirements

### Requirement: Keybindings command stays separate from diagnostic metadata

The keymap configuration SHALL keep the keybindings popup command separate from
metadata-only diagnostic/help action IDs.

#### Scenario: Metadata IDs are not bindable

- **WHEN** settings or trusted JavaScript config try to bind a metadata ID such
    as `vimmode.keybindings`, `vimmode.keymap`, or `vimmode.help`
- **THEN** no user keybinding dispatch is created for the metadata ID

#### Scenario: Keybindings command keeps its own scope

- **WHEN** settings configure `commands.showKeybindings`
- **THEN** the configured key opens only the keybindings popup and does not
    dispatch any metadata action

### Requirement: Protected shortcut overrides require a same-layer allow-list

The Vim keymap configuration SHALL reject protected Pi shortcuts unless the same
keymap settings layer explicitly allow-lists the normalized protected key
through `piVimMode.keymap.allowProtectedOverrides`.

#### Scenario: Protected key remains rejected by default

- **WHEN** `piVimMode.keymap.commands.showKeybindings` is configured with
    `ctrl+p` and `piVimMode.keymap.allowProtectedOverrides` is absent
- **THEN** the `ctrl+p` binding is rejected with a protected-key warning and
    the shortcut continues to delegate to Pi behavior

#### Scenario: Allow-listed classic keymap binding is accepted

- **WHEN** one settings layer configures
    `piVimMode.keymap.allowProtectedOverrides` with `ctrl+p` and
    `piVimMode.keymap.commands.showKeybindings` with `ctrl+p`
- **THEN** the resolved keymap accepts `ctrl+p` for `showKeybindings` instead
    of rejecting it solely because it is protected

#### Scenario: Allow-list is scoped to its settings layer

- **WHEN** global settings allow-list `ctrl+p` but project settings bind
    `ctrl+p` without project `piVimMode.keymap.allowProtectedOverrides`
- **THEN** the project binding is rejected as protected and valid sibling
    project keymap fields remain usable

#### Scenario: Invalid allow-list entries preserve valid siblings

- **WHEN** `piVimMode.keymap.allowProtectedOverrides` contains unsupported key
    entries and a valid protected key entry
- **THEN** unsupported entries produce warnings, the valid protected key entry
    remains usable for bindings in the same settings layer, and valid sibling
    keymap fields remain usable

### Requirement: Insert edit and movement bindings are configurable

The Vim keymap configuration SHALL accept opt-in insert-mode edit and navigation
bindings for finite supported actions while preserving insert-mode Pi delegation
by default.

#### Scenario: Default insert edit keymap is empty

- **WHEN** Pi starts with no `piVimMode.keymap.insert` setting
- **THEN** the resolved keymap has no insert-mode edit, navigation, or
    line-opening bindings and ordinary insert-mode input continues to delegate
    to Pi

#### Scenario: Insert edit bindings are accepted

- **WHEN** `piVimMode.keymap.insert.deleteWordBackward`, `deleteWordForward`,
    `deleteLineBackward`, or `deleteLineForward` contains a valid modified key
    such as `ctrl+w`, `alt+d`, `ctrl+u`, or `ctrl+k`
- **THEN** the resolved keymap records that key for the configured insert edit
    action without changing normal-mode command, motion, or operator bindings

#### Scenario: Insert movement bindings are accepted

- **WHEN** `piVimMode.keymap.insert.moveWordBackward`, `moveWordForward`,
    `moveLineStart`, or `moveLineEnd` contains a valid modified key such as
    `alt+b`, `alt+f`, `ctrl+a`, or `ctrl+e`
- **THEN** the resolved keymap records that key for the configured insert
    movement action without changing normal-mode command, motion, or operator
    bindings

#### Scenario: Raw printable insert bindings are rejected

- **WHEN** `piVimMode.keymap.insert.deleteWordBackward` or another insert
    action contains raw printable text such as `j`, `jk`, `jj`, or `oo`
- **THEN** that binding is ignored with a warning and valid sibling insert and
    normal/visual keymap fields remain usable

#### Scenario: Protected insert binding requires same-layer allow-list

- **WHEN** `piVimMode.keymap.insert.deleteLineForward` contains a protected Pi
    shortcut such as `enter` and the same settings layer does not include it in
    `piVimMode.keymap.allowProtectedOverrides`
- **THEN** the binding is rejected with a protected-key warning and that
    shortcut continues to delegate to Pi behavior

#### Scenario: Duplicate insert binding is diagnosed

- **WHEN** two different `piVimMode.keymap.insert` actions claim the same
    normalized key sequence
- **THEN** the resolved keymap remains deterministic, a warning names both
    insert actions, and session startup continues

#### Scenario: Configured insert action dispatches only in insert mode

- **WHEN** an accepted insert edit or movement binding is pressed in insert
    mode while autocomplete is inactive
- **THEN** pi-vimmode performs the configured prompt-local insert action
    instead of delegating that key to Pi

#### Scenario: Autocomplete keeps ownership

- **WHEN** autocomplete is active and the user presses a key sequence
    configured under `piVimMode.keymap.insert`
- **THEN** input delegates to Pi autocomplete behavior rather than executing
    the insert action

### Requirement: Trusted global JS keymap builder adds descriptor bindings

The Vim editor SHALL load a trusted global JS config file from
`~/.pi/agent/pi-vimmode.config.js` after global JSON settings and before project
JSON settings.

#### Scenario: JS builder uses action descriptors instead of internal action strings

- **WHEN** the JS config default export calls
    `vim.keymap.set("n", "zq", vim.action.operator.uppercase())`
- **THEN** the resolved keymap binds `zq` to the uppercase operator in normal
    mode
- **AND** raw string RHS values such as `"operator.uppercase"` are treated
    only as key replay text, not internal action IDs

#### Scenario: Project JSON remains authoritative

- **WHEN** JS config maps `zq` and project JSON binds `zq` to a command
- **THEN** the project binding owns `zq` in the scopes it claims

#### Scenario: JS string rhs replays key inputs

- **WHEN** the JS config default export calls
    `vim.keymap.set("n", "zz", "llll")`
- **THEN** pressing `zz` in normal mode replays `l`, `l`, `l`, `l` through the
    existing macro replay path

#### Scenario: JS insert built-ins bind only insert mode

- **WHEN** JS config calls
    `vim.keymap.set("i", "<A-w>", vim.prompt.deleteWordBackward())`
- **THEN** insert mode treats `alt+w` as the configured delete-word-backward
    action
- **AND** using that insert builtin in normal or visual mode is rejected with
    a warning

#### Scenario: JS config is trusted global code only

- **WHEN** Pi loads settings for a project
- **THEN** pi-vimmode does not load project-local executable JS config
- **AND** unsupported JS default exports fail with warnings instead of
    crashing startup

### Requirement: Settings removed in 1.0.0 warn and are ignored

The configuration SHALL warn about `piVimMode.keymap.actions`,
`piVimMode.keymap.actionPresets`, and `piVimMode.promptTransforms`, which were
removed in 1.0.0, and SHALL ignore them without discarding valid sibling
settings.

#### Scenario: Removed settings produce warnings

- **WHEN** settings contain `piVimMode.keymap.actions`,
    `piVimMode.keymap.actionPresets`, or `piVimMode.promptTransforms`
- **THEN** each removed setting produces one warning naming the setting and
    stating that it was removed in 1.0.0 and is ignored

#### Scenario: Valid siblings survive removed settings

- **WHEN** settings combine a removed setting with valid settings such as
    `piVimMode.startMode` or `piVimMode.keymap.commands`
- **THEN** the valid settings resolve as if the removed setting were absent

## MODIFIED Requirements

### Requirement: Backward search entry participates in semantic keymap configuration

The Vim keymap configuration SHALL expose backward prompt search entry as a
finite semantic command while preserving the default `?` binding.

#### Scenario: Default backward search keymap is available

- **WHEN** Pi starts with no `piVimMode.keymap` setting and the editor is in
    normal mode
- **THEN** pressing `?` enters backward prompt search workbench mode

#### Scenario: Configured backward search key is used

- **WHEN** `piVimMode.keymap.commands.startSearchBackward` is set to a valid
    key sequence and the editor is in normal mode
- **THEN** that key sequence enters backward prompt search workbench mode
    instead of requiring the default `?` key

#### Scenario: Configured backward search works from visual modes

- **WHEN** `piVimMode.keymap.commands.startSearchBackward` is set to a valid
    key sequence and the editor is in a visual mode with an active selection
- **THEN** that key sequence enters backward prompt search workbench mode and
    a completed matching search extends the active visual selection

#### Scenario: Configured backward search works after operators

- **WHEN** `piVimMode.keymap.commands.startSearchBackward` is set to a valid
    key sequence and the editor has a pending delete, change, or yank operator
- **THEN** that key sequence starts backward search as an operator motion target

#### Scenario: Insert mode remains Pi-owned for backward search key

- **WHEN** the editor is in insert mode and the user presses `?` or a
    configured backward search key
- **THEN** input delegates to Pi default editor behavior unless that
    insert-mode input is otherwise supported by pi-vimmode

#### Scenario: Invalid backward search binding falls back safely

- **WHEN** `piVimMode.keymap.commands.startSearchBackward` contains an
    unsupported type, protected key, or conflicting key sequence
- **THEN** the invalid field is ignored, a warning is recorded, and sibling
    keymap fields remain usable

#### Scenario: Backward search configuration survives live editor construction

- **WHEN** a live `VimEditor` is constructed with resolved keymap options that
    include `commands.startSearchBackward`
- **THEN** the editor uses the resolved backward search binding without
    dropping other command, motion, operator, macro, mark, search, or UI
    options

### Requirement: Keybindings popup command participates in semantic keymap configuration

The Vim keymap configuration SHALL expose a finite semantic command for opening
the keybindings popup while preserving existing protected-shortcut, conflict,
and insert-mode delegation rules.

#### Scenario: Keybindings popup command has no default binding

- **WHEN** Pi starts with no `piVimMode.keymap.commands.showKeybindings` setting
- **THEN** no normal-mode key sequence opens the keybindings popup by default
    and existing default bindings remain unchanged

#### Scenario: Configured keybindings popup command opens popup

- **WHEN** `piVimMode.keymap.commands.showKeybindings` is set to a valid
    non-conflicting key sequence and the editor is in normal mode
- **THEN** pressing that key sequence opens the same bounded read-only popup
    as `:keybindings`

#### Scenario: Configured keybindings popup command is read-only

- **WHEN** the configured keybindings popup command opens the popup from
    normal mode
- **THEN** prompt text, cursor position, registers, marks, macros, search
    state, resolved options, retained diagnostics, and dot-repeat state remain
    unchanged except for displaying the popup

#### Scenario: Insert mode remains Pi-owned for configured key

- **WHEN** the editor is in insert mode and the user presses a key sequence
    configured for `showKeybindings`
- **THEN** input delegates to Pi default editor behavior unless that
    insert-mode input is otherwise supported by pi-vimmode

#### Scenario: Protected key binding is rejected

- **WHEN** `piVimMode.keymap.commands.showKeybindings` attempts to bind a
    protected Pi-owned shortcut such as `ctrl+p`, `enter`, or `tab`
- **THEN** the binding is ignored or rejected with a warning and the protected
    shortcut continues to delegate to Pi behavior

#### Scenario: Conflicting keybinding is rejected

- **WHEN** `piVimMode.keymap.commands.showKeybindings` attempts to use a key
    sequence that exactly conflicts with or prefix-shadows an existing resolved
    grammar binding
- **THEN** the invalid binding is ignored or rejected with a warning and the
    existing grammar binding keeps its behavior

#### Scenario: Live editor uses resolved keybindings popup command

- **WHEN** a live `VimEditor` is constructed with resolved options that
    include `commands.showKeybindings`
- **THEN** the editor uses that binding without dropping other command,
    motion, operator, macro, mark, search, or UI options

### Requirement: WORD and previous-end motions participate in semantic keymap configuration

The Vim keymap configuration SHALL expose WORD and previous-end word motions as
finite semantic motion actions while preserving existing lowercase word motion
configuration.

#### Scenario: Default keymap binds WORD and previous-end motions

- **WHEN** Pi starts with no `piVimMode.keymap` setting
- **THEN** the resolved keymap binds `wordForwardBig` to `W`,
    `wordBackwardBig` to `B`, `wordEndBig` to `E`, `wordPreviousEnd` to `ge`,
    and `wordPreviousEndBig` to `gE`

#### Scenario: Configured WORD motion is used

- **WHEN** `piVimMode.keymap.motions.wordForwardBig` is set to a valid finite
    key sequence and the editor is in normal or visual mode
- **THEN** that key sequence performs whitespace-delimited WORD-forward
    movement instead of requiring the default `W` key

#### Scenario: Configured previous-end motion is used

- **WHEN** `piVimMode.keymap.motions.wordPreviousEnd` is set to a valid finite
    key sequence and the editor is in normal mode
- **THEN** that key sequence performs previous word-end movement using the
    same target semantics as the default `ge` binding

#### Scenario: Configured operator-motion matrix accepts new motions

- **WHEN** `wordForwardBig`, `wordEndBig`, `wordPreviousEnd`, or
    `wordPreviousEndBig` is included in
    `piVimMode.keymap.operatorMotions.delete`, `change`, or `yank`
- **THEN** the resolved operator followed by the configured motion applies
    that operator to the addressed finite range

#### Scenario: Omitted new motion remains disabled for that operator

- **WHEN** a motion-capable operator has an explicit
    `piVimMode.keymap.operatorMotions` list that omits a WORD or previous-end
    motion action
- **THEN** pressing that operator followed by the omitted motion clears the
    pending operator, leaves prompt text unchanged, and does not insert the
    motion key as text

#### Scenario: New motion configuration survives live editor construction

- **WHEN** a live `VimEditor` is constructed with resolved keymap options that
    include configured WORD or previous-end motion bindings
- **THEN** the editor uses those bindings without dropping other command,
    motion, operator, macro, mark, search, or UI options

### Requirement: Cached keymap lookups preserve semantic command resolution

The Vim keymap configuration SHALL allow normal-mode command resolution to use
cached or compiled lookup data while preserving the existing finite semantic
parser contract for resolved keymaps.

#### Scenario: Default keymap resolution remains equivalent

- **WHEN** the editor resolves default normal-mode operators, motions,
    commands, command prefixes, counts, search commands, character-search
    commands, and text objects
- **THEN** command resolution returns the same semantic results and
    pending-state behavior as the uncached resolver contract

#### Scenario: Configured keymap resolution remains equivalent

- **WHEN** `piVimMode.keymap` configures supported operators, motions,
    commands, text-object keys, or operator-motion matrices
- **THEN** command resolution uses the active resolved keymap and preserves
    explicit override precedence, finite multi-key prefixes, and invalid-key
    handling

#### Scenario: Operator-pending grammar remains scoped

- **WHEN** an operator is pending and the next key could also be part of an
    unrelated longer top-level key sequence
- **THEN** the resolver interprets the key through operator-pending grammar
    before generic top-level prefix matching

#### Scenario: Duplicate sequences remain deterministic

- **WHEN** a directly supplied resolved keymap contains the same sequence in
    multiple resolver groups
- **THEN** command resolution keeps the same deterministic first-match
    behavior as before this change and does not fail session startup

### Requirement: Resolver performance work is validated without user-visible behavior changes

The change SHALL validate resolver performance work with tests and profiling
evidence while keeping public keymap behavior unchanged.

#### Scenario: Automated semantic validation runs

- **WHEN** `npm test` is executed
- **THEN** tests cover cached resolver equivalence for default commands,
    configured bindings, prefix precedence, operator motions, operator text
    objects, operator search, character search, counts, invalid pending input,
    and distinct keymap identities

#### Scenario: Typecheck validates cached lookup types

- **WHEN** `npm run check` is executed
- **THEN** TypeScript validates the compiled lookup structures without
    exposing unsupported public keymap API

#### Scenario: No documentation update is required

- **WHEN** users read `docs/features.md` or `docs/settings.md`
- **THEN** no new keybinding, setting, command syntax, or Vim parity claim is
    introduced by the cache refactor

### Requirement: Paragraph motions participate in semantic keymap configuration

The Vim keymap configuration SHALL expose paragraph motions as finite semantic
motion actions while preserving default Vim keys and existing keymap validation
behavior.

#### Scenario: Default paragraph motion keymap is available

- **WHEN** Pi starts with no `piVimMode.keymap` setting and the editor is in
    normal or visual mode
- **THEN** the resolved keymap binds `paragraphBackward` to `{` and
    `paragraphForward` to `}`

#### Scenario: Configured paragraph motion key is used

- **WHEN** `piVimMode.keymap.motions.paragraphForward` or
    `piVimMode.keymap.motions.paragraphBackward` is set to a valid finite key
    sequence
- **THEN** that key sequence performs the matching paragraph motion in normal
    and visual contexts where motions are supported

#### Scenario: Configured operator-motion matrix accepts paragraph motions

- **WHEN** `paragraphForward` or `paragraphBackward` is included in
    `piVimMode.keymap.operatorMotions.delete`, `change`, or `yank`
- **THEN** the resolved operator followed by the configured paragraph motion
    applies that operator to the addressed finite paragraph range

#### Scenario: Omitted paragraph operator motion is disabled safely

- **WHEN** a motion-capable operator has an explicit
    `piVimMode.keymap.operatorMotions` list that omits `paragraphForward` or
    `paragraphBackward`
- **THEN** pressing that operator followed by the omitted paragraph motion
    clears the pending operator, leaves prompt text unchanged, and does not
    insert the motion key as text

#### Scenario: Paragraph motion configuration survives live editor construction

- **WHEN** a live `VimEditor` is constructed with resolved keymap options that
    include configured paragraph motion bindings
- **THEN** the editor uses those bindings without dropping other command,
    motion, operator, macro, mark, search, or UI options

### Requirement: Word-under-cursor search commands participate in semantic keymap configuration

The Vim keymap configuration SHALL expose word-under-cursor prompt search as
finite semantic command actions while preserving the default `*` and `#`
bindings.

#### Scenario: Default star keymap is available

- **WHEN** Pi starts with no `piVimMode.keymap` setting and the editor is in
    normal mode with the cursor on a keyword word
- **THEN** pressing `*` searches forward for that word using prompt-local word
    search behavior

#### Scenario: Default hash keymap is available

- **WHEN** Pi starts with no `piVimMode.keymap` setting and the editor is in
    normal mode with the cursor on a keyword word
- **THEN** pressing `#` searches backward for that word using prompt-local
    word search behavior

#### Scenario: Configured forward word search key is used

- **WHEN** `piVimMode.keymap.commands.searchWordForward` is set to a valid key
    sequence and the editor is in normal mode with the cursor on a keyword word
- **THEN** that key sequence searches forward for that word instead of
    requiring the default `*` key

#### Scenario: Configured backward word search key is used

- **WHEN** `piVimMode.keymap.commands.searchWordBackward` is set to a valid
    key sequence and the editor is in normal mode with the cursor on a keyword
    word
- **THEN** that key sequence searches backward for that word instead of
    requiring the default `#` key

#### Scenario: Insert mode remains Pi-owned for word search keys

- **WHEN** the editor is in insert mode and the user presses `*`, `#`, or a
    configured word search key
- **THEN** input delegates to Pi default editor behavior unless that
    insert-mode input is otherwise supported by pi-vimmode

#### Scenario: Invalid word search binding falls back safely

- **WHEN** `piVimMode.keymap.commands.searchWordForward` or
    `piVimMode.keymap.commands.searchWordBackward` contains an unsupported type,
    protected key, or conflicting key sequence
- **THEN** the invalid field is ignored, a warning is recorded, and sibling
    keymap fields remain usable

#### Scenario: Word search configuration survives live editor construction

- **WHEN** a live `VimEditor` is constructed with resolved keymap options that
    include word search command bindings
- **THEN** the editor uses the resolved word search bindings without dropping
    other command, motion, operator, macro, mark, search, UI, prompt-structure,
    or feedback options

### Requirement: Case operators participate in semantic keymap configuration

The Vim editor SHALL expose finite case operators through
`piVimMode.keymap.operators` while preserving deterministic prefix resolution
for existing `g` bindings.

#### Scenario: Default case operator keymap is available

- **WHEN** Pi starts with no `piVimMode.keymap` setting
- **THEN** the resolved keymap binds `lowercase` to `gu`, `uppercase` to `gU`,
    and `toggleCase` to `g~`

#### Scenario: Configured lowercase operator works

- **WHEN** `piVimMode.keymap.operators.lowercase` is set to a valid finite key
    sequence and the editor is in normal mode
- **THEN** pressing that configured operator followed by a supported
    configured motion lowercases the addressed prompt range

#### Scenario: Configured case operator text object works

- **WHEN** `piVimMode.keymap.operators.uppercase` is configured and the editor
    receives that operator followed by a configured text-object kind and target
- **THEN** the addressed text object is uppercased without changing registers
    or mode

#### Scenario: Case operators do not capture unsupported target families

- **WHEN** the editor is in normal mode with a pending case operator and the
    user enters a mark, search, character-search, or unsupported command target
- **THEN** the pending operator clears, prompt text is unchanged, and the
    unmatched key sequence is not inserted into the prompt

#### Scenario: Invalid case operator binding falls back safely

- **WHEN** `piVimMode.keymap.operators.lowercase`, `uppercase`, or
    `toggleCase` contains an unsupported type, protected key, or conflicting key
    sequence
- **THEN** the invalid field is ignored, a warning is recorded, and sibling
    keymap fields remain usable

#### Scenario: Live editor uses configured case operator

- **WHEN** a live `VimEditor` is constructed with resolved keymap options that
    include a configured case operator
- **THEN** the editor uses that binding without dropping other command,
    motion, operator, macro, mark, search, or UI options

### Requirement: Escape aliases are documented and discoverable

The change SHALL document configured escape aliases and keep runtime keymap
diagnostics aligned with the effective configuration.

#### Scenario: Settings reference documents escape aliases

- **WHEN** the user opens `docs/settings.md`
- **THEN** it documents `piVimMode.keymap.escape`, examples such as `<C-j>`
    and `<D-j>`, protected-key rejection, raw printable text rejection,
    autocomplete behavior, and Ctrl-J terminal ambiguity

#### Scenario: Feature guide documents escape behavior

- **WHEN** the user opens `docs/features.md`
- **THEN** the escape and reset behavior section describes configured escape
    aliases for leaving insert mode, visual modes, and pending Ex command-lines

#### Scenario: Runtime diagnostics describe escape aliases

- **WHEN** runtime keymap diagnostics such as `:keymap`, `:mapcheck`,
    or `:keybindings` report configured escape aliases
- **THEN** they identify the aliases as escape bindings and do not imply full
    Vim mapping support

#### Scenario: Automated validation covers insert escape configuration

- **WHEN** `npm test` is executed
- **THEN** tests cover accepted modified-key aliases, rejected protected
    shortcuts, rejected raw printable text aliases, invalid config fallback,
    normal-mode keymap preservation, and live editor option cloning for the new
    setting

### Requirement: Keymap grammar diagnostics share resolver semantics

The Vim keymap configuration SHALL keep runtime command resolution and settings
diagnostics aligned for finite key sequence enumeration, exact conflicts, and
prefix-shadow conflicts.

#### Scenario: Runtime and diagnostics enumerate the same grammar bindings

- **WHEN** the default resolved keymap is inspected by runtime command
    resolution and by settings diagnostics
- **THEN** both paths see the same finite operator, motion, command, macro,
    mark, text-object, character-search, and search key sequences

#### Scenario: Exact conflicts are diagnosed before dispatch

- **WHEN** settings configure an action key sequence that exactly matches an
    existing resolved grammar binding
- **THEN** settings resolution rejects the action binding with a warning and
    runtime dispatch keeps the existing grammar binding behavior

#### Scenario: Prefix shadows are diagnosed before dispatch

- **WHEN** settings configure a binding that is a strict prefix of an existing
    executable grammar sequence or has an existing executable grammar sequence
    as its strict prefix
- **THEN** settings resolution rejects the shadowing binding with a warning
    and runtime dispatch keeps finite deterministic key sequence behavior

#### Scenario: Shared non-executable prefixes remain valid

- **WHEN** two bindings share a common prefix that is not itself executable,
    such as two `g`-prefixed sequences
- **THEN** settings diagnostics accepts both non-conflicting bindings and
    runtime resolution waits for the full configured sequence before dispatch

#### Scenario: Refactor preserves default command behavior

- **WHEN** `npm test` is executed after grammar helper extraction
- **THEN** existing default keymap command resolution, pending-prefix
    invalidation, protected shortcut handling, and keymap conflict tests
    continue to pass without changed user-facing expectations

### Requirement: Leader placeholder expands retained mapping keys

The Vim editor SHALL validate case-insensitive `<leader>` entries in each
settings layer against final effective leader, overlay retained configured
mapping keys by normal precedence, then expand keys that begin with `<leader>`
before keymap conflict resolution and runtime compilation. Expansion MUST apply
only to mapping keys or LHS values and MUST preserve existing mapping-category
validation, valid lower-layer fallback, and explicit empty-array clears.

#### Scenario: JSON leader action expands

- **WHEN** JSON sets leader to space and configures a command, motion,
    operator, macro, mark, or remap key containing `<leader>q`
- **THEN** that accepted binding resolves with the physical key sequence `q`

#### Scenario: Trusted JavaScript leader mapping expands

- **WHEN** JS assigns comma to `vim.g.mapleader` and calls
    `vim.keymap.set("n", "<Leader>q", vim.action.operator.uppercase())`
- **THEN** the resolved normal-mode uppercase binding uses the physical key
    sequence `,q`

#### Scenario: Repeated placeholder expands

- **WHEN** an accepted mapping key contains `<leader><Leader>` and the final
    leader is comma
- **THEN** the resolved physical mapping key is `,,`

#### Scenario: Project leader moves inherited mappings

- **WHEN** global JSON or trusted JS defines `<leader>` mappings and project
    JSON sets a different valid leader
- **THEN** all retained inherited and project leader mappings use the final
    project leader

#### Scenario: Project clear removes inherited leader ownership

- **WHEN** global JSON defines a leader action, trusted JS adds another
    binding for that action, and project JSON clears that action with an empty
    array or clears leader with `null`
- **THEN** no removed or unresolved mapping leaves stale leader-prefix
    reservation

#### Scenario: Literal replacement removes leader provenance

- **WHEN** a higher-priority layer replaces an inherited `<leader>` mapping
    with a literal physical key sequence
- **THEN** the retained literal mapping does not activate leader reservation
    unless another retained normal/visual mapping begins with `<leader>`

#### Scenario: Missing leader drops affected mappings

- **WHEN** retained mapping keys use `<leader>` and the final leader is unset
- **THEN** each affected mapping is ignored with a non-fatal warning while
    valid sibling mappings remain usable

#### Scenario: Lone placeholder is rejected

- **WHEN** a mapping key consists only of one `<leader>` placeholder
- **THEN** that mapping is ignored with a non-fatal warning because leader
    requires a following mapping key

#### Scenario: Mid-sequence placeholder is rejected

- **WHEN** a mapping key contains a normal key before `<leader>`, such as
    `g<leader>x`
- **THEN** that mapping is ignored with a non-fatal warning because leader
    must begin the mapping key

#### Scenario: Replay RHS does not expand leader

- **WHEN** a JS string replay RHS contains `<leader>` notation
- **THEN** pi-vimmode does not substitute the configured leader into that
    replay input

#### Scenario: Existing category rules remain authoritative

- **WHEN** leader expansion would produce a printable insert-mode sequence or
    a multi-key text-object binding
- **THEN** that binding is ignored with the existing category warning and no
    insert pending-key behavior is added

## REMOVED Requirements

### Requirement: Action keymap configuration binds finite prompt transform actions

**Reason**: Prompt transforms (`:quote`, `:unquote`, `:bulletize`, `:fence`,
`:indent`, `:dedent`, `:reflow`), their `prompt.transform.*` action keybindings,
and the recipe/preset bundles built on them were removed in 1.0.0.
**Migration**: Use Vim line shifts (`>>`, `<<`, visual `>`/`<`) and case
operators, or edit prompt text directly. `piVimMode.keymap.actions`,
`piVimMode.keymap.actionPresets`, and `piVimMode.promptTransforms` now warn and
are ignored.

### Requirement: Action binding conflicts are rejected before dispatch

**Reason**: Prompt transforms (`:quote`, `:unquote`, `:bulletize`, `:fence`,
`:indent`, `:dedent`, `:reflow`), their `prompt.transform.*` action keybindings,
and the recipe/preset bundles built on them were removed in 1.0.0.
**Migration**: Use Vim line shifts (`>>`, `<<`, visual `>`/`<`) and case
operators, or edit prompt text directly. `piVimMode.keymap.actions`,
`piVimMode.keymap.actionPresets`, and `piVimMode.promptTransforms` now warn and
are ignored.

### Requirement: Action keybinding presets resolve to finite action bindings

**Reason**: Prompt transforms (`:quote`, `:unquote`, `:bulletize`, `:fence`,
`:indent`, `:dedent`, `:reflow`), their `prompt.transform.*` action keybindings,
and the recipe/preset bundles built on them were removed in 1.0.0.
**Migration**: Use Vim line shifts (`>>`, `<<`, visual `>`/`<`) and case
operators, or edit prompt text directly. `piVimMode.keymap.actions`,
`piVimMode.keymap.actionPresets`, and `piVimMode.promptTransforms` now warn and
are ignored.

### Requirement: Diagnostic metadata remains separate from keymap commands

**Reason**: Some scenarios described `:features`, `:changelog`, or prompt
transform surfaces removed in 1.0.0; the remaining behavior moves unchanged to
"Keybindings command stays separate from diagnostic metadata".
**Migration**: None; see "Keybindings command stays separate from diagnostic metadata".

### Requirement: Protected shortcut overrides require explicit allow-list

**Reason**: Some scenarios described `:features`, `:changelog`, or prompt
transform surfaces removed in 1.0.0; the remaining behavior moves unchanged to
"Protected shortcut overrides require a same-layer allow-list".
**Migration**: None; see "Protected shortcut overrides require a same-layer allow-list".

### Requirement: Insert edit and navigation bindings are configurable

**Reason**: Some scenarios described `:features`, `:changelog`, or prompt
transform surfaces removed in 1.0.0; the remaining behavior moves unchanged to
"Insert edit and movement bindings are configurable".
**Migration**: None; see "Insert edit and movement bindings are configurable".

### Requirement: Trusted global JS keymap builder adds prompt built-in bindings

**Reason**: Some scenarios described `:features`, `:changelog`, or prompt
transform surfaces removed in 1.0.0; the remaining behavior moves unchanged to
"Trusted global JS keymap builder adds descriptor bindings".
**Migration**: None; see "Trusted global JS keymap builder adds descriptor bindings".

### Requirement: Prompt transform action keybindings may be mode scoped

**Reason**: Prompt transforms (`:quote`, `:unquote`, `:bulletize`, `:fence`,
`:indent`, `:dedent`, `:reflow`), their `prompt.transform.*` action keybindings,
and the recipe/preset bundles built on them were removed in 1.0.0.
**Migration**: Use Vim line shifts (`>>`, `<<`, visual `>`/`<`) and case
operators, or edit prompt text directly. `piVimMode.keymap.actions`,
`piVimMode.keymap.actionPresets`, and `piVimMode.promptTransforms` now warn and
are ignored.
