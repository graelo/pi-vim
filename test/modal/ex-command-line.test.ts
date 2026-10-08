import { expect, test } from "vitest";
import type { ModalState } from "../../src/modal/types.ts";
import { handleModalInputWithOptions as handleModalInput } from "../modal-test-helper.ts";
import { p, cursor, options, snapshot, superJ, escapeOptions, applyModalKeys } from "./shared.ts";

test("normal entry opens Ex command-line and cancel closes it", () => {
  const opened = handleModalInput({ mode: "normal" }, snapshot, options, ":");
  expect(opened.state.pendingEx).toMatchObject({ command: "", sourceMode: "normal" });

  const cancelled = handleModalInput(opened.state, snapshot, options, "\x1b");
  expect(cancelled.state.pendingEx).toBeUndefined();
  expect(cancelled.state.mode).toBe("normal");
});

test("count before Ex entry prefills a concrete clamped line range", () => {
  const state = applyModalKeys({ mode: "normal" }, "one\ntwo\nthree", p(1, 0), ["3", ":"]).state;
  expect(state.pendingEx).toMatchObject({ command: "2,3", sourceMode: "normal" });
});

test("visual entry captures selected lines and cancel restores visual selection", () => {
  const opened = handleModalInput(
    { mode: "visual", visualAnchor: p(0, 1) },
    { text: "one\ntwo", lines: ["one", "two"], cursor: p(1, 2) },
    options,
    ":",
  );
  expect(opened.state.pendingEx).toMatchObject({
    command: "'<,'>",
    sourceMode: "visual",
    visualAnchor: p(0, 1),
    visualCursor: p(1, 2),
    visualRange: { startLine: 0, endLine: 1 },
  });

  const cancelled = handleModalInput(opened.state, snapshot, options, "\x1b");
  expect(cancelled.state.mode).toBe("visual");
  expect(cancelled.state.visualAnchor).toEqual(p(0, 1));
  expect(cancelled.state.pendingEx).toBeUndefined();
});

test("pending Ex command cancels and delegates Ctrl-C/Ctrl-G", () => {
  for (const key of ["\x03", "\x07"]) {
    const update = handleModalInput(
      { mode: "normal", pendingEx: { command: "s/a/b/", sourceMode: "normal" } },
      snapshot,
      options,
      key,
    );
    expect(update.state.pendingEx).toBeUndefined();
    expect(update.state.mode).toBe("insert");
    expect(update.effects).toContainEqual({ type: "delegate", input: key });
  }
});

test("configured escape alias cancels pending Ex command", () => {
  const update = handleModalInput(
    { mode: "normal", pendingEx: { command: "s/a/b/", sourceMode: "normal" } },
    snapshot,
    escapeOptions,
    superJ,
  );
  expect(update.state.pendingEx).toBeUndefined();
  expect(update.state.mode).toBe("normal");
  expect(update.effects).toEqual([{ type: "invalidate" }]);
});

test("Ex input edits command text, executes substitution, and reports success", () => {
  const result = applyModalKeys({ mode: "normal" }, "old old\nold", p(0, 0), [
    ":",
    "%",
    "s",
    "/",
    "o",
    "l",
    "d",
    "/",
    "n",
    "e",
    "w",
    "/",
    "g",
    "\r",
  ]);
  expect(result.text).toBe("new new\nnew");
  expect(result.cursor).toEqual(p(0, 0));
  expect(result.state.pendingEx).toBeUndefined();
  expect(result.state.exMessage).toEqual({ kind: "success", text: "3 substitutions" });
});

test("Tab completes a single matching Ex command name", () => {
  const result = applyModalKeys({ mode: "normal" }, "abc", p(0, 0), [":", "h", "e", "l", "\t"]);
  expect(result.state.pendingEx?.command).toBe("help");
  expect(result.state.pendingEx?.cursor).toBe(4);
  expect(result.text).toBe("abc");
});

