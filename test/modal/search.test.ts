import { expect, test } from "vitest";
import { DEFAULT_VIM_KEYMAP } from "../../src/config.ts";
import { handleModalInputWithOptions as handleModalInput } from "../modal-test-helper.ts";
import { p, options, snapshot, applyModalKeys } from "./shared.ts";

test("normal mode supports prompt search and repeat", () => {
  const result = applyModalKeys({ mode: "normal" }, "one two one", p(0, 0), [
    "/",
    "o",
    "n",
    "e",
    "\r",
    "n",
    "N",
  ]);

  expect(result.text).toBe("one two one");
  expect(result.cursor).toEqual(p(0, 8));
  expect(result.state.lastSearch).toEqual({
    query: "one",
    direction: "forward",
    matcherMode: "literal",
  });
  expect(result.state.searchHighlight).toEqual({ query: "one", current: p(0, 8) });
  expect(result.state.pendingSearch).toBeUndefined();
});

test("normal mode supports backward prompt search and repeat", () => {
  const result = applyModalKeys({ mode: "normal" }, "one two one", p(0, 8), [
    "?",
    "o",
    "n",
    "e",
    "\r",
    "n",
  ]);

  expect(result.text).toBe("one two one");
  expect(result.cursor).toEqual(p(0, 8));
  expect(result.state.lastSearch).toEqual({
    query: "one",
    direction: "backward",
    matcherMode: "literal",
  });
  expect(result.state.searchHighlight).toEqual({ query: "one", current: p(0, 8) });
  expect(result.state.pendingSearch).toBeUndefined();
});

test("backward prompt search displays question prefix while pending", () => {
  const opened = handleModalInput({ mode: "normal" }, snapshot, options, "?");
  expect(opened.state.pendingSearch).toEqual({ query: "", direction: "backward" });
});

test("star searches the word under the cursor forward", () => {
  const result = applyModalKeys({ mode: "normal" }, "one two one", p(0, 0), ["*"]);
  expect(result.text).toBe("one two one");
  expect(result.cursor).toEqual(p(0, 8));
  expect(result.state.lastSearch).toEqual({
    query: "one",
    direction: "forward",
    matcherMode: "literal",
  });
  expect(result.state.searchHighlight).toEqual({ query: "one", current: p(0, 8) });
  expect(result.state.pendingSearch).toBeUndefined();
});

test("hash searches the word under the cursor backward", () => {
  const result = applyModalKeys({ mode: "normal" }, "one two one", p(0, 8), ["#"]);
  expect(result.text).toBe("one two one");
  expect(result.cursor).toEqual(p(0, 0));
  expect(result.state.lastSearch).toEqual({
    query: "one",
    direction: "backward",
    matcherMode: "literal",
  });
  expect(result.state.searchHighlight).toEqual({ query: "one", current: p(0, 0) });
});

test("word search uses the preceding word at an insertion-point cursor", () => {
  const result = applyModalKeys({ mode: "normal" }, "foo bar foo", p(0, 3), ["*"]);
  expect(result.cursor).toEqual(p(0, 8));
  expect(result.state.lastSearch).toEqual({
    query: "foo",
    direction: "forward",
    matcherMode: "literal",
  });
});

test("word search on a unique word records search without moving the cursor", () => {
  const result = applyModalKeys({ mode: "normal" }, "alpha beta", p(0, 6), ["*"]);
  expect(result.text).toBe("alpha beta");
  expect(result.cursor).toEqual(p(0, 6));
  expect(result.state.lastSearch).toEqual({
    query: "beta",
    direction: "forward",
    matcherMode: "literal",
  });
  expect(result.state.searchHighlight).toEqual({ query: "beta", current: p(0, 6) });
});

test("word search with no word under the cursor is a safe no-op", () => {
  const result = applyModalKeys({ mode: "normal" }, " alpha beta", p(0, 0), ["*"]);
  expect(result.text).toBe(" alpha beta");
  expect(result.cursor).toEqual(p(0, 0));
  expect(result.state.lastSearch).toBeUndefined();
});

