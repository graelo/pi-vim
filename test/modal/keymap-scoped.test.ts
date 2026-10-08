import { expect, test } from "vitest";
import type { ModalOptions, ModalState } from "../../src/modal/types.ts";
import { resolveVimOptions } from "../../src/config.ts";
import { encodeMappingTokens } from "../../src/mapping-scopes.ts";
import { handleModalInputWithOptions as handleModalInput } from "../modal-test-helper.ts";
import { p, cursor, snapshot, superJ, ctrlP, applyModalKeys } from "./shared.ts";

test("project semantic action exact keys override built-in grammar", () => {
  const options = resolveVimOptions(undefined, {
    piVim: { keymap: { motions: { lineEnd: ["u"] } } },
  }).options;

  const result = applyModalKeys({ mode: "normal" }, "hello", p(0, 0), ["u"], options);
  const lineEnd = applyModalKeys({ mode: "normal" }, "hello", p(0, 0), ["$"]);
  expect(result.text).toBe("hello");
  expect(result.cursor).toEqual(lineEnd.cursor);
});

test("scoped command binding overrides macro record key", () => {
  const base = resolveVimOptions(undefined).options;
  const options: ModalOptions = {
    ...base,
    keymap: {
      ...base.keymap!,
      scoped: [...base.keymap!.scoped, { actionId: "command.undo", key: "q", modes: ["normal"] }],
    },
  };

  const result = applyModalKeys({ mode: "normal" }, "hello", p(0, 0), ["q"], options);
  expect(result.state.pendingMacro).toBeUndefined();
  expect(result.effects).toContainEqual({ type: "adapterCommand", command: "undo" });
});

test("visual-scoped operator descriptors execute visual operations", () => {
  const options = resolveVimOptions(undefined, undefined, {
    kind: "success",
    warnings: [],
    operations: [
      {
        kind: "map",
        mapping: {
          kind: "descriptor",
          actionId: "operator.delete",
          key: "u",
          modes: ["visual", "visualLine", "visualBlock"],
        },
      },
    ],
  }).options;

  const result = applyModalKeys(
    { mode: "visual", visualAnchor: p(0, 1) },
    "hello",
    p(0, 2),
    ["u"],
    options,
  );
  expect(result.text).toBe("hlo");
  expect(result.state.mode).toBe("normal");
});

test("multi-key scoped escape descriptors complete in visual mode", () => {
  const options = resolveVimOptions(undefined, undefined, {
    kind: "success",
    warnings: [],
    operations: [
      {
        kind: "map",
        mapping: {
          kind: "descriptor",
          actionId: "escape",
          key: "zz",
          modes: ["visual", "visualLine", "visualBlock"],
        },
      },
    ],
  }).options;

  const result = applyModalKeys(
    { mode: "visual", visualAnchor: p(0, 0) },
    "hello",
    p(0, 1),
    ["z", "z"],
    options,
  );
  expect(result.state.mode).toBe("normal");
});

test("scoped escape descriptors dispatch only in selected modes", () => {
  const insertOnly = resolveVimOptions(undefined, undefined, {
    kind: "success",
    warnings: [],
    operations: [
      {
        kind: "map",
        mapping: {
          kind: "descriptor",
          actionId: "escape",
          key: "alt+z",
          modes: ["insert"],
        },
      },
    ],
  }).options;

  const insert = applyModalKeys({ mode: "insert" }, "hello", p(0, 5), ["\u001bz"], insertOnly);
  expect(insert.state.mode).toBe("normal");

  const visual = applyModalKeys(
    { mode: "visual", visualAnchor: p(0, 0) },
    "hello",
    p(0, 1),
    ["\u001bz"],
    insertOnly,
  );
  expect(visual.state.mode).toBe("visual");
});