test("Up/Down navigates Ex command suggestions when multiple exist", () => {
  const result = applyModalKeys({ mode: "normal" }, "abc", p(0, 0), [":", "h", "\x1b[B"]);
  expect(result.state.pendingEx?.selectedSuggestion).toBe(0);
  expect(result.text).toBe("abc");
});

test("Tab accepts selected suggestion when navigating", () => {
  const result = applyModalKeys({ mode: "normal" }, "abc", p(0, 0), [":", "h", "\x1b[B", "\t"]);
  expect(result.state.pendingEx?.command).toBe("help");
  expect(result.state.pendingEx?.cursor).toBe(4);
  expect(result.text).toBe("abc");
});

test("Tab completes Ex command word at the cursor position inside a range prefix", () => {
  const result = applyModalKeys({ mode: "normal" }, "abc", p(0, 0), [":", "%", "s", "\t"]);
  expect(result.state.pendingEx?.command).toBe("%s");
  expect(result.state.pendingEx?.cursor).toBe(2);
  expect(result.text).toBe("abc");
});

test("visual-source Ex Tab completion preserves visual source state", () => {
  const opened = handleModalInput(
    { mode: "visual", visualAnchor: p(0, 1) },
    { text: "one\ntwo", lines: ["one", "two"], cursor: p(1, 2) },
    options,
    ":",
  );
  let state = opened.state;
  state = handleModalInput(
    state,
    { text: "one\ntwo", lines: ["one", "two"], cursor: p(1, 2) },
    options,
    "h",
  ).state;
  const result = handleModalInput(
    state,
    { text: "one\ntwo", lines: ["one", "two"], cursor: p(1, 2) },
    options,
    "\t",
  );
  expect(result.state.pendingEx?.command).toBe("'<,'>help");
  expect(result.state.mode).toBe("visual");
  expect(result.state.visualAnchor).toEqual(p(0, 1));
});

test("diagnostic Ex commands report info without editing state", () => {
  const initial: ModalState = {
    mode: "normal",
    register: { type: "char", text: "saved" },
    marks: { a: p(0, 1) },
    lastSearch: { query: "abc", direction: "forward" },
    searchHighlight: { query: "abc", current: p(0, 0) },
    lastRepeatableChange: { type: "command", command: "deleteChar" },
  };
  const result = applyModalKeys(initial, "abc", p(0, 1), [
    ":",
    "k",
    "e",
    "y",
    "m",
    "a",
    "p",
    " ",
    "r",
    "e",
    "d",
    "o",
    "\r",
  ]);

  expect(result.text).toBe("abc");
  expect(result.cursor).toEqual(p(0, 1));
  expect(result.state.register).toEqual(initial.register);
  expect(result.state.marks).toEqual(initial.marks);
  expect(result.state.lastSearch).toEqual(initial.lastSearch);
  expect(result.state.searchHighlight).toEqual(initial.searchHighlight);
  expect(result.state.lastRepeatableChange).toEqual(initial.lastRepeatableChange);
  expect(result.state.exMessage).toBeUndefined();
  expect(result.state.helpPopup?.title).toBe(":keymap redo");
  expect(result.state.helpPopup?.lines.join("\n")).toContain("command.redo");
});

test("visual diagnostic Ex commands preserve visual state", () => {
  const initial: ModalState = { mode: "visual", visualAnchor: p(0, 1) };
  const opened = handleModalInput(
    initial,
    { text: "one\ntwo", lines: ["one", "two"], cursor: p(1, 2) },
    options,
    ":",
  );
  let state = opened.state;
  for (const key of ["k", "e", "y", "m", "a", "p"]) {
    state = handleModalInput(
      state,
      { text: "one\ntwo", lines: ["one", "two"], cursor: p(1, 2) },
      options,
      key,
    ).state;
  }
  const result = handleModalInput(
    state,
    { text: "one\ntwo", lines: ["one", "two"], cursor: p(1, 2) },
    options,
    "\r",
  );

  expect(result.state.mode).toBe("visual");
  expect(result.state.visualAnchor).toEqual(p(0, 1));
  expect(result.effects).toContainEqual({ type: "restoreCursor", position: p(1, 2) });
  expect(result.state.exMessage).toBeUndefined();
  expect(result.state.helpPopup?.title).toBe(":keymap");
  expect(result.effects).toContainEqual({
    type: "openReadOnlyPopup",
    popup: result.state.helpPopup!,
  });
});

