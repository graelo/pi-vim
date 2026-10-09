import type { CaseTransformAction } from "../buffer.ts";
import type {
  EditResult,
  VimCommandAction,
  VimMotion,
  VimMotionAction,
  VimMotionOperatorAction,
  VimOperatorAction,
  VimTextObject,
} from "../types.ts";
import type {
  AdapterCommand,
  EditorSnapshot,
  ModalEffect,
  ModalOptions,
  ModalState,
  ModalUpdate,
  RepeatableChange,
} from "./types.ts";

import {
  adjustNumberAtOrAfterCursor,
  changeLine,
  deleteByCharSearch,
  deleteByMotion,
  deleteCharAt,
  deleteCharBefore,
  deleteLine,
  deleteTextObject,
  findCharOnLine,
  joinLineWithNext,
  moveByPromptLines,
  navigateBuffer,
  openLineAbove,
  openLineBelow,
  paragraphBackwardPosition,
  paragraphForwardPosition,
  pasteRegister,
  pasteRegisterBefore,
  repeatRegister,
  replaceCharAt,
  sentenceBackwardPosition,
  sentenceForwardPosition,
  shiftLinesFromCursor,
  substituteCharAt,
  toggleCaseAt,
  transformCaseByMotion,
  transformCaseLineCount,
  transformCaseTextObject,
  wordBackwardPosition,
  wordEndPosition,
  wordEndBigPosition,
  wordForwardPosition,
  wordForwardBigPosition,
  wordBackwardBigPosition,
  wordPreviousEndPosition,
  wordPreviousEndBigPosition,
  yankByCharSearch,
  yankByMotion,
  yankLine,
  yankLineCount,
  yankTextObject,
} from "../buffer.ts";
import { semanticMotionToLegacy } from "../commands.ts";
import { promptStructuresForOptions } from "../config.ts";
import { keybindingsPopup } from "../keybinding-discovery-popup.ts";
import {
  clearCommandPending,
  clearPending,
  editState,
  editStateAndEffects,
  editUpdate,
  invalidate,
  modeUpdate,
  shiftActionForOperator,
  withEffects,
  withNoopFeedback,
  yankUpdate,
} from "./core.ts";
import { startExCommandUpdate } from "./ex-command-line.ts";
import { clearRegisterTarget, clipboardTargetToRead, registerToRead } from "./registers.ts";
import { repeatSearch, searchWordUnderCursor, startSearchUpdate } from "./search.ts";
import { repeatSurroundChange } from "./surround.ts";
import { reselectVisualUpdate } from "./visual.ts";

export function normalDispatchSummary(state: ModalState): string {
  const pending = state.pending ? ` pending=${state.pending}` : "";
  const register = state.pendingRegister ? " register-pending" : "";
  const mark = state.pendingMark ? " mark-pending" : "";
  return `normal${pending}${register}${mark}`;
}

export function isNormalDispatchState(state: ModalState): boolean {
  return state.mode === "normal" && !state.pendingEx && !state.pendingSearch;
}

function halfPageLineCount(terminalRows: number | undefined): number {
  const visibleRows = Math.max(5, Math.floor((terminalRows ?? 24) * 0.3));
  return Math.max(1, Math.floor(visibleRows / 2));
}

