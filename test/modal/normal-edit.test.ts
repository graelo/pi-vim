import { expect, test } from "vitest";
import type { ModalOptions, ModalState } from "../../src/modal/types.ts";
import { DEFAULT_VIM_KEYMAP } from "../../src/config.ts";
import { handleModalInputWithOptions as handleModalInput } from "../modal-test-helper.ts";
import { p, cursor, options, snapshot, altV, ctrlAltV, applyModalKeys } from "./shared.ts";

test("normal pending command clears on invalid printable key", () => {
  expect(handleModalInput({ mode: "normal", pending: "d" }, snapshot, options, "q")).toEqual({
    state: { mode: "normal" },
    effects: [{ type: "invalidate" }],
  });
});

test("normal mode emits redo through semantic keymap without modal side effects", () => {
  const state: ModalState = {
    mode: "normal",
    pending: "2\u0000count\u0000",
    register: { type: "char", text: "keep" },
    namedRegisters: { a: { type: "line", text: "named" } },
    marks: { a: p(0, 2) },
    lastRepeatableChange: { type: "command", command: "deleteChar" },
    searchHighlight: { query: "a", current: cursor },
  };

  const update = handleModalInput(state, { ...snapshot, isRedoAvailable: true }, options, "\x12");

  expect(update.state).toEqual({
    mode: "normal",
    register: { type: "char", text: "keep" },
    namedRegisters: { a: { type: "line", text: "named" } },
    marks: { a: p(0, 2) },
    lastRepeatableChange: { type: "command", command: "deleteChar" },
    searchHighlight: { query: "a", current: cursor },
  });
  expect(update.effects).toEqual([{ type: "adapterCommand", command: "redo" }]);
});

test("normal mode uses configured semantic keymap", () => {
  const configuredOptions = {
    ...options,
    keymap: {
      ...DEFAULT_VIM_KEYMAP,
      operators: { ...DEFAULT_VIM_KEYMAP.operators, delete: ["z"] },
      motions: { ...DEFAULT_VIM_KEYMAP.motions, wordForward: ["e"] },
      commands: {
        ...DEFAULT_VIM_KEYMAP.commands,
        openLineBelow: ["n"],
        visualBlock: ["alt+x"],
        redo: ["R"],
      },
    },
  };

  expect(handleModalInput({ mode: "normal" }, snapshot, configuredOptions, "z")).toEqual({
    state: { mode: "normal", pending: "z" },
    effects: [{ type: "invalidate" }],
  });

  const deleted = handleModalInput(
    { mode: "normal", pending: "z" },
    { text: "abc def", lines: ["abc def"], cursor },
    configuredOptions,
    "e",
  );
  expect(deleted.state.register).toEqual({ type: "char", text: "abc " });
  expect(deleted.effects[0]).toEqual({
    type: "edit",
    result: {
      text: "def",
      cursor,
      register: { type: "char", text: "abc " },
      changed: true,
    },
  });

  const opened = handleModalInput({ mode: "normal" }, snapshot, configuredOptions, "n");
  expect(opened.state.mode).toBe("insert");
  expect(opened.effects[0]?.type).toBe("edit");

  const visualBlock = handleModalInput({ mode: "normal" }, snapshot, configuredOptions, "\x1bx");
  expect(visualBlock.state).toEqual({ mode: "visualBlock", visualAnchor: cursor });

  const redo = handleModalInput(
    { mode: "normal" },
    { ...snapshot, isRedoAvailable: true },
    configuredOptions,
    "R",
  );
  expect(redo.effects).toEqual([{ type: "adapterCommand", command: "redo" }]);
});

test("normal edit commands return structural edit effects and register state", () => {
  const result = handleModalInput({ mode: "normal" }, snapshot, options, "x");

  expect(result.state.register).toEqual({ type: "char", text: "a" });
  expect(result.effects).toEqual([
    {
      type: "edit",
      result: {
        text: "bc",
        cursor,
        register: { type: "char", text: "a" },
        changed: true,
      },
    },
  ]);
});

