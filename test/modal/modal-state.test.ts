import { expect, test } from "vitest";
import type { ModalEffect, ModalState } from "../../src/modal/types.ts";
import { createModalState, resetTransientState, transitionMode } from "../../src/modal/state.ts";
import { p, cursor, options, applyModalKeys } from "./shared.ts";

test("createModalState starts with configured mode and empty transient state", () => {
  expect(createModalState("normal")).toEqual({ mode: "normal" });
});

test("normal mode scroll motions move by half visible prompt page", () => {
  const text = Array.from({ length: 10 }, (_, index) => `line-${index}`).join("\n");
  expect(applyModalKeys({ mode: "normal" }, text, p(1, 4), ["\x04"], options, 20).cursor).toEqual(
    p(4, 4),
  );
  expect(applyModalKeys({ mode: "normal" }, text, p(4, 4), ["\x15"], options, 20).cursor).toEqual(
    p(1, 4),
  );
  expect(
    applyModalKeys({ mode: "normal" }, text, p(1, 4), ["2", "\x04"], options, 20).cursor,
  ).toEqual(p(7, 4));
  expect(
    applyModalKeys({ mode: "normal" }, "abcdef\nx", p(0, 5), ["\x04"], options, 20).cursor,
  ).toEqual(p(1, 1));
});

test("visual scroll motions preserve anchor and insert mode delegates", () => {
  const text = "zero\none\ntwo\nthree\nfour";
  const visual = applyModalKeys(
    { mode: "visual", visualAnchor: p(0, 1) },
    text,
    p(0, 1),
    ["\x04"],
    options,
    20,
  );
  expect(visual.state.visualAnchor).toEqual(p(0, 1));
  expect(visual.cursor).toEqual(p(3, 1));

  const insert = applyModalKeys({ mode: "insert" }, text, p(0, 0), ["\x04"], options, 20);
  expect(insert.effects).toContainEqual({ type: "delegate", input: "\x04" });
});

test("resetTransientState clears visual and pending state without dropping registers", () => {
  const state: ModalState = {
    mode: "visual",
    pending: "d",
    pendingRegister: { kind: "named", slot: "a", append: false },
    visualAnchor: cursor,
    register: { type: "char", text: "x" },
    namedRegisters: { a: { type: "line", text: "one" } },
    marks: { a: cursor },
    pendingMark: { kind: "jumpExact" },
    lastCharSearch: { command: "findCharForward", target: ":" },
    lastSearch: { query: "two", direction: "forward" },
    lastRepeatableChange: { type: "command", command: "deleteChar" },
  };

  expect(resetTransientState(state, "insert")).toEqual({
    mode: "insert",
    register: { type: "char", text: "x" },
    namedRegisters: { a: { type: "line", text: "one" } },
    marks: { a: cursor },
    lastCharSearch: { command: "findCharForward", target: ":" },
    lastSearch: { query: "two", direction: "forward" },
    lastRepeatableChange: { type: "command", command: "deleteChar" },
  });
});

test("transitionMode returns terminal cursor and invalidate effects", () => {
  const result = transitionMode({ mode: "normal" }, "visual", {
    startMode: "insert",
    cursor: {
      insert: "bar",
      normal: "block",
      visual: "underline",
      visualLine: "block",
      visualBlock: "block",
    },
  });

  expect(result.state).toEqual({ mode: "visual" });
  expect(result.effects).toEqual<ModalEffect[]>([
    { type: "terminalCursor", style: "underline" },
    { type: "invalidate" },
  ]);
});

test("effect union supports adapter-applied intents", () => {
  const effects: ModalEffect[] = [
    { type: "delegate", input: "\r" },
    { type: "adapterCommand", command: "redo" },
    { type: "edit", result: { text: "x", cursor, changed: true } },
    {
      type: "openReadOnlyPopup",
      popup: {
        title: ":help",
        lines: ["help"],
        source: "help",
        scrollOffset: 0,
      },
    },
    { type: "playMacro", slot: "a", inputs: ["i", "x", "\x1b"] },
    { type: "copyClipboard", register: "+", text: "copied" },
    { type: "readClipboard", register: "+", placement: "after" },
    { type: "invalidate" },
    { type: "terminalCursor", style: "bar" },
  ];

  expect(effects.map((effect) => effect.type)).toEqual([
    "delegate",
    "adapterCommand",
    "edit",
    "openReadOnlyPopup",
    "playMacro",
    "copyClipboard",
    "readClipboard",
    "invalidate",
    "terminalCursor",
  ]);
});
