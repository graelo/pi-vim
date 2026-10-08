# pi-vim trusted JavaScript config

<a id="basic-setup"></a>

## Basic setup

> **Warning:** `~/.pi/agent/pi-vim.config.js` is unsandboxed trusted code.
> It runs with full Pi process privileges. Only put code and imports you trust
> in this file.

Create exactly `~/.pi/agent/pi-vim.config.js`:

```js
/** @type {import("./npm/node_modules/@graelo/pi-vim/config").VimConfig} */
export default (vim) => {
  vim.startMode = "normal";
};
```

`vim.startMode` is validated: only `"insert"` or `"normal"` is accepted. Run
`/vim reload` after editing root config. See checked
[`examples/pi-vim.config.js`](../examples/pi-vim.config.js) for a larger
basic workflow.

Generated reference blocks below come from canonical source metadata. Regenerate
with `npm run generate:config-reference`; check committed output with
`npm run check:config-reference`. Corresponding JSON behavior remains canonical
in [`docs/settings.md`](settings.md).

<a id="generated-properties"></a>

## Properties

<!-- rumdl-disable MD013 -->

<!-- BEGIN GENERATED CONFIG PROPERTIES -->

### `vim`

#### `vim.leader`

<a id="config-property-leader"></a>

- Accepted shape: `one printable character or null`
- Built-in default: `unset`
- Assignment semantics: replaces leader; null clears it
- JSON crosswalk: `piVim.leader`
- Compatibility aliases: [`vim.g.mapleader`](#config-property-leader)

#### `vim.preset`

<a id="config-property-preset"></a>

- Accepted shape: `"minimal" | "prompt-safe" | "vim-heavy"`
- Built-in default: `unset`
- Assignment semantics: applies selected preset baseline, then replaces preset value
- JSON crosswalk: `piVim.preset`
- Compatibility aliases: none

#### `vim.startMode`

<a id="config-property-startMode"></a>

- Accepted shape: `"insert" | "normal"`
- Built-in default: `"insert"`
- Assignment semantics: replaces startup mode
- JSON crosswalk: `piVim.startMode`
- Compatibility aliases: none

### `vim.cursor`

#### `vim.cursor.insert`

<a id="config-property-cursor-insert"></a>

- Accepted shape: `"block" | "bar" | "underline"`
- Built-in default: `"bar"`
- Assignment semantics: replaces cursor style
- JSON crosswalk: `piVim.cursor.insert`
- Compatibility aliases: none

#### `vim.cursor.normal`

<a id="config-property-cursor-normal"></a>

- Accepted shape: `"block" | "bar" | "underline"`
- Built-in default: `"block"`
- Assignment semantics: replaces cursor style
- JSON crosswalk: `piVim.cursor.normal`
- Compatibility aliases: none

#### `vim.cursor.visual`

<a id="config-property-cursor-visual"></a>

- Accepted shape: `"block" | "bar" | "underline"`
- Built-in default: `"block"`
- Assignment semantics: replaces cursor style
- JSON crosswalk: `piVim.cursor.visual`
- Compatibility aliases: none

#### `vim.cursor.visualBlock`

<a id="config-property-cursor-visualBlock"></a>

- Accepted shape: `"block" | "bar" | "underline"`
- Built-in default: `"block"`
- Assignment semantics: replaces cursor style
- JSON crosswalk: `piVim.cursor.visualBlock`
- Compatibility aliases: none

#### `vim.cursor.visualLine`

<a id="config-property-cursor-visualLine"></a>

- Accepted shape: `"block" | "bar" | "underline"`
- Built-in default: `"block"`
- Assignment semantics: replaces cursor style
- JSON crosswalk: `piVim.cursor.visualLine`
- Compatibility aliases: none

### `vim.exCommand`

#### `vim.exCommand.autocomplete`

<a id="config-property-exCommand-autocomplete"></a>

- Accepted shape: `boolean`
- Built-in default: `true`
- Assignment semantics: replaces value
- JSON crosswalk: `piVim.exCommand.autocomplete`
- Compatibility aliases: none

### `vim.feedback`

#### `vim.feedback.noop`

<a id="config-property-feedback-noop"></a>

- Accepted shape: `"off" | "status"`
- Built-in default: `"off"`
- Assignment semantics: replaces value
- JSON crosswalk: `piVim.feedback.noop`
- Compatibility aliases: none

### `vim.keymap`

#### `vim.keymap.operatorMotions`

<a id="config-property-keymap-operatorMotions"></a>

- Accepted shape: `partial record of operator names to motion-name arrays`
- Built-in default: `{"change": ["left", "down", "up", "right", "wordForward", "wordBackward", "wordEnd", "wordForwardBig", "wordBackwardBig", "wordEndBig", "wordPreviousEnd", "wordPreviousEndBig", "lineStart", "lineEnd", "firstNonBlank", "bufferStart", "bufferEnd", "matchingPair", "paragraphBackward", "paragraphForward"], "delete": ["left", "down", "up", "right", "wordForward", "wordBackward", "wordEnd", "wordForwardBig", "wordBackwardBig", "wordEndBig", "wordPreviousEnd", "wordPreviousEndBig", "lineStart", "lineEnd", "firstNonBlank", "bufferStart", "bufferEnd", "matchingPair", "paragraphBackward", "paragraphForward"], "lowercase": ["left", "down", "up", "right", "wordForward", "wordBackward", "wordEnd", "wordForwardBig", "wordBackwardBig", "wordEndBig", "wordPreviousEnd", "wordPreviousEndBig", "lineStart", "lineEnd", "firstNonBlank", "bufferStart", "bufferEnd", "matchingPair", "paragraphBackward", "paragraphForward"], "surround": ["left", "down", "up", "right", "wordForward", "wordBackward", "wordEnd", "wordForwardBig", "wordBackwardBig", "wordEndBig", "wordPreviousEnd", "wordPreviousEndBig", "lineStart", "lineEnd", "firstNonBlank", "bufferStart", "bufferEnd", "matchingPair", "paragraphBackward", "paragraphForward"], "toggleCase": ["left", "down", "up", "right", "wordForward", "wordBackward", "wordEnd", "wordForwardBig", "wordBackwardBig", "wordEndBig", "wordPreviousEnd", "wordPreviousEndBig", "lineStart", "lineEnd", "firstNonBlank", "bufferStart", "bufferEnd", "matchingPair", "paragraphBackward", "paragraphForward"], "uppercase": ["left", "down", "up", "right", "wordForward", "wordBackward", "wordEnd", "wordForwardBig", "wordBackwardBig", "wordEndBig", "wordPreviousEnd", "wordPreviousEndBig", "lineStart", "lineEnd", "firstNonBlank", "bufferStart", "bufferEnd", "matchingPair", "paragraphBackward", "paragraphForward"], "yank": ["left", "down", "up", "right", "wordForward", "wordBackward", "wordEnd", "wordForwardBig", "wordBackwardBig", "wordEndBig", "wordPreviousEnd", "wordPreviousEndBig", "lineStart", "lineEnd", "firstNonBlank", "bufferStart", "bufferEnd", "matchingPair", "paragraphBackward", "paragraphForward"]}`
- Assignment semantics: replaces operator-motion allow-list
- JSON crosswalk: `piVim.keymap.operatorMotions`
- Compatibility aliases: none

### `vim.macros`

#### `vim.macros.enabled`

<a id="config-property-macros-enabled"></a>

- Accepted shape: `boolean`
- Built-in default: `true`
- Assignment semantics: replaces value
- JSON crosswalk: `piVim.macros.enabled`
- Compatibility aliases: none

#### `vim.macros.maxReplaySteps`

<a id="config-property-macros-maxReplaySteps"></a>

- Accepted shape: `positive integer`
- Built-in default: `1000`
- Assignment semantics: replaces value
- JSON crosswalk: `piVim.macros.maxReplaySteps`
- Compatibility aliases: none

#### `vim.macros.slots`

<a id="config-property-macros-slots"></a>

- Accepted shape: `readonly lowercase register-name[]`
- Built-in default: `["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"]`
- Assignment semantics: replaces slot list
- JSON crosswalk: `piVim.macros.slots`
- Compatibility aliases: none

### `vim.marks`

#### `vim.marks.enabled`

<a id="config-property-marks-enabled"></a>

- Accepted shape: `boolean`
- Built-in default: `true`
- Assignment semantics: replaces value
- JSON crosswalk: `piVim.marks.enabled`
- Compatibility aliases: none

#### `vim.marks.slots`

<a id="config-property-marks-slots"></a>

- Accepted shape: `readonly lowercase register-name[]`
- Built-in default: `["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"]`
- Assignment semantics: replaces slot list
- JSON crosswalk: `piVim.marks.slots`
- Compatibility aliases: none

### `vim.promptStructures`

#### `vim.promptStructures.enabled`

<a id="config-property-promptStructures-enabled"></a>

- Accepted shape: `boolean`
- Built-in default: `true`
- Assignment semantics: replaces value
- JSON crosswalk: `piVim.promptStructures.enabled`
- Compatibility aliases: none

#### `vim.promptStructures.targets`

<a id="config-property-promptStructures-targets"></a>

- Accepted shape: `partial record of prompt-structure targets to booleans`
- Built-in default: `{"codeFence": true, "errorBlock": true, "headingSection": true, "listItem": true, "tag": true}`
- Assignment semantics: replaces whole record; does not merge keys
- JSON crosswalk: `piVim.promptStructures.targets`
- Compatibility aliases: none

### `vim.search`

#### `vim.search.clearOnCancel`

<a id="config-property-search-clearOnCancel"></a>

- Accepted shape: `boolean`
- Built-in default: `true`
- Assignment semantics: replaces value
- JSON crosswalk: `piVim.search.clearOnCancel`
- Compatibility aliases: none

#### `vim.search.clearOnInsert`

<a id="config-property-search-clearOnInsert"></a>

- Accepted shape: `boolean`
- Built-in default: `true`
- Assignment semantics: replaces value
- JSON crosswalk: `piVim.search.clearOnInsert`
- Compatibility aliases: none

#### `vim.search.highlight`

<a id="config-property-search-highlight"></a>

- Accepted shape: `boolean`
- Built-in default: `true`
- Assignment semantics: replaces value
- JSON crosswalk: `piVim.search.highlight`
- Compatibility aliases: none

#### `vim.search.highlightCurrent`

<a id="config-property-search-highlightCurrent"></a>

- Accepted shape: `boolean`
- Built-in default: `true`
- Assignment semantics: replaces value
- JSON crosswalk: `piVim.search.highlightCurrent`
- Compatibility aliases: none

#### `vim.search.maxHighlights`

<a id="config-property-search-maxHighlights"></a>

- Accepted shape: `non-negative integer`
- Built-in default: `200`
- Assignment semantics: replaces value
- JSON crosswalk: `piVim.search.maxHighlights`
- Compatibility aliases: none

### `vim.ui`

#### `vim.ui.cursorPosition.base`

<a id="config-property-ui-cursorPosition-base"></a>

- Accepted shape: `0 | 1`
- Built-in default: `1`
- Assignment semantics: replaces value
- JSON crosswalk: `piVim.ui.cursorPosition.base`
- Compatibility aliases: none

#### `vim.ui.cursorPosition.enabled`

<a id="config-property-ui-cursorPosition-enabled"></a>

- Accepted shape: `boolean`
- Built-in default: `true`
- Assignment semantics: replaces value
- JSON crosswalk: `piVim.ui.cursorPosition.enabled`
- Compatibility aliases: none

#### `vim.ui.cursorPosition.format`

<a id="config-property-ui-cursorPosition-format"></a>

- Accepted shape: `string`
- Built-in default: `"{line}:{column}"`
- Assignment semantics: replaces value
- JSON crosswalk: `piVim.ui.cursorPosition.format`
- Compatibility aliases: none

#### `vim.ui.mode.enabled`

<a id="config-property-ui-mode-enabled"></a>

- Accepted shape: `boolean`
- Built-in default: `true`
- Assignment semantics: replaces value
- JSON crosswalk: `piVim.ui.mode.enabled`
- Compatibility aliases: none

#### `vim.ui.mode.labels`

<a id="config-property-ui-mode-labels"></a>

- Accepted shape: `partial record of Vim modes to strings`
- Built-in default: `{"insert": "INSERT", "normal": "NORMAL", "visual": "VISUAL", "visualBlock": "V-BLOCK", "visualLine": "V-LINE"}`
- Assignment semantics: replaces whole record; does not merge keys
- JSON crosswalk: `piVim.ui.mode.labels`
- Compatibility aliases: none

#### `vim.ui.mode.narrowLabels`

<a id="config-property-ui-mode-narrowLabels"></a>

- Accepted shape: `partial record of Vim modes to strings`
- Built-in default: `{"insert": "I", "normal": "N", "visual": "V", "visualBlock": "VB", "visualLine": "VL"}`
- Assignment semantics: replaces whole record; does not merge keys
- JSON crosswalk: `piVim.ui.mode.narrowLabels`
- Compatibility aliases: none

#### `vim.ui.selection.enabled`

<a id="config-property-ui-selection-enabled"></a>

- Accepted shape: `boolean`
- Built-in default: `true`
- Assignment semantics: replaces value
- JSON crosswalk: `piVim.ui.selection.enabled`
- Compatibility aliases: none

#### `vim.ui.selection.previewMaxChars`

<a id="config-property-ui-selection-previewMaxChars"></a>

- Accepted shape: `non-negative integer`
- Built-in default: `16`
- Assignment semantics: replaces value
- JSON crosswalk: `piVim.ui.selection.previewMaxChars`
- Compatibility aliases: none

#### `vim.ui.status.enabled`

<a id="config-property-ui-status-enabled"></a>

- Accepted shape: `boolean`
- Built-in default: `true`
- Assignment semantics: replaces value
- JSON crosswalk: `piVim.ui.status.enabled`
- Compatibility aliases: none

#### `vim.ui.status.items`

<a id="config-property-ui-status-items"></a>

- Accepted shape: `readonly ("mode" | "pendingOperator" | "selection" | "cursorPosition")[]`
- Built-in default: `["mode", "pendingOperator", "selection", "cursorPosition"]`
- Assignment semantics: replaces item list
- JSON crosswalk: `piVim.ui.status.items`
- Compatibility aliases: none

#### `vim.ui.status.position`

<a id="config-property-ui-status-position"></a>

- Accepted shape: `"left" | "right"`
- Built-in default: `"left"`
- Assignment semantics: replaces value
- JSON crosswalk: `piVim.ui.status.position`
- Compatibility aliases: none

#### `vim.ui.workbench.reservedRows`

<a id="config-property-ui-workbench-reservedRows"></a>

- Accepted shape: `integer from 0 through 5`
- Built-in default: `0`
- Assignment semantics: replaces value
- JSON crosswalk: `piVim.ui.workbench.reservedRows`
- Compatibility aliases: none

<!-- END GENERATED CONFIG PROPERTIES -->

<!-- rumdl-enable MD013 -->

<a id="generated-actions"></a>

## Actions

<!-- rumdl-disable MD013 -->

<!-- BEGIN GENERATED CONFIG ACTIONS -->

### `vim.action.command`

#### `command.changeSurround`

<a id="config-action-command-changeSurround"></a>

- Canonical factory: `vim.action.command.changeSurround()`
- Supported mapping scopes: `normal`
- Default keys: `cs`
- Compatibility aliases: none

#### `command.changeToLineEnd`

<a id="config-action-command-changeToLineEnd"></a>

- Canonical factory: `vim.action.command.changeToLineEnd()`
- Supported mapping scopes: `normal`
- Default keys: `C`
- Compatibility aliases: none

#### `command.decrementNumber`

<a id="config-action-command-decrementNumber"></a>

- Canonical factory: `vim.action.command.decrementNumber()`
- Supported mapping scopes: `normal`
- Default keys: `ctrl+x`
- Compatibility aliases: none

#### `command.deleteChar`

<a id="config-action-command-deleteChar"></a>

- Canonical factory: `vim.action.command.deleteChar()`
- Supported mapping scopes: `normal`, `visual`, `visualLine`, `visualBlock`
- Default keys: `x`
- Compatibility aliases: none

#### `command.deleteCharBefore`

<a id="config-action-command-deleteCharBefore"></a>

- Canonical factory: `vim.action.command.deleteCharBefore()`
- Supported mapping scopes: `normal`
- Default keys: `X`
- Compatibility aliases: none

#### `command.deleteSurround`

<a id="config-action-command-deleteSurround"></a>

- Canonical factory: `vim.action.command.deleteSurround()`
- Supported mapping scopes: `normal`
- Default keys: `ds`
- Compatibility aliases: none

#### `command.deleteToLineEnd`

<a id="config-action-command-deleteToLineEnd"></a>

- Canonical factory: `vim.action.command.deleteToLineEnd()`
- Supported mapping scopes: `normal`
- Default keys: `D`
- Compatibility aliases: none

#### `command.easymotion`

<a id="config-action-command-easymotion"></a>

- Canonical factory: `vim.action.command.easymotion.goToChar()`
- Supported mapping scopes: `normal`
- Default keys: none
- Compatibility aliases: [`vim.action.command.easymotion()`](#config-action-command-easymotion)

#### `command.findCharBackward`

<a id="config-action-command-findCharBackward"></a>

- Canonical factory: `vim.action.command.findCharBackward()`
- Supported mapping scopes: `normal`
- Default keys: `F`
- Compatibility aliases: none

#### `command.findCharForward`

<a id="config-action-command-findCharForward"></a>

- Canonical factory: `vim.action.command.findCharForward()`
- Supported mapping scopes: `normal`
- Default keys: `f`
- Compatibility aliases: none

#### `command.incrementNumber`

<a id="config-action-command-incrementNumber"></a>

- Canonical factory: `vim.action.command.incrementNumber()`
- Supported mapping scopes: `normal`
- Default keys: `ctrl+a`
- Compatibility aliases: none

#### `command.insertAfter`

<a id="config-action-command-insertAfter"></a>

- Canonical factory: `vim.action.command.insertAfter()`
- Supported mapping scopes: `normal`
- Default keys: `a`
- Compatibility aliases: none

#### `command.insertBefore`

<a id="config-action-command-insertBefore"></a>

- Canonical factory: `vim.action.command.insertBefore()`
- Supported mapping scopes: `normal`
- Default keys: `i`
- Compatibility aliases: none

#### `command.insertLineEnd`

<a id="config-action-command-insertLineEnd"></a>

- Canonical factory: `vim.action.command.insertLineEnd()`
- Supported mapping scopes: `normal`, `visualBlock`
- Default keys: `A`
- Compatibility aliases: none

#### `command.insertLineStart`

<a id="config-action-command-insertLineStart"></a>

- Canonical factory: `vim.action.command.insertLineStart()`
- Supported mapping scopes: `normal`, `visualBlock`
- Default keys: `I`
- Compatibility aliases: none

#### `command.joinLine`

<a id="config-action-command-joinLine"></a>

- Canonical factory: `vim.action.command.joinLine()`
- Supported mapping scopes: `normal`
- Default keys: `J`
- Compatibility aliases: none

#### `command.openLineAbove`

<a id="config-action-command-openLineAbove"></a>

- Canonical factory: `vim.action.command.openLineAbove()`
- Supported mapping scopes: `normal`
- Default keys: `O`
- Compatibility aliases: none

#### `command.openLineBelow`

<a id="config-action-command-openLineBelow"></a>

- Canonical factory: `vim.action.command.openLineBelow()`
- Supported mapping scopes: `normal`
- Default keys: `o`
- Compatibility aliases: none

#### `command.pasteAfter`

<a id="config-action-command-pasteAfter"></a>

- Canonical factory: `vim.action.command.pasteAfter()`
- Supported mapping scopes: `normal`, `visualLine`
- Default keys: `p`
- Compatibility aliases: none

#### `command.pasteBefore`

<a id="config-action-command-pasteBefore"></a>

- Canonical factory: `vim.action.command.pasteBefore()`
- Supported mapping scopes: `normal`
- Default keys: `P`
- Compatibility aliases: none

#### `command.redo`

<a id="config-action-command-redo"></a>

- Canonical factory: `vim.action.command.redo()`
- Supported mapping scopes: `normal`
- Default keys: `ctrl+r`
- Compatibility aliases: none

#### `command.repeatChange`

<a id="config-action-command-repeatChange"></a>

- Canonical factory: `vim.action.command.repeatChange()`
- Supported mapping scopes: `normal`
- Default keys: `.`
- Compatibility aliases: none

#### `command.repeatCharSearch`

<a id="config-action-command-repeatCharSearch"></a>

- Canonical factory: `vim.action.command.repeatCharSearch()`
- Supported mapping scopes: `normal`
- Default keys: `;`
- Compatibility aliases: none

#### `command.repeatCharSearchReverse`

<a id="config-action-command-repeatCharSearchReverse"></a>

- Canonical factory: `vim.action.command.repeatCharSearchReverse()`
- Supported mapping scopes: `normal`
- Default keys: `,`
- Compatibility aliases: none

#### `command.repeatSearch`

<a id="config-action-command-repeatSearch"></a>

- Canonical factory: `vim.action.command.repeatSearch()`
- Supported mapping scopes: `normal`, `visual`, `visualLine`, `visualBlock`
- Default keys: `n`
- Compatibility aliases: none

#### `command.repeatSearchReverse`

<a id="config-action-command-repeatSearchReverse"></a>

- Canonical factory: `vim.action.command.repeatSearchReverse()`
- Supported mapping scopes: `normal`, `visual`, `visualLine`, `visualBlock`
- Default keys: `N`
- Compatibility aliases: none

#### `command.replaceChar`

<a id="config-action-command-replaceChar"></a>

- Canonical factory: `vim.action.command.replaceChar()`
- Supported mapping scopes: `normal`, `visual`, `visualLine`, `visualBlock`
- Default keys: `r`
- Compatibility aliases: none

#### `command.reselectVisual`

<a id="config-action-command-reselectVisual"></a>

- Canonical factory: `vim.action.command.reselectVisual()`
- Supported mapping scopes: `normal`
- Default keys: `gv`
- Compatibility aliases: none

#### `command.searchWordBackward`

<a id="config-action-command-searchWordBackward"></a>

- Canonical factory: `vim.action.command.searchWordBackward()`
- Supported mapping scopes: `normal`
- Default keys: `#`
- Compatibility aliases: none

#### `command.searchWordForward`

<a id="config-action-command-searchWordForward"></a>

- Canonical factory: `vim.action.command.searchWordForward()`
- Supported mapping scopes: `normal`
- Default keys: `*`
- Compatibility aliases: none

#### `command.showKeybindings`

<a id="config-action-command-showKeybindings"></a>

- Canonical factory: `vim.action.command.showKeybindings()`
- Supported mapping scopes: `normal`
- Default keys: none
- Compatibility aliases: none

#### `command.startExCommand`

<a id="config-action-command-startExCommand"></a>

- Canonical factory: `vim.action.command.startExCommand()`
- Supported mapping scopes: `normal`, `visual`, `visualLine`, `visualBlock`
- Default keys: `:`
- Compatibility aliases: none

#### `command.startSearch`

<a id="config-action-command-startSearch"></a>

- Canonical factory: `vim.action.command.startSearch()`
- Supported mapping scopes: `normal`, `visual`, `visualLine`, `visualBlock`
- Default keys: `/`
- Compatibility aliases: none

#### `command.startSearchBackward`

<a id="config-action-command-startSearchBackward"></a>

- Canonical factory: `vim.action.command.startSearchBackward()`
- Supported mapping scopes: `normal`, `visual`, `visualLine`, `visualBlock`
- Default keys: `?`
- Compatibility aliases: none

#### `command.substituteChar`

<a id="config-action-command-substituteChar"></a>

- Canonical factory: `vim.action.command.substituteChar()`
- Supported mapping scopes: `normal`
- Default keys: `s`
- Compatibility aliases: none

#### `command.substituteLine`

<a id="config-action-command-substituteLine"></a>

- Canonical factory: `vim.action.command.substituteLine()`
- Supported mapping scopes: `normal`
- Default keys: `S`
- Compatibility aliases: none

#### `command.surroundSelection`

<a id="config-action-command-surroundSelection"></a>

- Canonical factory: `vim.action.command.surroundSelection()`
- Supported mapping scopes: `visual`, `visualLine`, `visualBlock`
- Default keys: `S`
- Compatibility aliases: none

#### `command.tillCharBackward`

<a id="config-action-command-tillCharBackward"></a>

- Canonical factory: `vim.action.command.tillCharBackward()`
- Supported mapping scopes: `normal`
- Default keys: `T`
- Compatibility aliases: none

#### `command.tillCharForward`

<a id="config-action-command-tillCharForward"></a>

- Canonical factory: `vim.action.command.tillCharForward()`
- Supported mapping scopes: `normal`
- Default keys: `t`
- Compatibility aliases: none

#### `command.toggleCase`

<a id="config-action-command-toggleCase"></a>

- Canonical factory: `vim.action.command.toggleCase()`
- Supported mapping scopes: `normal`, `visual`, `visualLine`, `visualBlock`
- Default keys: `~`
- Compatibility aliases: none

#### `command.undo`

<a id="config-action-command-undo"></a>

- Canonical factory: `vim.action.command.undo()`
- Supported mapping scopes: `normal`
- Default keys: `u`
- Compatibility aliases: none

#### `command.visualBlock`

<a id="config-action-command-visualBlock"></a>

- Canonical factory: `vim.action.command.visualBlock()`
- Supported mapping scopes: `normal`, `visual`, `visualLine`, `visualBlock`
- Default keys: none
- Compatibility aliases: none

#### `command.visualChar`

<a id="config-action-command-visualChar"></a>

- Canonical factory: `vim.action.command.visualChar()`
- Supported mapping scopes: `normal`, `visual`, `visualLine`, `visualBlock`
- Default keys: `v`
- Compatibility aliases: none

#### `command.visualLine`

<a id="config-action-command-visualLine"></a>

- Canonical factory: `vim.action.command.visualLine()`
- Supported mapping scopes: `normal`, `visual`, `visualLine`, `visualBlock`
- Default keys: `V`
- Compatibility aliases: none

#### `command.yankLine`

<a id="config-action-command-yankLine"></a>

- Canonical factory: `vim.action.command.yankLine()`
- Supported mapping scopes: `normal`
- Default keys: `Y`
- Compatibility aliases: none

### `vim.action.escape`

#### `escape`

<a id="config-action-escape"></a>

- Canonical factory: `vim.action.escape()`
- Supported mapping scopes: `visual`, `visualLine`, `visualBlock`, `insert`, `operatorPending`
- Default keys: none
- Compatibility aliases: none

### `vim.action.insert`

#### `insert.deleteLineBackward`

<a id="config-action-insert-deleteLineBackward"></a>

- Canonical factory: `vim.action.insert.deleteLineBackward()`
- Supported mapping scopes: `insert`
- Default keys: none
- Compatibility aliases: [`vim.prompt.deleteLineBackward()`](#config-action-insert-deleteLineBackward)

#### `insert.deleteLineForward`

<a id="config-action-insert-deleteLineForward"></a>

- Canonical factory: `vim.action.insert.deleteLineForward()`
- Supported mapping scopes: `insert`
- Default keys: none
- Compatibility aliases: [`vim.prompt.deleteLineForward()`](#config-action-insert-deleteLineForward)

#### `insert.deleteWordBackward`

<a id="config-action-insert-deleteWordBackward"></a>

- Canonical factory: `vim.action.insert.deleteWordBackward()`
- Supported mapping scopes: `insert`
- Default keys: none
- Compatibility aliases: [`vim.prompt.deleteWordBackward()`](#config-action-insert-deleteWordBackward)

#### `insert.deleteWordForward`

<a id="config-action-insert-deleteWordForward"></a>

- Canonical factory: `vim.action.insert.deleteWordForward()`
- Supported mapping scopes: `insert`
- Default keys: none
- Compatibility aliases: [`vim.prompt.deleteWordForward()`](#config-action-insert-deleteWordForward)

#### `insert.moveLineEnd`

<a id="config-action-insert-moveLineEnd"></a>

- Canonical factory: `vim.action.insert.moveLineEnd()`
- Supported mapping scopes: `insert`
- Default keys: none
- Compatibility aliases: [`vim.prompt.moveLineEnd()`](#config-action-insert-moveLineEnd)

#### `insert.moveLineStart`

<a id="config-action-insert-moveLineStart"></a>

- Canonical factory: `vim.action.insert.moveLineStart()`
- Supported mapping scopes: `insert`
- Default keys: none
- Compatibility aliases: [`vim.prompt.moveLineStart()`](#config-action-insert-moveLineStart)

#### `insert.moveWordBackward`

<a id="config-action-insert-moveWordBackward"></a>

- Canonical factory: `vim.action.insert.moveWordBackward()`
- Supported mapping scopes: `insert`
- Default keys: none
- Compatibility aliases: [`vim.prompt.moveWordBackward()`](#config-action-insert-moveWordBackward)

#### `insert.moveWordForward`

<a id="config-action-insert-moveWordForward"></a>

- Canonical factory: `vim.action.insert.moveWordForward()`
- Supported mapping scopes: `insert`
- Default keys: none
- Compatibility aliases: [`vim.prompt.moveWordForward()`](#config-action-insert-moveWordForward)

#### `insert.openLineAbove`

<a id="config-action-insert-openLineAbove"></a>

- Canonical factory: `vim.action.insert.openLineAbove()`
- Supported mapping scopes: `insert`
- Default keys: none
- Compatibility aliases: [`vim.prompt.openLineAbove()`](#config-action-insert-openLineAbove)

#### `insert.openLineBelow`

<a id="config-action-insert-openLineBelow"></a>

- Canonical factory: `vim.action.insert.openLineBelow()`
- Supported mapping scopes: `insert`
- Default keys: none
- Compatibility aliases: [`vim.prompt.openLineBelow()`](#config-action-insert-openLineBelow)

### `vim.action.macro`

#### `macro.play`

<a id="config-action-macro-play"></a>

- Canonical factory: `vim.action.macro.play()`
- Supported mapping scopes: `normal`
- Default keys: `@`
- Compatibility aliases: none

#### `macro.record`

<a id="config-action-macro-record"></a>

- Canonical factory: `vim.action.macro.record()`
- Supported mapping scopes: `normal`
- Default keys: `q`
- Compatibility aliases: none

### `vim.action.mark`

#### `mark.jumpExact`

<a id="config-action-mark-jumpExact"></a>

- Canonical factory: `vim.action.mark.jumpExact()`
- Supported mapping scopes: `normal`, `visual`, `visualLine`, `visualBlock`
- Default keys: `` ` ``
- Compatibility aliases: none

#### `mark.jumpLine`

<a id="config-action-mark-jumpLine"></a>

- Canonical factory: `vim.action.mark.jumpLine()`
- Supported mapping scopes: `normal`, `visual`, `visualLine`, `visualBlock`
- Default keys: `'`
- Compatibility aliases: none

#### `mark.set`

<a id="config-action-mark-set"></a>

- Canonical factory: `vim.action.mark.set()`
- Supported mapping scopes: `normal`
- Default keys: `m`
- Compatibility aliases: none

### `vim.action.motion`

#### `motion.bufferEnd`

<a id="config-action-motion-bufferEnd"></a>

- Canonical factory: `vim.action.motion.bufferEnd()`
- Supported mapping scopes: `normal`, `visual`, `visualLine`, `visualBlock`, `operatorPending`
- Default keys: `G`
- Compatibility aliases: none

#### `motion.bufferStart`

<a id="config-action-motion-bufferStart"></a>

- Canonical factory: `vim.action.motion.bufferStart()`
- Supported mapping scopes: `normal`, `visual`, `visualLine`, `visualBlock`, `operatorPending`
- Default keys: `gg`
- Compatibility aliases: none

#### `motion.down`

<a id="config-action-motion-down"></a>

- Canonical factory: `vim.action.motion.down()`
- Supported mapping scopes: `normal`, `visual`, `visualLine`, `visualBlock`, `operatorPending`
- Default keys: `j`, `down`
- Compatibility aliases: none

#### `motion.firstNonBlank`

<a id="config-action-motion-firstNonBlank"></a>

- Canonical factory: `vim.action.motion.firstNonBlank()`
- Supported mapping scopes: `normal`, `visual`, `visualLine`, `visualBlock`, `operatorPending`
- Default keys: `^`, `_`
- Compatibility aliases: none

#### `motion.halfPageDown`

<a id="config-action-motion-halfPageDown"></a>

- Canonical factory: `vim.action.motion.halfPageDown()`
- Supported mapping scopes: `normal`, `visual`, `visualLine`, `visualBlock`
- Default keys: `ctrl+d`
- Compatibility aliases: none

#### `motion.halfPageUp`

<a id="config-action-motion-halfPageUp"></a>

- Canonical factory: `vim.action.motion.halfPageUp()`
- Supported mapping scopes: `normal`, `visual`, `visualLine`, `visualBlock`
- Default keys: `ctrl+u`
- Compatibility aliases: none

#### `motion.left`

<a id="config-action-motion-left"></a>

- Canonical factory: `vim.action.motion.left()`
- Supported mapping scopes: `normal`, `visual`, `visualLine`, `visualBlock`, `operatorPending`
- Default keys: `h`, `left`
- Compatibility aliases: none

#### `motion.lineEnd`

<a id="config-action-motion-lineEnd"></a>

- Canonical factory: `vim.action.motion.lineEnd()`
- Supported mapping scopes: `normal`, `visual`, `visualLine`, `visualBlock`, `operatorPending`
- Default keys: `$`
- Compatibility aliases: none

#### `motion.lineStart`

<a id="config-action-motion-lineStart"></a>

- Canonical factory: `vim.action.motion.lineStart()`
- Supported mapping scopes: `normal`, `visual`, `visualLine`, `visualBlock`, `operatorPending`
- Default keys: `0`
- Compatibility aliases: none

#### `motion.matchingPair`

<a id="config-action-motion-matchingPair"></a>

- Canonical factory: `vim.action.motion.matchingPair()`
- Supported mapping scopes: `normal`, `visual`, `visualLine`, `visualBlock`, `operatorPending`
- Default keys: `%`
- Compatibility aliases: none

#### `motion.paragraphBackward`

<a id="config-action-motion-paragraphBackward"></a>

- Canonical factory: `vim.action.motion.paragraphBackward()`
- Supported mapping scopes: `normal`, `visual`, `visualLine`, `visualBlock`, `operatorPending`
- Default keys: `{`
- Compatibility aliases: none

#### `motion.paragraphForward`

<a id="config-action-motion-paragraphForward"></a>

- Canonical factory: `vim.action.motion.paragraphForward()`
- Supported mapping scopes: `normal`, `visual`, `visualLine`, `visualBlock`, `operatorPending`
- Default keys: `}`
- Compatibility aliases: none

#### `motion.right`

<a id="config-action-motion-right"></a>

- Canonical factory: `vim.action.motion.right()`
- Supported mapping scopes: `normal`, `visual`, `visualLine`, `visualBlock`, `operatorPending`
- Default keys: `l`, `right`
- Compatibility aliases: none

#### `motion.up`

<a id="config-action-motion-up"></a>

- Canonical factory: `vim.action.motion.up()`
- Supported mapping scopes: `normal`, `visual`, `visualLine`, `visualBlock`, `operatorPending`
- Default keys: `k`, `up`
- Compatibility aliases: none

#### `motion.wordBackward`

<a id="config-action-motion-wordBackward"></a>

- Canonical factory: `vim.action.motion.wordBackward()`
- Supported mapping scopes: `normal`, `visual`, `visualLine`, `visualBlock`, `operatorPending`
- Default keys: `b`
- Compatibility aliases: none

#### `motion.wordBackwardBig`

<a id="config-action-motion-wordBackwardBig"></a>

- Canonical factory: `vim.action.motion.wordBackwardBig()`
- Supported mapping scopes: `normal`, `visual`, `visualLine`, `visualBlock`, `operatorPending`
- Default keys: `B`
- Compatibility aliases: none

#### `motion.wordEnd`

<a id="config-action-motion-wordEnd"></a>

- Canonical factory: `vim.action.motion.wordEnd()`
- Supported mapping scopes: `normal`, `visual`, `visualLine`, `visualBlock`, `operatorPending`
- Default keys: `e`
- Compatibility aliases: none

#### `motion.wordEndBig`

<a id="config-action-motion-wordEndBig"></a>

- Canonical factory: `vim.action.motion.wordEndBig()`
- Supported mapping scopes: `normal`, `visual`, `visualLine`, `visualBlock`, `operatorPending`
- Default keys: `E`
- Compatibility aliases: none

#### `motion.wordForward`

<a id="config-action-motion-wordForward"></a>

- Canonical factory: `vim.action.motion.wordForward()`
- Supported mapping scopes: `normal`, `visual`, `visualLine`, `visualBlock`, `operatorPending`
- Default keys: `w`
- Compatibility aliases: none

#### `motion.wordForwardBig`

<a id="config-action-motion-wordForwardBig"></a>

- Canonical factory: `vim.action.motion.wordForwardBig()`
- Supported mapping scopes: `normal`, `visual`, `visualLine`, `visualBlock`, `operatorPending`
- Default keys: `W`
- Compatibility aliases: none

#### `motion.wordPreviousEnd`

<a id="config-action-motion-wordPreviousEnd"></a>

- Canonical factory: `vim.action.motion.wordPreviousEnd()`
- Supported mapping scopes: `normal`, `visual`, `visualLine`, `visualBlock`, `operatorPending`
- Default keys: `ge`
- Compatibility aliases: none

#### `motion.wordPreviousEndBig`

<a id="config-action-motion-wordPreviousEndBig"></a>

- Canonical factory: `vim.action.motion.wordPreviousEndBig()`
- Supported mapping scopes: `normal`, `visual`, `visualLine`, `visualBlock`, `operatorPending`
- Default keys: `gE`
- Compatibility aliases: none

### `vim.action.operator`

#### `operator.change`

<a id="config-action-operator-change"></a>

- Canonical factory: `vim.action.operator.change()`
- Supported mapping scopes: `normal`, `visual`, `visualLine`, `visualBlock`
- Default keys: `c`
- Compatibility aliases: none

#### `operator.dedent`

<a id="config-action-operator-dedent"></a>

- Canonical factory: `vim.action.operator.dedent()`
- Supported mapping scopes: `normal`, `visual`, `visualLine`, `visualBlock`
- Default keys: `<`
- Compatibility aliases: none

#### `operator.delete`

<a id="config-action-operator-delete"></a>

- Canonical factory: `vim.action.operator.delete()`
- Supported mapping scopes: `normal`, `visual`, `visualLine`, `visualBlock`
- Default keys: `d`
- Compatibility aliases: none

#### `operator.indent`

<a id="config-action-operator-indent"></a>

- Canonical factory: `vim.action.operator.indent()`
- Supported mapping scopes: `normal`, `visual`, `visualLine`, `visualBlock`
- Default keys: `>`
- Compatibility aliases: none

#### `operator.lowercase`

<a id="config-action-operator-lowercase"></a>

- Canonical factory: `vim.action.operator.lowercase()`
- Supported mapping scopes: `normal`, `visual`, `visualLine`, `visualBlock`
- Default keys: `gu`
- Compatibility aliases: none

#### `operator.surround`

<a id="config-action-operator-surround"></a>

- Canonical factory: `vim.action.operator.surround()`
- Supported mapping scopes: `normal`
- Default keys: `ys`
- Compatibility aliases: none

#### `operator.toggleCase`

<a id="config-action-operator-toggleCase"></a>

- Canonical factory: `vim.action.operator.toggleCase()`
- Supported mapping scopes: `normal`, `visual`, `visualLine`, `visualBlock`
- Default keys: `g~`
- Compatibility aliases: none

#### `operator.uppercase`

<a id="config-action-operator-uppercase"></a>

- Canonical factory: `vim.action.operator.uppercase()`
- Supported mapping scopes: `normal`, `visual`, `visualLine`, `visualBlock`
- Default keys: `gU`
- Compatibility aliases: none

#### `operator.yank`

<a id="config-action-operator-yank"></a>

- Canonical factory: `vim.action.operator.yank()`
- Supported mapping scopes: `normal`, `visual`, `visualLine`, `visualBlock`
- Default keys: `y`
- Compatibility aliases: none

### `vim.action.textObject`

#### `textObject.kind.around`

<a id="config-action-textObject-kind-around"></a>

- Canonical factory: `vim.action.textObject.kind.around()`
- Supported mapping scopes: `operatorPending`
- Default keys: `a`
- Compatibility aliases: none

#### `textObject.kind.inner`

<a id="config-action-textObject-kind-inner"></a>

- Canonical factory: `vim.action.textObject.kind.inner()`
- Supported mapping scopes: `operatorPending`
- Default keys: `i`
- Compatibility aliases: none

#### `textObject.target.backtick`

<a id="config-action-textObject-target-backtick"></a>

- Canonical factory: `vim.action.textObject.target.backtick()`
- Supported mapping scopes: `operatorPending`
- Default keys: `` ` ``
- Compatibility aliases: none

#### `textObject.target.bigWord`

<a id="config-action-textObject-target-bigWord"></a>

- Canonical factory: `vim.action.textObject.target.bigWord()`
- Supported mapping scopes: `operatorPending`
- Default keys: `W`
- Compatibility aliases: none

#### `textObject.target.brace`

<a id="config-action-textObject-target-brace"></a>

- Canonical factory: `vim.action.textObject.target.brace()`
- Supported mapping scopes: `operatorPending`
- Default keys: `{`, `}`
- Compatibility aliases: none

#### `textObject.target.bracket`

<a id="config-action-textObject-target-bracket"></a>

- Canonical factory: `vim.action.textObject.target.bracket()`
- Supported mapping scopes: `operatorPending`
- Default keys: `[`, `]`
- Compatibility aliases: none

#### `textObject.target.codeFence`

<a id="config-action-textObject-target-codeFence"></a>

- Canonical factory: `vim.action.textObject.target.codeFence()`
- Supported mapping scopes: `operatorPending`
- Default keys: `f`
- Compatibility aliases: none

#### `textObject.target.doubleQuote`

<a id="config-action-textObject-target-doubleQuote"></a>

- Canonical factory: `vim.action.textObject.target.doubleQuote()`
- Supported mapping scopes: `operatorPending`
- Default keys: `"`
- Compatibility aliases: none

#### `textObject.target.errorBlock`

<a id="config-action-textObject-target-errorBlock"></a>

- Canonical factory: `vim.action.textObject.target.errorBlock()`
- Supported mapping scopes: `operatorPending`
- Default keys: `e`
- Compatibility aliases: none

#### `textObject.target.headingSection`

<a id="config-action-textObject-target-headingSection"></a>

- Canonical factory: `vim.action.textObject.target.headingSection()`
- Supported mapping scopes: `operatorPending`
- Default keys: `h`
- Compatibility aliases: none

#### `textObject.target.listItem`

<a id="config-action-textObject-target-listItem"></a>

- Canonical factory: `vim.action.textObject.target.listItem()`
- Supported mapping scopes: `operatorPending`
- Default keys: `l`
- Compatibility aliases: none

#### `textObject.target.paragraph`

<a id="config-action-textObject-target-paragraph"></a>

- Canonical factory: `vim.action.textObject.target.paragraph()`
- Supported mapping scopes: `operatorPending`
- Default keys: `p`
- Compatibility aliases: none

#### `textObject.target.paren`

<a id="config-action-textObject-target-paren"></a>

- Canonical factory: `vim.action.textObject.target.paren()`
- Supported mapping scopes: `operatorPending`
- Default keys: `(`, `)`
- Compatibility aliases: none

#### `textObject.target.singleQuote`

<a id="config-action-textObject-target-singleQuote"></a>

- Canonical factory: `vim.action.textObject.target.singleQuote()`
- Supported mapping scopes: `operatorPending`
- Default keys: `'`
- Compatibility aliases: none

#### `textObject.target.tag`

<a id="config-action-textObject-target-tag"></a>

- Canonical factory: `vim.action.textObject.target.tag()`
- Supported mapping scopes: `operatorPending`
- Default keys: `t`
- Compatibility aliases: none

#### `textObject.target.word`

<a id="config-action-textObject-target-word"></a>

- Canonical factory: `vim.action.textObject.target.word()`
- Supported mapping scopes: `operatorPending`
- Default keys: `w`
- Compatibility aliases: none

<!-- END GENERATED CONFIG ACTIONS -->

<!-- rumdl-enable MD013 -->

<a id="advanced-setup"></a>

## Advanced setup

### Exports, async config, and imported presets

Root config must default-export a synchronous or asynchronous function. Raw
object exports and TypeScript config files are unsupported. Async exports commit
only after their returned promise fulfills; thrown errors and rejected promises
discard that evaluation.

Checked workflows:

- [Basic properties](../examples/pi-vim.config.js)
- [Keymaps](../examples/keymaps.config.js)
- [Async config](../examples/async.config.js)
- [Imported preset](../examples/imported-preset.config.js) using typed
    [`VimConfigApi` helper](../examples/presets/markdown.js)

`/vim reload` always imports a fresh root module. Native ESM caching can
retain imported helpers, including `examples/presets/markdown.js`; restart Pi
after editing an imported helper. No file watcher reloads either file.

### Keymaps

`vim.keymap.set(mode, keys, target, options?)` accepts one mode or nested arrays
of modes:

- `"i"` / `"insert"`
- `"n"` / `"normal"`
- `"v"` / `"x"` / `"visual"` for all visual scopes
- exact `"visualLine"` or `"visualBlock"`
- `"o"` / `"operatorPending"` / `"operator-pending"`

Targets are opaque [`vim.action.*`](#generated-actions) descriptors, compatible
`vim.prompt.*` aliases, literal replay strings, or `null`. Action reference
lists each factory's supported scopes and arguments. Existing `vim.prompt.*`,
`vim.g.mapleader`, and three-argument `vim.keymap.set` calls remain supported.

Mappings use source order. Exact later mappings replace earlier same-scope
mappings. Executable same-scope prefix conflicts warn and reject conflicting
mapping because no timeout exists. Literal replay works only in normal/visual
scopes, stays within macro replay limit, and never recursively expands mappings.
`null` unmaps exact keys in selected scopes.

Options accept only `{ allowProtected?: boolean, desc?: string }`. Protected Pi
shortcuts warn unless mapping sets `allowProtected: true`; override only claims
pi-vim ownership and cannot make terminal or Pi deliver an indistinguishable
key. Insert mappings accept finite insert actions only and defer to Pi while
autocomplete is active.

Set `vim.g.mapleader` or `vim.leader` to one printable character or `null`.
`<leader>` is supported only at mapping-key start. Final leader resolves after
project JSON, then expands every retained leader mapping. Replay targets never
expand `<leader>`.

<a id="safety-semantics"></a>

## Safety and configuration semantics

### Trust boundary and precedence

Executable config is global-only at `~/.pi/agent/pi-vim.config.js`.
Project-local executable config is never loaded. Resolution order:

1. Built-in defaults
2. Global `~/.pi/agent/settings.json`
3. Global trusted JavaScript operations
4. Project `.pi/settings.json`

Getters initially expose frozen snapshots of defaults plus valid global JSON,
never project JSON. Assignments stage source-ordered operations. Presets apply
at assignment position; later leaf writes override preset values, while later
presets can replace earlier leaves. Arrays and records replace whole values
instead of merging through mutation. See
[`docs/settings.md#settings-files-and-precedence`](settings.md#settings-files-and-precedence)
for canonical JSON rules.

### Warnings, failures, and reload

Invalid known leaves and unknown writes produce field-local warnings: prior
staged values and valid siblings survive. Syntax/import errors, invalid default
exports, thrown errors, and rejected promises are fatal transactions; no
JavaScript operation from failed evaluation commits.

Fresh startup with fatal JavaScript still compiles defaults plus valid
global/project JSON. Fatal reload keeps last-known-good active plan and updates
diagnostics. Successful reload compiles complete immutable plan before applying
it. Generation guards prevent older async loads from replacing newer results.

Reload preserves prompt text, bounds-clamped cursor, stable mode, undo/redo,
registers, marks, recorded macros, search/Ex history, and valid visual
selection. It clears pending count, operator, key prefix, character target,
register target, mark target, macro target, pending search/Ex/workbench input,
partial insert escape, active macro recording, and EasyMotion labels. New
keymaps, UI, diagnostics, and cursor style apply immediately.

### Compatibility and non-goals

Valid pre-0.9.0 `vim.g.mapleader`, `vim.prompt.*`, and three-argument
`vim.keymap.set` calls remain compatible. Breaking trusted-config changes
require a major release; removals should warn for at least one minor release
when feasible.

No sandbox, project JavaScript config, TypeScript config, runtime
`@graelo/pi-vim/config` module, `defineConfig`, file watching, plugin
discovery, arbitrary custom action execution, recursive mappings, timeout-based
prefix resolution, Vimscript, `.vimrc`, Neovim Lua, or full Vim/Neovim parity.
