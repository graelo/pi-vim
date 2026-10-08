import { expect, test } from "vitest";
import type { ModalState } from "../../src/modal/types.ts";
import { resolveVimOptions } from "../../src/config.ts";
import { canFastDelegateInsertInput } from "../../src/modal/engine.ts";
import { handleModalInputWithOptions as handleModalInput } from "../modal-test-helper.ts";
import {
  p,
  cursor,
  options,
  snapshot,
  ctrlJ,
  superJ,
  ctrlW,
  altD,
  csiAltD,
  altF,
  csiAltF,
  ctrlE,
  altV,
  ctrlAltV,
  escapeOptions,
} from "./shared.ts";

test("canFastDelegateInsertInput allows only plain insert text with no side state", () => {
  expect(canFastDelegateInsertInput({ mode: "insert" }, "a")).toBe(true);
  expect(canFastDelegateInsertInput({ mode: "insert" }, "é")).toBe(true);

  const unsafeStates: ModalState[] = [
    { mode: "normal" },
    { mode: "insert", visualAnchor: cursor },
    { mode: "insert", pending: "d" },
    {
      mode: "insert",
      blockInsert: {
        anchor: cursor,
        active: cursor,
        placement: "start",
        previewLine: 0,
        text: "",
      },
    },
    { mode: "insert", recordingSlot: "a" },
    { mode: "insert", pendingMacro: "record" },
    { mode: "insert", pendingRegister: "awaitingSlot" },
    { mode: "insert", pendingMark: { kind: "set" } },
    { mode: "insert", pendingSearch: { query: "", direction: "forward" } },
    { mode: "insert", pendingEx: { command: "", sourceMode: "normal" } },
    { mode: "insert", pendingInsertEscape: "f" },
    { mode: "insert", exMessage: { kind: "info", text: "message" } },
    {
      mode: "insert",
      helpPopup: {
        title: ":help",
        lines: ["help"],
        source: "help",
        scrollOffset: 0,
      },
    },
    { mode: "insert", searchHighlight: { query: "abc", current: cursor } },
  ];

  for (const state of unsafeStates) expect(canFastDelegateInsertInput(state, "a")).toBe(false);
});

test("canFastDelegateInsertInput rejects non-text and adapter-owned unsafe context", () => {
  for (const input of ["\x1b", "\r", "\t", "\x7f", "ab", "\u001b[A", "\x03"]) {
    expect(canFastDelegateInsertInput({ mode: "insert" }, input)).toBe(false);
  }
  expect(canFastDelegateInsertInput({ mode: "insert" }, "a", { isAutocompleteOpen: true })).toBe(
    false,
  );
  expect(canFastDelegateInsertInput({ mode: "insert" }, "a", { isMacroReplaying: true })).toBe(
    false,
  );
});

test("canFastDelegateInsertInput keeps configured modifier escape aliases on modal path", () => {
  expect(canFastDelegateInsertInput({ mode: "insert" }, superJ, { escape: ["super+j"] })).toBe(
    false,
  );
  expect(canFastDelegateInsertInput({ mode: "insert" }, "a", { escape: ["super+j"] })).toBe(true);
});

test("canFastDelegateInsertInput keeps configured insert newline keys on modal path", () => {
  // Insert newline keys are non-printable control sequences, not plain fast-insert text.
  expect(canFastDelegateInsertInput({ mode: "insert" }, ctrlJ)).toBe(false);
  expect(canFastDelegateInsertInput({ mode: "insert" }, "\x0a")).toBe(false);
  expect(canFastDelegateInsertInput({ mode: "insert" }, "a")).toBe(true);
});

test("configured modifier insert escape alias exits insert mode", () => {
  const matched = handleModalInput({ mode: "insert" }, snapshot, escapeOptions, superJ);

  expect(matched.state.mode).toBe("normal");
  expect(matched.state.pendingInsertEscape).toBeUndefined();
  expect(matched.effects).toEqual(
    expect.arrayContaining([{ type: "terminalCursor", style: "block" }, { type: "invalidate" }]),
  );
});