test("n and N repeat search follows the star direction", () => {
  const text = "one two one three one";
  const star = applyModalKeys({ mode: "normal" }, text, p(0, 0), ["*"]);
  expect(star.cursor).toEqual(p(0, 8));

  const next = applyModalKeys(star.state, text, p(0, 8), ["n"]);
  expect(next.cursor).toEqual(p(0, 18));

  const reverse = applyModalKeys(star.state, text, p(0, 8), ["N"]);
  expect(reverse.cursor).toEqual(p(0, 0));
});

test("n repeats search follows the hash direction", () => {
  const text = "one two one";
  const hash = applyModalKeys({ mode: "normal" }, text, p(0, 8), ["#"]);
  expect(hash.cursor).toEqual(p(0, 0));

  const next = applyModalKeys(hash.state, text, p(0, 0), ["n"]);
  expect(next.cursor).toEqual(p(0, 8));
});

test("word search records prompt-local search history", () => {
  const result = applyModalKeys({ mode: "normal" }, "one two one", p(0, 0), ["*"]);
  expect(result.state.searchHistory).toEqual([{ query: "one", matcherMode: "literal" }]);
});

test("insert mode delegates star and hash to Pi default editing", () => {
  const star = applyModalKeys({ mode: "insert" }, "one two one", p(0, 0), ["*"]);
  expect(star.text).toBe("one two one");
  expect(star.state.mode).toBe("insert");
  expect(star.state.pendingSearch).toBeUndefined();
  expect(star.state.lastSearch).toBeUndefined();

  const hash = applyModalKeys({ mode: "insert" }, "one two one", p(0, 0), ["#"]);
  expect(hash.text).toBe("one two one");
  expect(hash.state.mode).toBe("insert");
  expect(hash.state.lastSearch).toBeUndefined();
});

test("prompt search highlight state honors config and clear events", () => {
  const noHighlight = applyModalKeys(
    { mode: "normal" },
    "one two one",
    p(0, 0),
    ["/", "o", "n", "e", "\r"],
    {
      ...options,
      search: {
        highlight: false,
        highlightCurrent: true,
        clearOnCancel: true,
        clearOnInsert: true,
        maxHighlights: 200,
      },
    },
  );
  expect(noHighlight.state.searchHighlight).toBeUndefined();
  expect(noHighlight.state.lastSearch).toEqual({
    query: "one",
    direction: "forward",
    matcherMode: "literal",
  });

  const highlighted = applyModalKeys({ mode: "normal" }, "one two one", p(0, 0), [
    "/",
    "o",
    "n",
    "e",
    "\r",
  ]);
  expect(highlighted.state.searchHighlight).toEqual({ query: "one", current: p(0, 8) });

  const cancelled = applyModalKeys(highlighted.state, "one two one", p(0, 8), ["/", "x", "\x1b"]);
  expect(cancelled.state.searchHighlight).toBeUndefined();

  const edited = applyModalKeys(highlighted.state, "one two one", p(0, 8), ["x"]);
  expect(edited.text).toBe("one two ne");
  expect(edited.state.searchHighlight).toBeUndefined();

  const insert = applyModalKeys(highlighted.state, "one two one", p(0, 8), ["i"]);
  expect(insert.state.mode).toBe("insert");
  expect(insert.state.searchHighlight).toBeUndefined();

  const preserveOnInsert = applyModalKeys(highlighted.state, "one two one", p(0, 8), ["i"], {
    ...options,
    search: {
      highlight: true,
      highlightCurrent: true,
      clearOnCancel: true,
      clearOnInsert: false,
      maxHighlights: 200,
    },
  });
  expect(preserveOnInsert.state.searchHighlight).toEqual({ query: "one", current: p(0, 8) });
});