test("normal mode supports delete before cursor", () => {
  const deleted = applyModalKeys({ mode: "normal" }, "abcd", p(0, 2), ["X"]);
  expect(deleted.text).toBe("acd");
  expect(deleted.cursor).toEqual(p(0, 1));
  expect(deleted.state.register).toEqual({ type: "char", text: "b" });
  expect(deleted.state.lastRepeatableChange).toEqual({
    type: "command",
    command: "deleteCharBefore",
    count: 1,
  });

  const counted = applyModalKeys({ mode: "normal" }, "abcdef", p(0, 5), ["3", "X"]);
  expect(counted.text).toBe("abf");
  expect(counted.state.register).toEqual({ type: "char", text: "cde" });
  expect(counted.state.lastRepeatableChange).toEqual({
    type: "command",
    command: "deleteCharBefore",
    count: 3,
  });

  const noOp = applyModalKeys(
    { mode: "normal", register: { type: "char", text: "keep" } },
    "abc",
    p(0, 0),
    ["X"],
  );
  expect(noOp.text).toBe("abc");
  expect(noOp.state.register).toEqual({ type: "char", text: "keep" });
});

test.each([
  ["Kitty without shifted key", "\x1b[120;2u"],
  ["modifyOtherKeys uppercase", "\x1b[27;2;88~"],
  ["modifyOtherKeys lowercase", "\x1b[27;2;120~"],
])("normal mode deletes before cursor for shift+x as %s", (_, shiftX) => {
  const deleted = applyModalKeys({ mode: "normal" }, "abcd", p(0, 2), [shiftX]);
  expect(deleted.text).toBe("acd");
  expect(deleted.state.register).toEqual({ type: "char", text: "b" });
});

test("character targets receive the uppercase letter for shift+letter events", () => {
  const moved = applyModalKeys({ mode: "normal" }, "axbXc", p(0, 0), ["f", "\x1b[120;2u"]);
  expect(moved.cursor).toEqual(p(0, 3));
});

test("normal delete before cursor dot-repeat and ctrl-x numeric decrement stay distinct", () => {
  const deleted = applyModalKeys({ mode: "normal" }, "abcde", p(0, 4), ["2", "X"]);
  const repeated = applyModalKeys(deleted.state, deleted.text, p(0, 2), ["."]);
  expect(repeated.text).toBe("e");
  expect(repeated.state.register).toEqual({ type: "char", text: "ab" });

  const decremented = handleModalInput(
    { mode: "normal" },
    { text: "v2", lines: ["v2"], cursor },
    options,
    "\x18",
  );
  expect(decremented.effects[0]).toMatchObject({ type: "edit", result: { text: "v1" } });
});

test("normal mode supports counts, numeric adjustment, replacement, toggle case, and substitution", () => {
  const counted = handleModalInput({ mode: "normal" }, snapshot, options, "2");
  const deleted = handleModalInput(
    counted.state,
    { text: "abcd", lines: ["abcd"], cursor },
    options,
    "x",
  );
  expect(deleted.effects[0]).toEqual({
    type: "edit",
    result: {
      text: "cd",
      cursor,
      register: { type: "char", text: "ab" },
      changed: true,
    },
  });

  const incremented = handleModalInput(
    { mode: "normal" },
    { text: "v2", lines: ["v2"], cursor },
    options,
    "\x01",
  );
  expect(incremented.effects[0]).toMatchObject({ type: "edit", result: { text: "v3" } });

  const toggled = applyModalKeys({ mode: "normal" }, "aBc", cursor, ["3", "~"]);
  expect(toggled.text).toBe("AbC");
  expect(toggled.cursor).toEqual(p(0, 2));
  expect(toggled.state.mode).toBe("normal");

  const unicodeToggled = applyModalKeys({ mode: "normal" }, "ab😀cd", cursor, ["4", "~"]);
  expect(unicodeToggled.text).toBe("AB😀Cd");
  expect(unicodeToggled.cursor).toEqual(p(0, 4));

  const replacePending = handleModalInput({ mode: "normal" }, snapshot, options, "r");
  const replaced = handleModalInput(replacePending.state, snapshot, options, "z");
  expect(replaced.effects[0]).toMatchObject({ type: "edit", result: { text: "zbc" } });

  const rejected = handleModalInput(replacePending.state, snapshot, options, "\x7f");
  expect(rejected.state.pending).toBeUndefined();
  expect(rejected.effects.some((effect) => effect.type === "edit")).toBe(false);

  const substituted = handleModalInput({ mode: "normal" }, snapshot, options, "s");
  expect(substituted.state.mode).toBe("insert");
  expect(substituted.effects[0]).toMatchObject({ type: "edit", result: { text: "bc" } });
});