test("Ex errors and identical substitutions do not emit edit effects", () => {
  const error = handleModalInput(
    { mode: "normal", pendingEx: { command: "s/missing/new/", sourceMode: "normal" } },
    snapshot,
    options,
    "\r",
  );
  expect(error.effects.some((effect) => effect.type === "edit")).toBe(false);
  expect(error.state.exMessage).toEqual({ kind: "error", text: "Pattern not found: missing" });

  const identical = handleModalInput(
    { mode: "normal", pendingEx: { command: "s/abc/abc/", sourceMode: "normal" } },
    snapshot,
    options,
    "\r",
  );
  expect(identical.effects.some((effect) => effect.type === "edit")).toBe(false);
  expect(identical.state.exMessage).toEqual({ kind: "success", text: "1 substitution" });
});

test("Ex substitution clears search highlights only when text changes and preserves registers/repeat", () => {
  const state: ModalState = {
    mode: "normal",
    register: { type: "char", text: "keep" },
    lastRepeatableChange: { type: "command", command: "deleteChar" },
    searchHighlight: { query: "old", current: p(0, 0) },
    pendingEx: { command: "s/old/new/", sourceMode: "normal" },
  };
  const unchanged = handleModalInput(
    { ...state, pendingEx: { command: "s/old/old/", sourceMode: "normal" } },
    { text: "old", lines: ["old"], cursor },
    options,
    "\r",
  );
  expect(unchanged.state.searchHighlight).toEqual({ query: "old", current: p(0, 0) });

  const changed = handleModalInput(state, { text: "old", lines: ["old"], cursor }, options, "\r");
  expect(changed.state.register).toEqual({ type: "char", text: "keep" });
  expect(changed.state.lastRepeatableChange).toEqual({ type: "command", command: "deleteChar" });
  expect(changed.state.searchHighlight).toBeUndefined();
  expect(changed.state.lastExSubstitution).toMatchObject({
    pattern: "old",
    replacement: "new",
    global: false,
  });
});

test("count-only and no-error substitution flags avoid mutation and preserve repeat source", () => {
  const counted = handleModalInput(
    {
      mode: "normal",
      lastExSubstitution: {
        pattern: "old",
        replacement: "new",
        global: true,
        ignoreCase: false,
        matcherMode: "literal",
        command: "%s/old/new/g",
      },
      pendingEx: { command: "%s/foo/bar/gn", sourceMode: "normal" },
    },
    { text: "foo foo", lines: ["foo foo"], cursor },
    options,
    "\r",
  );
  expect(counted.effects.some((effect) => effect.type === "edit")).toBe(false);
  expect(counted.state.pendingEx).toBeUndefined();
  expect(counted.state.exMessage).toEqual({ kind: "success", text: "2 substitutions" });
  expect(counted.state.exHistory).toEqual(["%s/foo/bar/gn"]);
  expect(counted.state.lastExSubstitution?.pattern).toBe("old");

  const noMatch = handleModalInput(
    { mode: "normal", pendingEx: { command: "%s/missing/new/e", sourceMode: "normal" } },
    { text: "foo", lines: ["foo"], cursor },
    options,
    "\r",
  );
  expect(noMatch.state.exMessage).toEqual({ kind: "success", text: "0 substitutions" });
  expect(noMatch.state.pendingEx).toBeUndefined();
});

test("repeat substitution applies last applied substitution semantics", () => {
  const applied = applyModalKeys({ mode: "normal" }, "foo foo", p(0, 0), [
    ":",
    "%",
    "s",
    "/",
    "f",
    "o",
    "o",
    "/",
    "b",
    "a",
    "r",
    "/",
    "g",
    "\r",
  ]);
  expect(applied.text).toBe("bar bar");

  const repeated = handleModalInput(
    { ...applied.state, pendingEx: { command: "%&", sourceMode: "normal" } },
    { text: "foo\nfoo", lines: ["foo", "foo"], cursor: p(0, 0) },
    options,
    "\r",
  );
  expect(repeated.effects).toContainEqual({
    type: "edit",
    result: { text: "bar\nbar", cursor: p(0, 0), changed: true },
  });
  expect(repeated.state.exMessage).toEqual({ kind: "success", text: "2 substitutions" });
});

