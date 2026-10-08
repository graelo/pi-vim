import { expect, test } from "vitest";

import {
  isMacroSlot,
  isPendingOperatorKey,
  parseNormalCommand,
  resolveMacroCommand,
  resolveNormalCommand,
} from "../src/commands.ts";
import { DEFAULT_VIM_KEYMAP, resolveVimOptions } from "../src/config.ts";

const operatorMotions = [
  "h",
  "j",
  "k",
  "l",
  "w",
  "b",
  "e",
  "W",
  "B",
  "E",
  "ge",
  "gE",
  "0",
  "^",
  "$",
  "G",
  "%",
  "{",
  "}",
] as const;

test("creates pending state for operators and g prefix", () => {
  expect(parseNormalCommand("d")).toEqual({ type: "pending", operator: "d" });
  expect(parseNormalCommand("c")).toEqual({ type: "pending", operator: "c" });
  expect(parseNormalCommand("y")).toEqual({ type: "pending", operator: "y" });
  expect(parseNormalCommand("g")).toEqual({ type: "pending", operator: "g" });
});

test("resolves doubled line commands and gg", () => {
  expect(parseNormalCommand("d", "d")).toEqual({ type: "command", command: "dd" });
  expect(parseNormalCommand("c", "c")).toEqual({ type: "command", command: "cc" });
  expect(parseNormalCommand("y", "y")).toEqual({ type: "command", command: "yy" });
  expect(parseNormalCommand("g", "g")).toEqual({ type: "command", command: "gg" });
});

test("resolves shift operators as line-only semantic commands", () => {
  expect(resolveNormalCommand(">", undefined)).toEqual({ type: "pending", pending: ">" });
  expect(resolveNormalCommand("<", undefined)).toEqual({ type: "pending", pending: "<" });
  expect(resolveNormalCommand(">", ">")).toEqual({ type: "lineCommand", operator: "indent" });
  expect(resolveNormalCommand("<", "<")).toEqual({ type: "lineCommand", operator: "dedent" });

  const count = resolveNormalCommand("3", undefined);
  const pendingIndent = resolveNormalCommand(">", count.type === "pending" ? count.pending : "");
  expect(
    resolveNormalCommand(">", pendingIndent.type === "pending" ? pendingIndent.pending : ""),
  ).toEqual({ type: "lineCommand", operator: "indent", count: 3 });

  const dedentCount = resolveNormalCommand("2", undefined);
  const pendingDedent = resolveNormalCommand(
    "<",
    dedentCount.type === "pending" ? dedentCount.pending : "",
  );
  expect(
    resolveNormalCommand("<", pendingDedent.type === "pending" ? pendingDedent.pending : ""),
  ).toEqual({ type: "lineCommand", operator: "dedent", count: 2 });
});

test("resolves operator motions", () => {
  for (const operator of ["d", "c", "y"] as const) {
    for (const motion of operatorMotions) {
      expect(parseNormalCommand(motion, operator)).toEqual({
        type: "operatorMotion",
        operator,
        motion,
      });
    }
    const pendingG = resolveNormalCommand("g", operator);
    expect(pendingG.type).toBe("pending");
    expect(resolveNormalCommand("g", pendingG.type === "pending" ? pendingG.pending : "")).toEqual({
      type: "operatorMotion",
      operator: operator === "d" ? "delete" : operator === "c" ? "change" : "yank",
      motion: "bufferStart",
    });
  }
});

test("resolves finite case operators", () => {
  const lowercase = resolveNormalCommand("u", "g");
  expect(lowercase).toEqual({ type: "pending", pending: "gu" });
  expect(resolveNormalCommand("w", lowercase.type === "pending" ? lowercase.pending : "")).toEqual({
    type: "operatorMotion",
    operator: "lowercase",
    motion: "wordForward",
  });

  const uppercase = resolveNormalCommand("U", "g");
  const innerWord = resolveNormalCommand(
    "i",
    uppercase.type === "pending" ? uppercase.pending : "",
  );
  expect(innerWord.type).toBe("pending");
  expect(resolveNormalCommand("w", innerWord.type === "pending" ? innerWord.pending : "")).toEqual({
    type: "operatorTextObject",
    operator: "uppercase",
    textObject: { kind: "inner", target: "word" },
  });

  const toggle = resolveNormalCommand("~", "g");
  expect(resolveNormalCommand("g", toggle.type === "pending" ? toggle.pending : "")).toEqual({
    type: "pending",
    pending: "g~\u0000line\u0000g\u0000line\u0000",
  });
  expect(resolveNormalCommand("~", "g~\u0000line\u0000g\u0000line\u0000")).toEqual({
    type: "lineCommand",
    operator: "toggleCase",
  });

  const counted = resolveNormalCommand("2", undefined);
  const countedLower = resolveNormalCommand("g", counted.type === "pending" ? counted.pending : "");
  const countedLowercase = resolveNormalCommand(
    "u",
    countedLower.type === "pending" ? countedLower.pending : "",
  );
  expect(
    resolveNormalCommand("w", countedLowercase.type === "pending" ? countedLowercase.pending : ""),
  ).toEqual({ type: "operatorMotion", operator: "lowercase", motion: "wordForward", count: 2 });
});

