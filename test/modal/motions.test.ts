import { expect, test } from "vitest";
import { handleModalInputWithOptions as handleModalInput } from "../modal-test-helper.ts";
import { p, options, applyModalKeys } from "./shared.ts";

test("normal mode supports WORD and previous-end motions", () => {
  expect(
    applyModalKeys({ mode: "normal" }, "run --foo=bar /tmp/a-b", p(0, 0), ["W"]).cursor,
  ).toEqual(p(0, 4));
  expect(
    applyModalKeys({ mode: "normal" }, "run --foo=bar /tmp/a-b", p(0, 4), ["E"]).cursor,
  ).toEqual(p(0, 12));
  expect(
    applyModalKeys({ mode: "normal" }, "run --foo=bar /tmp/a-b", p(0, 14), ["B"]).cursor,
  ).toEqual(p(0, 4));
  expect(
    applyModalKeys({ mode: "normal" }, "alpha beta.gamma /tmp/file", p(0, 17), ["g", "e"]).cursor,
  ).toEqual(p(0, 15));
  expect(
    applyModalKeys({ mode: "normal" }, "alpha beta.gamma /tmp/file", p(0, 17), ["2", "g", "E"])
      .cursor,
  ).toEqual(p(0, 4));
});

test("visual mode extends selection with WORD and previous-end motions", () => {
  const word = applyModalKeys(
    { mode: "visual", visualAnchor: p(0, 0) },
    "run --foo=bar /tmp/a-b",
    p(0, 0),
    ["W"],
  );
  expect(word.cursor).toEqual(p(0, 4));
  expect(word.state.visualAnchor).toEqual(p(0, 0));

  const previous = applyModalKeys(
    { mode: "visual", visualAnchor: p(0, 17) },
    "alpha beta.gamma /tmp/file",
    p(0, 17),
    ["g", "E"],
  );
  expect(previous.cursor).toEqual(p(0, 15));
  expect(previous.state.visualAnchor).toEqual(p(0, 17));
});

test("normal operators support WORD and previous-end motions", () => {
  const deletedWord = applyModalKeys({ mode: "normal" }, "run --foo=bar /tmp/a-b", p(0, 0), [
    "d",
    "W",
  ]);
  expect(deletedWord.text).toBe("--foo=bar /tmp/a-b");
  expect(deletedWord.state.register).toEqual({ type: "char", text: "run " });

  const changedEnd = applyModalKeys({ mode: "normal" }, "run --foo=bar /tmp/a-b", p(0, 4), [
    "c",
    "E",
  ]);
  expect(changedEnd.text).toBe("run  /tmp/a-b");
  expect(changedEnd.state.mode).toBe("insert");
  expect(changedEnd.state.register).toEqual({ type: "char", text: "--foo=bar" });

  const yankedBack = applyModalKeys({ mode: "normal" }, "run --foo=bar /tmp/a-b", p(0, 14), [
    "y",
    "B",
  ]);
  expect(yankedBack.text).toBe("run --foo=bar /tmp/a-b");
  expect(yankedBack.state.register).toEqual({ type: "char", text: "--foo=bar " });

  const previousEnd = applyModalKeys({ mode: "normal" }, "alpha beta.gamma /tmp/file", p(0, 17), [
    "d",
    "g",
    "e",
  ]);
  expect(previousEnd.text).toBe("alpha beta.gamm/tmp/file");
  expect(previousEnd.state.register).toEqual({ type: "char", text: "a " });

  const repeatedChange = applyModalKeys(changedEnd.state, "run next-token", p(0, 5), ["\x1b", "."]);
  expect(repeatedChange.text).toBe("run ");
  expect(repeatedChange.state.mode).toBe("insert");
  expect(repeatedChange.state.register).toEqual({ type: "char", text: "next-token" });
});

test("normal mode arrow keys move cursor like h/j/k/l", () => {
  const left = "\x1b[D";
  const down = "\x1b[B";
  const up = "\x1b[A";
  const right = "\x1b[C";

  // Single-line navigation
  expect(applyModalKeys({ mode: "normal" }, "abc", p(0, 1), [right]).cursor).toEqual(p(0, 2));
  expect(applyModalKeys({ mode: "normal" }, "abc", p(0, 1), [left]).cursor).toEqual(p(0, 0));

  // Multi-line navigation
  expect(applyModalKeys({ mode: "normal" }, "a\nb\nc", p(0, 0), [down]).cursor).toEqual(p(1, 0));
  expect(applyModalKeys({ mode: "normal" }, "a\nb\nc", p(1, 0), [up]).cursor).toEqual(p(0, 0));

  // Boundary clamping
  expect(applyModalKeys({ mode: "normal" }, "abc", p(0, 2), [right]).cursor).toEqual(p(0, 3));
  expect(applyModalKeys({ mode: "normal" }, "abc", p(0, 0), [left]).cursor).toEqual(p(0, 0));
  expect(applyModalKeys({ mode: "normal" }, "a\nb", p(0, 0), [up]).cursor).toEqual(p(0, 0));
  expect(applyModalKeys({ mode: "normal" }, "a\nb", p(1, 0), [down]).cursor).toEqual(p(1, 0));
});

test("normal mode counted arrow keys move by count", () => {
  const down = "\x1b[B";
  const right = "\x1b[C";

  expect(applyModalKeys({ mode: "normal" }, "abcde", p(0, 0), ["2", right]).cursor).toEqual(
    p(0, 2),
  );
  expect(applyModalKeys({ mode: "normal" }, "a\nb\nc\nd", p(0, 0), ["2", down]).cursor).toEqual(
    p(2, 0),
  );
});