test("repeat substitution without previous applied substitution is safe", () => {
  const result = handleModalInput(
    { mode: "normal", pendingEx: { command: "&", sourceMode: "normal" } },
    snapshot,
    options,
    "\r",
  );
  expect(result.effects.some((effect) => effect.type === "edit")).toBe(false);
  expect(result.state.exMessage).toEqual({ kind: "error", text: "No previous substitution" });
  expect(result.state.exHistory).toBeUndefined();
});

test("Ex history recalls and reruns successful commands", () => {
  const substituted = applyModalKeys({ mode: "normal" }, "old old", p(0, 0), [
    ":",
    "s",
    "/",
    "o",
    "l",
    "d",
    "/",
    "n",
    "e",
    "w",
    "/",
    "\r",
    ":",
    "\x1b[A",
    "\r",
  ]);

  expect(substituted.text).toBe("new new");
  expect(substituted.state.exMessage).toEqual({ kind: "success", text: "1 substitution" });
  expect(substituted.state.exHistory).toEqual(["s/old/new/"]);
});

test("Ex offset and semicolon substitution ranges apply", () => {
  const offset = applyModalKeys({ mode: "normal" }, "foo\nfoo\nfoo", p(0, 0), [
    ":",
    "2",
    ",",
    "2",
    "+",
    "1",
    "s",
    "/",
    "f",
    "o",
    "o",
    "/",
    "b",
    "a",
    "r",
    "/",
    "g",
    "\r",
  ]);
  expect(offset.text).toBe("foo\nbar\nbar");
  expect(offset.state.exMessage).toEqual({ kind: "success", text: "2 substitutions" });

  const semicolon = applyModalKeys({ mode: "normal" }, "foo\nfoo\nfoo", p(0, 0), [
    ":",
    "2",
    ";",
    ".",
    "+",
    "1",
    "s",
    "/",
    "f",
    "o",
    "o",
    "/",
    "b",
    "a",
    "z",
    "/",
    "g",
    "\r",
  ]);
  expect(semicolon.text).toBe("foo\nbaz\nbaz");
  expect(semicolon.state.exMessage).toEqual({ kind: "success", text: "2 substitutions" });
});

test("Ex register operands read write append and preserve unnamed defaults", () => {
  const deleted = handleModalInput(
    {
      mode: "normal",
      namedRegisters: { b: { type: "line", text: "keep" } },
      pendingEx: { command: "2delete a", sourceMode: "normal" },
    },
    { text: "one\ntwo\nthree", lines: ["one", "two", "three"], cursor: p(1, 0) },
    options,
    "\r",
  );
  expect(deleted.state.register).toEqual({ type: "line", text: "two" });
  expect(deleted.state.namedRegisters?.a).toEqual({ type: "line", text: "two" });
  expect(deleted.state.namedRegisters?.b).toEqual({ type: "line", text: "keep" });

  const yanked = handleModalInput(
    {
      mode: "normal",
      namedRegisters: { a: { type: "line", text: "old" } },
      pendingEx: { command: "%yank A", sourceMode: "normal" },
    },
    { text: "one\ntwo", lines: ["one", "two"], cursor: p(0, 0) },
    options,
    "\r",
  );
  expect(yanked.state.register).toEqual({ type: "line", text: "one\ntwo" });
  expect(yanked.state.namedRegisters?.a).toEqual({ type: "line", text: "old\none\ntwo" });

  const put = handleModalInput(
    {
      mode: "normal",
      register: { type: "line", text: "unnamed" },
      namedRegisters: { a: { type: "line", text: "named" } },
      pendingEx: { command: "put A", sourceMode: "normal" },
    },
    { text: "one", lines: ["one"], cursor: p(0, 0) },
    options,
    "\r",
  );
  expect(put.effects).toContainEqual({
    type: "edit",
    result: { text: "one\nnamed", cursor: p(1, 0), changed: true },
  });
  expect(put.state.namedRegisters?.a).toEqual({ type: "line", text: "named" });
});