test("case operators preserve g-prefix motions and reject unsupported targets", () => {
  expect(resolveNormalCommand("g", "g")).toEqual({ type: "motion", motion: "bufferStart" });
  expect(resolveNormalCommand("e", "g")).toEqual({
    type: "motion",
    motion: "wordPreviousEnd",
  });
  expect(resolveNormalCommand("E", "g")).toEqual({
    type: "motion",
    motion: "wordPreviousEndBig",
  });
  const lowercase = resolveNormalCommand("u", "g");
  const pending = lowercase.type === "pending" ? lowercase.pending : "";
  expect(resolveNormalCommand("/", pending)).toEqual({ type: "invalid" });
  expect(resolveNormalCommand("f", pending)).toEqual({ type: "invalid" });
  expect(resolveNormalCommand(";", pending)).toEqual({ type: "invalid" });
  expect(resolveNormalCommand("'", pending)).toEqual({ type: "invalid" });
});

test("invalid pending key clears state", () => {
  expect(parseNormalCommand("x", "d")).toEqual({ type: "invalid" });
  expect(parseNormalCommand("p", "c")).toEqual({ type: "invalid" });
  expect(parseNormalCommand("d", "y")).toEqual({ type: "invalid" });
  expect(parseNormalCommand("x", "g")).toEqual({ type: "invalid" });
});

test("shift operators reject unsupported targets safely", () => {
  expect(resolveNormalCommand("w", ">")).toEqual({ type: "invalid" });

  const indentInner = resolveNormalCommand("i", ">");
  expect(indentInner).toEqual({ type: "invalid" });

  expect(resolveNormalCommand("/", ">")).toEqual({ type: "invalid" });
  expect(resolveNormalCommand("'", ">")).toEqual({ type: "invalid" });
  expect(resolveNormalCommand("w", "<")).toEqual({ type: "invalid" });
});

test("non-command key is not parsed", () => {
  expect(parseNormalCommand("x")).toEqual({ type: "none" });
});

test("pending key type guard", () => {
  expect(isPendingOperatorKey("d")).toBe(true);
  expect(isPendingOperatorKey("c")).toBe(true);
  expect(isPendingOperatorKey("y")).toBe(true);
  expect(isPendingOperatorKey("g")).toBe(true);
  expect(isPendingOperatorKey("x")).toBe(false);
});

test("explicit motion binding wins over default macro record binding", () => {
  const keymap = resolveVimOptions({
    piVim: { keymap: { motions: { wordForward: ["q"] } } },
  }).options.keymap;

  expect(resolveNormalCommand("q", undefined, keymap)).toEqual({
    type: "motion",
    motion: "wordForward",
  });
});

test("explicit single-key binding wins over default longer prefix bindings", () => {
  const keymap = resolveVimOptions({
    piVim: { keymap: { motions: { left: ["g"] } } },
  }).options.keymap;

  expect(resolveNormalCommand("g", undefined, keymap)).toEqual({
    type: "motion",
    motion: "left",
  });
});

test("active digit leader takes precedence over count parsing", () => {
  const keymap = resolveVimOptions({
    piVim: { leader: "1", keymap: { commands: { undo: ["<leader>u"] } } },
  }).options.keymap;

  expect(resolveNormalCommand("1", undefined, keymap)).toEqual({ type: "pending", pending: "1" });
  expect(resolveNormalCommand("u", "1", keymap)).toEqual({ type: "command", command: "undo" });
  expect(resolveNormalCommand("2", undefined, keymap)).toEqual({
    type: "pending",
    pending: "2\u0000count\u0000",
  });
});

test("resolves macro prefixes and targets separately from operator state", () => {
  expect(isMacroSlot("a")).toBe(true);
  expect(isMacroSlot("z")).toBe(true);
  expect(isMacroSlot("A")).toBe(false);
  expect(isMacroSlot("1")).toBe(false);
  expect(resolveMacroCommand("q", undefined, false)).toEqual({
    type: "pendingMacro",
    target: "record",
  });
  expect(resolveMacroCommand("a", "record", false)).toEqual({
    type: "startRecording",
    slot: "a",
  });
  expect(resolveMacroCommand("1", "record", false)).toEqual({ type: "invalid" });
  expect(resolveMacroCommand("q", undefined, true)).toEqual({ type: "stopRecording" });
  expect(resolveMacroCommand("@", undefined, false)).toEqual({
    type: "pendingMacro",
    target: "play",
  });
  expect(resolveMacroCommand("a", "play", false)).toEqual({ type: "playMacro", slot: "a" });
  expect(resolveMacroCommand("@", "play", false)).toEqual({ type: "repeatMacro" });
  expect(resolveMacroCommand("w", undefined, false)).toEqual({ type: "none" });
  expect(
    resolveMacroCommand("m", undefined, false, {
      recordKeys: ["m"],
      playKeys: ["r"],
      slots: ["x"],
    }),
  ).toEqual({ type: "pendingMacro", target: "record" });
  expect(
    resolveMacroCommand("x", "record", false, {
      recordKeys: ["m"],
      playKeys: ["r"],
      slots: ["x"],
    }),
  ).toEqual({ type: "startRecording", slot: "x" });
  expect(resolveMacroCommand("q", undefined, false, { enabled: false })).toEqual({
    type: "none",
  });
});

test("resolves configured keybindings popup command through semantic parser", () => {
  const keymap = resolveVimOptions({
    piVim: { keymap: { commands: { showKeybindings: ["gk"] } } },
  }).options.keymap;

  const pending = resolveNormalCommand("g", undefined, keymap);
  expect(pending).toEqual({ type: "pending", pending: "g" });
  expect(
    resolveNormalCommand("k", pending.type === "pending" ? pending.pending : "", keymap),
  ).toEqual({
    type: "command",
    command: "showKeybindings",
  });
});