test("multi-key scoped text-object descriptors complete under operators", () => {
  const descriptorOptions = resolveVimOptions(undefined, undefined, {
    kind: "success",
    warnings: [],
    operations: [
      {
        kind: "map",
        mapping: {
          kind: "descriptor",
          actionId: "textObject.kind.inner",
          key: "zz",
          modes: ["operatorPending"],
        },
      },
      {
        kind: "map",
        mapping: {
          kind: "descriptor",
          actionId: "textObject.target.word",
          key: "xx",
          modes: ["operatorPending"],
        },
      },
    ],
  }).options;

  const pendingKind = applyModalKeys(
    { mode: "normal" },
    "hello world",
    p(0, 1),
    ["d", "z"],
    descriptorOptions,
  );
  expect(pendingKind.state.pending).toBeDefined();
  const result = applyModalKeys(
    { mode: "normal" },
    "hello world",
    p(0, 1),
    ["d", "z", "z", "x", "x"],
    descriptorOptions,
  );
  expect(result.text).toBe(" world");
});

test("multi-key modified scoped escape descriptors retain token prefixes", () => {
  const descriptorOptions = resolveVimOptions(undefined, undefined, {
    kind: "success",
    warnings: [],
    operations: [
      {
        kind: "map",
        mapping: {
          kind: "descriptor",
          actionId: "escape",
          key: encodeMappingTokens(["ctrl+x", "z"]),
          modes: ["visual", "visualLine", "visualBlock"],
        },
      },
    ],
  }).options;

  const result = applyModalKeys(
    { mode: "visual", visualAnchor: p(0, 0) },
    "hello",
    p(0, 1),
    ["\u001b[120;5u", "z"],
    descriptorOptions,
  );
  expect(result.state.mode).toBe("normal");
});

test("tokenized scoped insert escapes preserve terminal input on mismatch", () => {
  const options = resolveVimOptions(undefined, undefined, {
    kind: "success",
    warnings: [],
    operations: [
      {
        kind: "map",
        mapping: {
          kind: "descriptor",
          actionId: "escape",
          key: encodeMappingTokens(["ctrl+x", "z"]),
          modes: ["insert"],
        },
      },
    ],
  }).options;

  const matched = applyModalKeys(
    { mode: "insert" },
    "hello",
    p(0, 5),
    ["\u001b[120;5u", "z"],
    options,
  );
  expect(matched.state.mode).toBe("normal");

  const pending = handleModalInput({ mode: "insert" }, snapshot, options, "\u001b[120;5u");
  const mismatch = handleModalInput(pending.state, snapshot, options, "a");
  expect(mismatch.effects).toEqual([
    { type: "delegate", input: "\u001b[120;5u" },
    { type: "delegate", input: "a" },
  ]);
});

test("tokenized scoped remaps complete at runtime", () => {
  const options = resolveVimOptions(undefined, undefined, {
    kind: "success",
    warnings: [],
    operations: [
      {
        kind: "map",
        mapping: {
          kind: "remap",
          key: encodeMappingTokens(["ctrl+x", "z"]),
          inputs: ["l"],
          modes: ["normal"],
        },
      },
    ],
  }).options;

  const pending = handleModalInput({ mode: "normal" }, snapshot, options, "\u001b[120;5u");
  const replay = handleModalInput(pending.state, snapshot, options, "z");
  expect(replay.effects).toContainEqual({ type: "playMacro", slot: "remap", inputs: ["l"] });
});

test("scoped operator aliases repeat as linewise operations", () => {
  const descriptorOptions = resolveVimOptions(undefined, undefined, {
    kind: "success",
    warnings: [],
    operations: [
      {
        kind: "map",
        mapping: {
          kind: "descriptor",
          actionId: "operator.delete",
          key: "z",
          modes: ["normal"],
        },
      },
    ],
  }).options;

  const result = applyModalKeys(
    { mode: "normal" },
    "one\ntwo\nthree",
    cursor,
    ["z", "z"],
    descriptorOptions,
  );
  expect(result.text).toBe("two\nthree");
});

