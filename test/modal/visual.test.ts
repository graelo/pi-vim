import { expect, test } from "vitest";
import type { ModalState } from "../../src/modal/types.ts";
import { DEFAULT_VIM_KEYMAP, resolveVimOptions } from "../../src/config.ts";
import { handleModalInputWithOptions as handleModalInput } from "../modal-test-helper.ts";
import { p, cursor, options, snapshot, applyModalKeys } from "./shared.ts";

test("visual replace rejects non-printable character arguments", () => {
  const result = applyModalKeys({ mode: "visual", visualAnchor: p(0, 0) }, "abc", p(0, 1), [
    "r",
    "\x7f",
  ]);
  expect(result.text).toBe("abc");
  expect(result.state).toMatchObject({ mode: "visual", visualAnchor: p(0, 0) });
  expect(result.state.pending).toBeUndefined();
});

test("visual mode uses configured motion keys", () => {
  const configuredOptions = {
    ...options,
    keymap: {
      ...DEFAULT_VIM_KEYMAP,
      motions: { ...DEFAULT_VIM_KEYMAP.motions, right: ["r"] },
    },
  };

  expect(
    handleModalInput({ mode: "visual", visualAnchor: cursor }, snapshot, configuredOptions, "r")
      .effects,
  ).toEqual([{ type: "adapterCommand", command: "right" }, { type: "invalidate" }]);
});

test("visual mode supports configured multi-key motions and operators", () => {
  const configuredOptions = {
    ...options,
    keymap: {
      ...DEFAULT_VIM_KEYMAP,
      operators: { ...DEFAULT_VIM_KEYMAP.operators, yank: ["qq"] },
      motions: { ...DEFAULT_VIM_KEYMAP.motions, right: ["rr"] },
    },
  };

  const pendingMotion = handleModalInput(
    { mode: "visual", visualAnchor: cursor },
    snapshot,
    configuredOptions,
    "r",
  );
  expect(pendingMotion.state.pending).toBe("r");
  expect(handleModalInput(pendingMotion.state, snapshot, configuredOptions, "r").effects).toEqual([
    { type: "adapterCommand", command: "right" },
    { type: "invalidate" },
  ]);

  const pendingOperator = handleModalInput(
    { mode: "visual", visualAnchor: cursor },
    snapshot,
    configuredOptions,
    "q",
  );
  const yanked = handleModalInput(
    pendingOperator.state,
    { text: "abc", lines: ["abc"], cursor: { line: 0, col: 1 } },
    configuredOptions,
    "q",
  );
  expect(yanked.state.register).toEqual({ type: "char", text: "ab" });
  expect(yanked.state.mode).toBe("normal");
});

test("visual shift operators transform touched lines and preserve registers", () => {
  const visualChar = applyModalKeys(
    { mode: "visual", visualAnchor: p(0, 1), register: { type: "char", text: "keep" } },
    "one\ntwo\nthree",
    p(1, 1),
    [">"],
  );
  expect(visualChar.text).toBe("  one\n  two\nthree");
  expect(visualChar.state.mode).toBe("normal");
  expect(visualChar.state.visualAnchor).toBeUndefined();
  expect(visualChar.state.register).toEqual({ type: "char", text: "keep" });

  const visualLine = applyModalKeys(
    { mode: "visualLine", visualAnchor: p(0, 0), register: { type: "line", text: "keep" } },
    "  one\n  two\nthree",
    p(1, 0),
    ["<"],
  );
  expect(visualLine.text).toBe("one\ntwo\nthree");
  expect(visualLine.state.mode).toBe("normal");
  expect(visualLine.state.register).toEqual({ type: "line", text: "keep" });

  const visualBlock = applyModalKeys(
    { mode: "visualBlock", visualAnchor: p(0, 1) },
    "one\ntwo\nthree",
    p(2, 1),
    [">"],
  );
  expect(visualBlock.text).toBe("  one\n  two\n  three");
  expect(visualBlock.state.mode).toBe("normal");

  const countedVisual = applyModalKeys(
    { mode: "visualLine", visualAnchor: p(0, 0) },
    "one\ntwo",
    p(1, 0),
    ["2", ">"],
  );
  expect(countedVisual.text).toBe("    one\n    two");
  expect(countedVisual.state.mode).toBe("normal");
});