test("named terminal command mappings stay atomic at runtime", () => {
  const keymap = resolveVimOptions({
    piVim: { keymap: { commands: { undo: ["<Home>", "<F1>"] } } },
  }).options.keymap!;

  expect(resolveNormalCommand("h", undefined, keymap)).toEqual({
    type: "motion",
    motion: "left",
  });
  expect(resolveNormalCommand("f", undefined, keymap)).toMatchObject({ type: "pending" });
  expect(resolveNormalCommand("home", undefined, keymap)).toMatchObject({
    type: "command",
    command: "undo",
  });
  expect(resolveNormalCommand("f1", undefined, keymap)).toMatchObject({
    type: "command",
    command: "undo",
  });
});

test("resolves configured semantic operators, motions, and commands", () => {
  const keymap = {
    ...DEFAULT_VIM_KEYMAP,
    operators: { ...DEFAULT_VIM_KEYMAP.operators, delete: ["q"], lowercase: ["zu"] },
    motions: { ...DEFAULT_VIM_KEYMAP.motions, wordForward: ["e"], halfPageDown: ["zz"] },
    commands: {
      ...DEFAULT_VIM_KEYMAP.commands,
      openLineBelow: ["n"],
      toggleCase: ["~"],
      visualBlock: ["ctrl+v"],
      redo: ["ctrl+r"],
    },
  };

  expect(resolveNormalCommand("q", undefined, keymap)).toEqual({
    type: "pending",
    pending: "q",
  });
  expect(resolveNormalCommand("e", "q", keymap)).toEqual({
    type: "operatorMotion",
    operator: "delete",
    motion: "wordForward",
  });
  expect(resolveNormalCommand("n", undefined, keymap)).toEqual({
    type: "command",
    command: "openLineBelow",
  });
  expect(resolveNormalCommand("~", undefined, keymap)).toEqual({
    type: "command",
    command: "toggleCase",
  });
  expect(resolveNormalCommand("ctrl+v", undefined, keymap)).toEqual({
    type: "command",
    command: "visualBlock",
  });
  expect(resolveNormalCommand("ctrl+r", undefined, keymap)).toEqual({
    type: "command",
    command: "redo",
  });
  expect(resolveNormalCommand("zz", undefined, keymap)).toEqual({
    type: "motion",
    motion: "halfPageDown",
  });
  const casePrefix = resolveNormalCommand("z", undefined, keymap);
  expect(
    resolveNormalCommand("u", casePrefix.type === "pending" ? casePrefix.pending : "", keymap),
  ).toEqual({ type: "pending", pending: "zu" });
  expect(resolveNormalCommand("e", "zu", keymap)).toEqual({
    type: "operatorMotion",
    operator: "lowercase",
    motion: "wordForward",
  });
});

test("resolves configured shift operator bindings as line-only", () => {
  const keymap = {
    ...DEFAULT_VIM_KEYMAP,
    operators: { ...DEFAULT_VIM_KEYMAP.operators, indent: ["]"], dedent: ["["] },
  };

  expect(resolveNormalCommand("]", undefined, keymap)).toEqual({ type: "pending", pending: "]" });
  expect(resolveNormalCommand("]", "]", keymap)).toEqual({
    type: "lineCommand",
    operator: "indent",
  });
  expect(resolveNormalCommand("[", "[", keymap)).toEqual({
    type: "lineCommand",
    operator: "dedent",
  });
  expect(resolveNormalCommand("w", "]", keymap)).toEqual({ type: "invalid" });
});

test("resolves default scroll motions and counts", () => {
  expect(resolveNormalCommand("ctrl+d", undefined, DEFAULT_VIM_KEYMAP)).toEqual({
    type: "motion",
    motion: "halfPageDown",
  });
  expect(resolveNormalCommand("ctrl+u", undefined, DEFAULT_VIM_KEYMAP)).toEqual({
    type: "motion",
    motion: "halfPageUp",
  });
  expect(resolveNormalCommand("ctrl+d", "2\u0000count\u0000", DEFAULT_VIM_KEYMAP)).toEqual({
    type: "motion",
    motion: "halfPageDown",
    count: 2,
  });
});

test("resolves default arrow-key motion aliases", () => {
  expect(resolveNormalCommand("left", undefined, DEFAULT_VIM_KEYMAP)).toEqual({
    type: "motion",
    motion: "left",
  });
  expect(resolveNormalCommand("down", undefined, DEFAULT_VIM_KEYMAP)).toEqual({
    type: "motion",
    motion: "down",
  });
  expect(resolveNormalCommand("up", undefined, DEFAULT_VIM_KEYMAP)).toEqual({
    type: "motion",
    motion: "up",
  });
  expect(resolveNormalCommand("right", undefined, DEFAULT_VIM_KEYMAP)).toEqual({
    type: "motion",
    motion: "right",
  });
});

test("resolves counted default arrow-key motions", () => {
  expect(resolveNormalCommand("left", "3\u0000count\u0000", DEFAULT_VIM_KEYMAP)).toEqual({
    type: "motion",
    motion: "left",
    count: 3,
  });
});

test("resolves finite multi-key sequences and invalid pending prefixes", () => {
  expect(resolveNormalCommand("g", undefined, DEFAULT_VIM_KEYMAP)).toEqual({
    type: "pending",
    pending: "g",
  });
  expect(resolveNormalCommand("g", "g", DEFAULT_VIM_KEYMAP)).toEqual({
    type: "motion",
    motion: "bufferStart",
  });
  expect(resolveNormalCommand("e", "g", DEFAULT_VIM_KEYMAP)).toEqual({
    type: "motion",
    motion: "wordPreviousEnd",
  });
  expect(resolveNormalCommand("E", "g", DEFAULT_VIM_KEYMAP)).toEqual({
    type: "motion",
    motion: "wordPreviousEndBig",
  });
  expect(resolveNormalCommand("x", "g", DEFAULT_VIM_KEYMAP)).toEqual({ type: "invalid" });
});

