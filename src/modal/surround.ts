import type { CharSearchKind, SurroundRange, SurroundTargetSpec } from "../buffer.ts";
import type { EditResult } from "../types.ts";
import type {
  EditorSnapshot,
  ModalOptions,
  ModalState,
  ModalUpdate,
  PendingSurround,
  RepeatableChange,
  SurroundTarget,
} from "./types.ts";

import { surroundRangeFor, visualSurroundRange } from "../buffer.ts";
import { semanticMotionToLegacy } from "../commands.ts";
import { promptStructuresForOptions } from "../config.ts";
import {
  addSurround,
  changeSurround,
  deleteSurround,
  surroundPairFor,
  surroundTargetFor,
} from "../surround.ts";
import {
  clearPending,
  editState,
  invalidate,
  keyMatches,
  keySequence,
  modeUpdate,
  withEffects,
} from "./core.ts";
import { captureBeforeVisualExit } from "./visual.ts";

const CHAR_SEARCH_KINDS = {
  findCharForward: "findForward",
  findCharBackward: "findBackward",
  tillCharForward: "tillForward",
  tillCharBackward: "tillBackward",
} as const satisfies Record<
  Extract<SurroundTarget, { type: "charSearch" }>["command"],
  CharSearchKind
>;

type SurroundChange = Extract<
  RepeatableChange,
  { type: "surround" | "deleteSurround" | "changeSurround" }
>;

function targetSpec(target: SurroundTarget): SurroundTargetSpec | undefined {
  if (target.type === "motion") {
    const motion = semanticMotionToLegacy(target.motion);
    return motion ? { type: "motion", motion, count: target.count } : undefined;
  }
  if (target.type === "charSearch") {
    return {
      type: "charSearch",
      kind: CHAR_SEARCH_KINDS[target.command],
      char: target.char,
      count: target.count,
    };
  }
  return target;
}

/** Wait for the surround character(s) after `ys{target}`, `ds`, or `cs`. */
export function startSurroundUpdate(state: ModalState, pending: PendingSurround): ModalUpdate {
  return invalidate({ ...clearPending(state), pendingSurround: pending });
}

/** Visual `S`: leave visual mode and wait for the surround character. */
export function startVisualSurroundUpdate(
  state: ModalState,
  snapshot: EditorSnapshot,
  options: ModalOptions,
): ModalUpdate {
  const exit = captureBeforeVisualExit(state, snapshot, modeUpdate(state, "normal", options));
  const range =
    state.mode === "visualBlock" || !state.visualAnchor
      ? undefined
      : visualSurroundRange(
          snapshot.text,
          state.visualAnchor,
          snapshot.cursor,
          state.mode === "visualLine",
        );
  if (!range) return exit;
  return {
    ...exit,
    state: { ...exit.state, pendingSurround: { kind: "addSelection", ...range, keys: "S" } },
  };
}

function surroundEditUpdate(
  state: ModalState,
  result: EditResult,
  change: SurroundChange | undefined,
): ModalUpdate {
  let edited = editState(clearPending(state), result);
  if (change && result.changed) edited = { ...edited, lastRepeatableChange: change };
  return withEffects(
    edited,
    result.changed ? [{ type: "edit", result }] : [{ type: "invalidate" }],
  );
}

function applyAdd(
  snapshot: EditorSnapshot,
  options: ModalOptions,
  target: SurroundTarget,
  char: string,
): EditResult | undefined {
  const pair = surroundPairFor(char);
  const spec = targetSpec(target);
  if (!pair || !spec) return undefined;
  const range = surroundRangeFor(
    snapshot.text,
    snapshot.cursor,
    spec,
    promptStructuresForOptions(options),
  );
  return addSurround(snapshot.text, snapshot.cursor, range, pair);
}

function applyDelete(snapshot: EditorSnapshot, char: string, count?: number) {
  const target = surroundTargetFor(char);
  return target ? deleteSurround(snapshot.text, snapshot.cursor, target, count) : undefined;
}

function applyChange(snapshot: EditorSnapshot, from: string, to: string, count?: number) {
  const target = surroundTargetFor(from);
  const pair = surroundPairFor(to);
  return target && pair
    ? changeSurround(snapshot.text, snapshot.cursor, target, pair, count)
    : undefined;
}

function applySelection(
  snapshot: EditorSnapshot,
  range: SurroundRange,
  char: string,
): EditResult | undefined {
  const pair = surroundPairFor(char);
  return pair ? addSurround(snapshot.text, snapshot.cursor, range, pair) : undefined;
}

function resolvePendingSurround(
  state: ModalState,
  snapshot: EditorSnapshot,
  options: ModalOptions,
  pending: PendingSurround,
  key: string,
): ModalUpdate | undefined {
  if (pending.kind === "change" && pending.from === undefined) {
    if (!surroundTargetFor(key)) return undefined;
    return invalidate({
      ...state,
      pendingSurround: { ...pending, from: key, keys: `${pending.keys}${key}` },
    });
  }
  if (pending.kind === "add") {
    const result = applyAdd(snapshot, options, pending.target, key);
    return (
      result &&
      surroundEditUpdate(state, result, { type: "surround", target: pending.target, char: key })
    );
  }
  if (pending.kind === "addSelection") {
    const result = applySelection(snapshot, pending, key);
    return result && surroundEditUpdate(state, result, undefined);
  }
  if (pending.kind === "delete") {
    const result = applyDelete(snapshot, key, pending.count);
    return (
      result &&
      surroundEditUpdate(state, result, { type: "deleteSurround", char: key, count: pending.count })
    );
  }
  const result = applyChange(snapshot, pending.from!, key, pending.count);
  return (
    result &&
    surroundEditUpdate(state, result, {
      type: "changeSurround",
      from: pending.from!,
      to: key,
      count: pending.count,
    })
  );
}

/** Read the character after a pending surround; Esc and rejected keys cancel it. */
export function handlePendingSurroundInput(
  state: ModalState,
  snapshot: EditorSnapshot,
  options: ModalOptions,
  data: string,
): ModalUpdate {
  const pending = state.pendingSurround;
  const key = keySequence(data);
  if (!pending || !key || keyMatches(data, "escape")) return invalidate(clearPending(state));
  return (
    resolvePendingSurround(state, snapshot, options, pending, key) ??
    invalidate(clearPending(state))
  );
}

/** Replay a recorded surround change for `.`. */
export function repeatSurroundChange(
  state: ModalState,
  snapshot: EditorSnapshot,
  options: ModalOptions,
  change: SurroundChange,
): ModalUpdate {
  const result =
    change.type === "surround"
      ? applyAdd(snapshot, options, change.target, change.char)
      : change.type === "deleteSurround"
        ? applyDelete(snapshot, change.char, change.count)
        : applyChange(snapshot, change.from, change.to, change.count);
  return result ? surroundEditUpdate(state, result, undefined) : invalidate(clearPending(state));
}