test("visual shifts clear search highlights on changed text and no-op safely without anchor", () => {
  const shifted = applyModalKeys(
    {
      mode: "visualLine",
      visualAnchor: p(0, 0),
      searchHighlight: { query: "one", current: p(0, 0) },
    },
    "one\ntwo",
    p(0, 0),
    [">"],
  );
  expect(shifted.text).toBe("  one\ntwo");
  expect(shifted.state.searchHighlight).toBeUndefined();

  const noAnchor = applyModalKeys({ mode: "visualLine" }, "one", p(0, 0), [">"]);
  expect(noAnchor.text).toBe("one");
  expect(noAnchor.state.mode).toBe("normal");
});

test("visual case changes selected text and returns normal without registers", () => {
  const lowered = handleModalInput(
    {
      mode: "visual",
      visualAnchor: { line: 0, col: 1 },
      register: { type: "char", text: "old" },
    },
    { text: "aBc", lines: ["aBc"], cursor: { line: 0, col: 2 } },
    options,
    "u",
  );
  expect(lowered.state.mode).toBe("normal");
  expect(lowered.state.register).toEqual({ type: "char", text: "old" });
  expect(lowered.effects[0]).toMatchObject({
    type: "edit",
    result: { text: "abc", cursor: { line: 0, col: 1 }, changed: true },
  });

  const uppered = applyModalKeys(
    { mode: "visualLine", visualAnchor: p(0, 0), register: { type: "line", text: "old" } },
    "aBc\nDeF",
    p(1, 0),
    ["U"],
  );
  expect(uppered.text).toBe("ABC\nDEF");
  expect(uppered.state.mode).toBe("normal");
  expect(uppered.state.register).toEqual({ type: "line", text: "old" });

  const toggledBlock = applyModalKeys(
    { mode: "visualBlock", visualAnchor: p(0, 1) },
    "aBcD\neFgH",
    p(1, 2),
    ["~"],
  );
  expect(toggledBlock.text).toBe("abCD\nefGH");
  expect(toggledBlock.state.mode).toBe("normal");
});

test("visual replace changes selected text with a typed character", () => {
  const pending = handleModalInput(
    { mode: "visual", visualAnchor: { line: 0, col: 1 } },
    { text: "abc", lines: ["abc"], cursor: { line: 0, col: 2 } },
    options,
    "r",
  );
  expect(pending.state.pending).toBeDefined();

  const replaced = handleModalInput(
    pending.state,
    { text: "abc", lines: ["abc"], cursor: { line: 0, col: 2 } },
    options,
    "X",
  );
  expect(replaced.state.mode).toBe("normal");
  expect(replaced.effects[0]).toEqual({
    type: "edit",
    result: {
      text: "aXX",
      cursor: { line: 0, col: 1 },
      register: { type: "char", text: "bc" },
      changed: true,
    },
  });
});

test("visual block replace changes selected rectangle with a typed character", () => {
  const pending = handleModalInput(
    { mode: "visualBlock", visualAnchor: { line: 0, col: 1 } },
    { text: "abcd\nef", lines: ["abcd", "ef"], cursor: { line: 1, col: 2 } },
    options,
    "r",
  );
  const replaced = handleModalInput(
    pending.state,
    { text: "abcd\nef", lines: ["abcd", "ef"], cursor: { line: 1, col: 2 } },
    options,
    "Q",
  );
  expect(replaced.state.mode).toBe("normal");
  expect(replaced.effects[0]).toMatchObject({
    type: "edit",
    result: { text: "aQQd\neQ", cursor: { line: 0, col: 1 }, changed: true },
  });
});

