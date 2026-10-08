import { expect, test } from "vitest";
import { handleModalInputWithOptions as handleModalInput } from "../modal-test-helper.ts";
import { p, cursor, options, snapshot, applyModalKeys } from "./shared.ts";

test("normal named register prefix yanks current line", () => {
  const prefix = handleModalInput({ mode: "normal" }, snapshot, options, '"');
  expect(prefix.state).toEqual({ mode: "normal", pendingRegister: "awaitingSlot" });

  const targeted = handleModalInput(prefix.state, snapshot, options, "a");
  expect(targeted.state).toEqual({
    mode: "normal",
    pendingRegister: { kind: "named", slot: "a", append: false },
  });

  const pending = handleModalInput(targeted.state, snapshot, options, "y");
  expect(pending.state).toEqual({
    mode: "normal",
    pending: "y",
    pendingRegister: { kind: "named", slot: "a", append: false },
  });

  const yanked = handleModalInput(pending.state, snapshot, options, "y");
  expect(yanked.state).toEqual({
    mode: "normal",
    register: { type: "line", text: "abc" },
    namedRegisters: { a: { type: "line", text: "abc" } },
  });
});

test("normal named register prefix writes deletes and operator yanks", () => {
  const deletedLine = handleModalInput(
    {
      mode: "normal",
      pending: "d",
      pendingRegister: { kind: "named", slot: "a", append: false },
    },
    { text: "one\ntwo", lines: ["one", "two"], cursor },
    options,
    "d",
  );
  expect(deletedLine.state.namedRegisters?.a).toEqual({ type: "line", text: "one" });
  expect(deletedLine.state.register).toEqual({ type: "line", text: "one" });

  const deletedChar = handleModalInput(
    { mode: "normal", pendingRegister: { kind: "named", slot: "b", append: false } },
    snapshot,
    options,
    "x",
  );
  expect(deletedChar.state.namedRegisters?.b).toEqual({ type: "char", text: "a" });
  expect(deletedChar.effects[0]).toEqual({
    type: "edit",
    result: { text: "bc", cursor, register: { type: "char", text: "a" }, changed: true },
  });

  const yankedWord = handleModalInput(
    {
      mode: "normal",
      pending: "y",
      pendingRegister: { kind: "named", slot: "c", append: false },
    },
    { text: "abc def", lines: ["abc def"], cursor },
    options,
    "w",
  );
  expect(yankedWord.state.namedRegisters?.c).toEqual({ type: "char", text: "abc " });
  expect(yankedWord.effects).toEqual([{ type: "invalidate" }]);
});

test("backtick text objects work after operators", () => {
  const inner = applyModalKeys({ mode: "normal" }, "run `ls -l` now", p(0, 6), ["d", "i", "`"]);
  expect(inner.text).toBe("run `` now");
  const around = applyModalKeys({ mode: "normal" }, "run `ls` now", p(0, 5), ["c", "a", "`"]);
  expect(around.text).toBe("run now");
  expect(around.state.mode).toBe("insert");
});

test("counted paste puts count copies", () => {
  const charPaste = applyModalKeys(
    { mode: "normal", register: { type: "char", text: "ab" } },
    "-",
    p(0, 0),
    ["3", "p"],
  );
  expect(charPaste.text).toBe("-ababab");
  expect(charPaste.cursor).toEqual(p(0, 6));

  const linePaste = applyModalKeys(
    { mode: "normal", register: { type: "line", text: "x" } },
    "a\nb",
    p(0, 0),
    ["2", "P"],
  );
  expect(linePaste.text).toBe("x\nx\na\nb");

  const namedPaste = applyModalKeys(
    { mode: "normal", namedRegisters: { a: { type: "char", text: "x" } } },
    "-",
    p(0, 0),
    ['"', "a", "3", "p"],
  );
  expect(namedPaste.text).toBe("-xxx");
});