test("Ex invalid or missing register operands are safe", () => {
  const missing = handleModalInput(
    {
      mode: "normal",
      register: { type: "line", text: "keep" },
      namedRegisters: { a: { type: "line", text: "named" } },
      pendingEx: { command: "put z", sourceMode: "normal" },
    },
    { text: "one", lines: ["one"], cursor: p(0, 0) },
    options,
    "\r",
  );
  expect(missing.effects.some((effect) => effect.type === "edit")).toBe(false);
  expect(missing.state.exMessage).toEqual({ kind: "error", text: "Register is empty" });
  expect(missing.state.register).toEqual({ type: "line", text: "keep" });
  expect(missing.state.namedRegisters?.a).toEqual({ type: "line", text: "named" });

  const invalid = handleModalInput(
    { mode: "normal", pendingEx: { command: 'delete "a', sourceMode: "normal" } },
    { text: "one", lines: ["one"], cursor: p(0, 0) },
    options,
    "\r",
  );
  expect(invalid.state.exMessage).toEqual({ kind: "error", text: "Invalid Ex register operand" });
});

test("Ex offset and semicolon line commands preserve bounded side effects", () => {
  const initial: ModalState = {
    mode: "normal",
    register: { type: "char", text: "keep" },
    lastRepeatableChange: { type: "command", command: "deleteChar" },
    searchHighlight: { query: "two", current: p(1, 0) },
  };
  const deleted = applyModalKeys(initial, "one\ntwo\nthree\nfour", p(1, 0), [
    ":",
    ".",
    ",",
    ".",
    "+",
    "1",
    "d",
    "e",
    "l",
    "e",
    "t",
    "e",
    "\r",
  ]);
  expect(deleted.text).toBe("one\nfour");
  expect(deleted.state.register).toEqual({ type: "line", text: "two\nthree" });
  expect(deleted.state.lastRepeatableChange).toEqual(initial.lastRepeatableChange);
  expect(deleted.state.searchHighlight).toBeUndefined();

  const yanked = applyModalKeys(initial, "one\ntwo\nthree\nfour", p(0, 0), [
    ":",
    "2",
    ";",
    ".",
    "+",
    "1",
    "y",
    "a",
    "n",
    "k",
    "\r",
  ]);
  expect(yanked.text).toBe("one\ntwo\nthree\nfour");
  expect(yanked.state.register).toEqual({ type: "line", text: "two\nthree" });
  expect(yanked.state.searchHighlight).toEqual(initial.searchHighlight);
});

test("Ex destination offsets preserve copy, move, and destination zero behavior", () => {
  const copied = applyModalKeys({ mode: "normal" }, "one\ntwo\nthree\nfour", p(0, 0), [
    ":",
    "2",
    "c",
    "o",
    "p",
    "y",
    "$",
    "-",
    "1",
    "\r",
  ]);
  expect(copied.text).toBe("one\ntwo\nthree\ntwo\nfour");

  const moved = applyModalKeys({ mode: "normal" }, "one\ntwo\nthree\nfour", p(0, 0), [
    ":",
    "4",
    "m",
    "o",
    "v",
    "e",
    ".",
    "+",
    "1",
    "\r",
  ]);
  expect(moved.text).toBe("one\ntwo\nfour\nthree");

  const copiedToZero = applyModalKeys({ mode: "normal" }, "one\ntwo", p(0, 0), [
    ":",
    "2",
    "t",
    "0",
    "\r",
  ]);
  expect(copiedToZero.text).toBe("two\none\ntwo");
});