test("resolves multi-key operators and operator motions", () => {
  const keymap = {
    ...DEFAULT_VIM_KEYMAP,
    operators: { ...DEFAULT_VIM_KEYMAP.operators, delete: ["qq"] },
    motions: { ...DEFAULT_VIM_KEYMAP.motions, wordForward: ["ef"] },
  };

  const pendingOperatorPrefix = resolveNormalCommand("q", undefined, keymap);
  expect(pendingOperatorPrefix).toEqual({ type: "pending", pending: "q" });
  const pendingOperator = resolveNormalCommand("q", "q", keymap);
  expect(pendingOperator).toEqual({ type: "pending", pending: "qq" });

  const pendingMotion = resolveNormalCommand("e", "qq", keymap);
  expect(pendingMotion.type).toBe("pending");
  expect(
    resolveNormalCommand(
      "f",
      pendingMotion.type === "pending" ? pendingMotion.pending : "",
      keymap,
    ),
  ).toEqual({
    type: "operatorMotion",
    operator: "delete",
    motion: "wordForward",
  });

  const pendingRepeat = resolveNormalCommand("q", "qq", keymap);
  expect(pendingRepeat.type).toBe("pending");
  expect(
    resolveNormalCommand(
      "q",
      pendingRepeat.type === "pending" ? pendingRepeat.pending : "",
      keymap,
    ),
  ).toEqual({
    type: "lineCommand",
    operator: "delete",
  });
});

test("resolves counts for motions, line commands, and operator motions", () => {
  const count = resolveNormalCommand("3", undefined);
  expect(count.type).toBe("pending");
  const pending = count.type === "pending" ? count.pending : "";
  expect(resolveNormalCommand("w", pending)).toEqual({
    type: "motion",
    motion: "wordForward",
    count: 3,
  });

  const countToggle = resolveNormalCommand("3", undefined);
  expect(
    resolveNormalCommand("~", countToggle.type === "pending" ? countToggle.pending : ""),
  ).toEqual({
    type: "command",
    command: "toggleCase",
    count: 3,
  });

  const countDelete = resolveNormalCommand("2", undefined);
  const deletePending = resolveNormalCommand(
    "d",
    countDelete.type === "pending" ? countDelete.pending : "",
  );
  expect(deletePending.type).toBe("pending");
  expect(
    resolveNormalCommand("d", deletePending.type === "pending" ? deletePending.pending : ""),
  ).toEqual({ type: "lineCommand", operator: "delete", count: 2 });

  const countedOperator = resolveNormalCommand("4", undefined);
  const operatorPending = resolveNormalCommand(
    "d",
    countedOperator.type === "pending" ? countedOperator.pending : "",
  );
  expect(
    resolveNormalCommand("e", operatorPending.type === "pending" ? operatorPending.pending : ""),
  ).toEqual({ type: "operatorMotion", operator: "delete", motion: "wordEnd", count: 4 });

  const countedWord = resolveNormalCommand("2", undefined);
  expect(
    resolveNormalCommand("W", countedWord.type === "pending" ? countedWord.pending : ""),
  ).toEqual({ type: "motion", motion: "wordForwardBig", count: 2 });

  const countedPreviousEnd = resolveNormalCommand("2", undefined);
  const previousPrefix = resolveNormalCommand(
    "g",
    countedPreviousEnd.type === "pending" ? countedPreviousEnd.pending : "",
  );
  expect(
    resolveNormalCommand("e", previousPrefix.type === "pending" ? previousPrefix.pending : ""),
  ).toEqual({ type: "motion", motion: "wordPreviousEnd", count: 2 });

  const countedOperatorPreviousEnd = resolveNormalCommand("2", undefined);
  const operatorPreviousPending = resolveNormalCommand(
    "d",
    countedOperatorPreviousEnd.type === "pending" ? countedOperatorPreviousEnd.pending : "",
  );
  const operatorPreviousPrefix = resolveNormalCommand(
    "g",
    operatorPreviousPending.type === "pending" ? operatorPreviousPending.pending : "",
  );
  expect(
    resolveNormalCommand(
      "e",
      operatorPreviousPrefix.type === "pending" ? operatorPreviousPrefix.pending : "",
    ),
  ).toEqual({
    type: "operatorMotion",
    operator: "delete",
    motion: "wordPreviousEnd",
    count: 2,
  });
});

test("resolves prompt search commands and undo redo", () => {
  expect(resolveNormalCommand("u", undefined)).toEqual({ type: "command", command: "undo" });
  expect(resolveNormalCommand("ctrl+r", undefined)).toEqual({ type: "command", command: "redo" });
  expect(resolveNormalCommand(":", undefined)).toEqual({
    type: "command",
    command: "startExCommand",
  });
  expect(resolveNormalCommand("/", undefined)).toEqual({
    type: "command",
    command: "startSearch",
  });
  expect(resolveNormalCommand("?", undefined)).toEqual({
    type: "command",
    command: "startSearchBackward",
  });
  expect(resolveNormalCommand("n", undefined)).toEqual({
    type: "command",
    command: "repeatSearch",
  });
  expect(resolveNormalCommand("N", undefined)).toEqual({
    type: "command",
    command: "repeatSearchReverse",
  });
  expect(resolveNormalCommand("*", undefined)).toEqual({
    type: "command",
    command: "searchWordForward",
  });
  expect(resolveNormalCommand("#", undefined)).toEqual({
    type: "command",
    command: "searchWordBackward",
  });
  expect(resolveNormalCommand("/", "d")).toEqual({
    type: "operatorSearch",
    operator: "delete",
    direction: "forward",
    count: undefined,
  });
  expect(resolveNormalCommand("?", "d")).toEqual({
    type: "operatorSearch",
    operator: "delete",
    direction: "backward",
    count: undefined,
  });
});

