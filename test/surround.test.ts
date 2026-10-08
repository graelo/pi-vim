import { describe, expect, test } from "vitest";

import {
  enclosingBracketRange,
  quotePairRange,
  type SurroundTargetSpec,
  surroundRangeFor,
} from "../src/buffer.ts";
import {
  addSurround,
  changeSurround,
  deleteSurround,
  surroundPairFor,
  surroundTargetFor,
} from "../src/surround.ts";

const p = (line: number, col: number) => ({ line, col });

function wrap(
  text: string,
  cursor: { line: number; col: number },
  target: SurroundTargetSpec,
  char: string,
) {
  const pair = surroundPairFor(char);
  if (!pair) throw new Error(`no pair for ${char}`);
  return addSurround(text, cursor, surroundRangeFor(text, cursor, target), pair);
}

function del(text: string, cursor: { line: number; col: number }, char: string, count = 1) {
  const target = surroundTargetFor(char);
  if (!target) throw new Error(`no target for ${char}`);
  return deleteSurround(text, cursor, target, count);
}

function change(text: string, cursor: { line: number; col: number }, from: string, to: string) {
  const target = surroundTargetFor(from);
  const pair = surroundPairFor(to);
  if (!target || !pair) throw new Error(`bad surround ${from}${to}`);
  return changeSurround(text, cursor, target, pair);
}

describe("enclosing pair finders", () => {
  test("bracket pairs nest, span lines, and take a count", () => {
    const text = "(a (b\nc) d)";
    expect(enclosingBracketRange(text, p(0, 4), "(", ")")).toEqual({ start: 3, end: 8 });
    expect(enclosingBracketRange(text, p(0, 4), "(", ")", 2)).toEqual({ start: 0, end: 11 });
    expect(enclosingBracketRange(text, p(0, 4), "(", ")", 3)).toBeUndefined();
  });

  test("a cursor on either delimiter belongs to that pair", () => {
    expect(enclosingBracketRange("x (a) y", p(0, 2), "(", ")")).toEqual({ start: 2, end: 5 });
    expect(enclosingBracketRange("x (a) y", p(0, 4), "(", ")")).toEqual({ start: 2, end: 5 });
    expect(enclosingBracketRange("((a))", p(0, 4), "(", ")")).toEqual({ start: 0, end: 5 });
  });

  test("same-character pairs follow Vim quote pairing on the cursor line", () => {
    const text = 'say "hi" and "yo"';
    expect(quotePairRange(text, p(0, 5), '"')).toEqual({ start: 4, end: 8 });
    expect(quotePairRange(text, p(0, 4), '"')).toEqual({ start: 4, end: 8 });
    expect(quotePairRange(text, p(0, 7), '"')).toEqual({ start: 4, end: 8 });
    expect(quotePairRange(text, p(0, 0), '"')).toEqual({ start: 4, end: 8 });
    expect(quotePairRange(text, p(0, 10), '"')).toEqual({ start: 7, end: 14 });
    expect(quotePairRange(text, p(0, 13), '"')).toEqual({ start: 13, end: 17 });
    expect(quotePairRange(text, p(0, 16), '"')).toEqual({ start: 13, end: 17 });
    expect(quotePairRange('"a\nb"', p(1, 0), '"')).toBeUndefined();
    expect(quotePairRange('"a\\"b"', p(0, 1), '"')).toEqual({ start: 0, end: 6 });
    expect(quotePairRange("a *b* c", p(0, 3), "*")).toEqual({ start: 2, end: 5 });
    expect(quotePairRange("a *b* c", p(0, 4), "*")).toEqual({ start: 2, end: 5 });
    expect(quotePairRange("a *b\nc*", p(0, 3), "*")).toBeUndefined();
  });
});

describe("surround target ranges", () => {
  test("charwise motion excludes trailing whitespace", () => {
    expect(surroundRangeFor("hello world", p(0, 0), { type: "motion", motion: "w" })).toEqual({
      start: 0,
      end: 5,
      linewise: false,
    });
  });

  test("text object and character search", () => {
    expect(
      surroundRangeFor("say hello world", p(0, 5), {
        type: "textObject",
        textObject: { kind: "around", target: "word" },
      }),
    ).toEqual({ start: 4, end: 9, linewise: false });
    expect(
      surroundRangeFor("call ab, c", p(0, 5), {
        type: "charSearch",
        kind: "tillForward",
        char: ",",
      }),
    ).toEqual({ start: 5, end: 7, linewise: false });
  });

  test("line motions and paragraphs are linewise", () => {
    expect(surroundRangeFor("a\nb\nc", p(0, 0), { type: "motion", motion: "j" })).toEqual({
      start: 0,
      end: 3,
      linewise: true,
    });
    expect(
      surroundRangeFor("a\nb\n\nc", p(0, 0), {
        type: "textObject",
        textObject: { kind: "around", target: "paragraph" },
      }),
    ).toEqual({ start: 0, end: 3, linewise: true });
  });

  test("line form starts at the first non-blank and spans count lines", () => {
    expect(surroundRangeFor("  fix it  ", p(0, 5), { type: "line" })).toEqual({
      start: 2,
      end: 8,
      linewise: false,
    });
    expect(surroundRangeFor("one\ntwo", p(0, 0), { type: "line", count: 2 })).toEqual({
      start: 0,
      end: 7,
      linewise: false,
    });
  });

  test("empty targets have no range", () => {
    expect(surroundRangeFor("   ", p(0, 0), { type: "line" })).toBeUndefined();
    expect(surroundRangeFor("x", p(0, 0), { type: "motion", motion: "h" })).toBeUndefined();
  });
});