test("normal mode supports character search repeat and dot repeat", () => {
  const found = handleModalInput(
    { mode: "normal" },
    { text: "a:b:c", lines: ["a:b:c"], cursor },
    options,
    "f",
  );
  const rejected = handleModalInput(
    found.state,
    { text: "a:b:c", lines: ["a:b:c"], cursor },
    options,
    "\x7f",
  );
  expect(rejected.state.pending).toBeUndefined();
  expect(rejected.effects).toEqual([{ type: "invalidate" }]);

  const targeted = handleModalInput(
    found.state,
    { text: "a:b:c", lines: ["a:b:c"], cursor },
    options,
    ":",
  );
  expect(targeted.effects).toEqual([
    { type: "restoreCursor", position: { line: 0, col: 1 } },
    { type: "invalidate" },
  ]);
  const repeated = handleModalInput(
    targeted.state,
    { text: "a:b:c", lines: ["a:b:c"], cursor: { line: 0, col: 1 } },
    options,
    ";",
  );
  expect(repeated.effects[0]).toEqual({ type: "restoreCursor", position: { line: 0, col: 3 } });

  const reversedRepeated = applyModalKeys({ mode: "normal" }, "banana apple alpha", p(0, 0), [
    "f",
    "a",
    ";",
    ";",
    ",",
    ",",
  ]);
  expect(reversedRepeated.cursor).toEqual(p(0, 1));
  expect(reversedRepeated.state.lastCharSearch).toEqual({
    command: "findCharForward",
    target: "a",
  });

  const backwardReversed = applyModalKeys({ mode: "normal" }, "banana apple alpha", p(0, 17), [
    "F",
    "a",
    ",",
  ]);
  expect(backwardReversed.cursor).toEqual(p(0, 17));
  expect(backwardReversed.state.lastCharSearch).toEqual({
    command: "findCharBackward",
    target: "a",
  });

  const tillRepeated = applyModalKeys({ mode: "normal" }, "banana apple alpha", p(0, 0), [
    "t",
    "a",
    ";",
  ]);
  expect(tillRepeated.cursor).toEqual(p(0, 2));

  const tillBackwardRepeated = applyModalKeys({ mode: "normal" }, "banana apple alpha", p(0, 5), [
    "T",
    "a",
    ";",
  ]);
  expect(tillBackwardRepeated.cursor).toEqual(p(0, 2));

  const tillReverseRepeated = applyModalKeys({ mode: "normal" }, "banana apple alpha", p(0, 0), [
    "l",
    "l",
    "l",
    "T",
    "a",
    ",",
  ]);
  expect(tillReverseRepeated.cursor).toEqual(p(0, 4));

  const replacePending = handleModalInput({ mode: "normal" }, snapshot, options, "r");
  const replaced = handleModalInput(replacePending.state, snapshot, options, "z");
  const repeatedChange = handleModalInput(
    replaced.state,
    { text: "zbc", lines: ["zbc"], cursor: { line: 0, col: 1 } },
    options,
    ".",
  );
  expect(repeatedChange.effects[0]).toMatchObject({ type: "edit", result: { text: "zzc" } });

  const toggled = applyModalKeys({ mode: "normal" }, "abCD", cursor, ["2", "~"]);
  const repeatedToggle = applyModalKeys(toggled.state, toggled.text, p(0, 2), ["."]);
  expect(repeatedToggle.text).toBe("ABcd");

  const noOp = applyModalKeys(toggled.state, toggled.text, p(0, 4), ["~"]);
  const preservedRepeat = applyModalKeys(noOp.state, noOp.text, p(0, 2), ["."]);
  expect(preservedRepeat.text).toBe("ABcd");
});