test("resolves operator character search targets", () => {
  const deletePending = resolveNormalCommand("d", undefined);
  const findPending = resolveNormalCommand(
    "f",
    deletePending.type === "pending" ? deletePending.pending : "",
  );
  expect(findPending.type).toBe("pending");
  expect(
    resolveNormalCommand("x", findPending.type === "pending" ? findPending.pending : ""),
  ).toEqual({
    type: "operatorCharSearch",
    operator: "delete",
    command: "findCharForward",
    char: "x",
  });

  const tillPending = resolveNormalCommand("t", "d");
  expect(tillPending.type).toBe("pending");
  expect(
    resolveNormalCommand(",", tillPending.type === "pending" ? tillPending.pending : ""),
  ).toEqual({
    type: "operatorCharSearch",
    operator: "delete",
    command: "tillCharForward",
    char: ",",
  });

  const changeTill = resolveNormalCommand("t", "c");
  expect(changeTill.type).toBe("pending");
  expect(
    resolveNormalCommand(",", changeTill.type === "pending" ? changeTill.pending : ""),
  ).toEqual({
    type: "operatorCharSearch",
    operator: "change",
    command: "tillCharForward",
    char: ",",
  });

  const changeBackward = resolveNormalCommand("F", "c");
  expect(changeBackward.type).toBe("pending");
  expect(
    resolveNormalCommand(":", changeBackward.type === "pending" ? changeBackward.pending : ""),
  ).toEqual({
    type: "operatorCharSearch",
    operator: "change",
    command: "findCharBackward",
    char: ":",
  });

  const yankTillBackward = resolveNormalCommand("T", "y");
  expect(yankTillBackward.type).toBe("pending");
  expect(
    resolveNormalCommand("[", yankTillBackward.type === "pending" ? yankTillBackward.pending : ""),
  ).toEqual({
    type: "operatorCharSearch",
    operator: "yank",
    command: "tillCharBackward",
    char: "[",
  });
});

test("resolves counted and configured operator character search targets", () => {
  const countedAfter = resolveNormalCommand("2", "d");
  expect(countedAfter.type).toBe("pending");
  const countedFind = resolveNormalCommand(
    "f",
    countedAfter.type === "pending" ? countedAfter.pending : "",
  );
  expect(countedFind.type).toBe("pending");
  expect(
    resolveNormalCommand(",", countedFind.type === "pending" ? countedFind.pending : ""),
  ).toEqual({
    type: "operatorCharSearch",
    operator: "delete",
    command: "findCharForward",
    char: ",",
    count: 2,
  });

  const countBefore = resolveNormalCommand("2", undefined);
  const deletePending = resolveNormalCommand(
    "d",
    countBefore.type === "pending" ? countBefore.pending : "",
  );
  const targetCount = resolveNormalCommand(
    "3",
    deletePending.type === "pending" ? deletePending.pending : "",
  );
  const findPending = resolveNormalCommand(
    "f",
    targetCount.type === "pending" ? targetCount.pending : "",
  );
  expect(
    resolveNormalCommand(",", findPending.type === "pending" ? findPending.pending : ""),
  ).toEqual({
    type: "operatorCharSearch",
    operator: "delete",
    command: "findCharForward",
    char: ",",
    count: 6,
  });

  const keymap = {
    ...DEFAULT_VIM_KEYMAP,
    operators: { ...DEFAULT_VIM_KEYMAP.operators, change: ["qq"] },
    commands: { ...DEFAULT_VIM_KEYMAP.commands, tillCharForward: ["gf"] },
  };
  const qPrefix = resolveNormalCommand("q", undefined, keymap);
  const change = resolveNormalCommand(
    "q",
    qPrefix.type === "pending" ? qPrefix.pending : "",
    keymap,
  );
  const gPrefix = resolveNormalCommand(
    "g",
    change.type === "pending" ? change.pending : "",
    keymap,
  );
  expect(gPrefix.type).toBe("pending");
  const till = resolveNormalCommand("f", gPrefix.type === "pending" ? gPrefix.pending : "", keymap);
  expect(till.type).toBe("pending");
  expect(resolveNormalCommand(":", till.type === "pending" ? till.pending : "", keymap)).toEqual({
    type: "operatorCharSearch",
    operator: "change",
    command: "tillCharForward",
    char: ":",
  });

  expect(resolveNormalCommand("x", "d")).toEqual({ type: "invalid" });
});

test("resolves operator character search repeats", () => {
  expect(resolveNormalCommand(";", "d")).toEqual({
    type: "operatorCharSearchRepeat",
    operator: "delete",
    reverse: false,
  });
  expect(resolveNormalCommand(",", "c")).toEqual({
    type: "operatorCharSearchRepeat",
    operator: "change",
    reverse: true,
  });

  const counted = resolveNormalCommand("2", "y");
  expect(counted.type).toBe("pending");
  expect(resolveNormalCommand(";", counted.type === "pending" ? counted.pending : "")).toEqual({
    type: "operatorCharSearchRepeat",
    operator: "yank",
    reverse: false,
    count: 2,
  });

  const keymap = {
    ...DEFAULT_VIM_KEYMAP,
    commands: { ...DEFAULT_VIM_KEYMAP.commands, repeatCharSearch: ["rr"] },
  };
  const prefix = resolveNormalCommand("r", "d", keymap);
  expect(prefix.type).toBe("pending");
  expect(
    resolveNormalCommand("r", prefix.type === "pending" ? prefix.pending : "", keymap),
  ).toEqual({
    type: "operatorCharSearchRepeat",
    operator: "delete",
    reverse: false,
  });
});