test("visual named register prefix yanks selected text", () => {
  const prefix = handleModalInput(
    { mode: "visual", visualAnchor: { line: 0, col: 1 } },
    { text: "abcd", lines: ["abcd"], cursor: { line: 0, col: 2 } },
    options,
    '"',
  );
  expect(prefix.state.pendingRegister).toBe("awaitingSlot");

  const target = handleModalInput(
    prefix.state,
    { text: "abcd", lines: ["abcd"], cursor: { line: 0, col: 2 } },
    options,
    "a",
  );
  const yanked = handleModalInput(
    target.state,
    { text: "abcd", lines: ["abcd"], cursor: { line: 0, col: 2 } },
    options,
    "y",
  );

  expect(yanked.state).toEqual({
    mode: "normal",
    register: { type: "char", text: "bc" },
    namedRegisters: { a: { type: "char", text: "bc" } },
    lastVisualSelection: {
      mode: "visual",
      anchor: { line: 0, col: 1 },
      cursor: { line: 0, col: 2 },
      text: "abcd",
    },
  });
});

test("visual line and block operations write named registers", () => {
  const lineDeleted = handleModalInput(
    {
      mode: "visualLine",
      visualAnchor: { line: 0, col: 0 },
      pendingRegister: { kind: "named", slot: "a", append: false },
    },
    { text: "one\ntwo\nthree", lines: ["one", "two", "three"], cursor: { line: 1, col: 0 } },
    options,
    "d",
  );
  expect(lineDeleted.state.namedRegisters?.a).toEqual({ type: "line", text: "one\ntwo" });
  expect(lineDeleted.state.register).toEqual({ type: "line", text: "one\ntwo" });

  const blockChanged = handleModalInput(
    {
      mode: "visualBlock",
      visualAnchor: { line: 0, col: 1 },
      pendingRegister: { kind: "named", slot: "b", append: false },
    },
    { text: "abcd\nefgh", lines: ["abcd", "efgh"], cursor: { line: 1, col: 2 } },
    options,
    "c",
  );
  expect(blockChanged.state.mode).toBe("insert");
  expect(blockChanged.state.namedRegisters?.b).toEqual({ type: "char", text: "bc\nfg" });
  expect(blockChanged.state.register).toEqual({ type: "char", text: "bc\nfg" });
});

test("visual line paste replacement can read named register", () => {
  const result = handleModalInput(
    {
      mode: "visualLine",
      visualAnchor: { line: 1, col: 0 },
      register: { type: "line", text: "unnamed" },
      namedRegisters: { a: { type: "line", text: "alpha\nbeta" } },
      pendingRegister: { kind: "named", slot: "a", append: false },
    },
    { text: "one\ntwo\nthree", lines: ["one", "two", "three"], cursor: { line: 1, col: 0 } },
    options,
    "p",
  );

  expect(result.effects[0]).toEqual({
    type: "edit",
    result: {
      text: "one\nalpha\nbeta\nthree",
      cursor: { line: 1, col: 0 },
      register: { type: "line", text: "two" },
      changed: true,
    },
  });
  expect(result.state.namedRegisters?.a).toEqual({ type: "line", text: "two" });
  expect(result.state.register).toEqual({ type: "line", text: "two" });
});

test("visual delete returns edit effect and normal-mode cursor intent", () => {
  const result = handleModalInput(
    { mode: "visual", visualAnchor: { line: 0, col: 1 } },
    { text: "abcd", lines: ["abcd"], cursor: { line: 0, col: 2 } },
    options,
    "d",
  );

  expect(result.state).toEqual({
    mode: "normal",
    register: { type: "char", text: "bc" },
    lastVisualSelection: {
      mode: "visual",
      anchor: { line: 0, col: 1 },
      cursor: { line: 0, col: 2 },
      text: "abcd",
    },
  });
  expect(result.effects[0]).toEqual({
    type: "edit",
    result: {
      text: "ad",
      cursor: { line: 0, col: 1 },
      register: { type: "char", text: "bc" },
      changed: true,
    },
  });
  expect(result.effects.at(-2)).toEqual({ type: "terminalCursor", style: "block" });
});

