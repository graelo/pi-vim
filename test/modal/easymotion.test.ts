import { expect, test } from "vitest";
import type { ModalState } from "../../src/modal/types.ts";
import { handleModalInputWithOptions as handleModalInput } from "../modal-test-helper.ts";
import { p, cursor, options, snapshot, highlight } from "./shared.ts";

test("matches prompt-wide, case-insensitively, with lowercase then uppercase labels", () => {
  const update = handleModalInput(
    { mode: "normal", pendingEasymotion: { kind: "char" } },
    { text: "Axa\ncatA", lines: ["Axa", "catA"], cursor },
    options,
    "a",
  );

  expect(update.state.pendingEasymotion).toEqual({
    kind: "highlight",
    targets: [
      { label: "a", line: 0, character: 0 },
      { label: "b", line: 0, character: 2 },
      { label: "c", line: 1, character: 1 },
      { label: "d", line: 1, character: 3 },
    ],
  });
  expect(update.effects).toEqual([{ type: "invalidate" }]);
  expect(update.effects.some((effect) => effect.type === "edit")).toBe(false);
});

test("preserves source offsets when case folding expands characters", () => {
  const update = handleModalInput(
    { mode: "normal", pendingEasymotion: { kind: "char" } },
    { text: "İI", lines: ["İI"], cursor },
    options,
    "i",
  );

  expect(update.state.pendingEasymotion).toEqual({
    kind: "highlight",
    targets: [
      { label: "a", line: 0, character: 0 },
      { label: "b", line: 0, character: 1 },
    ],
  });
});

test("caps targets at 52 labels", () => {
  const text = "a".repeat(60);
  const update = handleModalInput(
    { mode: "normal", pendingEasymotion: { kind: "char" } },
    { text, lines: [text], cursor },
    options,
    "a",
  );
  const targets = update.state.pendingEasymotion;

  expect(targets?.kind).toBe("highlight");
  if (targets?.kind !== "highlight") return;
  expect(targets.targets).toHaveLength(52);
  expect(targets.targets.at(-1)).toEqual({ label: "Z", line: 0, character: 51 });
});

test("no match clears pending state without editing", () => {
  const update = handleModalInput(
    { mode: "normal", pendingEasymotion: { kind: "char" } },
    snapshot,
    options,
    "z",
  );

  expect(update.state).toEqual({ mode: "normal" });
  expect(update.effects).toEqual([{ type: "invalidate" }]);
});

test("escape and invalid labels preserve highlight without editing", () => {
  const initial = highlight([{ label: "a", line: 0, character: 2 }]);
  const cancelled = handleModalInput(initial, { ...snapshot, text: "xxa" }, options, "\x1b");
  const invalid = handleModalInput(initial, { ...snapshot, text: "xxa" }, options, "Z");

  expect(cancelled.state).toEqual({ mode: "normal" });
  expect(cancelled.effects).toEqual([{ type: "invalidate" }]);
  expect(invalid.state).toEqual(initial);
  expect(invalid.effects).toEqual([{ type: "invalidate" }]);
  expect([...cancelled.effects, ...invalid.effects].some((effect) => effect.type === "edit")).toBe(
    false,
  );
});

test("valid lowercase and uppercase labels move cursor without editing", () => {
  const lowercase = handleModalInput(
    highlight([
      { label: "a", line: 0, character: 2 },
      { label: "A", line: 1, character: 4 },
    ]),
    { text: "xxa\nyyyyA", lines: ["xxa", "yyyyA"], cursor },
    options,
    "a",
  );
  const uppercase = handleModalInput(
    highlight([
      { label: "a", line: 0, character: 2 },
      { label: "A", line: 1, character: 4 },
    ]),
    { text: "xxa\nyyyyA", lines: ["xxa", "yyyyA"], cursor },
    options,
    "A",
  );

  expect(lowercase.state.pendingEasymotion).toBeUndefined();
  expect(uppercase.state.pendingEasymotion).toBeUndefined();
  expect(lowercase.effects).toContainEqual({
    type: "restoreCursor",
    position: { line: 0, col: 2 },
  });
  expect(uppercase.effects).toContainEqual({
    type: "restoreCursor",
    position: { line: 1, col: 4 },
  });
  expect(
    [...lowercase.effects, ...uppercase.effects].some((effect) => effect.type === "edit"),
  ).toBe(false);
});

test("EasyMotion leaves durable modal state unchanged", () => {
  const initial: ModalState = {
    mode: "normal",
    pendingEasymotion: { kind: "char" },
    namedRegisters: { a: { type: "char", text: "register" } },
    marks: { a: p(0, 1) },
    macros: { q: ["x"] },
    lastPlayedMacro: "q",
    lastCharSearch: { command: "findCharForward", target: "," },
    lastSearch: { query: "needle", direction: "forward" },
    searchHistory: [{ query: "needle", matcherMode: "literal" }],
    lastRepeatableChange: { type: "command", command: "deleteChar" },
    lastVisualSelection: { mode: "visual", anchor: p(0, 0), cursor: p(0, 1), text: "ab" },
    messageHistory: [{ kind: "info", text: "kept" }],
  };
  const entered = handleModalInput(initial, { text: "abc", lines: ["abc"], cursor }, options, "a");
  const states = [
    entered,
    handleModalInput(entered.state, { text: "abc", lines: ["abc"], cursor }, options, "\x1b"),
    handleModalInput(entered.state, { text: "abc", lines: ["abc"], cursor }, options, "Z"),
    handleModalInput(entered.state, { text: "abc", lines: ["abc"], cursor }, options, "a"),
  ];

  const { pendingEasymotion: _pending, ...durable } = initial;
  for (const update of states) {
    expect(update.state).toMatchObject(durable);
    expect(update.effects.some((effect) => effect.type === "edit")).toBe(false);
  }
  expect(entered.state.pendingEasymotion?.kind).toBe("highlight");
  expect(states[1]?.state.pendingEasymotion).toBeUndefined();
  expect(states[2]?.state.pendingEasymotion?.kind).toBe("highlight");
  expect(states[3]?.state.pendingEasymotion).toBeUndefined();
});