test("resolves char commands and operator text objects", () => {
  const replacePending = resolveNormalCommand("r", undefined);
  expect(replacePending.type).toBe("pending");
  expect(
    resolveNormalCommand("x", replacePending.type === "pending" ? replacePending.pending : ""),
  ).toEqual({ type: "charCommand", command: "replaceChar", char: "x" });

  const findPending = resolveNormalCommand("f", undefined);
  expect(findPending.type).toBe("pending");
  expect(
    resolveNormalCommand(":", findPending.type === "pending" ? findPending.pending : ""),
  ).toEqual({ type: "charCommand", command: "findCharForward", char: ":" });

  for (const key of ["up", "backspace", "ctrl+c"]) {
    expect(
      resolveNormalCommand(key, replacePending.type === "pending" ? replacePending.pending : ""),
    ).toEqual({
      type: "invalid",
    });
    expect(
      resolveNormalCommand(key, findPending.type === "pending" ? findPending.pending : ""),
    ).toEqual({
      type: "invalid",
    });
  }

  const change = resolveNormalCommand("c", undefined);
  const inner = resolveNormalCommand("i", change.type === "pending" ? change.pending : "");
  expect(inner.type).toBe("pending");
  expect(resolveNormalCommand("w", inner.type === "pending" ? inner.pending : "")).toEqual({
    type: "operatorTextObject",
    operator: "change",
    textObject: { kind: "inner", target: "word" },
  });
});

test("resolves configured text object kind and target keys", () => {
  const keymap = {
    ...DEFAULT_VIM_KEYMAP,
    textObjects: {
      kinds: { ...DEFAULT_VIM_KEYMAP.textObjects.kinds, inner: ["I"] },
      targets: { ...DEFAULT_VIM_KEYMAP.textObjects.targets, codeFence: ["F"] },
    },
  };
  const change = resolveNormalCommand("c", undefined, keymap);
  const inner = resolveNormalCommand("I", change.type === "pending" ? change.pending : "", keymap);
  expect(inner.type).toBe("pending");
  expect(resolveNormalCommand("F", inner.type === "pending" ? inner.pending : "", keymap)).toEqual({
    type: "operatorTextObject",
    operator: "change",
    textObject: { kind: "inner", target: "codeFence" },
  });
});

test("keeps operator motions distinct from text object targets", () => {
  const deletePending = resolveNormalCommand("d", undefined);
  expect(
    resolveNormalCommand("w", deletePending.type === "pending" ? deletePending.pending : ""),
  ).toEqual({ type: "operatorMotion", operator: "delete", motion: "wordForward" });
});

test("resolves paragraph motions and paragraph text objects", () => {
  expect(resolveNormalCommand("{", undefined)).toEqual({
    type: "motion",
    motion: "paragraphBackward",
  });
  expect(resolveNormalCommand("}", undefined)).toEqual({
    type: "motion",
    motion: "paragraphForward",
  });
  expect(parseNormalCommand("}", "d")).toEqual({
    type: "operatorMotion",
    operator: "d",
    motion: "}",
  });
  expect(parseNormalCommand("{", "y")).toEqual({
    type: "operatorMotion",
    operator: "y",
    motion: "{",
  });

  const change = resolveNormalCommand("c", undefined);
  const inner = resolveNormalCommand("i", change.type === "pending" ? change.pending : "");
  expect(resolveNormalCommand("p", inner.type === "pending" ? inner.pending : "")).toEqual({
    type: "operatorTextObject",
    operator: "change",
    textObject: { kind: "inner", target: "paragraph" },
  });
  const deletePending = resolveNormalCommand("d", undefined);
  const around = resolveNormalCommand(
    "a",
    deletePending.type === "pending" ? deletePending.pending : "",
  );
  expect(resolveNormalCommand("p", around.type === "pending" ? around.pending : "")).toEqual({
    type: "operatorTextObject",
    operator: "delete",
    textObject: { kind: "around", target: "paragraph" },
  });
});

test("uses configured paragraph motion and text object keys", () => {
  const keymap = {
    ...DEFAULT_VIM_KEYMAP,
    motions: {
      ...DEFAULT_VIM_KEYMAP.motions,
      paragraphForward: ["P"],
      paragraphBackward: ["N"],
    },
    textObjects: {
      ...DEFAULT_VIM_KEYMAP.textObjects,
      targets: { ...DEFAULT_VIM_KEYMAP.textObjects.targets, paragraph: ["g"] },
    },
  };
  expect(resolveNormalCommand("P", undefined, keymap)).toEqual({
    type: "motion",
    motion: "paragraphForward",
  });
  expect(resolveNormalCommand("N", undefined, keymap)).toEqual({
    type: "motion",
    motion: "paragraphBackward",
  });
  const deletePending = resolveNormalCommand("d", undefined, keymap);
  const inner = resolveNormalCommand(
    "i",
    deletePending.type === "pending" ? deletePending.pending : "",
    keymap,
  );
  expect(resolveNormalCommand("g", inner.type === "pending" ? inner.pending : "", keymap)).toEqual({
    type: "operatorTextObject",
    operator: "delete",
    textObject: { kind: "inner", target: "paragraph" },
  });
});

test("omitted paragraph operator motion clears pending state", () => {
  const keymap = {
    ...DEFAULT_VIM_KEYMAP,
    operatorMotions: {
      ...DEFAULT_VIM_KEYMAP.operatorMotions,
      delete: ["wordForward"] as const,
    },
  };
  const deletePending = resolveNormalCommand("d", undefined, keymap);
  expect(
    resolveNormalCommand(
      "}",
      deletePending.type === "pending" ? deletePending.pending : "",
      keymap,
    ),
  ).toEqual({ type: "invalid" });
});