test("configured modifier insert escape alias exits visual modes", () => {
  for (const mode of ["visual", "visualLine", "visualBlock"] as const) {
    const matched = handleModalInput(
      { mode, visualAnchor: p(0, 1) },
      snapshot,
      escapeOptions,
      superJ,
    );

    expect(matched.state.mode).toBe("normal");
    expect(matched.effects).toEqual(
      expect.arrayContaining([{ type: "terminalCursor", style: "block" }, { type: "invalidate" }]),
    );
  }
});

test("unmatched modifier insert escape input delegates", () => {
  const mismatch = handleModalInput({ mode: "insert" }, snapshot, escapeOptions, ctrlJ);

  expect(mismatch.state.mode).toBe("insert");
  expect(mismatch.state.pendingInsertEscape).toBeUndefined();
  expect(mismatch.effects).toEqual([{ type: "delegate", input: ctrlJ }]);
});

test("configured insert escape aliases delegate while autocomplete is open", () => {
  const openSnapshot = { ...snapshot, isAutocompleteOpen: true };
  const delegated = handleModalInput({ mode: "insert" }, openSnapshot, escapeOptions, superJ);

  expect(delegated.state.pendingInsertEscape).toBeUndefined();
  expect(delegated.state.mode).toBe("insert");
  expect(delegated.effects).toEqual([{ type: "delegate", input: superJ }]);
});

test("physical escape keeps insert-mode behavior", () => {
  const closed = handleModalInput({ mode: "insert" }, snapshot, escapeOptions, "\x1b");
  const open = handleModalInput(
    { mode: "insert" },
    { ...snapshot, isAutocompleteOpen: true },
    escapeOptions,
    "\x1b",
  );

  expect(closed.state.mode).toBe("normal");
  expect(open.state.mode).toBe("insert");
  expect(open.effects).toEqual([{ type: "delegate", input: "\x1b" }]);
});

const insertOptions = resolveVimOptions({
  piVim: {
    keymap: { insert: { openLineBelow: ["ctrl+j"], openLineAbove: ["ctrl+k"] } },
  },
}).options;

test("default insert mode delegates non-escape keys to Pi", () => {
  const result = handleModalInput({ mode: "insert" }, snapshot, options, ctrlJ);
  expect(result.state.mode).toBe("insert");
  expect(result.effects).toEqual([{ type: "delegate", input: ctrlJ }]);

  const imagePaste = handleModalInput({ mode: "insert" }, snapshot, options, "\x16");
  expect(imagePaste.state.mode).toBe("insert");
  expect(imagePaste.effects).toEqual([{ type: "delegate", input: "\x16" }]);

  const windowsImagePaste = handleModalInput({ mode: "insert" }, snapshot, options, altV);
  expect(windowsImagePaste.state.mode).toBe("insert");
  expect(windowsImagePaste.effects).toEqual([{ type: "delegate", input: altV }]);

  const modifiedImagePaste = handleModalInput({ mode: "insert" }, snapshot, options, ctrlAltV);
  expect(modifiedImagePaste.state.mode).toBe("insert");
  expect(modifiedImagePaste.effects).toEqual([{ type: "delegate", input: ctrlAltV }]);
});

test("configured insert open-line-below opens line and stays in insert", () => {
  const result = handleModalInput({ mode: "insert" }, snapshot, insertOptions, ctrlJ);
  expect(result.state.mode).toBe("insert");
  const editEffect = result.effects.find((e) => e.type === "edit") as
    | { type: "edit"; result: { text: string; cursor: { line: number; col: number } } }
    | undefined;
  expect(editEffect).toBeDefined();
  expect(editEffect!.result.text).toBe("abc\n");
  expect(editEffect!.result.cursor).toEqual({ line: 1, col: 0 });
});

test("configured insert open-line-above opens line and stays in insert", () => {
  const ctrlK = "\u001b[107;5u";
  const result = handleModalInput({ mode: "insert" }, snapshot, insertOptions, ctrlK);
  expect(result.state.mode).toBe("insert");
  const editEffect = result.effects.find((e) => e.type === "edit") as
    | { type: "edit"; result: { text: string; cursor: { line: number; col: number } } }
    | undefined;
  expect(editEffect).toBeDefined();
  expect(editEffect!.result.text).toBe("\nabc");
  expect(editEffect!.result.cursor).toEqual({ line: 0, col: 0 });
});