test("scoped prefixes own visual grammar, macros, marks, and easymotion", () => {
  const visualOptions = resolveVimOptions(undefined, undefined, {
    kind: "success",
    warnings: [],
    operations: [
      {
        kind: "map",
        mapping: {
          kind: "descriptor",
          actionId: "operator.delete",
          key: "uz",
          modes: ["visual", "visualLine", "visualBlock"],
        },
      },
    ],
  }).options;
  const pendingVisual = applyModalKeys(
    { mode: "visual", visualAnchor: p(0, 1) },
    "hello",
    p(0, 2),
    ["u"],
    visualOptions,
  );
  expect(pendingVisual.text).toBe("hello");
  expect(pendingVisual.state).toMatchObject({ mode: "visual", pending: "u" });
  const deleted = applyModalKeys(
    { mode: "visual", visualAnchor: p(0, 1) },
    "hello",
    p(0, 2),
    ["u", "z"],
    visualOptions,
  );
  expect(deleted.text).toBe("hlo");

  const descriptorOptions = resolveVimOptions(undefined, undefined, {
    kind: "success",
    warnings: [],
    operations: [
      {
        kind: "map",
        mapping: { kind: "descriptor", actionId: "macro.record", key: "zz", modes: ["normal"] },
      },
      {
        kind: "map",
        mapping: {
          kind: "descriptor",
          actionId: "command.easymotion",
          key: "q",
          modes: ["normal"],
        },
      },
    ],
  }).options;
  expect(
    applyModalKeys({ mode: "normal" }, "hello", p(0, 0), ["z"], descriptorOptions).state,
  ).toMatchObject({ pending: "z" });
  expect(
    applyModalKeys({ mode: "normal" }, "hello", p(0, 0), ["z", "z", "a"], descriptorOptions).state
      .recordingSlot,
  ).toBe("a");
  const markOptions = resolveVimOptions(undefined, undefined, {
    kind: "success",
    warnings: [],
    operations: [
      {
        kind: "map",
        mapping: { kind: "descriptor", actionId: "mark.set", key: "zz", modes: ["normal"] },
      },
    ],
  }).options;
  expect(
    applyModalKeys({ mode: "normal" }, "hello", p(0, 0), ["z", "z", "a"], markOptions).state.marks,
  ).toMatchObject({ a: p(0, 0) });
  expect(
    applyModalKeys({ mode: "normal" }, "hello", p(0, 0), ["q"], descriptorOptions).state,
  ).toMatchObject({ pendingEasymotion: { kind: "char" } });
});

test("scoped unmaps return protected inherited keys to Pi", () => {
  const unmappedOptions = resolveVimOptions(
    {
      piVim: {
        keymap: {
          allowProtectedOverrides: ["<C-p>"],
          commands: { undo: ["<C-p>"] },
        },
      },
    },
    undefined,
    {
      kind: "success",
      warnings: [],
      operations: [{ kind: "unmap", key: "ctrl+p", modes: ["normal"] }],
    },
  ).options;

  const update = handleModalInput({ mode: "normal" }, snapshot, unmappedOptions, ctrlP);
  expect(update.effects).toContainEqual({ type: "delegate", input: ctrlP });
  expect(update.state).toEqual({ mode: "normal" });
});

test("operator-pending protected descriptors keep modal ownership", () => {
  const descriptorOptions = resolveVimOptions(undefined, undefined, {
    kind: "success",
    warnings: [],
    operations: [
      {
        kind: "map",
        mapping: {
          kind: "descriptor",
          actionId: "motion.wordForward",
          key: "ctrl+p",
          modes: ["operatorPending"],
          allowProtected: true,
        },
      },
    ],
  }).options;

  const result = applyModalKeys(
    { mode: "normal" },
    "one two",
    p(0, 0),
    ["d", "\x10"],
    descriptorOptions,
  );
  expect(result.text).toBe("two");
  expect(result.effects).not.toContainEqual({ type: "delegate", input: "\x10" });
});

