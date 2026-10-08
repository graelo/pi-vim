import { expect, test } from "vitest";
import type { ModalState } from "../../src/modal/types.ts";
import { DEFAULT_VIM_KEYMAP } from "../../src/config.ts";
import { handleModalInputWithOptions as handleModalInput } from "../modal-test-helper.ts";
import { cursor, options, snapshot } from "./shared.ts";

test("normal mode sets and jumps to local marks", () => {
  const prefix = handleModalInput({ mode: "normal" }, snapshot, options, "m");
  expect(prefix.state).toEqual({ mode: "normal", pendingMark: { kind: "set" } });
  expect(prefix.effects).toEqual([{ type: "invalidate" }]);

  const marked = handleModalInput(
    prefix.state,
    { text: "one\n  two", lines: ["one", "  two"], cursor: { line: 1, col: 4 } },
    options,
    "a",
  );
  expect(marked.state).toEqual({ mode: "normal", marks: { a: { line: 1, col: 4 } } });

  const exactPrefix = handleModalInput(marked.state, snapshot, options, "`");
  expect(exactPrefix.state).toEqual({
    mode: "normal",
    marks: { a: { line: 1, col: 4 } },
    pendingMark: { kind: "jumpExact" },
  });
  const exactJump = handleModalInput(exactPrefix.state, snapshot, options, "a");
  expect(exactJump.effects).toEqual([
    { type: "restoreCursor", position: { line: 0, col: 3 } },
    { type: "invalidate" },
  ]);

  const linePrefix = handleModalInput(marked.state, snapshot, options, "'");
  const lineJump = handleModalInput(
    linePrefix.state,
    { text: "one\n  two", lines: ["one", "  two"], cursor },
    options,
    "a",
  );
  expect(lineJump.effects).toEqual([
    { type: "restoreCursor", position: { line: 1, col: 2 } },
    { type: "invalidate" },
  ]);
});

test("mark prefixes are safe and visible as pending state", () => {
  expect(handleModalInput({ mode: "normal" }, snapshot, options, "m").state).toEqual({
    mode: "normal",
    pendingMark: { kind: "set" },
  });
  expect(
    handleModalInput({ mode: "normal", pendingMark: { kind: "set" } }, snapshot, options, "1"),
  ).toEqual({
    state: { mode: "normal" },
    effects: [{ type: "invalidate" }],
  });
  expect(
    handleModalInput(
      { mode: "normal", pendingMark: { kind: "jumpExact" } },
      snapshot,
      options,
      "z",
    ),
  ).toEqual({ state: { mode: "normal" }, effects: [{ type: "invalidate" }] });
});

test("mark behavior is configurable", () => {
  const disabledOptions = { ...options, marks: { enabled: false, slots: ["a"] } };
  expect(handleModalInput({ mode: "normal" }, snapshot, disabledOptions, "m").state).toEqual({
    mode: "normal",
  });

  const restrictedOptions = { ...options, marks: { enabled: true, slots: ["x"] } };
  const restricted = handleModalInput({ mode: "normal" }, snapshot, restrictedOptions, "m");
  expect(restricted.state).toEqual({ mode: "normal", pendingMark: { kind: "set" } });
  expect(handleModalInput(restricted.state, snapshot, restrictedOptions, "a").state).toEqual({
    mode: "normal",
  });
  expect(handleModalInput(restricted.state, snapshot, restrictedOptions, "x").state).toEqual({
    mode: "normal",
    marks: { x: cursor },
  });

  const configuredOptions = {
    ...options,
    keymap: {
      ...DEFAULT_VIM_KEYMAP,
      marks: { set: ["s"], jumpExact: ["e"], jumpLine: ["l"] },
    },
    marks: { enabled: true, slots: ["x"] },
  };
  const setPrefix = handleModalInput({ mode: "normal" }, snapshot, configuredOptions, "s");
  expect(setPrefix.state).toEqual({ mode: "normal", pendingMark: { kind: "set" } });
  const marked = handleModalInput(
    setPrefix.state,
    { text: "abc", lines: ["abc"], cursor: { line: 0, col: 2 } },
    configuredOptions,
    "x",
  );
  const exactPrefix = handleModalInput(marked.state, snapshot, configuredOptions, "e");
  expect(exactPrefix.state.pendingMark).toEqual({ kind: "jumpExact" });
  const exactJump = handleModalInput(exactPrefix.state, snapshot, configuredOptions, "x");
  expect(exactJump.effects).toContainEqual({
    type: "restoreCursor",
    position: { line: 0, col: 2 },
  });

  const operatorPrefix = handleModalInput(
    { mode: "normal", pending: "y", marks: { x: { line: 0, col: 2 } } },
    snapshot,
    configuredOptions,
    "e",
  );
  expect(operatorPrefix.state.pendingMark).toEqual({
    kind: "jumpExact",
    operator: "yank",
    operatorKey: "y",
  });
});

test("visual modes jump to local marks while preserving anchors", () => {
  const state: ModalState = {
    mode: "visualBlock",
    visualAnchor: { line: 0, col: 1 },
    marks: { a: { line: 1, col: 3 } },
  };
  const prefix = handleModalInput(
    state,
    { text: "abcd\nefgh", lines: ["abcd", "efgh"], cursor },
    options,
    "`",
  );
  expect(prefix.state).toEqual({ ...state, pendingMark: { kind: "jumpExact" } });
  const jumped = handleModalInput(
    prefix.state,
    { text: "abcd\nefgh", lines: ["abcd", "efgh"], cursor },
    options,
    "a",
  );
  expect(jumped.state).toEqual(state);
  expect(jumped.effects).toEqual([
    { type: "restoreCursor", position: { line: 1, col: 3 } },
    { type: "invalidate" },
  ]);
});

test("operators accept mark motions", () => {
  const state: ModalState = { mode: "normal", pending: "y", marks: { a: { line: 0, col: 3 } } };
  const prefix = handleModalInput(
    state,
    { text: "hello", lines: ["hello"], cursor: { line: 0, col: 1 } },
    options,
    "`",
  );
  expect(prefix.state).toEqual({
    mode: "normal",
    pending: "y",
    marks: { a: { line: 0, col: 3 } },
    pendingMark: { kind: "jumpExact", operator: "yank", operatorKey: "y" },
  });
  const yanked = handleModalInput(
    prefix.state,
    { text: "hello", lines: ["hello"], cursor: { line: 0, col: 1 } },
    options,
    "a",
  );
  expect(yanked.state).toEqual({
    mode: "normal",
    marks: { a: { line: 0, col: 3 } },
    register: { type: "char", text: "ell" },
  });

  const deleted = handleModalInput(
    {
      mode: "normal",
      pendingMark: { kind: "jumpLine", operator: "delete", operatorKey: "d" },
      marks: { a: { line: 2, col: 3 } },
    },
    { text: "one\ntwo\nthree", lines: ["one", "two", "three"], cursor: { line: 1, col: 1 } },
    options,
    "a",
  );
  expect(deleted.effects[0]).toEqual({
    type: "edit",
    result: {
      text: "one",
      cursor: { line: 0, col: 0 },
      register: { type: "line", text: "two\nthree" },
      changed: true,
    },
  });
});