function wordMoveEffect(
  motion: VimMotionAction,
  snapshot: EditorSnapshot,
  count: number,
): ModalEffect | undefined {
  if (motion === "wordForward") {
    return {
      type: "restoreCursor",
      position: wordForwardPosition(snapshot.text, snapshot.cursor, count),
    };
  }
  if (motion === "wordBackward") {
    return {
      type: "restoreCursor",
      position: wordBackwardPosition(snapshot.text, snapshot.cursor, count),
    };
  }
  if (motion === "wordEnd") {
    return {
      type: "restoreCursor",
      position: wordEndPosition(snapshot.text, snapshot.cursor, count),
    };
  }
  if (motion === "wordForwardBig") {
    return {
      type: "restoreCursor",
      position: wordForwardBigPosition(snapshot.text, snapshot.cursor, count),
    };
  }
  if (motion === "wordBackwardBig") {
    return {
      type: "restoreCursor",
      position: wordBackwardBigPosition(snapshot.text, snapshot.cursor, count),
    };
  }
  if (motion === "wordEndBig") {
    return {
      type: "restoreCursor",
      position: wordEndBigPosition(snapshot.text, snapshot.cursor, count),
    };
  }
  if (motion === "wordPreviousEnd") {
    return {
      type: "restoreCursor",
      position: wordPreviousEndPosition(snapshot.text, snapshot.cursor, count),
    };
  }
  if (motion === "wordPreviousEndBig") {
    return {
      type: "restoreCursor",
      position: wordPreviousEndBigPosition(snapshot.text, snapshot.cursor, count),
    };
  }
  return undefined;
}

function moveEffectFor(
  motion: VimMotionAction,
  snapshot: EditorSnapshot,
  count = 1,
): ModalEffect | undefined {
  const adapterCommands: Partial<Record<VimMotionAction, AdapterCommand>> = {
    left: "left",
    down: "down",
    up: "up",
    right: "right",
    lineStart: "lineStart",
    lineEnd: "lineEnd",
  };
  const command = adapterCommands[motion];
  if (command) return { type: "adapterCommand", command };
  const wordEffect = wordMoveEffect(motion, snapshot, count);
  if (wordEffect) return wordEffect;
  if (motion === "bufferStart") {
    return {
      type: "restoreCursor",
      position: navigateBuffer(snapshot.text, snapshot.cursor, "start"),
    };
  }
  if (motion === "bufferEnd") {
    return {
      type: "restoreCursor",
      position: navigateBuffer(snapshot.text, snapshot.cursor, "end"),
    };
  }
  if (motion === "firstNonBlank") {
    return {
      type: "restoreCursor",
      position: navigateBuffer(snapshot.text, snapshot.cursor, "firstNonBlank"),
    };
  }
  if (motion === "matchingPair") {
    const target = navigateBuffer(snapshot.text, snapshot.cursor, "matchingPair");
    return target ? { type: "restoreCursor", position: target } : undefined;
  }
  if (motion === "paragraphForward") {
    return {
      type: "restoreCursor",
      position: paragraphForwardPosition(snapshot.text, snapshot.cursor, count),
    };
  }
  if (motion === "paragraphBackward") {
    return {
      type: "restoreCursor",
      position: paragraphBackwardPosition(snapshot.text, snapshot.cursor, count),
    };
  }
  if (motion === "sentenceForward") {
    return {
      type: "restoreCursor",
      position: sentenceForwardPosition(snapshot.text, snapshot.cursor, count),
    };
  }
  if (motion === "sentenceBackward") {
    return {
      type: "restoreCursor",
      position: sentenceBackwardPosition(snapshot.text, snapshot.cursor, count),
    };
  }
  if (motion === "halfPageDown" || motion === "halfPageUp") {
    const direction = motion === "halfPageDown" ? 1 : -1;
    return {
      type: "restoreCursor",
      position: moveByPromptLines(
        snapshot.text,
        snapshot.cursor,
        direction * halfPageLineCount(snapshot.terminalRows) * count,
      ),
    };
  }
}

export function moveUpdate(
  state: ModalState,
  motion: VimMotionAction,
  snapshot: EditorSnapshot,
  count = 1,
): ModalUpdate {
  const effect = moveEffectFor(motion, snapshot, count);
  if (!effect) return withEffects(state, [{ type: "invalidate" }]);
  if (effect.type === "adapterCommand" && count > 1) {
    return withEffects(state, [
      ...Array.from({ length: count }, () => effect),
      { type: "invalidate" },
    ]);
  }
  return withEffects(state, [effect, { type: "invalidate" }]);
}