test("keeps duplicate sequence resolution first-match deterministic", () => {
  const keymap = {
    ...DEFAULT_VIM_KEYMAP,
    operators: { ...DEFAULT_VIM_KEYMAP.operators, delete: ["q"] },
    motions: { ...DEFAULT_VIM_KEYMAP.motions, wordForward: ["q"] },
    commands: { ...DEFAULT_VIM_KEYMAP.commands, undo: ["q"] },
  };

  expect(resolveNormalCommand("q", undefined, keymap)).toEqual({
    type: "pending",
    pending: "q",
  });
});

test("resolves distinct keymap identities without stale command cache", () => {
  const leftKeymap = resolveVimOptions({
    piVim: { keymap: { motions: { left: ["q"] } } },
  }).options.keymap;
  const undoKeymap = resolveVimOptions({
    piVim: { keymap: { commands: { undo: ["q"] } } },
  }).options.keymap;

  expect(resolveNormalCommand("q", undefined, leftKeymap)).toEqual({
    type: "motion",
    motion: "left",
  });
  expect(resolveNormalCommand("q", undefined, undoKeymap)).toEqual({
    type: "command",
    command: "undo",
  });
  expect(resolveNormalCommand("q", undefined, leftKeymap)).toEqual({
    type: "motion",
    motion: "left",
  });
});

test("interleaves default and custom keymap resolution without contamination", () => {
  const keymap = resolveVimOptions({
    piVim: { keymap: { motions: { left: ["q"], wordForward: ["z"] } } },
  }).options.keymap;

  expect(resolveNormalCommand("q", undefined, DEFAULT_VIM_KEYMAP)).toEqual({ type: "none" });
  expect(resolveNormalCommand("q", undefined, keymap)).toEqual({
    type: "motion",
    motion: "left",
  });
  expect(resolveNormalCommand("w", undefined, DEFAULT_VIM_KEYMAP)).toEqual({
    type: "motion",
    motion: "wordForward",
  });
  expect(resolveNormalCommand("z", undefined, keymap)).toEqual({
    type: "motion",
    motion: "wordForward",
  });
});

test("gv resolves to reselectVisual with default keymap", () => {
  const pendingG = resolveNormalCommand("g", undefined);
  expect(pendingG).toEqual({ type: "pending", pending: "g" });
  const result = resolveNormalCommand("v", pendingG.type === "pending" ? pendingG.pending : "");
  expect(result).toEqual({ type: "command", command: "reselectVisual" });
});

test("configured reselectVisual key executes", () => {
  const keymap = resolveVimOptions({
    piVim: { keymap: { commands: { reselectVisual: ["grv"] } } },
  }).options.keymap;
  const pendingG = resolveNormalCommand("g", undefined, keymap);
  const pendingR = resolveNormalCommand(
    "r",
    pendingG.type === "pending" ? pendingG.pending : "",
    keymap,
  );
  const result = resolveNormalCommand(
    "v",
    pendingR.type === "pending" ? pendingR.pending : "",
    keymap,
  );
  expect(result).toEqual({ type: "command", command: "reselectVisual" });
});

test("reselectVisual default binding does not conflict with existing g-prefix motions", () => {
  const pendingG = resolveNormalCommand("g", undefined);
  expect(resolveNormalCommand("g", pendingG.type === "pending" ? pendingG.pending : "")).toEqual({
    type: "motion",
    motion: "bufferStart",
  });
  expect(resolveNormalCommand("e", pendingG.type === "pending" ? pendingG.pending : "")).toEqual({
    type: "motion",
    motion: "wordPreviousEnd",
  });
  const pendingGV = resolveNormalCommand("v", pendingG.type === "pending" ? pendingG.pending : "");
  expect(pendingGV).toEqual({ type: "command", command: "reselectVisual" });
});

function resolveKeys(
  keys: readonly string[],
  keymap = DEFAULT_VIM_KEYMAP,
  mode: "normal" | "visual" = "normal",
) {
  let pending: string | undefined;
  let result = resolveNormalCommand(keys[0]!, pending, keymap, mode);
  for (const key of keys.slice(1)) {
    if (result.type !== "pending") return result;
    pending = result.pending;
    result = resolveNormalCommand(key, pending, keymap, mode);
  }
  return result;
}

test("surround bindings extend their operators", () => {
  expect(resolveKeys(["y", "s", "i", "w"])).toEqual({
    type: "operatorTextObject",
    operator: "surround",
    textObject: { kind: "inner", target: "word" },
    count: undefined,
  });
  expect(resolveKeys(["y", "s", "w"])).toEqual({
    type: "operatorMotion",
    operator: "surround",
    motion: "wordForward",
    count: undefined,
  });
  expect(resolveKeys(["d", "s"])).toEqual({ type: "command", command: "deleteSurround" });
  expect(resolveKeys(["c", "s"])).toEqual({ type: "command", command: "changeSurround" });
  expect(resolveKeys(["2", "d", "s"])).toEqual({
    type: "command",
    command: "deleteSurround",
    count: 2,
  });
});

test("operators keep their meaning next to surround extensions", () => {
  expect(resolveKeys(["y", "i", "w"])).toMatchObject({
    type: "operatorTextObject",
    operator: "yank",
  });
  expect(resolveKeys(["y", "y"])).toEqual({
    type: "lineCommand",
    operator: "yank",
    count: undefined,
  });
  expect(resolveKeys(["d", "w"])).toMatchObject({ type: "operatorMotion", operator: "delete" });
  expect(resolveKeys(["d", "d"])).toEqual({
    type: "lineCommand",
    operator: "delete",
    count: undefined,
  });
  expect(resolveKeys(["c", "i", "w"])).toMatchObject({
    type: "operatorTextObject",
    operator: "change",
  });
  expect(resolveKeys(["c", "c"])).toEqual({
    type: "lineCommand",
    operator: "change",
    count: undefined,
  });
  expect(resolveKeys(["d", "2", "s"])).toEqual({ type: "invalid" });
});