test("visual mode arrow keys extend selection", () => {
  const right = "\x1b[C";
  const down = "\x1b[B";

  const selected = applyModalKeys({ mode: "visual", visualAnchor: p(0, 0) }, "abc\ndef", p(0, 0), [
    right,
    right,
    down,
  ]);
  expect(selected.cursor).toEqual(p(1, 2));
  expect(selected.state.visualAnchor).toEqual(p(0, 0));
});

test("normal operators support arrow-key motions", () => {
  const right = "\x1b[C";
  const down = "\x1b[B";

  const deleted = applyModalKeys({ mode: "normal" }, "abc", p(0, 0), ["d", right]);
  expect(deleted.text).toBe("bc");
  expect(deleted.state.register).toEqual({ type: "char", text: "a" });

  const changed = applyModalKeys({ mode: "normal" }, "a\nb\nc", p(0, 0), ["c", "2", down]);
  expect(changed.text).toBe("");
  expect(changed.state.mode).toBe("insert");
  expect(changed.state.register).toEqual({ type: "line", text: "a\nb\nc" });
});

test("normal operators support line, buffer, and matching-pair motions", () => {
  const deletedDown = applyModalKeys({ mode: "normal" }, "one\ntwo\nthree", p(0, 0), ["d", "j"]);
  expect(deletedDown.text).toBe("three");
  expect(deletedDown.state.register).toEqual({ type: "line", text: "one\ntwo" });

  const changedStart = applyModalKeys({ mode: "normal" }, "one\ntwo\nthree", p(1, 0), [
    "c",
    "g",
    "g",
  ]);
  expect(changedStart.text).toBe("three");
  expect(changedStart.state.mode).toBe("insert");
  expect(changedStart.state.register).toEqual({ type: "line", text: "one\ntwo" });

  const yankedEnd = applyModalKeys({ mode: "normal" }, "one\ntwo\nthree", p(1, 0), ["y", "G"]);
  expect(yankedEnd.text).toBe("one\ntwo\nthree");
  expect(yankedEnd.state.register).toEqual({ type: "line", text: "two\nthree" });

  const deletedPair = applyModalKeys({ mode: "normal" }, "a(b)c", p(0, 1), ["d", "%"]);
  expect(deletedPair.text).toBe("ac");
  expect(deletedPair.state.register).toEqual({ type: "char", text: "(b)" });
});

test("normal operators support text objects", () => {
  const change = handleModalInput(
    { mode: "normal" },
    { text: "hello world", lines: ["hello world"], cursor: { line: 0, col: 6 } },
    options,
    "c",
  );
  const inner = handleModalInput(
    change.state,
    { text: "hello world", lines: ["hello world"], cursor: { line: 0, col: 6 } },
    options,
    "i",
  );
  const changed = handleModalInput(
    inner.state,
    { text: "hello world", lines: ["hello world"], cursor: { line: 0, col: 6 } },
    options,
    "w",
  );
  expect(changed.state.mode).toBe("insert");
  expect(changed.effects[0]).toMatchObject({ type: "edit", result: { text: "hello " } });
});

test("normal operators support prompt-native text objects and repeat", () => {
  const deletedFence = applyModalKeys(
    { mode: "normal" },
    "before\n```\nbody\n```\nafter",
    p(2, 0),
    ["d", "a", "f"],
  );
  expect(deletedFence.text).toBe("before\nafter");
  expect(deletedFence.state.register).toEqual({ type: "char", text: "```\nbody\n```" });

  const changedHeading = applyModalKeys({ mode: "normal" }, "# A\none\n# B\ntwo", p(1, 0), [
    "c",
    "i",
    "h",
  ]);
  expect(changedHeading.text).toBe("# A\n# B\ntwo");
  expect(changedHeading.state.mode).toBe("insert");

  const yankedList = applyModalKeys({ mode: "normal" }, "- one\n  more\n- two", p(1, 2), [
    "y",
    "a",
    "l",
  ]);
  expect(yankedList.text).toBe("- one\n  more\n- two");
  expect(yankedList.state.register).toEqual({ type: "char", text: "- one\n  more" });

  const deletedInnerList = applyModalKeys({ mode: "normal" }, "- one\n- two", p(0, 3), [
    "d",
    "i",
    "l",
  ]);
  expect(deletedInnerList.text).toBe("- \n- two");

  const deletedTag = applyModalKeys({ mode: "normal" }, "<x>body</x>", p(0, 4), ["d", "i", "t"]);
  expect(deletedTag.text).toBe("<x></x>");

  const yankedError = applyModalKeys(
    { mode: "normal" },
    "intro\nTypeError: boom\n    at fn (x.ts:1:1)\noutro",
    p(2, 4),
    ["y", "a", "e"],
  );
  expect(yankedError.state.register).toEqual({
    type: "char",
    text: "TypeError: boom\n    at fn (x.ts:1:1)",
  });

  const missing = applyModalKeys({ mode: "normal" }, "plain", p(0, 0), ["d", "a", "f"]);
  expect(missing.text).toBe("plain");
  expect(missing.state.pending).toBeUndefined();

  const repeated = applyModalKeys(changedHeading.state, changedHeading.text, p(2, 0), [
    "\x1b",
    ".",
  ]);
  expect(repeated.text).toBe("# A\n# B\n");
});