test("visual line yank updates linewise register and returns normal", () => {
  const result = handleModalInput(
    { mode: "visualLine", visualAnchor: { line: 0, col: 0 } },
    { text: "one\ntwo", lines: ["one", "two"], cursor: { line: 1, col: 0 } },
    options,
    "y",
  );

  expect(result.state).toEqual({
    mode: "normal",
    register: { type: "line", text: "one\ntwo" },
    lastVisualSelection: {
      mode: "visualLine",
      anchor: { line: 0, col: 0 },
      cursor: { line: 1, col: 0 },
      text: "one\ntwo",
    },
  });
  expect(result.effects).toEqual([
    { type: "terminalCursor", style: "block" },
    { type: "invalidate" },
  ]);
});

test("normal ctrl-v delegates by default and explicit visualBlock binding enters visual block", () => {
  const delegated = handleModalInput({ mode: "normal" }, snapshot, options, "\x16");
  expect(delegated.state).toEqual({ mode: "normal" });
  expect(delegated.effects).toContainEqual({ type: "delegate", input: "\x16" });

  const configuredOptions = {
    ...options,
    keymap: {
      ...DEFAULT_VIM_KEYMAP,
      commands: { ...DEFAULT_VIM_KEYMAP.commands, visualBlock: ["ctrl+v"] },
    },
  };
  const result = handleModalInput({ mode: "normal" }, snapshot, configuredOptions, "\x16");

  expect(result.state).toEqual({ mode: "visualBlock", visualAnchor: cursor });
  expect(result.effects).toEqual([
    { type: "terminalCursor", style: "block" },
    { type: "invalidate" },
  ]);
});

test("visual block switches kind without resetting anchor", () => {
  const state: ModalState = { mode: "visualBlock", visualAnchor: { line: 0, col: 1 } };
  expect(handleModalInput(state, snapshot, options, "v").state).toEqual({
    mode: "visual",
    visualAnchor: { line: 0, col: 1 },
  });
  expect(handleModalInput(state, snapshot, options, "V").state).toEqual({
    mode: "visualLine",
    visualAnchor: { line: 0, col: 1 },
  });

  const configuredOptions = {
    ...options,
    keymap: {
      ...DEFAULT_VIM_KEYMAP,
      commands: { ...DEFAULT_VIM_KEYMAP.commands, visualBlock: ["alt+x"] },
    },
  };
  expect(
    handleModalInput(
      { mode: "visual", visualAnchor: { line: 0, col: 1 } },
      snapshot,
      configuredOptions,
      "\x1bx",
    ).state,
  ).toEqual({ mode: "visualBlock", visualAnchor: { line: 0, col: 1 } });
});

test("visual block yank delete and change use blockwise character registers", () => {
  const blockState: ModalState = { mode: "visualBlock", visualAnchor: { line: 0, col: 1 } };
  const blockSnapshot = {
    text: "abcd\nefgh",
    lines: ["abcd", "efgh"],
    cursor: { line: 1, col: 2 },
  };

  const expectedBlockLastSelection = {
    mode: "visualBlock" as const,
    anchor: { line: 0, col: 1 },
    cursor: { line: 1, col: 2 },
    text: "abcd\nefgh",
  };

  const yanked = handleModalInput(blockState, blockSnapshot, options, "y");
  expect(yanked.state).toEqual({
    mode: "normal",
    register: { type: "char", text: "bc\nfg" },
    lastVisualSelection: expectedBlockLastSelection,
  });

  const deleted = handleModalInput(blockState, blockSnapshot, options, "d");
  expect(deleted.state).toEqual({
    mode: "normal",
    register: { type: "char", text: "bc\nfg" },
    lastVisualSelection: expectedBlockLastSelection,
  });
  expect(deleted.effects[0]).toEqual({
    type: "edit",
    result: {
      text: "ad\neh",
      cursor: { line: 0, col: 1 },
      register: { type: "char", text: "bc\nfg" },
      changed: true,
    },
  });

  const changed = handleModalInput(blockState, blockSnapshot, options, "c");
  expect(changed.state.mode).toBe("insert");
  expect(changed.state.register).toEqual({ type: "char", text: "bc\nfg" });
  expect(changed.state.lastVisualSelection).toEqual(expectedBlockLastSelection);
});