test("normal dot repeat applies line delete commands and updates line register", () => {
  const deleted = applyModalKeys({ mode: "normal" }, "one\ntwo\nthree\nfour", cursor, ["d", "d"]);
  expect(deleted.text).toBe("two\nthree\nfour");
  expect(deleted.state.register).toEqual({ type: "line", text: "one" });

  const repeated = applyModalKeys(deleted.state, deleted.text, { line: 1, col: 0 }, ["."]);
  expect(repeated.text).toBe("two\nfour");
  expect(repeated.state.register).toEqual({ type: "line", text: "three" });

  const counted = applyModalKeys({ mode: "normal" }, "one\ntwo\nthree\nfour", cursor, [
    "2",
    "d",
    "d",
  ]);
  const countedRepeat = applyModalKeys(counted.state, counted.text, counted.cursor, ["."]);
  expect(countedRepeat.text).toBe("");
  expect(countedRepeat.state.register).toEqual({ type: "line", text: "three\nfour" });
});

test("normal mode supports line shift operators without writing registers", () => {
  const indented = applyModalKeys(
    { mode: "normal", register: { type: "char", text: "keep" } },
    "one\ntwo\nthree",
    p(0, 1),
    [">", ">"],
  );
  expect(indented.text).toBe("  one\ntwo\nthree");
  expect(indented.cursor).toEqual(p(0, 1));
  expect(indented.state.mode).toBe("normal");
  expect(indented.state.register).toEqual({ type: "char", text: "keep" });

  const counted = applyModalKeys({ mode: "normal" }, "one\ntwo\nthree", p(0, 0), ["3", ">", ">"]);
  expect(counted.text).toBe("  one\n  two\n  three");

  const dedented = applyModalKeys({ mode: "normal" }, "  one\n two\nthree", p(0, 2), [
    "2",
    "<",
    "<",
  ]);
  expect(dedented.text).toBe("one\ntwo\nthree");
  expect(dedented.cursor).toEqual(p(0, 2));

  const noOp = applyModalKeys(
    { mode: "normal", register: { type: "line", text: "old" } },
    "one",
    p(0, 0),
    ["<", "<"],
  );
  expect(noOp.text).toBe("one");
  expect(noOp.state.register).toEqual({ type: "line", text: "old" });
});

test("normal dot repeat applies line shift commands", () => {
  const shifted = applyModalKeys({ mode: "normal" }, "one\ntwo", cursor, [">", ">"]);
  expect(shifted.text).toBe("  one\ntwo");

  const repeated = applyModalKeys(shifted.state, shifted.text, p(1, 0), ["."]);
  expect(repeated.text).toBe("  one\n  two");

  const counted = applyModalKeys({ mode: "normal" }, "one\ntwo\nthree", cursor, ["2", ">", ">"]);
  const countedRepeat = applyModalKeys(counted.state, counted.text, p(1, 0), ["."]);
  expect(countedRepeat.text).toBe("  one\n    two\n  three");
});