test("pending prompt search cancels and delegates Ctrl-C/Ctrl-G", () => {
  for (const key of ["\x03", "\x07"]) {
    const update = handleModalInput(
      { mode: "normal", pendingSearch: { query: "one", direction: "forward" } },
      snapshot,
      options,
      key,
    );
    expect(update.state.pendingSearch).toBeUndefined();
    expect(update.state.mode).toBe("insert");
    expect(update.effects).toContainEqual({ type: "delegate", input: key });
  }
});

test("empty prompt search recalls previous successful query", () => {
  const result = applyModalKeys({ mode: "normal" }, "one two one", p(0, 0), [
    "/",
    "t",
    "w",
    "o",
    "\r",
    "/",
    "\r",
    "?",
    "\r",
  ]);

  expect(result.cursor).toEqual(p(0, 4));
  expect(result.state.lastSearch).toEqual({
    query: "two",
    direction: "backward",
    matcherMode: "literal",
  });
});

test("pending prompt search navigates successful search history", () => {
  const searched = applyModalKeys({ mode: "normal" }, "one two three", p(0, 0), [
    "/",
    "t",
    "w",
    "o",
    "\r",
    "/",
    "t",
    "h",
    "r",
    "e",
    "e",
    "\r",
    "/",
    "\x1b[A",
    "\r",
  ]);

  expect(searched.cursor).toEqual(p(0, 8));
  expect(searched.state.lastSearch).toEqual({
    query: "three",
    direction: "forward",
    matcherMode: "literal",
  });
  expect(searched.state.searchHistory).toEqual([
    { query: "two", matcherMode: "literal" },
    { query: "three", matcherMode: "literal" },
  ]);
});

test("prompt search supports explicit bounded regex mode", () => {
  const found = applyModalKeys({ mode: "normal" }, "todo FIXME", p(0, 0), [
    "/",
    "\\",
    "r",
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
    "\r",
  ]);

  expect(found.cursor).toEqual(p(0, 5));
  expect(found.state.lastSearch).toEqual({
    query: "TODO|FIXME",
    direction: "forward",
    matcherMode: "regex",
  });
  expect(found.state.searchHistory).toEqual([{ query: "TODO|FIXME", matcherMode: "regex" }]);

  const literal = applyModalKeys({ mode: "normal" }, "todo TODO|FIXME FIXME", p(0, 0), [
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
    "\r",
  ]);
  expect(literal.cursor).toEqual(p(0, 5));
  expect(literal.state.lastSearch).toEqual({
    query: "TODO|FIXME",
    direction: "forward",
    matcherMode: "literal",
  });
});

test("invalid regex prompt search is safe", () => {
  const result = applyModalKeys({ mode: "normal" }, "abc", p(0, 0), ["/", "\\", "r", "(", "\r"]);
  expect(result).toMatchObject({
    text: "abc",
    cursor: p(0, 0),
    state: { mode: "normal", exMessage: { kind: "error", text: "Invalid regex pattern" } },
  });
  expect(result.state.lastSearch).toBeUndefined();
  expect(result.state.searchHistory).toBeUndefined();
});

test("normal prompt search handles cancellation empty and missing queries safely", () => {
  expect(applyModalKeys({ mode: "normal" }, "abc", p(0, 0), ["/", "x", "\x1b"])).toMatchObject({
    text: "abc",
    cursor: p(0, 0),
    state: { mode: "normal" },
  });
  expect(applyModalKeys({ mode: "normal" }, "abc", p(0, 0), ["/", "\r"])).toMatchObject({
    text: "abc",
    cursor: p(0, 0),
    state: { mode: "normal" },
  });
  const missingWithPrevious = applyModalKeys(
    { mode: "normal", searchHighlight: { query: "a", current: p(0, 0) } },
    "abc",
    p(0, 0),
    ["/", "z", "\r"],
  );
  expect(missingWithPrevious).toMatchObject({
    text: "abc",
    cursor: p(0, 0),
    state: { mode: "normal", searchHighlight: { query: "a", current: p(0, 0) } },
  });
});

