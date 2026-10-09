import { expect, test } from "vitest";
import type { ModalState } from "../../src/modal/types.ts";
import { resolveVimOptions } from "../../src/config.ts";
import { handleModalInputWithOptions as handleModalInput } from "../modal-test-helper.ts";
import { p, options, snapshot, applyModalKeys } from "./shared.ts";

test("keybindings opens catalog popup without editing state", () => {
  const configured = resolveVimOptions({ keymap: { commands: { redo: ["U"] } } }).options;
  const initial: ModalState = {
    mode: "normal",
    register: { type: "char", text: "saved" },
    namedRegisters: { a: { type: "line", text: "line" } },
    marks: { a: p(0, 1) },
    macros: { a: ["x"] },
    lastPlayedMacro: "a",
    lastSearch: { query: "abc", direction: "forward" },
    searchHighlight: { query: "abc", current: p(0, 0) },
    lastRepeatableChange: { type: "command", command: "deleteChar" },
    messageHistory: [{ kind: "info", text: "kept" }],
  };
  const result = applyModalKeys(
    initial,
    "abc",
    p(0, 1),
    [":", "k", "e", "y", "b", "i", "n", "d", "i", "n", "g", "s", "\r"],
    configured,
  );
  const popupText = [result.state.helpPopup?.title, ...(result.state.helpPopup?.lines ?? [])].join(
    "\n",
  );

  expect(result.text).toBe("abc");
  expect(result.cursor).toEqual(p(0, 1));
  expect(result.state.mode).toBe("normal");
  expect(result.state.exMessage).toBeUndefined();
  expect(result.state.helpPopup?.title).toBe(":keybindings");
  expect(result.state.helpPopup?.source).toBe("keybindings");
  expect(popupText).not.toContain("Effective pi-vim keybindings");
  expect(popupText).toContain("Key            Mode        Action");
  expect(popupText).toContain("command.redo");
  expect(popupText).toContain("U");
  expect(popupText).toContain("no runtime :map");
  expect(result.state.register).toEqual(initial.register);
  expect(result.state.namedRegisters).toEqual(initial.namedRegisters);
  expect(result.state.marks).toEqual(initial.marks);
  expect(result.state.macros).toEqual(initial.macros);
  expect(result.state.lastPlayedMacro).toEqual(initial.lastPlayedMacro);
  expect(result.state.lastSearch).toEqual(initial.lastSearch);
  expect(result.state.searchHighlight).toEqual(initial.searchHighlight);
  expect(result.state.lastRepeatableChange).toEqual(initial.lastRepeatableChange);
  expect(result.state.messageHistory).toEqual(initial.messageHistory);
});

test("keybindings detail popup preserves message history while scrolling and dismissing", () => {
  const initial: ModalState = {
    mode: "normal",
    messageHistory: [{ kind: "info", text: "kept" }],
    lastRepeatableChange: { type: "command", command: "deleteChar" },
  };
  const opened = applyModalKeys(initial, "abc", p(0, 1), [
    ":",
    "k",
    "e",
    "y",
    "b",
    "i",
    "n",
    "d",
    "i",
    "n",
    "g",
    "s",
    " ",
    "r",
    "e",
    "d",
    "o",
    "\r",
  ]);

  expect(opened.state.helpPopup?.title).toBe(":keybindings redo");
  expect(opened.state.helpPopup?.lines.join("\n")).toContain("command.redo");
  expect(opened.state.messageHistory).toEqual(initial.messageHistory);
  const scrolled = applyModalKeys(opened.state, "abc", p(0, 1), ["j", "\x1b"]);
  expect(scrolled.state.helpPopup).toBeUndefined();
  expect(scrolled.state.messageHistory).toEqual(initial.messageHistory);
  expect(scrolled.state.lastRepeatableChange).toEqual(initial.lastRepeatableChange);
});