test("normal case operators transform motions, text objects, and lines without registers", () => {
  const lowered = applyModalKeys(
    { mode: "normal", register: { type: "char", text: "keep" } },
    "AbC Def",
    p(0, 0),
    ["g", "u", "w"],
  );
  expect(lowered.text).toBe("abc Def");
  expect(lowered.cursor).toEqual(p(0, 0));
  expect(lowered.state.mode).toBe("normal");
  expect(lowered.state.register).toEqual({ type: "char", text: "keep" });

  const uppered = applyModalKeys({ mode: "normal" }, "foo bar", p(0, 5), ["g", "U", "i", "w"]);
  expect(uppered.text).toBe("foo BAR");
  expect(uppered.cursor).toEqual(p(0, 4));

  const toggledLine = applyModalKeys(
    { mode: "normal", register: { type: "line", text: "old" } },
    "AbC\nDeF",
    p(0, 1),
    ["g", "~", "g", "~"],
  );
  expect(toggledLine.text).toBe("aBc\nDeF");
  expect(toggledLine.cursor).toEqual(p(0, 0));
  expect(toggledLine.state.register).toEqual({ type: "line", text: "old" });
});

test("normal case operators no-op safely and dot-repeat successful changes", () => {
  const changed = applyModalKeys({ mode: "normal" }, "AbC DeF", p(0, 0), ["g", "u", "w"]);
  const repeated = applyModalKeys(changed.state, changed.text, p(0, 4), ["."]);
  expect(repeated.text).toBe("abc def");

  const missing = applyModalKeys(
    { mode: "normal", register: { type: "char", text: "keep" } },
    "abc",
    p(0, 3),
    ["g", "u", "w"],
  );
  expect(missing.text).toBe("abc");
  expect(missing.cursor).toEqual(p(0, 3));
  expect(missing.state.register).toEqual({ type: "char", text: "keep" });
  expect(missing.state.pending).toBeUndefined();

  const unsupported = applyModalKeys({ mode: "normal" }, "a:b", p(0, 0), ["g", "u", "f"]);
  expect(unsupported.text).toBe("a:b");
  expect(unsupported.state.pending).toBeUndefined();
});

test("normal dot repeat applies line change commands and keeps no-ops from replacing repeat", () => {
  const changed = applyModalKeys({ mode: "normal" }, "one\ntwo\nthree", cursor, ["c", "c", "\x1b"]);
  expect(changed.text).toBe("\ntwo\nthree");
  expect(changed.state.mode).toBe("normal");

  const noNumber = applyModalKeys(changed.state, changed.text, { line: 1, col: 0 }, ["\x01"]);
  expect(noNumber.text).toBe("\ntwo\nthree");

  const repeated = applyModalKeys(noNumber.state, noNumber.text, noNumber.cursor, ["."]);
  expect(repeated.text).toBe("\n\nthree");
  expect(repeated.state.mode).toBe("insert");
  expect(repeated.state.register).toEqual({ type: "line", text: "two" });
});

test("configured keymaps support operator character search targets", () => {
  const keymapOptions: ModalOptions = {
    ...options,
    keymap: {
      ...DEFAULT_VIM_KEYMAP,
      operators: { ...DEFAULT_VIM_KEYMAP.operators, change: ["zz"], yank: ["xx"] },
      commands: {
        ...DEFAULT_VIM_KEYMAP.commands,
        findCharForward: ["gf"],
        tillCharForward: ["gt"],
      },
    },
  };

  const changed = applyModalKeys(
    { mode: "normal" },
    "ab:c",
    p(0, 0),
    ["z", "z", "g", "t", ":"],
    keymapOptions,
  );
  expect(changed.text).toBe(":c");
  expect(changed.state.mode).toBe("insert");
  expect(changed.state.register).toEqual({ type: "char", text: "ab" });

  const yanked = applyModalKeys(
    { mode: "normal" },
    "a:b:c",
    p(0, 0),
    ["x", "x", "g", "f", ":"],
    keymapOptions,
  );
  expect(yanked.text).toBe("a:b:c");
  expect(yanked.state.register).toEqual({ type: "char", text: "a:" });

  const inserted = handleModalInput(
    { mode: "insert" },
    { text: "a:b", lines: ["a:b"], cursor: p(0, 0) },
    keymapOptions,
    "g",
  );
  expect(inserted.state.mode).toBe("insert");
  expect(inserted.effects).toEqual([{ type: "delegate", input: "g" }]);
});