test("visual mode supports backward prompt search motion", () => {
  const result = applyModalKeys({ mode: "visual", visualAnchor: p(0, 8) }, "one two one", p(0, 8), [
    "?",
    "t",
    "w",
    "o",
    "\r",
  ]);

  expect(result.cursor).toEqual(p(0, 4));
  expect(result.state).toMatchObject({ mode: "visual", visualAnchor: p(0, 8) });
});

test("visual mode supports prompt search motion", () => {
  const result = applyModalKeys({ mode: "visual", visualAnchor: p(0, 0) }, "one two one", p(0, 0), [
    "/",
    "t",
    "w",
    "o",
    "\r",
  ]);

  expect(result.cursor).toEqual(p(0, 4));
  expect(result.state).toMatchObject({ mode: "visual", visualAnchor: p(0, 0) });
});

test("operators accept prompt search motions", () => {
  expect(
    applyModalKeys({ mode: "normal" }, "one two three", p(0, 0), ["d", "/", "t", "w", "o", "\r"]),
  ).toMatchObject({
    text: " three",
    cursor: p(0, 0),
    state: { mode: "normal", register: { type: "char", text: "one two" } },
  });
  expect(
    applyModalKeys({ mode: "normal" }, "one two three", p(0, 0), ["y", "/", "t", "w", "o", "\r"]),
  ).toMatchObject({
    text: "one two three",
    cursor: p(0, 0),
    state: { mode: "normal", register: { type: "char", text: "one two" } },
  });
  expect(
    applyModalKeys({ mode: "normal" }, "one two three", p(0, 0), ["c", "/", "t", "w", "o", "\r"]),
  ).toMatchObject({
    text: " three",
    cursor: p(0, 0),
    state: { mode: "insert", register: { type: "char", text: "one two" } },
  });
  expect(
    applyModalKeys({ mode: "normal" }, "one two three", p(0, 8), ["d", "?", "t", "w", "o", "\r"]),
  ).toMatchObject({
    text: "one hree",
    cursor: p(0, 4),
    state: { mode: "normal", register: { type: "char", text: "two t" } },
  });
  expect(
    applyModalKeys({ mode: "normal" }, "one two", p(0, 0), ["d", "/", "z", "\r"]),
  ).toMatchObject({
    text: "one two",
    cursor: p(0, 0),
    state: { mode: "normal" },
  });
});

test("configured startSearch key starts operator search", () => {
  const configuredOptions = {
    ...options,
    keymap: {
      ...DEFAULT_VIM_KEYMAP,
      commands: { ...DEFAULT_VIM_KEYMAP.commands, startSearch: ["?"] },
    },
  };

  const update = handleModalInput(
    { mode: "normal", pending: "d" },
    snapshot,
    configuredOptions,
    "?",
  );
  expect(update.state.pendingSearch).toEqual({
    query: "",
    direction: "forward",
    operator: "delete",
  });
  expect(update.effects).toEqual([{ type: "invalidate" }]);
});

test("configured multi-key startSearch starts operator search", () => {
  const configuredOptions = {
    ...options,
    keymap: {
      ...DEFAULT_VIM_KEYMAP,
      commands: { ...DEFAULT_VIM_KEYMAP.commands, startSearch: ["gs"] },
    },
  };

  const pending = handleModalInput(
    { mode: "normal", pending: "d" },
    snapshot,
    configuredOptions,
    "g",
  );
  expect(pending.state.pending).toBeDefined();

  const update = handleModalInput(pending.state, snapshot, configuredOptions, "s");
  expect(update.state.pending).toBeUndefined();
  expect(update.state.pendingSearch).toEqual({
    query: "",
    direction: "forward",
    operator: "delete",
  });
  expect(update.effects).toEqual([{ type: "invalidate" }]);
});