test("register prefixes reach counts and operator targets", () => {
  const named = (state: { namedRegisters?: Record<string, unknown> }) => state.namedRegisters?.a;
  const textObject = applyModalKeys({ mode: "normal" }, "alpha beta", p(0, 7), [
    '"',
    "a",
    "d",
    "i",
    "w",
  ]);
  expect(textObject.text).toBe("alpha ");
  expect(named(textObject.state)).toEqual({ type: "char", text: "beta" });

  const counted = applyModalKeys({ mode: "normal" }, "one\ntwo\nthree", p(0, 0), [
    '"',
    "a",
    "2",
    "y",
    "y",
  ]);
  expect(named(counted.state)).toEqual({ type: "line", text: "one\ntwo" });

  const charSearch = applyModalKeys({ mode: "normal" }, "ab,c", p(0, 0), ['"', "a", "d", "t", ","]);
  expect(charSearch.text).toBe(",c");
  expect(named(charSearch.state)).toEqual({ type: "char", text: "ab" });

  const countedChar = applyModalKeys({ mode: "normal" }, "abc", p(0, 0), ['"', "a", "2", "x"]);
  expect(countedChar.text).toBe("c");
  expect(named(countedChar.state)).toEqual({ type: "char", text: "ab" });

  const motion = applyModalKeys({ mode: "normal" }, "one\ntwo", p(0, 0), ['"', "a", "j"]);
  expect(motion.cursor).toEqual(p(1, 0));
  expect(motion.state.pendingRegister).toBeUndefined();

  const caseOperator = applyModalKeys({ mode: "normal" }, "abc def", p(0, 0), [
    '"',
    "a",
    "g",
    "U",
    "i",
    "w",
  ]);
  expect(caseOperator.text).toBe("ABC def");
  expect(caseOperator.state.pendingRegister).toBeUndefined();
  expect(caseOperator.state.namedRegisters?.a).toBeUndefined();

  const ignoredThenYank = applyModalKeys(caseOperator.state, "abc", p(0, 0), ["y", "y"]);
  expect(ignoredThenYank.state.namedRegisters?.a).toBeUndefined();
  expect(ignoredThenYank.state.register).toEqual({ type: "line", text: "abc" });

  const visualYank = applyModalKeys({ mode: "normal" }, "abc def", p(0, 0), [
    "v",
    "e",
    '"',
    "a",
    "y",
  ]);
  expect(visualYank.state.namedRegisters?.a).toEqual({ type: "char", text: "abc" });

  const visualMotion = applyModalKeys({ mode: "normal" }, "abc def", p(0, 0), [
    "v",
    '"',
    "a",
    "e",
    "y",
  ]);
  expect(visualMotion.state.namedRegisters?.a).toBeUndefined();
  expect(visualMotion.state.register).toEqual({ type: "char", text: "abc" });
});

test("named register paste reads named target and leaves unnamed paste unchanged", () => {
  const state = {
    mode: "normal" as const,
    register: { type: "char" as const, text: "U" },
    namedRegisters: { a: { type: "char" as const, text: "A" } },
  };

  const namedPaste = handleModalInput(
    { ...state, pendingRegister: { kind: "named", slot: "a", append: false } },
    { text: "xy", lines: ["xy"], cursor: { line: 0, col: 0 } },
    options,
    "p",
  );
  expect(namedPaste.effects[0]).toEqual({
    type: "edit",
    result: { text: "xAy", cursor: { line: 0, col: 1 }, changed: true },
  });

  const unnamedPaste = handleModalInput(
    namedPaste.state,
    { text: "xy", lines: ["xy"], cursor: { line: 0, col: 0 } },
    options,
    "p",
  );
  expect(unnamedPaste.effects[0]).toEqual({
    type: "edit",
    result: { text: "xUy", cursor: { line: 0, col: 1 }, changed: true },
  });
});

test("named line register pastes before current line and missing paste no-ops", () => {
  const pasted = handleModalInput(
    {
      mode: "normal",
      register: { type: "line", text: "unnamed" },
      namedRegisters: { a: { type: "line", text: "alpha\nbeta" } },
      pendingRegister: { kind: "named", slot: "a", append: true },
    },
    { text: "one\ntwo", lines: ["one", "two"], cursor: { line: 1, col: 0 } },
    options,
    "P",
  );
  expect(pasted.effects[0]).toEqual({
    type: "edit",
    result: {
      text: "one\nalpha\nbeta\ntwo",
      cursor: { line: 1, col: 0 },
      changed: true,
    },
  });

  const missing = handleModalInput(
    { mode: "normal", pendingRegister: { kind: "named", slot: "z", append: false } },
    snapshot,
    options,
    "p",
  );
  expect(missing.state).toEqual({ mode: "normal" });
  expect(missing.effects[0]).toEqual({
    type: "edit",
    result: { text: "abc", cursor, changed: false },
  });
});

test("register prefix target is safe and one-shot", () => {
  const invalid = handleModalInput(
    { mode: "normal", pendingRegister: "awaitingSlot", register: { type: "char", text: "x" } },
    snapshot,
    options,
    "1",
  );
  expect(invalid.state).toEqual({ mode: "normal", register: { type: "char", text: "x" } });

  const unsupported = handleModalInput(
    {
      mode: "normal",
      pendingRegister: { kind: "named", slot: "a", append: false },
      namedRegisters: { a: { type: "line", text: "keep" } },
    },
    snapshot,
    options,
    "q",
  );
  expect(unsupported.state).toEqual({
    mode: "normal",
    namedRegisters: { a: { type: "line", text: "keep" } },
    pendingMacro: "record",
  });

  const appended = handleModalInput(
    {
      mode: "normal",
      pending: "y",
      namedRegisters: { a: { type: "line", text: "one" } },
      pendingRegister: { kind: "named", slot: "a", append: true },
    },
    { text: "two", lines: ["two"], cursor },
    options,
    "y",
  );
  expect(appended.state.namedRegisters?.a).toEqual({ type: "line", text: "one\ntwo" });
  expect(appended.state.register).toEqual({ type: "line", text: "two" });
  expect(appended.state.pendingRegister).toBeUndefined();
});

