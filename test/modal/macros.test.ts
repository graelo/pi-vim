import { expect, test } from "vitest";
import type { ModalOptions, ModalState } from "../../src/modal/types.ts";
import { DEFAULT_VIM_KEYMAP } from "../../src/config.ts";
import { handleModalInputWithOptions as handleModalInput } from "../modal-test-helper.ts";
import { cursor, options, snapshot } from "./shared.ts";

test("macro recording starts, captures handled inputs, and stops in normal mode", () => {
  const started = handleModalInput({ mode: "normal" }, snapshot, options, "q");
  expect(started.state).toEqual({ mode: "normal", pendingMacro: "record" });

  const recording = handleModalInput(started.state, snapshot, options, "a");
  expect(recording.state).toEqual({ mode: "normal", macros: { a: [] }, recordingSlot: "a" });

  const insert = handleModalInput(recording.state, snapshot, options, "i");
  expect(insert.state).toMatchObject({
    mode: "insert",
    recordingSlot: "a",
    macros: { a: ["i"] },
  });

  const typedQ = handleModalInput(insert.state, snapshot, options, "q");
  expect(typedQ.state.macros?.a).toEqual(["i", "q"]);

  const escaped = handleModalInput(typedQ.state, snapshot, options, "\x1b");
  expect(escaped.state.macros?.a).toEqual(["i", "q", "\x1b"]);
  expect(escaped.state.recordingSlot).toBe("a");

  const stopped = handleModalInput(escaped.state, snapshot, options, "q");
  expect(stopped.state).toEqual({ mode: "normal", macros: { a: ["i", "q", "\x1b"] } });
});

test("macro recording excludes delegated app shortcuts and preserves unnamed register", () => {
  const state: ModalState = {
    mode: "normal",
    recordingSlot: "a",
    macros: { a: [] },
    register: { type: "char", text: "keep" },
  };

  const submitted = handleModalInput(state, snapshot, options, "\r");
  expect(submitted.state.macros?.a).toEqual([]);
  expect(submitted.state.register).toEqual({ type: "char", text: "keep" });

  const imagePaste = handleModalInput(
    {
      ...state,
      pending: "d",
      searchHighlight: { query: "keep", current: cursor },
      lastRepeatableChange: { type: "command", command: "deleteChar", count: 1 },
    },
    snapshot,
    options,
    "\x16",
  );
  expect(imagePaste.state).toEqual({
    mode: "normal",
    recordingSlot: "a",
    macros: { a: [] },
    register: { type: "char", text: "keep" },
    searchHighlight: { query: "keep", current: cursor },
    lastRepeatableChange: { type: "command", command: "deleteChar", count: 1 },
  });
  expect(imagePaste.effects).toContainEqual({ type: "delegate", input: "\x16" });
});

test("macro playback emits replay effects and repeat-last no-ops safely", () => {
  const pending = handleModalInput(
    { mode: "normal", macros: { a: ["i", "X", "\x1b"] } },
    snapshot,
    options,
    "@",
  );
  expect(pending.state).toEqual({
    mode: "normal",
    macros: { a: ["i", "X", "\x1b"] },
    pendingMacro: "play",
  });

  const played = handleModalInput(pending.state, snapshot, options, "a");
  expect(played.state.lastPlayedMacro).toBe("a");
  expect(played.effects).toEqual([{ type: "playMacro", slot: "a", inputs: ["i", "X", "\x1b"] }]);

  const repeated = handleModalInput(played.state, snapshot, options, "@");
  expect(handleModalInput(repeated.state, snapshot, options, "@").effects).toEqual([
    { type: "playMacro", slot: "a", inputs: ["i", "X", "\x1b"] },
  ]);

  expect(handleModalInput({ mode: "normal" }, snapshot, options, "@").state.pendingMacro).toBe(
    "play",
  );
  expect(
    handleModalInput({ mode: "normal", pendingMacro: "play" }, snapshot, options, "@").effects,
  ).toEqual([{ type: "invalidate" }]);
});

test("normal string remap emits replay effect", () => {
  const remapOptions: ModalOptions = {
    ...options,
    keymap: {
      ...DEFAULT_VIM_KEYMAP,
      remaps: { accepted: [{ key: "zz", inputs: ["l", "l", "l", "l"], modes: ["normal"] }] },
    },
  };

  const pending = handleModalInput({ mode: "normal" }, snapshot, remapOptions, "z");
  expect(pending.state.pending).toBe("z");

  const played = handleModalInput(pending.state, snapshot, remapOptions, "z");
  expect(played.effects).toEqual([
    { type: "playMacro", slot: "remap", inputs: ["l", "l", "l", "l"] },
  ]);
});

test("macro playback is ignored while recording or replaying", () => {
  const recording = handleModalInput(
    { mode: "normal", recordingSlot: "a", macros: { a: [] } },
    snapshot,
    options,
    "@",
  );
  const ignoredRecorded = handleModalInput(recording.state, snapshot, options, "a");
  expect(ignoredRecorded.effects).toEqual([{ type: "invalidate" }]);
  expect(ignoredRecorded.state.macros?.a).toEqual([]);

  expect(
    handleModalInput(
      { mode: "normal", macros: { a: ["x"] } },
      { ...snapshot, isMacroReplaying: true },
      options,
      "@",
    ).effects,
  ).toEqual([{ type: "invalidate" }]);
});