test("normal operators support character search targets", () => {
  const deleted = applyModalKeys({ mode: "normal" }, "a:b:c", p(0, 0), ["d", "f", ":"]);
  expect(deleted.text).toBe("b:c");
  expect(deleted.cursor).toEqual(p(0, 0));
  expect(deleted.state.mode).toBe("normal");
  expect(deleted.state.register).toEqual({ type: "char", text: "a:" });
  expect(deleted.state.lastCharSearch).toEqual({ command: "findCharForward", target: ":" });

  const counted = applyModalKeys({ mode: "normal" }, "a,b,c", p(0, 0), ["d", "2", "f", ","]);
  expect(counted.text).toBe("c");
  expect(counted.state.register).toEqual({ type: "char", text: "a,b," });

  const changed = applyModalKeys({ mode: "normal" }, "a:b:c", p(0, 2), ["c", "F", ":"]);
  expect(changed.text).toBe("ab:c");
  expect(changed.cursor).toEqual(p(0, 1));
  expect(changed.state.mode).toBe("insert");
  expect(changed.state.register).toEqual({ type: "char", text: ":" });

  const changedTill = applyModalKeys({ mode: "normal" }, "foo,bar", p(0, 0), ["c", "t", ","]);
  expect(changedTill.text).toBe(",bar");
  expect(changedTill.cursor).toEqual(p(0, 0));
  expect(changedTill.state.mode).toBe("insert");
  expect(changedTill.state.register).toEqual({ type: "char", text: "foo" });

  const yanked = applyModalKeys({ mode: "normal" }, "a[b]c", p(0, 3), ["y", "T", "["]);
  expect(yanked.text).toBe("a[b]c");
  expect(yanked.cursor).toEqual(p(0, 3));
  expect(yanked.state.register).toEqual({ type: "char", text: "b" });
  expect(yanked.state.lastRepeatableChange).toBeUndefined();

  const noOp = applyModalKeys(
    { mode: "normal", register: { type: "char", text: "old" } },
    "a:b",
    p(0, 2),
    ["d", "T", ":"],
  );
  expect(noOp.text).toBe("a:b");
  expect(noOp.cursor).toEqual(p(0, 2));

  const adjacentTill = applyModalKeys({ mode: "normal" }, "ab,c", p(0, 1), ["d", "t", ","]);
  expect(adjacentTill.text).toBe("a,c");
  expect(adjacentTill.state.register).toEqual({ type: "char", text: "b" });
  expect(noOp.state.register).toEqual({ type: "char", text: "old" });
});

test("normal dot repeat applies character search operator changes", () => {
  const changed = applyModalKeys({ mode: "normal" }, "a:b c:d", p(0, 0), ["d", "f", ":"]);
  const repeated = applyModalKeys(changed.state, changed.text, p(0, 2), ["."]);
  expect(repeated.text).toBe("b d");
  expect(repeated.state.register).toEqual({ type: "char", text: "c:" });
});

test("normal operators support repeated character search targets", () => {
  const searched = applyModalKeys({ mode: "normal" }, "a:b:c", p(0, 0), ["f", ":"]);
  const deleted = applyModalKeys(searched.state, searched.text, p(0, 1), ["d", ";"]);
  expect(deleted.text).toBe("ac");
  expect(deleted.state.register).toEqual({ type: "char", text: ":b:" });

  const reversed = applyModalKeys(searched.state, searched.text, p(0, 3), ["c", ","]);
  expect(reversed.text).toBe("a:c");
  expect(reversed.state.mode).toBe("insert");
  expect(reversed.state.register).toEqual({ type: "char", text: ":b" });
  expect(reversed.state.lastCharSearch).toEqual({ command: "findCharForward", target: ":" });

  const tillSearched = applyModalKeys({ mode: "normal" }, "banana apple alpha", p(0, 0), [
    "t",
    "a",
  ]);
  const tillDeleted = applyModalKeys(tillSearched.state, tillSearched.text, tillSearched.cursor, [
    "d",
    ";",
  ]);
  expect(tillDeleted.text).toBe("ana apple alpha");
});