test("empty characterwise visual yank preserves previous register", () => {
  const result = handleModalInput(
    {
      mode: "visual",
      visualAnchor: cursor,
      register: { type: "char", text: "keep" },
    },
    { text: "", lines: [""], cursor },
    options,
    "y",
  );

  expect(result.state).toEqual({
    mode: "normal",
    register: { type: "char", text: "keep" },
    lastVisualSelection: {
      mode: "visual",
      anchor: cursor,
      cursor: cursor,
      text: "",
    },
  });
});

test("normal explicit unnamed, black-hole, clipboard, and unsupported targets", () => {
  const yanked = applyModalKeys({ mode: "normal" }, "one\ntwo", p(0, 0), ['"', '"', "y", "y"]);
  expect(yanked.state.register).toEqual({ type: "line", text: "one" });
  expect(yanked.state.namedRegisters).toBeUndefined();
  expect(yanked.state.clipboardRegisters).toBeUndefined();

  const deleted = applyModalKeys(
    { mode: "normal", register: { type: "char", text: "keep" } },
    "one\ntwo",
    p(0, 0),
    ['"', "_", "d", "d"],
  );
  expect(deleted.text).toBe("two");
  expect(deleted.state.register).toEqual({ type: "char", text: "keep" });

  const copied = applyModalKeys({ mode: "normal" }, "one\ntwo", p(0, 0), ['"', "+", "y", "y"]);
  expect(copied.state.register).toEqual({ type: "line", text: "one" });
  expect(copied.state.clipboardRegisters?.["+"]).toEqual({ type: "line", text: "one" });

  const invalid = applyModalKeys({ mode: "normal" }, "one", p(0, 0), ['"', "="]);
  expect(invalid.text).toBe("one");
  expect(invalid.cursor).toEqual(p(0, 0));
  expect(invalid.state.pendingRegister).toBeUndefined();
});

test("normal clipboard paste requests host clipboard read with mirror fallback", () => {
  const pasted = applyModalKeys(
    {
      mode: "normal",
      clipboardRegisters: { "+": { type: "line", text: "clip" } },
    },
    "one\ntwo",
    p(1, 0),
    ['"', "+", "P"],
  );
  expect(pasted.text).toBe("one\ntwo");
  expect(pasted.effects).toContainEqual({
    type: "readClipboard",
    register: "+",
    placement: "before",
    fallback: { type: "line", text: "clip" },
  });

  const missing = applyModalKeys({ mode: "normal" }, "one", p(0, 0), ['"', "+", "p"]);
  expect(missing.text).toBe("one");
  expect(missing.cursor).toEqual(p(0, 0));
  expect(missing.effects).toContainEqual({
    type: "readClipboard",
    register: "+",
    placement: "after",
    fallback: undefined,
  });
});

test("visual special registers write, discard, and paste through existing semantics", () => {
  const yanked = applyModalKeys({ mode: "visual", visualAnchor: p(0, 0) }, "abc", p(0, 1), [
    '"',
    "+",
    "y",
  ]);
  expect(yanked.state.mode).toBe("normal");
  expect(yanked.state.clipboardRegisters?.["+"]).toEqual({ type: "char", text: "ab" });

  const deleted = applyModalKeys(
    {
      mode: "visualLine",
      visualAnchor: p(0, 0),
      register: { type: "char", text: "keep" },
    },
    "one\ntwo",
    p(1, 0),
    ['"', "_", "d"],
  );
  expect(deleted.text).toBe("");
  expect(deleted.state.register).toEqual({ type: "char", text: "keep" });

  const pasted = applyModalKeys(
    {
      mode: "visualLine",
      visualAnchor: p(0, 0),
      register: { type: "line", text: "new" },
    },
    "one\ntwo",
    p(1, 0),
    ['"', '"', "p"],
  );
  expect(pasted.text).toBe("new");
});

test("Ex special register operands write, discard, put, and reject quoted forms", () => {
  const yanked = applyModalKeys({ mode: "normal" }, "one\ntwo", p(0, 0), [
    ":",
    "%",
    "y",
    "a",
    "n",
    "k",
    " ",
    "+",
    "\r",
  ]);
  expect(yanked.state.clipboardRegisters?.["+"]).toEqual({ type: "line", text: "one\ntwo" });
  expect(yanked.state.exMessage).toEqual({ kind: "success", text: "2 lines yanked" });

  const deleted = applyModalKeys(
    { mode: "normal", register: { type: "char", text: "keep" } },
    "one\ntwo",
    p(0, 0),
    [":", "2", "d", "e", "l", "e", "t", "e", " ", "_", "\r"],
  );
  expect(deleted.text).toBe("one");
  expect(deleted.state.register).toEqual({ type: "char", text: "keep" });

  const put = applyModalKeys(
    {
      mode: "normal",
      clipboardRegisters: { "*": { type: "line", text: "clip" } },
    },
    "one",
    p(0, 0),
    [":", "p", "u", "t", " ", "*", "\r"],
  );
  expect(put.text).toBe("one\nclip");

  const rejected = applyModalKeys({ mode: "normal" }, "one", p(0, 0), [
    ":",
    "y",
    "a",
    "n",
    "k",
    " ",
    '"',
    "+",
    "\r",
  ]);
  expect(rejected.text).toBe("one");
  expect(rejected.state.exMessage?.kind).toBe("error");
});