test("invalid offset ranges leave state unchanged", () => {
  const initial: ModalState = {
    mode: "normal",
    register: { type: "char", text: "keep" },
    lastRepeatableChange: { type: "command", command: "deleteChar" },
    searchHighlight: { query: "one", current: p(0, 0) },
  };
  const update = applyModalKeys(initial, "one\ntwo", p(0, 0), [
    ":",
    ".",
    "+",
    "1",
    "-",
    "2",
    "d",
    "e",
    "l",
    "e",
    "t",
    "e",
    "\r",
  ]);
  expect(update.text).toBe("one\ntwo");
  expect(update.cursor).toEqual(p(0, 0));
  expect(update.state.register).toEqual(initial.register);
  expect(update.state.lastRepeatableChange).toEqual(initial.lastRepeatableChange);
  expect(update.state.searchHighlight).toEqual(initial.searchHighlight);
  expect(update.state.exMessage).toEqual({ kind: "error", text: "Invalid Ex range" });
});

test("Ex regex substitution applies with literal replacement", () => {
  const result = applyModalKeys({ mode: "normal" }, "TODO FIXME", p(0, 0), [
    ":",
    "%",
    "s",
    "/",
    "T",
    "O",
    "D",
    "O",
    "|",
    "F",
    "I",
    "X",
    "M",
    "E",
    "/",
    "&",
    "-",
    "$",
    "1",
    "-",
    "\\",
    "1",
    "/",
    "g",
    "r",
    "\r",
  ]);

  expect(result.text).toBe("&-$1-\\1 &-$1-\\1");
  expect(result.state.exMessage).toEqual({ kind: "success", text: "2 substitutions" });
});

test("Ex command-line cursor edits command text without touching prompt", () => {
  const result = applyModalKeys({ mode: "normal" }, "prompt", p(0, 0), [
    ":",
    "d",
    "e",
    "l",
    "x",
    "e",
    "t",
    "e",
    "\x1b[D",
    "\x1b[D",
    "\x1b[D",
    "\x1b[D",
    "\x1b[3~",
    "\x1b[H",
    "2",
  ]);
  expect(result.text).toBe("prompt");
  expect(result.state.pendingEx?.command).toBe("2delete");
  expect(result.state.pendingEx?.cursor).toBe(1);
});

test("Ex command-line word movement and deletion are bounded", () => {
  const state = applyModalKeys({ mode: "normal" }, "prompt", p(0, 0), [
    ":",
    "2",
    ",",
    "4",
    "d",
    "e",
    "l",
    "e",
    "t",
    "e",
    " ",
    "a",
    "\x1bb",
    "\x17",
  ]).state;
  expect(state.pendingEx?.command).toBe("2,4a");
  expect(state.pendingEx?.cursor).toBe(3);
});

test("Ex history recall moves command cursor to end", () => {
  const substituted = applyModalKeys({ mode: "normal" }, "old", p(0, 0), [
    ":",
    "s",
    "/",
    "o",
    "l",
    "d",
    "/",
    "n",
    "e",
    "w",
    "/",
    "\r",
    ":",
    "x",
    "\x1b[A",
  ]);
  expect(substituted.state.pendingEx?.command).toBe("s/old/new/");
  expect(substituted.state.pendingEx?.cursor).toBe("s/old/new/".length);
});

test("transient Ex message clears on next handled input", () => {
  const update = handleModalInput(
    { mode: "normal", exMessage: { kind: "error", text: "E" } },
    snapshot,
    options,
    "h",
  );
  expect(update.state.exMessage).toBeUndefined();
});

test("bare numeric line jump moves cursor without editing text", () => {
  const result = applyModalKeys({ mode: "normal" }, "one\ntwo\nthree", p(0, 1), [":", "3", "\r"]);
  expect(result.text).toBe("one\ntwo\nthree");
  expect(result.cursor).toEqual(p(2, 1));
  expect(result.state.pendingEx).toBeUndefined();
  expect(result.state.mode).toBe("normal");
  expect(result.state.exMessage).toEqual({ kind: "success", text: "line 3" });
});