function operatorMotionKey(motion: VimMotionAction): VimMotion | undefined {
  return semanticMotionToLegacy(motion);
}

function withRepeatableChange(
  state: ModalState,
  change: RepeatableChange,
  changed: boolean,
): ModalState {
  return changed ? { ...state, lastRepeatableChange: change } : state;
}

/**
 * Register-aware edit: applies register-write effects, records the dot-repeat
 * change, and optionally transitions to insert mode.
 */
function editWithRepeat(
  state: ModalState,
  result: EditResult,
  repeat: RepeatableChange | undefined,
  insertOptions?: ModalOptions,
): ModalUpdate {
  const written = editStateAndEffects(state, result);
  let edited = written.state;
  if (repeat) edited = withRepeatableChange(edited, repeat, result.changed);
  const effects: ModalEffect[] = [{ type: "edit", result }, ...written.effects];
  return insertOptions
    ? modeUpdate(edited, "insert", insertOptions, effects)
    : withEffects(edited, effects);
}

/**
 * Pure text edit without register-write effects: records the dot-repeat
 * change and optionally transitions to insert mode.
 */
function textEditWithRepeat(
  state: ModalState,
  result: EditResult,
  repeat: RepeatableChange | undefined,
  insertOptions?: ModalOptions,
): ModalUpdate {
  let edited = editState(state, result);
  if (repeat) edited = withRepeatableChange(edited, repeat, result.changed);
  const effects: ModalEffect[] = [{ type: "edit", result }];
  return insertOptions
    ? modeUpdate(edited, "insert", insertOptions, effects)
    : withEffects(edited, effects);
}

function caseActionForOperator(operator: VimMotionOperatorAction): CaseTransformAction | undefined {
  if (operator === "lowercase") return "lowercase";
  if (operator === "uppercase") return "uppercase";
  if (operator === "toggleCase") return "toggleCase";
}

export function applyOperatorMotion(
  state: ModalState,
  snapshot: EditorSnapshot,
  operator: VimMotionOperatorAction,
  motion: VimMotionAction,
  options: ModalOptions,
  count = 1,
  recordRepeat = true,
): ModalUpdate {
  const legacyMotion = operatorMotionKey(motion);
  const baseState = clearCommandPending(state);
  if (!legacyMotion) return invalidate(clearPending(state));
  const caseAction = caseActionForOperator(operator);
  if (caseAction) {
    const result = transformCaseByMotion(
      snapshot.text,
      snapshot.cursor,
      legacyMotion,
      count,
      caseAction,
    );
    let edited = editState(baseState, result);
    if (recordRepeat) {
      edited = withRepeatableChange(
        edited,
        { type: "operatorMotion", operator, motion, count },
        result.changed,
      );
    }
    return withEffects(
      edited,
      result.changed ? [{ type: "edit", result }] : [{ type: "invalidate" }],
    );
  }
  if (operator === "yank") {
    return yankUpdate(baseState, yankByMotion(snapshot.text, snapshot.cursor, legacyMotion, count));
  }

  return editWithRepeat(
    baseState,
    deleteByMotion(snapshot.text, snapshot.cursor, legacyMotion, count),
    recordRepeat ? { type: "operatorMotion", operator, motion, count } : undefined,
    operator === "change" ? options : undefined,
  );
}