test("empty prompt stays editable with configured insert open-line-below", () => {
  const empty = { text: "", lines: [""], cursor: p(0, 0) };
  const result = handleModalInput({ mode: "insert" }, empty, insertOptions, ctrlJ);
  expect(result.state.mode).toBe("insert");
  expect(result.effects.some((e) => e.type === "edit")).toBe(true);
});

test("autocomplete active keeps Pi ownership for configured insert binding", () => {
  const openSnapshot = { ...snapshot, isAutocompleteOpen: true };
  const result = handleModalInput({ mode: "insert" }, openSnapshot, insertOptions, ctrlJ);
  expect(result.state.mode).toBe("insert");
  expect(result.effects).toEqual([{ type: "delegate", input: ctrlJ }]);
});

test("configured insert open-line-below clears search highlights on change", () => {
  const state = { mode: "insert" as const, searchHighlight: { query: "abc", current: cursor } };
  const result = handleModalInput(state, snapshot, insertOptions, ctrlJ);
  expect(result.state.mode).toBe("insert");
  expect(result.state).not.toHaveProperty("searchHighlight");
  expect(result.effects.some((e) => e.type === "edit")).toBe(true);
});

test("configured insert open-line-below clear ex message before editing", () => {
  const state = {
    mode: "insert" as const,
    exMessage: { kind: "info" as const, text: "message" },
  };
  const result = handleModalInput(state, snapshot, insertOptions, ctrlJ);
  expect(result.state.mode).toBe("insert");
  expect(result.state).not.toHaveProperty("exMessage");
  expect(result.effects.some((e) => e.type === "edit")).toBe(true);
});

test("unconfigured insert key still delegates", () => {
  const result = handleModalInput({ mode: "insert" }, snapshot, insertOptions, "a");
  expect(result.state.mode).toBe("insert");
  expect(result.effects).toEqual([{ type: "delegate", input: "a" }]);
});

const editOptions = resolveVimOptions({
  piVim: {
    keymap: {
      insert: {
        deleteWordBackward: ["ctrl+w"],
        deleteWordForward: ["alt+d"],
        deleteLineBackward: ["ctrl+u"],
        deleteLineForward: ["ctrl+k"],
        moveWordBackward: ["alt+b"],
        moveWordForward: ["alt+f"],
        moveLineStart: ["ctrl+a"],
        moveLineEnd: ["ctrl+e"],
      },
    },
  },
}).options;

test("configured insert deleteWordBackward deletes backward without writing registers", () => {
  const textSnapshot = { text: "alpha beta", lines: ["alpha beta"], cursor: p(0, 6) };
  const result = handleModalInput({ mode: "insert" }, textSnapshot, editOptions, ctrlW);
  expect(result.state.mode).toBe("insert");
  const editEffect = result.effects.find((effect) => effect.type === "edit") as
    | {
        type: "edit";
        result: { text: string; cursor: { line: number; col: number }; register?: unknown };
      }
    | undefined;
  expect(editEffect).toBeDefined();
  expect(editEffect!.result.text).toBe("beta");
  expect(editEffect!.result.cursor).toEqual(p(0, 0));
  expect(editEffect!.result.register).toBeUndefined();
});

test("configured insert deleteWordForward supports legacy and enhanced alt keys", () => {
  const textSnapshot = { text: "hello world foo", lines: ["hello world foo"], cursor: p(0, 0) };
  for (const input of [altD, csiAltD]) {
    const result = handleModalInput({ mode: "insert" }, textSnapshot, editOptions, input);
    const editEffect = result.effects.find((effect) => effect.type === "edit") as
      | {
          type: "edit";
          result: { text: string; cursor: { line: number; col: number }; register?: unknown };
        }
      | undefined;
    expect(editEffect).toBeDefined();
    expect(editEffect!.result.text).toBe("world foo");
    expect(editEffect!.result.cursor).toEqual(p(0, 0));
    expect(editEffect!.result.register).toBeUndefined();
  }
});

test("configured insert moveWordForward supports legacy and enhanced alt keys", () => {
  const textSnapshot = { text: "hello world foo", lines: ["hello world foo"], cursor: p(0, 0) };
  for (const input of [altF, csiAltF]) {
    const result = handleModalInput({ mode: "insert" }, textSnapshot, editOptions, input);
    expect(result.effects).toEqual([
      { type: "restoreCursor", position: p(0, 6) },
      { type: "invalidate" },
    ]);
  }
});