test("current-line and last-line address jumps move cursor", () => {
  const dotResult = applyModalKeys({ mode: "normal" }, "a\nb\nc", p(1, 0), [":", ".", "\r"]);
  expect(dotResult.cursor).toEqual(p(1, 0));
  expect(dotResult.state.exMessage).toEqual({ kind: "success", text: "line 2" });

  const dollarResult = applyModalKeys({ mode: "normal" }, "a\nb\nc", p(0, 0), [":", "$", "\r"]);
  expect(dollarResult.cursor).toEqual(p(2, 0));
  expect(dollarResult.state.exMessage).toEqual({ kind: "success", text: "line 3" });
});

test("line jump clamps column to target line length", () => {
  const result = applyModalKeys({ mode: "normal" }, "long line\nshort", p(0, 8), [":", "2", "\r"]);
  expect(result.cursor).toEqual(p(1, 5));
});

test("line jump preserves registers, marks, search, macros, and dot-repeat", () => {
  const initial: ModalState = {
    mode: "normal",
    register: { type: "char", text: "saved" },
    marks: { a: p(0, 1) },
    lastSearch: { query: "abc", direction: "forward" },
    searchHighlight: { query: "abc", current: p(0, 0) },
    lastRepeatableChange: { type: "command", command: "deleteChar" },
  };
  const result = applyModalKeys(initial, "abc\ndef", p(0, 1), [":", "2", "\r"]);
  expect(result.text).toBe("abc\ndef");
  expect(result.state.register).toEqual(initial.register);
  expect(result.state.marks).toEqual(initial.marks);
  expect(result.state.lastSearch).toEqual(initial.lastSearch);
  expect(result.state.searchHighlight).toEqual(initial.searchHighlight);
  expect(result.state.lastRepeatableChange).toEqual(initial.lastRepeatableChange);
});

test("commandless range rejects without editing text or cursor", () => {
  const percentResult = applyModalKeys({ mode: "normal" }, "a\nb\nc", p(1, 0), [":", "%", "\r"]);
  expect(percentResult.text).toBe("a\nb\nc");
  expect(percentResult.cursor).toEqual(p(1, 0));
  expect(percentResult.state.exMessage).toEqual({
    kind: "error",
    text: "Unsupported Ex command",
  });

  const commaResult = applyModalKeys({ mode: "normal" }, "a\nb\nc", p(1, 0), [
    ":",
    "2",
    ",",
    "3",
    "\r",
  ]);
  expect(commaResult.text).toBe("a\nb\nc");
  expect(commaResult.cursor).toEqual(p(1, 0));
  expect(commaResult.state.exMessage).toEqual({ kind: "error", text: "Unsupported Ex command" });
});

test("visual-source line jump exits visual mode to normal mode", () => {
  const initial: ModalState = {
    mode: "visual",
    visualAnchor: p(0, 1),
  };
  const opened = handleModalInput(
    initial,
    { text: "one\ntwo\nthree", lines: ["one", "two", "three"], cursor: p(1, 2) },
    options,
    ":",
  );
  const typeReturn = handleModalInput(
    opened.state,
    { text: "one\ntwo\nthree", lines: ["one", "two", "three"], cursor: p(1, 2) },
    options,
    "3",
  );
  const result = handleModalInput(
    typeReturn.state,
    { text: "one\ntwo\nthree", lines: ["one", "two", "three"], cursor: p(1, 2) },
    options,
    "\r",
  );
  expect(result.state.mode).toBe("normal");
  expect(result.state.visualAnchor).toBeUndefined();
});