function applyCaseOrShiftLineCommand(
  state: ModalState,
  snapshot: EditorSnapshot,
  operator: VimOperatorAction,
  count: number,
  recordRepeat: boolean,
): ModalUpdate | undefined {
  const nextState = clearCommandPending(state);
  const caseAction = caseActionForOperator(operator as VimMotionOperatorAction);
  if (caseAction) {
    const result = transformCaseLineCount(snapshot.text, snapshot.cursor, count, caseAction);
    let edited = editState(nextState, result);
    if (recordRepeat)
      edited = withRepeatableChange(
        edited,
        { type: "lineCommand", operator, count },
        result.changed,
      );
    return withEffects(
      edited,
      result.changed ? [{ type: "edit", result }] : [{ type: "invalidate" }],
    );
  }
  const shiftAction = shiftActionForOperator(operator);
  if (shiftAction) {
    const shiftResult = shiftLinesFromCursor(snapshot.text, snapshot.cursor, count, shiftAction);
    if (!shiftResult.ok) return invalidate(nextState);
    const result = shiftResult.edit;
    let edited = editState(nextState, result);
    if (recordRepeat)
      edited = withRepeatableChange(
        edited,
        { type: "lineCommand", operator, count },
        result.changed,
      );
    return withEffects(
      edited,
      result.changed ? [{ type: "edit", result }] : [{ type: "invalidate" }],
    );
  }
  return undefined;
}

export function applyLineCommand(
  state: ModalState,
  snapshot: EditorSnapshot,
  options: ModalOptions,
  operator: VimOperatorAction,
  count = 1,
  recordRepeat = true,
): ModalUpdate {
  const nextState = clearCommandPending(state);
  const specialUpdate = applyCaseOrShiftLineCommand(state, snapshot, operator, count, recordRepeat);
  if (specialUpdate) return specialUpdate;
  if (operator === "delete")
    return editWithRepeat(
      nextState,
      deleteLine(snapshot.text, snapshot.cursor, count),
      recordRepeat ? { type: "lineCommand", operator, count } : undefined,
    );
  if (operator === "change")
    return editWithRepeat(
      nextState,
      changeLine(snapshot.text, snapshot.cursor, count),
      recordRepeat ? { type: "lineCommand", operator, count } : undefined,
      options,
    );
  return yankUpdate(
    nextState,
    count > 1
      ? yankLineCount(snapshot.text, snapshot.cursor, count)
      : yankLine(snapshot.text, snapshot.cursor),
  );
}

type NormalCommandContext = {
  command: VimCommandAction;
  state: ModalState;
  nextState: ModalState;
  snapshot: EditorSnapshot;
  options: ModalOptions;
  count: number;
  char: string | undefined;
  recordRepeat: boolean;
};

type NormalCommandHandler = (context: NormalCommandContext) => ModalUpdate;

// The engine resolves easymotion, deleteSurround, changeSurround, and
// surroundSelection before normal command dispatch; invalidate keeps the legacy
// fallback if one ever reaches this table.
const invalidNormalCommand: NormalCommandHandler = ({ nextState }) => invalidate(nextState);

const charSearchCommand: NormalCommandHandler = ({ nextState, snapshot, command, count, char }) =>
  applyCharSearch(nextState, snapshot, command as CharSearchCommand, char ?? "", count);

const visualModeCommand =
  (mode: "visual" | "visualLine" | "visualBlock"): NormalCommandHandler =>
  ({ nextState, snapshot, options }) =>
    modeUpdate({ ...nextState, visualAnchor: snapshot.cursor }, mode, options);

const openLineCommand =
  (open: typeof openLineBelow): NormalCommandHandler =>
  ({ nextState, snapshot, options }) => {
    const result = open(snapshot.text, snapshot.cursor);
    return modeUpdate(editState(nextState, result), "insert", options, [{ type: "edit", result }]);
  };

const deleteEditCommand =
  (compute: (snapshot: EditorSnapshot, count: number) => EditResult): NormalCommandHandler =>
  ({ nextState, snapshot, command, count, recordRepeat }) =>
    editWithRepeat(
      nextState,
      compute(snapshot, count),
      recordRepeat ? { type: "command", command, count } : undefined,
    );

