// Canary for the cursor seam's structural assumption.
//
// `VimEditor` lands engine-intended logical cursor positions by writing Pi's
// private editor cursor state and verifying through the public `getCursor()`
// (`piCursorWriter` in `src/vim-editor.ts`). These tests pin that assumption
// against the real pi-tui `Editor`. If a future pi-tui release renames or
// reshapes the internals, the resolver returns undefined here and fails
// loudly in CI, pointing at the seam, instead of leaving the adapter to
// silently degrade to drift-prone key replay.
import { expect, test } from "vitest";

import { piCursorWriter } from "../src/vim-editor.ts";

class CursorlessEditor {
  state = { cursorLine: 0, cursorCol: 0 };
  getCursor() {
    return { line: this.state.cursorLine, col: this.state.cursorCol };
  }
}

class RealShapedEditor {
  state = { lines: [""], cursorLine: 0, cursorCol: 0 };
  setCursorColCalls = 0;
  getCursor() {
    return { line: this.state.cursorLine, col: this.state.cursorCol };
  }
  setCursorCol(col: number) {
    this.setCursorColCalls += 1;
    this.state.cursorCol = col;
  }
}

test("cursor seam writes and verifies against a Pi-shaped editor", () => {
  const editor = new RealShapedEditor();
  const write = piCursorWriter(editor);
  expect(write).toBeDefined();
  expect(write?.({ line: 3, col: 7 })).toBe(true);
  expect(editor.getCursor()).toEqual({ line: 3, col: 7 });
  expect(editor.state.cursorLine).toBe(3);
  expect(editor.state.cursorCol).toBe(7);
});

test("cursor seam goes through setCursorCol, not a bare field write", () => {
  const editor = new RealShapedEditor();
  const write = piCursorWriter(editor);
  expect(write?.({ line: 1, col: 2 })).toBe(true);
  // Sticky-column invariants live inside setCursorCol in Pi's editor; the
  // writer must call it so they stay maintained by Pi's own code.
  expect(editor.setCursorColCalls).toBe(1);
});

test("cursor seam degrades to undefined when internals change shape", () => {
  // Missing setCursorCol entirely.
  expect(piCursorWriter(new CursorlessEditor())).toBeUndefined();
  // Missing or malformed state.
  expect(piCursorWriter({})).toBeUndefined();
  expect(piCursorWriter({ state: {}, setCursorCol: () => {} })).toBeUndefined();
  expect(piCursorWriter({ state: null, setCursorCol: () => {} })).toBeUndefined();
  // Non-numeric cursorLine in state.
  expect(
    piCursorWriter({
      state: { cursorLine: "0" },
      setCursorCol: () => {},
      getCursor: () => ({ line: 0, col: 0 }),
    }),
  ).toBeUndefined();
  // A throwing writer reports failure instead of crashing.
  const throwing = piCursorWriter({
    state: { cursorLine: 0 },
    setCursorCol: () => {
      throw new Error("shape drift");
    },
    getCursor: () => ({ line: 0, col: 0 }),
  });
  expect(throwing).toBeDefined();
  expect(throwing?.({ line: 1, col: 1 })).toBe(false);

  const throwingReadback = piCursorWriter({
    state: { cursorLine: 0 },
    setCursorCol: () => {},
    getCursor: () => {
      throw new Error("readback failed");
    },
  });
  expect(throwingReadback?.({ line: 1, col: 1 })).toBe(false);

  const throwingShape = Object.defineProperty({}, "state", {
    get() {
      throw new Error("shape getter failed");
    },
  });
  expect(piCursorWriter(throwingShape)).toBeUndefined();
});