test("multi-key operators accept the last-key line form", () => {
  expect(resolveKeys(["g", "u", "u"])).toEqual({
    type: "lineCommand",
    operator: "lowercase",
    count: undefined,
  });
  expect(resolveKeys(["g", "U", "U"])).toEqual({
    type: "lineCommand",
    operator: "uppercase",
    count: undefined,
  });
  expect(resolveKeys(["g", "~", "~"])).toEqual({
    type: "lineCommand",
    operator: "toggleCase",
    count: undefined,
  });
  expect(resolveKeys(["g", "u", "g", "u"])).toEqual({
    type: "lineCommand",
    operator: "lowercase",
    count: undefined,
  });
  expect(resolveKeys(["y", "s", "s"])).toEqual({
    type: "lineCommand",
    operator: "surround",
    count: undefined,
  });
  expect(resolveKeys(["3", "y", "s", "s"])).toEqual({
    type: "lineCommand",
    operator: "surround",
    count: 3,
  });

  const keymap = resolveVimOptions({ piVim: { keymap: { operators: { surround: ["gs"] } } } })
    .options.keymap!;
  expect(resolveKeys(["g", "s", "s"], keymap)).toEqual({
    type: "lineCommand",
    operator: "surround",
    count: undefined,
  });
  expect(resolveKeys(["g", "s", "i", "w"], keymap)).toMatchObject({
    type: "operatorTextObject",
    operator: "surround",
  });
});

test("surround accepts character-search targets but not search or repeat", () => {
  expect(resolveKeys(["y", "s", "f", ","])).toEqual({
    type: "operatorCharSearch",
    operator: "surround",
    command: "findCharForward",
    char: ",",
    count: undefined,
  });
  expect(resolveKeys(["y", "s", "t", ","])).toMatchObject({ command: "tillCharForward" });
  expect(resolveKeys(["y", "s", "2", "w"])).toEqual({
    type: "operatorMotion",
    operator: "surround",
    motion: "wordForward",
    count: 2,
  });
  expect(resolveKeys(["y", "s", "/"])).toEqual({ type: "invalid" });
  expect(resolveKeys(["y", "s", ";"])).toEqual({ type: "invalid" });
});

test("visual S resolves to surround selection and normal S stays substitute line", () => {
  expect(resolveKeys(["S"])).toEqual({ type: "command", command: "substituteLine" });
  expect(resolveKeys(["S"], DEFAULT_VIM_KEYMAP, "visual")).toEqual({
    type: "command",
    command: "surroundSelection",
  });
});

test("resolves sentence motions and sentence text objects", () => {
  expect(resolveKeys(["("])).toEqual({ type: "motion", motion: "sentenceBackward" });
  expect(resolveKeys([")"])).toEqual({ type: "motion", motion: "sentenceForward" });
  expect(parseNormalCommand(")", "d")).toEqual({
    type: "operatorMotion",
    operator: "d",
    motion: ")",
  });
  expect(resolveKeys(["c", "("])).toMatchObject({
    type: "operatorMotion",
    operator: "change",
    motion: "sentenceBackward",
  });
  expect(resolveKeys(["d", "i", "s"])).toMatchObject({
    type: "operatorTextObject",
    operator: "delete",
    textObject: { kind: "inner", target: "sentence" },
  });
  expect(resolveKeys(["y", "s", "a", "s"])).toMatchObject({
    type: "operatorTextObject",
    operator: "surround",
    textObject: { kind: "around", target: "sentence" },
  });
  expect(resolveKeys(["d", "i", ")"])).toMatchObject({
    textObject: { kind: "inner", target: "paren" },
  });
});

test("sentence target leaves surround commands unchanged", () => {
  expect(resolveKeys(["d", "s"])).toEqual({ type: "command", command: "deleteSurround" });
  expect(resolveKeys(["c", "s"])).toEqual({ type: "command", command: "changeSurround" });
});

test("uses configured sentence motion and text object keys", () => {
  const keymap = {
    ...DEFAULT_VIM_KEYMAP,
    motions: { ...DEFAULT_VIM_KEYMAP.motions, sentenceForward: ["S"], sentenceBackward: ["R"] },
    textObjects: {
      ...DEFAULT_VIM_KEYMAP.textObjects,
      targets: { ...DEFAULT_VIM_KEYMAP.textObjects.targets, sentence: ["z"] },
    },
  };
  expect(resolveKeys(["S"], keymap)).toEqual({ type: "motion", motion: "sentenceForward" });
  expect(resolveKeys(["R"], keymap)).toEqual({ type: "motion", motion: "sentenceBackward" });
  expect(resolveKeys(["d", "S"], keymap)).toMatchObject({ motion: "sentenceForward" });
  expect(resolveKeys(["d", "a", "z"], keymap)).toMatchObject({
    textObject: { kind: "around", target: "sentence" },
  });
});

test("omitted sentence operator motion clears pending state", () => {
  const keymap = {
    ...DEFAULT_VIM_KEYMAP,
    operatorMotions: { ...DEFAULT_VIM_KEYMAP.operatorMotions, delete: ["wordForward"] as const },
  };
  expect(resolveKeys(["d", ")"], keymap)).toEqual({ type: "invalid" });
});