const textEditCommand =
  (compute: (snapshot: EditorSnapshot, count: number) => EditResult): NormalCommandHandler =>
  ({ nextState, snapshot, command, count, recordRepeat }) =>
    textEditWithRepeat(
      nextState,
      compute(snapshot, count),
      recordRepeat ? { type: "command", command, count } : undefined,
    );

const numberAdjustCommand =
  (direction: 1 | -1): NormalCommandHandler =>
  ({ nextState, snapshot, command, count, recordRepeat }) =>
    textEditWithRepeat(
      nextState,
      adjustNumberAtOrAfterCursor(snapshot.text, snapshot.cursor, direction * Math.max(1, count)),
      recordRepeat ? { type: "command", command, count } : undefined,
    );

const repeatSearchCommand =
  (reverse: boolean): NormalCommandHandler =>
  ({ nextState, snapshot, options }) =>
    repeatSearch(nextState, snapshot, options, reverse);

const searchWordCommand =
  (direction: "forward" | "backward"): NormalCommandHandler =>
  ({ nextState, snapshot, options }) =>
    searchWordUnderCursor(nextState, snapshot, options, direction);

const pasteCommand =
  (placement: "after" | "before"): NormalCommandHandler =>
  ({ state, nextState, snapshot, count }) => {
    const clipboardTarget = clipboardTargetToRead(state);
    if (clipboardTarget) {
      return withEffects(clearRegisterTarget(nextState), [
        {
          type: "readClipboard",
          register: clipboardTarget.slot,
          placement,
          fallback: state.clipboardRegisters?.[clipboardTarget.slot],
          ...(count > 1 ? { count } : {}),
        },
      ]);
    }
    const paste = placement === "after" ? pasteRegister : pasteRegisterBefore;
    return editUpdate(
      clearRegisterTarget(nextState),
      paste(snapshot.text, snapshot.cursor, repeatRegister(registerToRead(state), count)),
    );
  };