test("scoped unmaps remove inherited escape aliases by scope", () => {
  const options = resolveVimOptions({ piVim: { keymap: { escape: ["<D-j>"] } } }, undefined, {
    kind: "success",
    warnings: [],
    operations: [{ kind: "unmap", key: "super+j", modes: ["insert"] }],
  }).options;
  const insert = handleModalInput({ mode: "insert" }, snapshot, options, superJ);
  expect(insert.state.mode).toBe("insert");
  expect(insert.effects).toContainEqual({ type: "delegate", input: superJ });
  const visual = handleModalInput(
    { mode: "visual", visualAnchor: p(0, 0) },
    snapshot,
    options,
    superJ,
  );
  expect(visual.state.mode).toBe("normal");
});

test("scoped unmap disables inherited macro key", () => {
  const options = resolveVimOptions(undefined, undefined, {
    kind: "success",
    warnings: [],
    operations: [{ kind: "unmap", key: "q", modes: ["normal"] }],
  }).options;

  const result = applyModalKeys({ mode: "normal" }, "hello", p(0, 0), ["q"], options);
  expect(result.state.pendingMacro).toBeUndefined();
});

test("scoped unmap disables inherited visual command", () => {
  const options = resolveVimOptions(undefined, undefined, {
    kind: "success",
    warnings: [],
    operations: [{ kind: "unmap", key: "x", modes: ["visual", "visualLine", "visualBlock"] }],
  }).options;

  const result = applyModalKeys(
    { mode: "visual", visualAnchor: p(0, 1) },
    "hello",
    p(0, 2),
    ["x"],
    options,
  );
  expect(result.text).toBe("hello");
  expect(result.state.mode).toBe("visual");
});

test("active leader overrides normal structural prefixes", () => {
  for (const leader of ['"', "q", "m"]) {
    const configured = resolveVimOptions({
      piVim: {
        leader,
        keymap: { commands: { redo: ["<leader>x"] } },
      },
    }).options;
    const result = handleModalInput({ mode: "normal" }, snapshot, configured, leader);
    expect(result.state.pending).toBe(leader);
    expect(result.state.pendingRegister).toBeUndefined();
    expect(result.state.pendingMacro).toBeUndefined();
    expect(result.state.pendingMark).toBeUndefined();
  }
});

test("visual leader overrides direct case transform across visual modes", () => {
  const configured = resolveVimOptions({
    piVim: {
      leader: "u",
      keymap: { operators: { uppercase: ["<leader>x"] } },
    },
  }).options;

  for (const mode of ["visual", "visualLine", "visualBlock"] as const) {
    const state: ModalState = { mode, visualAnchor: p(0, 0) };
    const result = handleModalInput(state, snapshot, configured, "u");
    expect(result.state).toEqual({ ...state, pending: "u" });
    expect(result.effects).toEqual([{ type: "invalidate" }]);
  }
  expect(handleModalInput({ mode: "normal" }, snapshot, configured, "u").state.pending).toBe("u");
});

test("invalid leader continuation preserves durable modal state", () => {
  const configured = resolveVimOptions({
    piVim: {
      leader: '"',
      feedback: { noop: "status" },
      keymap: { commands: { redo: ["<leader>q"] } },
    },
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
    lastVisualSelection: {
      mode: "visual",
      anchor: p(0, 0),
      cursor: p(0, 1),
      text: "abc",
    },
  };

  const result = applyModalKeys(initial, "abc", p(0, 1), ['"', "z"], configured);
  expect(result.text).toBe("abc");
  expect(result.cursor).toEqual(p(0, 1));
  expect(result.state).toEqual(initial);
  expect(result.state.exMessage).toBeUndefined();
  expect(result.effects.every((effect) => effect.type === "invalidate")).toBe(true);
});

test("pending register keeps ownership of leader character", () => {
  const configured = resolveVimOptions({
    piVim: {
      leader: "w",
      keymap: { commands: { redo: ["<leader>x"] } },
    },
  }).options;
  const result = handleModalInput(
    { mode: "normal", pendingRegister: "awaitingSlot" },
    snapshot,
    configured,
    "w",
  );
  expect(result.state.pendingRegister).toEqual({ kind: "named", slot: "w", append: false });
  expect(result.state.pending).toBeUndefined();
});