test("visual block I and A collect text and insert across selected lines on escape", () => {
  const blockState: ModalState = { mode: "visualBlock", visualAnchor: { line: 0, col: 1 } };
  const blockSnapshot = {
    text: "abcd\nefgh",
    lines: ["abcd", "efgh"],
    cursor: { line: 1, col: 2 },
  };

  const started = handleModalInput(blockState, blockSnapshot, options, "I");
  expect(started.state).toEqual({
    mode: "insert",
    blockInsert: {
      anchor: { line: 0, col: 1 },
      active: { line: 1, col: 2 },
      placement: "start",
      previewLine: 0,
      text: "",
    },
    lastVisualSelection: {
      mode: "visualBlock",
      anchor: { line: 0, col: 1 },
      cursor: { line: 1, col: 2 },
      text: "abcd\nefgh",
    },
  });
  expect(started.effects[0]).toEqual({ type: "restoreCursor", position: { line: 0, col: 1 } });

  const typed = handleModalInput(started.state, blockSnapshot, options, "X");
  expect(typed.effects[0]).toEqual({ type: "delegate", input: "X" });
  const finished = handleModalInput(
    typed.state,
    { text: "aXbcd\nefgh", lines: ["aXbcd", "efgh"], cursor: { line: 0, col: 2 } },
    options,
    "\x1b",
  );
  expect(finished.state.mode).toBe("normal");
  expect(finished.effects[0]).toEqual({
    type: "edit",
    result: { text: "aXbcd\neXfgh", cursor: { line: 0, col: 2 }, changed: true },
  });

  const appendStarted = handleModalInput(blockState, blockSnapshot, options, "A");
  expect(appendStarted.effects[0]).toEqual({
    type: "restoreCursor",
    position: { line: 0, col: 3 },
  });
  const appendTyped = handleModalInput(appendStarted.state, blockSnapshot, options, "Y");
  const appendFinished = handleModalInput(
    appendTyped.state,
    { text: "abcYd\nefgh", lines: ["abcYd", "efgh"], cursor: { line: 0, col: 4 } },
    options,
    "\x1b",
  );
  expect(appendFinished.effects[0]).toEqual({
    type: "edit",
    result: { text: "abcYd\nefgYh", cursor: { line: 0, col: 4 }, changed: true },
  });
});

test("visual block insert delegates reset and protected shortcuts", () => {
  const blockInsertState: ModalState = {
    mode: "insert",
    blockInsert: {
      anchor: { line: 0, col: 1 },
      active: { line: 1, col: 2 },
      placement: "start",
      previewLine: 0,
      text: "X",
    },
  };

  const reset = handleModalInput(blockInsertState, snapshot, options, "\x03");
  expect(reset.state).toEqual({ mode: "insert" });
  expect(reset.effects).toContainEqual({ type: "delegate", input: "\x03" });

  const protectedShortcut = handleModalInput(blockInsertState, snapshot, options, "\x0c");
  expect(protectedShortcut.state).toEqual(blockInsertState);
  expect(protectedShortcut.effects).toContainEqual({ type: "delegate", input: "\x0c" });
});

test("visual line change returns linewise edit and insert-mode intent", () => {
  const result = handleModalInput(
    { mode: "visualLine", visualAnchor: { line: 1, col: 0 } },
    { text: "one\ntwo", lines: ["one", "two"], cursor: { line: 1, col: 0 } },
    options,
    "c",
  );

  expect(result.state).toEqual({
    mode: "insert",
    register: { type: "line", text: "two" },
    lastVisualSelection: {
      mode: "visualLine",
      anchor: { line: 1, col: 0 },
      cursor: { line: 1, col: 0 },
      text: "one\ntwo",
    },
  });
  expect(result.effects[0]).toEqual({
    type: "edit",
    result: {
      text: "one",
      cursor: { line: 0, col: 0 },
      register: { type: "line", text: "two" },
      changed: true,
    },
  });
  expect(result.effects.at(-2)).toEqual({ type: "terminalCursor", style: "bar" });
});