const NORMAL_COMMAND_HANDLERS: Record<VimCommandAction, NormalCommandHandler> = {
  // Engine-intercepted commands.
  easymotion: invalidNormalCommand,
  deleteSurround: invalidNormalCommand,
  changeSurround: invalidNormalCommand,
  surroundSelection: invalidNormalCommand,
  // Mode entry.
  insertBefore: ({ nextState, options }) => modeUpdate(nextState, "insert", options),
  insertAfter: ({ nextState, snapshot, options }) =>
    modeUpdate(
      nextState,
      "insert",
      options,
      snapshot.cursor.col < (snapshot.lines[snapshot.cursor.line] ?? "").length
        ? [{ type: "adapterCommand", command: "right" }, { type: "invalidate" }]
        : [],
    ),
  insertLineStart: ({ nextState, options }) =>
    modeUpdate(nextState, "insert", options, [
      { type: "adapterCommand", command: "lineStart" },
      { type: "invalidate" },
    ]),
  insertLineEnd: ({ nextState, options }) =>
    modeUpdate(nextState, "insert", options, [
      { type: "adapterCommand", command: "lineEnd" },
      { type: "invalidate" },
    ]),
  openLineBelow: openLineCommand(openLineBelow),
  openLineAbove: openLineCommand(openLineAbove),
  visualChar: visualModeCommand("visual"),
  visualLine: visualModeCommand("visualLine"),
  visualBlock: visualModeCommand("visualBlock"),
  // Register-aware edits.
  deleteChar: deleteEditCommand((snapshot, count) =>
    deleteCharAt(snapshot.text, snapshot.cursor, count),
  ),
  deleteCharBefore: deleteEditCommand((snapshot, count) =>
    deleteCharBefore(snapshot.text, snapshot.cursor, count),
  ),
  deleteToLineEnd: deleteEditCommand((snapshot, count) =>
    deleteByMotion(snapshot.text, snapshot.cursor, "$", count),
  ),
  changeToLineEnd: ({ nextState, snapshot, options, command, count, recordRepeat }) =>
    editWithRepeat(
      nextState,
      deleteByMotion(snapshot.text, snapshot.cursor, "$", count),
      recordRepeat ? { type: "command", command, count } : undefined,
      options,
    ),
  yankLine: ({ nextState, snapshot, count }) =>
    yankUpdate(
      nextState,
      count > 1
        ? yankLineCount(snapshot.text, snapshot.cursor, count)
        : yankLine(snapshot.text, snapshot.cursor),
    ),
  joinLine: ({ nextState, snapshot }) =>
    editUpdate(nextState, joinLineWithNext(snapshot.text, snapshot.cursor)),
  pasteAfter: pasteCommand("after"),
  pasteBefore: pasteCommand("before"),
  // Pure text edits.
  incrementNumber: numberAdjustCommand(1),
  decrementNumber: numberAdjustCommand(-1),
  toggleCase: textEditCommand((snapshot, count) =>
    toggleCaseAt(snapshot.text, snapshot.cursor, count),
  ),
  replaceChar: ({ nextState, snapshot, command, count, char, recordRepeat }) =>
    textEditWithRepeat(
      nextState,
      replaceCharAt(snapshot.text, snapshot.cursor, char ?? "", count),
      recordRepeat ? { type: "command", command, count, char } : undefined,
    ),
  substituteChar: ({ nextState, snapshot, options, command, count, recordRepeat }) =>
    textEditWithRepeat(
      nextState,
      substituteCharAt(snapshot.text, snapshot.cursor, count),
      recordRepeat ? { type: "command", command, count } : undefined,
      options,
    ),
  substituteLine: ({ nextState, snapshot, options, command, count, recordRepeat }) =>
    textEditWithRepeat(
      nextState,
      changeLine(snapshot.text, snapshot.cursor, count),
      recordRepeat ? { type: "command", command, count } : undefined,
      options,
    ),
  // Character search.
  findCharForward: charSearchCommand,
  findCharBackward: charSearchCommand,
  tillCharForward: charSearchCommand,
  tillCharBackward: charSearchCommand,
  repeatCharSearch: ({ nextState, snapshot, count }) =>
    repeatCharSearch(nextState, snapshot, false, count),
  repeatCharSearchReverse: ({ nextState, snapshot, count }) =>
    repeatCharSearch(nextState, snapshot, true, count),
  // Prompt search.
  startSearch: ({ nextState }) => startSearchUpdate(nextState),
  startSearchBackward: ({ nextState }) => startSearchUpdate(nextState, "backward"),
  repeatSearch: repeatSearchCommand(false),
  repeatSearchReverse: repeatSearchCommand(true),
  searchWordForward: searchWordCommand("forward"),
  searchWordBackward: searchWordCommand("backward"),
  // Ex command line, history, and system commands.
  startExCommand: ({ nextState, snapshot, count }) =>
    startExCommandUpdate(nextState, snapshot, count),
  repeatChange: ({ state, snapshot, options }) => repeatChange(state, snapshot, options),
  undo: ({ nextState }) => withEffects(nextState, [{ type: "adapterCommand", command: "undo" }]),
  redo: ({ nextState, snapshot, options }) =>
    snapshot.isRedoAvailable
      ? withEffects(nextState, [{ type: "adapterCommand", command: "redo" }])
      : invalidate(withNoopFeedback(nextState, options, "redo stack empty")),
  reselectVisual: ({ nextState, snapshot, options }) =>
    reselectVisualUpdate(nextState, snapshot, options),
  showKeybindings: ({ nextState, options }) => {
    const popup = keybindingsPopup(options);
    return withEffects({ ...nextState, helpPopup: popup }, [
      { type: "openReadOnlyPopup", popup },
      { type: "invalidate" },
    ]);
  },
};