describe("surround characters", () => {
  test("pairs follow vim-surround", () => {
    expect(surroundPairFor("(")).toEqual({ open: "( ", close: " )" });
    expect(surroundPairFor("{")).toEqual({ open: "{ ", close: " }" });
    expect(surroundPairFor("[")).toEqual({ open: "[ ", close: " ]" });
    for (const [char, open, close] of [
      [")", "(", ")"],
      ["b", "(", ")"],
      ["}", "{", "}"],
      ["B", "{", "}"],
      ["]", "[", "]"],
      ["r", "[", "]"],
      [">", "<", ">"],
      ["a", "<", ">"],
      ['"', '"', '"'],
      ["'", "'", "'"],
      ["`", "`", "`"],
      ["*", "*", "*"],
      ["_", "_", "_"],
    ] as const) {
      expect(surroundPairFor(char)).toEqual({ open, close });
    }
  });

  test("letters, digits, whitespace, < and control keys are rejected", () => {
    for (const char of ["x", "Z", "1", " ", "<", "escape", "ctrl+a", "\t"]) {
      expect(surroundPairFor(char)).toBeUndefined();
    }
  });

  test("delete targets", () => {
    expect(surroundTargetFor("(")).toEqual({ kind: "bracket", open: "(", close: ")", trim: true });
    expect(surroundTargetFor("b")).toEqual({ kind: "bracket", open: "(", close: ")", trim: false });
    expect(surroundTargetFor("a")).toEqual({ kind: "bracket", open: "<", close: ">", trim: false });
    expect(surroundTargetFor("'")).toEqual({ kind: "char", char: "'" });
    expect(surroundTargetFor("*")).toEqual({ kind: "char", char: "*" });
    expect(surroundTargetFor("x")).toBeUndefined();
  });
});

describe("add surround", () => {
  test("wraps a word and puts the cursor on the opening character", () => {
    const iw: SurroundTargetSpec = {
      type: "textObject",
      textObject: { kind: "inner", target: "word" },
    };
    expect(wrap("say hello world", p(0, 5), iw, ")")).toEqual({
      text: "say (hello) world",
      cursor: p(0, 4),
      changed: true,
    });
    expect(wrap("x", p(0, 0), iw, "(").text).toBe("( x )");
  });

  test("wraps motions, character searches, and the line form", () => {
    expect(wrap("hello world", p(0, 0), { type: "motion", motion: "w" }, '"').text).toBe(
      '"hello" world',
    );
    expect(
      wrap("call ab, c", p(0, 5), { type: "charSearch", kind: "tillForward", char: "," }, "]").text,
    ).toBe("call [ab], c");
    expect(wrap("  fix the bug", p(0, 3), { type: "line" }, ")").text).toBe("  (fix the bug)");
    expect(wrap("one\ntwo", p(0, 0), { type: "line", count: 2 }, '"').text).toBe('"one\ntwo"');
    expect(wrap("a b c", p(0, 0), { type: "motion", motion: "w", count: 2 }, ")").text).toBe(
      "(a b) c",
    );
  });

  test("linewise targets put the pair on their own lines without inner spaces", () => {
    const ip: SurroundTargetSpec = {
      type: "textObject",
      textObject: { kind: "inner", target: "paragraph" },
    };
    expect(wrap("a\nb\n\nc", p(0, 0), ip, "}").text).toBe("{\na\nb\n}\n\nc");
    expect(wrap("a\nb", p(0, 0), { type: "motion", motion: "j" }, "(").text).toBe("(\na\nb\n)");
  });

  test("missing target leaves the text unchanged", () => {
    expect(wrap("   ", p(0, 1), { type: "line" }, ")")).toEqual({
      text: "   ",
      cursor: p(0, 1),
      changed: false,
    });
  });
});

describe("delete surround", () => {
  test("removes brackets, quotes, and punctuation", () => {
    expect(del("f(a, b)", p(0, 2), ")")).toEqual({ text: "fa, b", cursor: p(0, 1), changed: true });
    expect(del('say "hi" now', p(0, 5), '"').text).toBe("say hi now");
    expect(del("a *b* c", p(0, 3), "*").text).toBe("a b c");
    expect(del("x {\n  y\n}", p(1, 2), "B").text).toBe("x \n  y\n");
  });

  test("opening target trims whitespace inside the pair", () => {
    expect(del("( a )", p(0, 2), "(").text).toBe("a");
    expect(del("( a )", p(0, 2), ")").text).toBe(" a ");
  });

  test("count selects an outer pair", () => {
    expect(del("(a (b))", p(0, 4), ")", 2).text).toBe("a (b)");
  });

  test("missing pair is a no-op", () => {
    expect(del("abc", p(0, 1), ")")).toEqual({ text: "abc", cursor: p(0, 1), changed: false });
  });
});

describe("change surround", () => {
  test("replaces quotes and brackets", () => {
    expect(change('"hi"', p(0, 1), '"', "'")).toEqual({
      text: "'hi'",
      cursor: p(0, 0),
      changed: true,
    });
    expect(change("[x]", p(0, 1), "]", "{").text).toBe("{ x }");
    expect(change("( x )", p(0, 2), "(", "]").text).toBe("[x]");
  });

  test("missing pair is a no-op", () => {
    expect(change("x", p(0, 0), '"', "'").changed).toBe(false);
  });
});