test("visual keybindings Ex command restores visual source state", () => {
  const opened = handleModalInput(
    { mode: "visualLine", visualAnchor: p(0, 0) },
    { text: "one\ntwo", lines: ["one", "two"], cursor: p(1, 2) },
    options,
    ":",
  );
  let state = opened.state;
  for (const key of ["k", "e", "y", "b", "i", "n", "d", "i", "n", "g", "s"]) {
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

  expect(result.state.mode).toBe("visualLine");
  expect(result.state.visualAnchor).toEqual(p(0, 0));
  expect(result.effects).toContainEqual({ type: "restoreCursor", position: p(1, 2) });
  expect(result.state.helpPopup?.title).toBe(":keybindings");
  expect(result.effects).toContainEqual({
    type: "openReadOnlyPopup",
    popup: result.state.helpPopup!,
  });
});

test("popup dismisses with escape without clearing durable state", () => {
  const initial: ModalState = {
    mode: "normal",
    helpPopup: {
      title: ":keybindings",
      lines: ["U              normal      command.redo"],
      source: "keybindings",
      scrollOffset: 0,
    },
    register: { type: "char", text: "saved" },
    marks: { a: p(0, 1) },
    macros: { a: ["x"] },
    searchHighlight: { query: "abc", current: p(0, 0) },
    lastRepeatableChange: { type: "command", command: "deleteChar" },
    messageHistory: [{ kind: "info", text: "kept" }],
  };
  const result = applyModalKeys(initial, "abc", p(0, 1), ["\x1b"]);

  expect(result.text).toBe("abc");
  expect(result.cursor).toEqual(p(0, 1));
  expect(result.state.mode).toBe("normal");
  expect(result.state.helpPopup).toBeUndefined();
  expect(result.state.register).toEqual(initial.register);
  expect(result.state.marks).toEqual(initial.marks);
  expect(result.state.macros).toEqual(initial.macros);
  expect(result.state.searchHighlight).toEqual(initial.searchHighlight);
  expect(result.state.lastRepeatableChange).toEqual(initial.lastRepeatableChange);
  expect(result.state.messageHistory).toEqual(initial.messageHistory);
});

test("popup scroll keys are local and read-only", () => {
  const initial: ModalState = {
    mode: "normal",
    helpPopup: {
      title: ":keybindings",
      lines: [
        "one",
        "two",
        "three",
        "four",
        "five",
        "six",
        "seven",
        "eight",
        "nine",
        "ten",
        "eleven",
        "twelve",
      ],
      source: "keybindings",
      scrollOffset: 0,
    },
    register: { type: "char", text: "saved" },
    namedRegisters: { a: { type: "line", text: "line" } },
    marks: { a: p(0, 1) },
    macros: { a: ["x"] },
    lastPlayedMacro: "a",
    lastSearch: { query: "abc", direction: "forward" },
    searchHighlight: { query: "abc", current: p(0, 0) },
    lastRepeatableChange: { type: "command", command: "deleteChar" },
    messageHistory: [{ kind: "info", text: "kept" }],
  };

  const result = applyModalKeys(initial, "abc", p(0, 1), ["j", "\x1b[B", "x", "k"]);

  expect(result.text).toBe("abc");
  expect(result.cursor).toEqual(p(0, 1));
  expect(result.state.mode).toBe("normal");
  expect(result.state.helpPopup?.scrollOffset).toBe(1);
  expect(result.state.register).toEqual(initial.register);
  expect(result.state.namedRegisters).toEqual(initial.namedRegisters);
  expect(result.state.marks).toEqual(initial.marks);
  expect(result.state.macros).toEqual(initial.macros);
  expect(result.state.lastPlayedMacro).toEqual(initial.lastPlayedMacro);
  expect(result.state.lastSearch).toEqual(initial.lastSearch);
  expect(result.state.searchHighlight).toEqual(initial.searchHighlight);
  expect(result.state.lastRepeatableChange).toEqual(initial.lastRepeatableChange);
  expect(result.state.messageHistory).toEqual(initial.messageHistory);

  const clampedTop = applyModalKeys(result.state, "abc", p(0, 1), ["k", "k", "\x1b[A"]);
  expect(clampedTop.state.helpPopup?.scrollOffset).toBe(0);
  const clampedBottom = applyModalKeys(clampedTop.state, "abc", p(0, 1), [
    "j",
    "j",
    "j",
    "j",
    "j",
    "j",
  ]);
  expect(clampedBottom.state.helpPopup?.scrollOffset).toBe(2);
});

test("popup scroll and dismissal are excluded from macro recording", () => {
  const initial: ModalState = {
    mode: "normal",
    recordingSlot: "a",
    macros: { a: [] },
    helpPopup: {
      title: ":keybindings",
      lines: [
        "one",
        "two",
        "three",
        "four",
        "five",
        "six",
        "seven",
        "eight",
        "nine",
        "ten",
        "eleven",
        "twelve",
      ],
      source: "keybindings",
      scrollOffset: 0,
    },
  };

  const scrolled = applyModalKeys(initial, "abc", p(0, 1), ["j", "k", "j"]);
  expect(scrolled.state.helpPopup?.scrollOffset).toBe(1);
  expect(scrolled.state.macros).toEqual({ a: [] });
  expect(scrolled.state.recordingSlot).toBe("a");

  const dismissed = applyModalKeys(scrolled.state, "abc", p(0, 1), ["\x1b"]);
  expect(dismissed.state.helpPopup).toBeUndefined();
  expect(dismissed.state.macros).toEqual({ a: [] });
  expect(dismissed.state.recordingSlot).toBe("a");
});

test("runtime help Ex commands report info without editing state", () => {
  const initial: ModalState = {
    mode: "normal",
    register: { type: "char", text: "saved" },
    namedRegisters: { a: { type: "line", text: "line" } },
    marks: { a: p(0, 1) },
    macros: { a: ["x"] },
    lastPlayedMacro: "a",
    lastSearch: { query: "abc", direction: "forward" },
    searchHighlight: { query: "abc", current: p(0, 0) },
    lastRepeatableChange: { type: "command", command: "deleteChar" },
  };
  const result = applyModalKeys(initial, "abc", p(0, 1), [
    ":",
    "h",
    "e",
    "l",
    "p",
    " ",
    "v",
    "i",
    "m",
    "d",
    "o",
    "c",
    "t",
    "o",
    "r",
    "\r",
  ]);

  expect(result.text).toBe("abc");
  expect(result.cursor).toEqual(p(0, 1));
  expect(result.state.register).toEqual(initial.register);
  expect(result.state.namedRegisters).toEqual(initial.namedRegisters);
  expect(result.state.marks).toEqual(initial.marks);
  expect(result.state.macros).toEqual(initial.macros);
  expect(result.state.lastPlayedMacro).toEqual(initial.lastPlayedMacro);
  expect(result.state.lastSearch).toEqual(initial.lastSearch);
  expect(result.state.searchHighlight).toEqual(initial.searchHighlight);
  expect(result.state.lastRepeatableChange).toEqual(initial.lastRepeatableChange);
  expect(result.state.exMessage).toBeUndefined();
  expect(result.state.helpPopup?.title).toBe(":help vimdoctor");
  expect(result.state.helpPopup?.lines.join("\n")).toContain("customization");
});

test("visual keybindings popup restores visual state after marker deletion", () => {
  const opened = handleModalInput(
    { mode: "visual", visualAnchor: p(0, 1) },
    { text: "one\ntwo", lines: ["one", "two"], cursor: p(1, 2) },
    options,
    ":",
  );
  let state = opened.state;
  for (const _ of ["'", ">", ",", "'", "<"]) {
    state = handleModalInput(
      state,
      { text: "one\ntwo", lines: ["one", "two"], cursor: p(1, 2) },
      options,
      "\b",
    ).state;
  }
  for (const key of ["k", "e", "y", "b", "i", "n", "d", "i", "n", "g", "s"]) {
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
  expect(result.state.helpPopup?.title).toBe(":keybindings");
});

test("visual runtime help Ex commands preserve visual state after marker deletion", () => {
  const opened = handleModalInput(
    { mode: "visual", visualAnchor: p(0, 1) },
    { text: "one\ntwo", lines: ["one", "two"], cursor: p(1, 2) },
    options,
    ":",
  );
  let state = opened.state;
  for (const _ of ["'", ">", ",", "'", "<"]) {
    state = handleModalInput(
      state,
      { text: "one\ntwo", lines: ["one", "two"], cursor: p(1, 2) },
      options,
      "\b",
    ).state;
  }
  for (const key of ["h", "e", "l", "p"]) {
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
  expect(result.state.helpPopup?.title).toBe(":help");
  expect(result.state.helpPopup?.lines.join("\n")).toContain("help:");
});

test("no-op feedback is quiet by default and bounded when enabled", () => {
  const quiet = handleModalInput({ mode: "normal" }, snapshot, options, "z");
  expect(quiet.state.exMessage).toBeUndefined();

  const noisy = handleModalInput(
    { mode: "normal" },
    snapshot,
    { ...options, feedback: { noop: "status" } },
    "z",
  );
  expect(noisy.state.exMessage).toEqual({ kind: "info", text: "unmapped key: z" });

  const redo = handleModalInput(
    { mode: "normal" },
    { ...snapshot, isRedoAvailable: false },
    { ...options, feedback: { noop: "status" } },
    "\x12",
  );
  expect(redo.state.exMessage).toEqual({ kind: "info", text: "redo stack empty" });
});

test("protected shortcut feedback explains delegation when enabled", () => {
  const update = handleModalInput(
    { mode: "normal", pending: "d" },
    snapshot,
    { ...options, feedback: { noop: "status" } },
    "\x10",
  );

  expect(update.effects).toContainEqual({ type: "delegate", input: "\x10" });
  expect(update.state.pending).toBeUndefined();
  expect(update.state.exMessage?.text).toContain("ctrl+p protected");
});

test("vim inspect reports bounded read-only state", () => {
  const initial: ModalState = {
    mode: "normal",
    register: { type: "char", text: "secret register payload" },
    namedRegisters: { a: { type: "line", text: "named secret" } },
    marks: { a: p(0, 1) },
    macros: { q: ["i", "x", "\x1b"] },
    lastSearch: { query: "abc", direction: "forward" },
    searchHighlight: { query: "abc", current: p(0, 0) },
    lastRepeatableChange: { type: "command", command: "deleteChar" },
    pendingEx: { command: "vim inspect", sourceMode: "normal" },
  };

  const result = handleModalInput(initial, snapshot, options, "\r");

  expect(result.state.mode).toBe("normal");
  expect(result.effects).toEqual([
    { type: "invalidate" },
    { type: "openReadOnlyPopup", popup: result.state.helpPopup! },
  ]);
  expect(result.state.register).toEqual(initial.register);
  expect(result.state.namedRegisters).toEqual(initial.namedRegisters);
  expect(result.state.marks).toEqual(initial.marks);
  expect(result.state.macros).toEqual(initial.macros);
  expect(result.state.lastSearch).toEqual(initial.lastSearch);
  expect(result.state.searchHighlight).toEqual(initial.searchHighlight);
  expect(result.state.lastRepeatableChange).toEqual(initial.lastRepeatableChange);
  expect(result.state.exMessage).toBeUndefined();
  const popupText = result.state.helpPopup?.lines.join("\n") ?? "";
  expect(result.state.helpPopup?.title).toBe(":vim inspect");
  expect(popupText).toContain("inspect: mode=normal");
  expect(popupText).toContain("registers=unnamed-char:23,named-1(a)");
  expect(popupText).not.toContain("secret register payload");
  expect(popupText).not.toContain("named secret");
});

test("vim inspect from visual Ex restores visual state", () => {
  const result = handleModalInput(
    {
      mode: "visual",
      visualAnchor: p(0, 1),
      pendingEx: {
        command: "vim inspect",
        sourceMode: "visual",
        visualAnchor: p(0, 1),
        visualCursor: p(0, 2),
        visualRange: { startLine: 0, endLine: 0 },
      },
    },
    snapshot,
    options,
    "\r",
  );

  expect(result.state.mode).toBe("visual");
  expect(result.state.visualAnchor).toEqual(p(0, 1));
  expect(result.state.pendingEx).toBeUndefined();
  expect(result.state.exMessage).toBeUndefined();
  expect(result.state.helpPopup?.lines.join("\n")).toContain("inspect: mode=visual");
});

test("runtime messages are retained with bounded history", () => {
  const empty = handleModalInput(
    { mode: "normal", pendingEx: { command: "messages", sourceMode: "normal" } },
    snapshot,
    options,
    "\r",
  );
  expect(empty.state.exMessage).toBeUndefined();
  expect(empty.state.helpPopup?.title).toBe(":messages");
  expect(empty.state.helpPopup?.lines).toContain("messages: none retained");
  expect(empty.state.messageHistory).toBeUndefined();

  const error = handleModalInput(
    { mode: "normal", pendingEx: { command: "s/missing/new/", sourceMode: "normal" } },
    snapshot,
    options,
    "\r",
  );
  expect(error.state.messageHistory).toEqual([
    { kind: "error", text: "Pattern not found: missing" },
  ]);

  const cleared = handleModalInput(error.state, snapshot, options, ":");
  expect(cleared.state.exMessage).toBeUndefined();
  expect(cleared.state.messageHistory).toEqual(error.state.messageHistory);

  const messages = handleModalInput(
    { ...cleared.state, pendingEx: { command: "messages", sourceMode: "normal" } },
    snapshot,
    options,
    "\r",
  );
  expect(messages.state.exMessage).toBeUndefined();
  expect(messages.state.helpPopup?.lines).toContain("messages: 1 retained");
  expect(messages.state.helpPopup?.lines).toContain("latest: Pattern not found: missing");
  expect(messages.state.messageHistory).toEqual(error.state.messageHistory);
});

test("keybinding popup does not pollute retained runtime messages", () => {
  const history = [{ kind: "info" as const, text: "kept" }];
  const popup = handleModalInput(
    {
      mode: "normal",
      messageHistory: history,
      pendingEx: { command: "keybindings", sourceMode: "normal" },
    },
    snapshot,
    options,
    "\r",
  );
  expect(popup.state.helpPopup?.title).toBe(":keybindings");
  expect(popup.state.messageHistory).toEqual(history);

  const dismissed = handleModalInput(popup.state, snapshot, options, "\x1b");
  expect(dismissed.state.helpPopup).toBeUndefined();
  expect(dismissed.state.messageHistory).toEqual(history);

  const messages = handleModalInput(
    { ...dismissed.state, pendingEx: { command: "messages", sourceMode: "normal" } },
    snapshot,
    options,
    "\r",
  );
  expect(messages.state.exMessage).toBeUndefined();
  expect(messages.state.helpPopup?.lines).toContain("messages: 1 retained");
  expect(messages.state.helpPopup?.lines).toContain("latest: kept");
  expect(messages.state.helpPopup?.lines.join("\n")).not.toContain("Key            Mode");
  expect(messages.state.messageHistory).toEqual(history);
});

test("message history cap discards oldest entries", () => {
  const history = Array.from({ length: 20 }, (_, index) => ({
    kind: "info" as const,
    text: `old ${index}`,
  }));
  const result = handleModalInput(
    {
      mode: "normal",
      messageHistory: history,
      pendingEx: { command: "s/missing/new/", sourceMode: "normal" },
    },
    snapshot,
    options,
    "\r",
  );

  expect(result.state.messageHistory).toHaveLength(20);
  expect(result.state.messageHistory?.[0]?.text).toBe("old 1");
  expect(result.state.messageHistory?.at(-1)?.text).toBe("Pattern not found: missing");
});

test("normal showKeybindings semantic command opens popup without modal side effects", () => {
  const configured = resolveVimOptions({
    keymap: { commands: { showKeybindings: ["gk"] } },
  }).options;
  const initial: ModalState = {
    mode: "normal",
    register: { type: "char", text: "saved" },
    namedRegisters: { a: { type: "line", text: "line" } },
    marks: { a: p(0, 1) },
    macros: { a: ["x"] },
    lastSearch: { query: "abc", direction: "forward" },
    searchHighlight: { query: "abc", current: p(0, 0) },
    lastRepeatableChange: { type: "command", command: "deleteChar" },
    messageHistory: [{ kind: "info", text: "kept" }],
  };
  const result = applyModalKeys(initial, "abc", p(0, 1), ["g", "k"], configured);

  expect(result.text).toBe("abc");
  expect(result.cursor).toEqual(p(0, 1));
  expect(result.state.helpPopup?.title).toBe(":keybindings");
  expect(result.state.helpPopup?.source).toBe("keybindings");
  expect(result.state.helpPopup?.lines.join("\n")).not.toContain("Effective pi-vim keybindings");
  expect(result.state.helpPopup?.lines.join("\n")).toContain("Key            Mode        Action");
  expect(result.state.register).toEqual(initial.register);
  expect(result.state.namedRegisters).toEqual(initial.namedRegisters);
  expect(result.state.marks).toEqual(initial.marks);
  expect(result.state.macros).toEqual(initial.macros);
  expect(result.state.lastSearch).toEqual(initial.lastSearch);
  expect(result.state.searchHighlight).toEqual(initial.searchHighlight);
  expect(result.state.lastRepeatableChange).toEqual(initial.lastRepeatableChange);
  expect(result.state.messageHistory).toEqual(initial.messageHistory);
});