export function applyCommand(
  state: ModalState,
  snapshot: EditorSnapshot,
  options: ModalOptions,
  command: VimCommandAction,
  count = 1,
  char?: string,
  recordRepeat = true,
): ModalUpdate {
  return NORMAL_COMMAND_HANDLERS[command]({
    command,
    state,
    nextState: clearCommandPending(state),
    snapshot,
    options,
    count,
    char,
    recordRepeat,
  });
}

type CharSearchCommand = Extract<
  VimCommandAction,
  "findCharForward" | "findCharBackward" | "tillCharForward" | "tillCharBackward"
>;

function charSearchKind(command: CharSearchCommand) {
  if (command === "findCharBackward") return "findBackward" as const;
  if (command === "tillCharForward") return "tillForward" as const;
  if (command === "tillCharBackward") return "tillBackward" as const;
  return "findForward" as const;
}

function oppositeCharSearch(command: CharSearchCommand): CharSearchCommand {
  if (command === "findCharForward") return "findCharBackward";
  if (command === "findCharBackward") return "findCharForward";
  if (command === "tillCharForward") return "tillCharBackward";
  return "tillCharForward";
}

function repeatCharSearchOffset(command: CharSearchCommand): number {
  if (command === "tillCharForward") return 1;
  if (command === "tillCharBackward") return -1;
  return 0;
}

function repeatCharSearchSnapshot(
  snapshot: EditorSnapshot,
  command: CharSearchCommand,
): EditorSnapshot {
  const cursorOffset = repeatCharSearchOffset(command);
  return cursorOffset
    ? { ...snapshot, cursor: { ...snapshot.cursor, col: snapshot.cursor.col + cursorOffset } }
    : snapshot;
}

function applyCharSearch(
  state: ModalState,
  snapshot: EditorSnapshot,
  command: CharSearchCommand,
  target: string,
  count = 1,
  recordLastCharSearch = true,
): ModalUpdate {
  const position = findCharOnLine(
    snapshot.text,
    snapshot.cursor,
    charSearchKind(command),
    target,
    count,
  );
  if (!position) return invalidate(state);
  const searchedState = recordLastCharSearch
    ? {
        ...state,
        lastCharSearch: { command, target },
      }
    : state;
  return withEffects(searchedState, [{ type: "restoreCursor", position }, { type: "invalidate" }]);
}

function repeatCharSearch(
  state: ModalState,
  snapshot: EditorSnapshot,
  reverse: boolean,
  count = 1,
): ModalUpdate {
  if (!state.lastCharSearch) return invalidate(state);
  const command = reverse
    ? oppositeCharSearch(state.lastCharSearch.command)
    : state.lastCharSearch.command;
  return applyCharSearch(
    state,
    repeatCharSearchSnapshot(snapshot, command),
    command,
    state.lastCharSearch.target,
    count,
    false,
  );
}

export function applyOperatorCharSearchRepeat(
  state: ModalState,
  snapshot: EditorSnapshot,
  operator: VimMotionOperatorAction,
  reverse: boolean,
  options: ModalOptions,
  count = 1,
): ModalUpdate {
  if (!state.lastCharSearch) return invalidate(clearCommandPending(state));
  const command = reverse
    ? oppositeCharSearch(state.lastCharSearch.command)
    : state.lastCharSearch.command;
  return applyOperatorCharSearch(
    state,
    snapshot,
    operator,
    command,
    state.lastCharSearch.target,
    options,
    count,
    true,
    false,
    repeatCharSearchOffset(command),
  );
}