test("characterwise gv after exiting visual mode restores mode, anchor, and cursor", () => {
  // Enter visual mode, move, escape, then press gv
  const entered = applyModalKeys({ mode: "normal" }, "abcd", p(0, 0), ["v", "l", "l", "\x1b"]);
  expect(entered.state.mode).toBe("normal");
  expect(entered.state.lastVisualSelection).toEqual({
    mode: "visual",
    anchor: p(0, 0),
    cursor: p(0, 2),
    text: "abcd",
  });

  // Press gv to reselect
  const reselected = applyModalKeys(entered.state, entered.text, p(0, 0), ["g", "v"]);
  expect(reselected.state.mode).toBe("visual");
  expect(reselected.state.visualAnchor).toEqual(p(0, 0));
  expect(reselected.cursor).toEqual(p(0, 2));
});

test("visual line gv preserves linewise selection kind", () => {
  // Enter visual line mode, move, escape
  const entered = applyModalKeys({ mode: "normal" }, "one\ntwo\nthree", p(0, 0), [
    "V",
    "j",
    "\x1b",
  ]);
  expect(entered.state.lastVisualSelection).toEqual({
    mode: "visualLine",
    anchor: p(0, 0),
    cursor: p(1, 0),
    text: "one\ntwo\nthree",
  });

  // Press gv to reselect
  const reselected = applyModalKeys(entered.state, entered.text, p(0, 0), ["g", "v"]);
  expect(reselected.state.mode).toBe("visualLine");
  expect(reselected.state.visualAnchor).toEqual(p(0, 0));
  expect(reselected.cursor).toEqual(p(1, 0));
});

test("visual block gv preserves blockwise selection kind", () => {
  const visualBlockOptions = {
    ...options,
    keymap: {
      ...DEFAULT_VIM_KEYMAP,
      commands: { ...DEFAULT_VIM_KEYMAP.commands, visualBlock: ["ctrl+v"] },
    },
  };
  // Enter visual block mode, move, escape
  const entered = applyModalKeys(
    { mode: "normal" },
    "abcd\nefgh",
    p(0, 0),
    ["\x16", "l", "j", "\x1b"],
    visualBlockOptions,
  );
  expect(entered.state.lastVisualSelection).toEqual({
    mode: "visualBlock",
    anchor: p(0, 0),
    cursor: p(1, 1),
    text: "abcd\nefgh",
  });

  // Press gv to reselect
  const reselected = applyModalKeys(entered.state, entered.text, p(0, 0), ["g", "v"]);
  expect(reselected.state.mode).toBe("visualBlock");
  expect(reselected.state.visualAnchor).toEqual(p(0, 0));
  expect(reselected.cursor).toEqual(p(1, 1));
});

test("gv after visual Ex exit reselects the Ex range", () => {
  const exited = applyModalKeys({ mode: "normal" }, "abcd", p(0, 0), ["v", "l", ":", "\r"]);
  expect(exited.state.mode).toBe("normal");
  expect(exited.state.lastVisualSelection).toEqual({
    mode: "visual",
    anchor: p(0, 0),
    cursor: p(0, 1),
    text: "abcd",
  });

  const reselected = applyModalKeys(exited.state, exited.text, p(0, 0), ["g", "v"]);
  expect(reselected.state.mode).toBe("visual");
  expect(reselected.state.visualAnchor).toEqual(p(0, 0));
  expect(reselected.cursor).toEqual(p(0, 1));
});