test("normal delegated reset shortcuts return to configured startup mode", () => {
  expect(
    handleModalInput(
      { mode: "visual", pending: "d", visualAnchor: cursor },
      snapshot,
      options,
      "\r",
    ),
  ).toEqual({
    state: { mode: "insert" },
    effects: [
      { type: "terminalCursor", style: "bar" },
      { type: "invalidate" },
      { type: "delegate", input: "\r" },
    ],
  });
});

test("protected Pi shortcuts delegate from normal and visual modes", () => {
  const normal = handleModalInput({ mode: "normal", pending: "d" }, snapshot, options, "\x0c");
  expect(normal.state).toEqual({ mode: "normal" });
  expect(normal.effects).toContainEqual({ type: "delegate", input: "\x0c" });

  const ctrlShiftP = handleModalInput(
    { mode: "normal", pending: "d" },
    snapshot,
    options,
    "ctrl+shift+p",
  );
  expect(ctrlShiftP.state).toEqual({ mode: "normal" });
  expect(ctrlShiftP.effects).toContainEqual({ type: "delegate", input: "ctrl+shift+p" });

  const ctrlV = handleModalInput({ mode: "normal", pending: "d" }, snapshot, options, "\x16");
  expect(ctrlV.state).toEqual({ mode: "normal" });
  expect(ctrlV.effects).toContainEqual({ type: "delegate", input: "\x16" });

  const altVUpdate = handleModalInput({ mode: "normal", pending: "d" }, snapshot, options, altV);
  expect(altVUpdate.state).toEqual({ mode: "normal" });
  expect(altVUpdate.effects).toContainEqual({ type: "delegate", input: altV });

  const ctrlAltVUpdate = handleModalInput(
    { mode: "normal", pending: "d" },
    snapshot,
    options,
    ctrlAltV,
  );
  expect(ctrlAltVUpdate.state).toEqual({ mode: "normal" });
  expect(ctrlAltVUpdate.effects).toContainEqual({ type: "delegate", input: ctrlAltV });

  const visual = handleModalInput(
    { mode: "visual", pending: "d", visualAnchor: cursor },
    snapshot,
    options,
    "\x14",
  );
  expect(visual.state).toEqual({ mode: "visual", visualAnchor: cursor });
  expect(visual.effects).toContainEqual({ type: "delegate", input: "\x14" });

  const visualCtrlV = handleModalInput(
    { mode: "visual", pending: "d", visualAnchor: cursor },
    snapshot,
    options,
    "\x16",
  );
  expect(visualCtrlV.state).toEqual({ mode: "visual", visualAnchor: cursor });
  expect(visualCtrlV.effects).toContainEqual({ type: "delegate", input: "\x16" });

  const visualAltV = handleModalInput(
    { mode: "visual", pending: "d", visualAnchor: cursor },
    snapshot,
    options,
    altV,
  );
  expect(visualAltV.state).toEqual({ mode: "visual", visualAnchor: cursor });
  expect(visualAltV.effects).toContainEqual({ type: "delegate", input: altV });

  const visualCtrlAltV = handleModalInput(
    { mode: "visual", pending: "d", visualAnchor: cursor },
    snapshot,
    options,
    ctrlAltV,
  );
  expect(visualCtrlAltV.state).toEqual({ mode: "visual", visualAnchor: cursor });
  expect(visualCtrlAltV.effects).toContainEqual({ type: "delegate", input: ctrlAltV });
});