export function applyOperatorCharSearch(
  state: ModalState,
  snapshot: EditorSnapshot,
  operator: VimMotionOperatorAction,
  command: CharSearchCommand,
  target: string,
  options: ModalOptions,
  count = 1,
  recordRepeat = true,
  recordLastCharSearch = true,
  searchCursorOffset = 0,
): ModalUpdate {
  const baseState = clearCommandPending(state);
  const searchedState = recordLastCharSearch
    ? { ...baseState, lastCharSearch: { command, target } }
    : baseState;
  const kind = charSearchKind(command);
  if (operator === "yank") {
    const register = yankByCharSearch(
      snapshot.text,
      snapshot.cursor,
      kind,
      target,
      count,
      searchCursorOffset,
    );
    return yankUpdate(register ? searchedState : baseState, register);
  }

  const result = deleteByCharSearch(
    snapshot.text,
    snapshot.cursor,
    kind,
    target,
    count,
    searchCursorOffset,
  );
  const written = editStateAndEffects(result.changed ? searchedState : baseState, result);
  let edited = written.state;
  if (recordRepeat) {
    edited = withRepeatableChange(
      edited,
      { type: "operatorCharSearch", operator, command, char: target, count },
      result.changed,
    );
  }
  const effects: ModalEffect[] = result.changed
    ? [{ type: "edit", result }, ...written.effects]
    : [{ type: "invalidate" }, ...written.effects];
  if (operator === "change" && result.changed)
    return modeUpdate(edited, "insert", options, effects);
  return withEffects(edited, effects);
}

export function applyOperatorTextObject(
  state: ModalState,
  snapshot: EditorSnapshot,
  operator: VimMotionOperatorAction,
  textObject: VimTextObject,
  options: ModalOptions,
  count = 1,
  recordRepeat = true,
): ModalUpdate {
  const baseState = clearCommandPending(state);
  const promptStructures = promptStructuresForOptions(options);
  const caseAction = caseActionForOperator(operator);
  if (caseAction) {
    const result = transformCaseTextObject(
      snapshot.text,
      snapshot.cursor,
      textObject,
      caseAction,
      promptStructures,
    );
    let edited = editState(baseState, result);
    if (recordRepeat) {
      edited = withRepeatableChange(
        edited,
        { type: "operatorTextObject", operator, textObject, count },
        result.changed,
      );
    }
    return withEffects(
      edited,
      result.changed ? [{ type: "edit", result }] : [{ type: "invalidate" }],
    );
  }
  if (operator === "yank")
    return yankUpdate(
      baseState,
      yankTextObject(snapshot.text, snapshot.cursor, textObject, promptStructures),
    );
  const result = deleteTextObject(snapshot.text, snapshot.cursor, textObject, promptStructures);
  const written = editStateAndEffects(baseState, result);
  let edited = written.state;
  if (recordRepeat) {
    edited = withRepeatableChange(
      edited,
      { type: "operatorTextObject", operator, textObject, count },
      result.changed,
    );
  }
  const effects: ModalEffect[] = [{ type: "edit", result }, ...written.effects];
  if (operator === "change") return modeUpdate(edited, "insert", options, effects);
  return withEffects(edited, effects);
}

export function repeatChange(
  state: ModalState,
  snapshot: EditorSnapshot,
  options: ModalOptions,
): ModalUpdate {
  const change = state.lastRepeatableChange;
  if (!change) return invalidate(clearCommandPending(state));
  if (
    change.type === "surround" ||
    change.type === "deleteSurround" ||
    change.type === "changeSurround"
  )
    return repeatSurroundChange(state, snapshot, options, change);
  if (change.type === "command") {
    return applyCommand(state, snapshot, options, change.command, change.count, change.char, false);
  }
  if (change.type === "lineCommand") {
    return applyLineCommand(state, snapshot, options, change.operator, change.count, false);
  }
  if (change.type === "operatorMotion") {
    return applyOperatorMotion(
      state,
      snapshot,
      change.operator,
      change.motion,
      options,
      change.count,
      false,
    );
  }
  if (change.type === "operatorCharSearch") {
    return applyOperatorCharSearch(
      state,
      snapshot,
      change.operator,
      change.command,
      change.char,
      options,
      change.count,
      false,
    );
  }
  return applyOperatorTextObject(
    state,
    snapshot,
    change.operator,
    change.textObject,
    options,
    change.count,
    false,
  );
}