test("gv after yank reselects the yanked range", () => {
  // Enter visual, select, yank
  const yanked = applyModalKeys({ mode: "normal" }, "abcd", p(0, 0), ["v", "l", "l", "y"]);
  expect(yanked.state.mode).toBe("normal");
  expect(yanked.state.lastVisualSelection).toEqual({
    mode: "visual",
    anchor: p(0, 0),
    cursor: p(0, 2),
    text: "abcd",
  });

  // Press gv to reselect
  const reselected = applyModalKeys(yanked.state, yanked.text, p(0, 0), ["g", "v"]);
  expect(reselected.state.mode).toBe("visual");
  expect(reselected.state.visualAnchor).toEqual(p(0, 0));
  expect(reselected.cursor).toEqual(p(0, 2));
});

test("gv after delete reselects the deleted range", () => {
  // Enter visual, select, delete
  const deleted = applyModalKeys({ mode: "normal" }, "abcd", p(0, 0), ["v", "l", "l", "d"]);
  expect(deleted.state.mode).toBe("normal");
  expect(deleted.text).toBe("d");
  expect(deleted.state.lastVisualSelection).toEqual({
    mode: "visual",
    anchor: p(0, 0),
    cursor: p(0, 2),
    text: "abcd",
  });

  // Press gv to reselect (stale positions after edit)
  const reselected = applyModalKeys(deleted.state, deleted.text, p(0, 0), ["g", "v"]);
  // Should no-op because cursor position is now stale
  expect(reselected.state.mode).toBe("normal");
});

test("gv after edit no-ops when old coordinates still fit changed text", () => {
  const deleted = applyModalKeys({ mode: "normal" }, "abcdef", p(0, 1), ["v", "l", "l", "d"]);
  expect(deleted.text).toBe("aef");
  expect(deleted.state.lastVisualSelection).toEqual({
    mode: "visual",
    anchor: p(0, 1),
    cursor: p(0, 3),
    text: "abcdef",
  });

  const reselected = applyModalKeys(deleted.state, deleted.text, p(0, 1), ["g", "v"]);
  expect(reselected.state.mode).toBe("normal");
  expect(reselected.cursor).toEqual(p(0, 1));
});

test("gv with no last visual selection is a no-op", () => {
  const result = applyModalKeys({ mode: "normal" }, "abcd", p(0, 0), ["g", "v"]);
  expect(result.state.mode).toBe("normal");
  expect(result.text).toBe("abcd");
  expect(result.cursor).toEqual(p(0, 0));
});

test("later visual exits replace previous stored selection", () => {
  // First visual selection
  const first = applyModalKeys({ mode: "normal" }, "abcdefgh", p(0, 0), ["v", "l", "\x1b"]);
  expect(first.state.lastVisualSelection).toEqual({
    mode: "visual",
    anchor: p(0, 0),
    cursor: p(0, 1),
    text: "abcdefgh",
  });

  // Second visual selection replaces first
  const second = applyModalKeys(first.state, first.text, p(0, 4), ["v", "l", "l", "\x1b"]);
  expect(second.state.lastVisualSelection).toEqual({
    mode: "visual",
    anchor: p(0, 4),
    cursor: p(0, 6),
    text: "abcdefgh",
  });

  // gv uses the second selection
  const reselected = applyModalKeys(second.state, second.text, p(0, 0), ["g", "v"]);
  expect(reselected.state.mode).toBe("visual");
  expect(reselected.state.visualAnchor).toEqual(p(0, 4));
  expect(reselected.cursor).toEqual(p(0, 6));
});

test("configured reselectVisual key works", () => {
  const configuredOptions = resolveVimOptions({
    keymap: { commands: { reselectVisual: ["grv"] } },
  }).options;

  // Enter visual, select, escape
  const entered = applyModalKeys(
    { mode: "normal" },
    "abcd",
    p(0, 0),
    ["v", "l", "l", "\x1b"],
    configuredOptions,
  );

  // Press configured key
  const reselected = applyModalKeys(
    entered.state,
    entered.text,
    p(0, 0),
    ["g", "r", "v"],
    configuredOptions,
  );
  expect(reselected.state.mode).toBe("visual");
  expect(reselected.state.visualAnchor).toEqual(p(0, 0));
  expect(reselected.cursor).toEqual(p(0, 2));
});