test("configured insert moveLineEnd moves cursor without editing", () => {
  const textSnapshot = { text: "alpha beta", lines: ["alpha beta"], cursor: p(0, 0) };
  const initial = {
    mode: "insert" as const,
    searchHighlight: { query: "beta", current: p(0, 0) },
  };
  const result = handleModalInput(initial, textSnapshot, editOptions, ctrlE);
  expect(result.state.mode).toBe("insert");
  expect(result.state.searchHighlight).toEqual({ query: "beta", current: p(0, 0) });
  expect(result.effects).toEqual([
    { type: "restoreCursor", position: p(0, 10) },
    { type: "invalidate" },
  ]);
});

test("configured insert movement preserves autocomplete delegation", () => {
  const textSnapshot = { ...snapshot, isAutocompleteOpen: true };
  const result = handleModalInput({ mode: "insert" }, textSnapshot, editOptions, ctrlE);
  expect(result.state.mode).toBe("insert");
  expect(result.effects).toEqual([{ type: "delegate", input: ctrlE }]);
});

test("insert escape enters normal unless autocomplete is open", () => {
  expect(handleModalInput({ mode: "insert" }, snapshot, options, "\x1b")).toEqual({
    state: { mode: "normal" },
    effects: [{ type: "terminalCursor", style: "block" }, { type: "invalidate" }],
  });

  expect(
    handleModalInput(
      { mode: "insert" },
      { ...snapshot, isAutocompleteOpen: true },
      options,
      "\x1b",
    ),
  ).toEqual({ state: { mode: "insert" }, effects: [{ type: "delegate", input: "\x1b" }] });
});

test("insert after moves only when cursor points before logical line end", () => {
  expect(
    handleModalInput(
      { mode: "normal" },
      { text: "abc\n", lines: ["abc", ""], cursor: p(0, 2) },
      options,
      "a",
    ).effects,
  ).toContainEqual({ type: "adapterCommand", command: "right" });

  for (const atBoundary of [
    { text: "abc\n", lines: ["abc", ""], cursor: p(0, 3) },
    { text: "\n", lines: ["", ""], cursor: p(0, 0) },
  ]) {
    expect(
      handleModalInput({ mode: "normal" }, atBoundary, options, "a").effects,
    ).not.toContainEqual({ type: "adapterCommand", command: "right" });
  }
});

test("insert after at line end preserves persistent modal state", () => {
  const state: ModalState = {
    mode: "normal",
    register: { type: "char", text: "saved" },
    namedRegisters: { a: { type: "line", text: "line" } },
    marks: { a: p(0, 1) },
    macros: { a: ["x"] },
    lastRepeatableChange: { type: "command", command: "deleteChar" },
    searchHighlight: { query: "abc", current: p(0, 0) },
    exMessage: { kind: "info", text: "clear me" },
  };

  expect(
    handleModalInput(state, { text: "abc\n", lines: ["abc", ""], cursor: p(0, 3) }, options, "a"),
  ).toEqual({
    state: {
      mode: "insert",
      register: state.register,
      namedRegisters: state.namedRegisters,
      marks: state.marks,
      macros: state.macros,
      lastRepeatableChange: state.lastRepeatableChange,
    },
    effects: [{ type: "terminalCursor", style: "bar" }, { type: "invalidate" }],
  });
});

test("insert mode delegates configured showKeybindings keys to Pi", () => {
  const configured = resolveVimOptions({
    piVim: { keymap: { commands: { showKeybindings: ["gk"] } } },
  }).options;
  const update = handleModalInput({ mode: "insert" }, snapshot, configured, "g");

  expect(update.state.helpPopup).toBeUndefined();
  expect(update.effects).toContainEqual({ type: "delegate", input: "g" });
});

test("insert mode delegates Ctrl-R and undo remains unchanged", () => {
  expect(handleModalInput({ mode: "insert" }, snapshot, options, "\x12")).toEqual({
    state: { mode: "insert" },
    effects: [{ type: "delegate", input: "\x12" }],
  });

  expect(handleModalInput({ mode: "normal" }, snapshot, options, "u")).toEqual({
    state: { mode: "normal" },
    effects: [{ type: "adapterCommand", command: "undo" }],
  });
});