test(":q emits shutdown without editing prompt text or mutating editing state", () => {
  const initial: ModalState = {
    mode: "normal",
    register: { type: "char", text: "saved" },
    namedRegisters: { a: { type: "line", text: "line" } },
    marks: { a: p(0, 1) },
    lastSearch: { query: "abc", direction: "forward" },
    searchHighlight: { query: "abc", current: p(0, 0) },
    lastRepeatableChange: { type: "command", command: "deleteChar" },
    messageHistory: [{ kind: "info", text: "kept" }],
  };
  const result = applyModalKeys(initial, "hello world", p(0, 5), [":", "q", "\r"]);
  expect(result.text).toBe("hello world");
  expect(result.cursor).toEqual(p(0, 5));
  expect(result.state.mode).toBe("normal");
  expect(result.state.pendingEx).toBeUndefined();
  expect(result.effects).toContainEqual({ type: "shutdown" });
  expect(result.state.register).toEqual(initial.register);
  expect(result.state.namedRegisters).toEqual(initial.namedRegisters);
  expect(result.state.marks).toEqual(initial.marks);
  expect(result.state.lastSearch).toEqual(initial.lastSearch);
  expect(result.state.searchHighlight).toEqual(initial.searchHighlight);
  expect(result.state.lastRepeatableChange).toEqual(initial.lastRepeatableChange);
  expect(result.state.messageHistory).toEqual(initial.messageHistory);
});

test(":quit emits shutdown without editing prompt text or mutating editing state", () => {
  const initial: ModalState = {
    mode: "normal",
    register: { type: "char", text: "saved" },
    marks: { a: p(0, 1) },
  };
  const result = applyModalKeys(initial, "old text", p(0, 3), [":", "q", "u", "i", "t", "\r"]);
  expect(result.text).toBe("old text");
  expect(result.cursor).toEqual(p(0, 3));
  expect(result.state.mode).toBe("normal");
  expect(result.state.pendingEx).toBeUndefined();
  expect(result.effects).toContainEqual({ type: "shutdown" });
  expect(result.state.register).toEqual(initial.register);
  expect(result.state.marks).toEqual(initial.marks);
});

test(":quit! is rejected without emitting shutdown", () => {
  const result = applyModalKeys({ mode: "normal" }, "hello", p(0, 0), [
    ":",
    "q",
    "u",
    "i",
    "t",
    "!",
    "\r",
  ]);
  expect(result.text).toBe("hello");
  expect(result.state.pendingEx).toBeUndefined();
  expect(result.state.exMessage).toEqual({
    kind: "error",
    text: "Unexpected Ex command arguments",
  });
  expect(result.effects).not.toContainEqual({ type: "shutdown" });
});

test(":wq is rejected without emitting shutdown", () => {
  const result = applyModalKeys({ mode: "normal" }, "hello", p(0, 0), [":", "w", "q", "\r"]);
  expect(result.text).toBe("hello");
  expect(result.state.exMessage).toEqual({
    kind: "error",
    text: "Unsupported Ex command: wq",
  });
  expect(result.effects).not.toContainEqual({ type: "shutdown" });
});

test("visual-source :q emits shutdown without editing state", () => {
  const initial: ModalState = {
    mode: "visual",
    visualAnchor: p(0, 1),
    register: { type: "char", text: "saved" },
    marks: { a: p(0, 1) },
    lastSearch: { query: "abc", direction: "forward" },
    searchHighlight: { query: "abc", current: p(0, 0) },
    lastRepeatableChange: { type: "command", command: "deleteChar" },
  };
  const opened = handleModalInput(
    initial,
    { text: "one\ntwo", lines: ["one", "two"], cursor: p(1, 2) },
    options,
    ":",
  );
  const typed = handleModalInput(
    opened.state,
    { text: "one\ntwo", lines: ["one", "two"], cursor: p(1, 2) },
    options,
    "q",
  );
  const result = handleModalInput(
    typed.state,
    { text: "one\ntwo", lines: ["one", "two"], cursor: p(1, 2) },
    options,
    "\r",
  );
  const state = result.state;
  expect(result.effects).toContainEqual({ type: "shutdown" });
  expect(state.mode).toBe("normal");
  expect(state.pendingEx).toBeUndefined();
  expect(state.visualAnchor).toBeUndefined();
  expect(state.register).toEqual(initial.register);
  expect(state.marks).toEqual(initial.marks);
  expect(state.lastSearch).toEqual(initial.lastSearch);
  expect(state.searchHighlight).toEqual(initial.searchHighlight);
  expect(state.lastRepeatableChange).toEqual(initial.lastRepeatableChange);
});
