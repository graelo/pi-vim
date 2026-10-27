// Regression coverage: cursor drift between the modal engine and Pi's base
// editor.
//
// The modal engine computes motions and edits in logical lines/columns from
// `getCursor()`. Pi's `Editor`, left to its own key handling, moves the
// cursor by *visual* (word-wrapped) row and by grapheme, wraps across
// logical-line boundaries, and hijacks up-arrow at the top visual line as
// prompt-history navigation. These tests pin the sync contract:
// engine-intended positions land exactly, so deletes act on the line under
// the cursor even in wrapped prompts, and vertical/horizontal motions clamp
// in logical space.
import type { Component, OverlayOptions } from "@earendil-works/pi-tui";
import { expect, test } from "vitest";

import type { ResolvedVimEditorOptions, VimDiagnostics } from "../src/types.ts";
import { createVimConfigPlan, DEFAULT_VIM_OPTIONS } from "../src/config.ts";
import { piCursorWriter, VimEditor } from "../src/vim-editor.ts";

type EditorArgs = ConstructorParameters<typeof VimEditor>;

function createEditorTui(terminalSize: { rows?: number; columns?: number }) {
  return {
    tui: {
      terminal: {
        rows: terminalSize.rows ?? 24,
        columns: terminalSize.columns,
        write: (_data: string) => {},
      },
      requestRender() {},
      showOverlay(_component: Component, _options?: OverlayOptions) {
        return {
          hide() {},
          setHidden() {},
          isHidden() {
            return true;
          },
          focus() {},
          unfocus() {},
          isFocused() {
            return false;
          },
        };
      },
      getShowHardwareCursor() {
        return false;
      },
      setShowHardwareCursor() {},
    } as unknown as EditorArgs[0],
  };
}

const editorTheme = {
  borderColor: (text: string) => text,
  selectList: {
    selectedText: (text: string) => text,
    description: (text: string) => text,
    noMatch: (text: string) => text,
    scrollInfo: (text: string) => text,
  },
} as unknown as EditorArgs[1];

const editorKeybindings = {
  matches() {
    return false;
  },
  getKeys() {
    return [];
  },
  getDefinition() {
    return { defaultKeys: [] };
  },
  getConflicts() {
    return [];
  },
} as unknown as EditorArgs[2];

function createEditor(
  options: ResolvedVimEditorOptions = DEFAULT_VIM_OPTIONS,
  terminalSize: { rows?: number; columns?: number } = {},
) {
  const tuiState = createEditorTui(terminalSize);
  const editor = new VimEditor(tuiState.tui, editorTheme, editorKeybindings, {
    plan: createVimConfigPlan(options, []),
    diagnostics: { warnings: [] } as VimDiagnostics,
  });
  return { editor, ...tuiState };
}

const LONG = "alpha bravo charlie delta echo foxtrot golf hotel india juliet kilo"; // wraps at 40 cols
const TEXT = [LONG, "SECOND", "THIRD"].join("\n");

test("j from a wrapped line moves one logical line, not one visual row", () => {
  const { editor } = createEditor(DEFAULT_VIM_OPTIONS, { rows: 24, columns: 40 });
  editor.setText(TEXT);
  editor.render(40); // insert-mode frame: base editor learns wrap width 40
  editor.handleInput("\x1b"); // -> normal
  editor.render(40);

  editor.handleInput("g");
  editor.handleInput("g");
  expect(editor.getCursor()).toEqual({ line: 0, col: 0 });

  editor.handleInput("j");
  expect(editor.getCursor()).toEqual({ line: 1, col: 0 });
});

test("j then dd deletes the line under the cursor in a wrapped prompt", () => {
  const { editor } = createEditor(DEFAULT_VIM_OPTIONS, { rows: 24, columns: 40 });
  editor.setText(TEXT);
  editor.render(40);
  editor.handleInput("\x1b");
  editor.render(40);

  editor.handleInput("g");
  editor.handleInput("g");
  editor.handleInput("j");
  editor.handleInput("d");
  editor.handleInput("d");

  expect(editor.getText()).toBe([LONG, "THIRD"].join("\n"));
});

test("G lands on the last logical line in a wrapped prompt", () => {
  const { editor } = createEditor(DEFAULT_VIM_OPTIONS, { rows: 24, columns: 40 });
  editor.setText(TEXT);
  editor.render(40);
  editor.handleInput("\x1b");
  editor.render(40);

  editor.handleInput("g");
  editor.handleInput("g");
  editor.handleInput("G"); // vim: go to last logical line ("THIRD")
  expect(editor.getCursor().line).toBe(2);
});

test("k on the first line is a no-op and never navigates prompt history", () => {
  const { editor } = createEditor(
    { ...DEFAULT_VIM_OPTIONS, startMode: "normal" },
    { rows: 24, columns: 40 },
  );
  editor.addToHistory("PREVIOUS PROMPT FROM HISTORY");
  editor.setText("current prompt");
  editor.render(40);

  editor.handleInput("g");
  editor.handleInput("g"); // {0, 0}
  editor.handleInput("k"); // vim semantics: no-op at line 0
  expect(editor.getText()).toBe("current prompt");
  expect(editor.getCursor()).toEqual({ line: 0, col: 0 });
});

test("l at end of line stays on the same logical line", () => {
  const { editor } = createEditor(
    { ...DEFAULT_VIM_OPTIONS, startMode: "normal" },
    { rows: 24, columns: 40 },
  );
  editor.setText("ab\ncdef");
  editor.render(40);

  editor.handleInput("g");
  editor.handleInput("g");
  editor.handleInput("$"); // {0, 2}
  editor.handleInput("l"); // vim semantics: no-op at end of line
  expect(editor.getCursor()).toEqual({ line: 0, col: 2 });
});

test("cursor seam resolves against the real Pi editor and lands exact positions", () => {
  const { editor } = createEditor(DEFAULT_VIM_OPTIONS, { rows: 24, columns: 40 });
  editor.setText("one\ntwo\nthree");

  const write = piCursorWriter(editor);
  // Fails loudly when a future pi-tui release renames or reshapes the
  // cursor internals: the adapter would fall back to drift-prone replay.
  expect(write).toBeDefined();
  expect(write?.({ line: 2, col: 3 })).toBe(true);
  expect(editor.getCursor()).toEqual({ line: 2, col: 3 });
});

test("cursor seam is actually used: motions land on wrapped lines exactly", () => {
  const { editor } = createEditor(DEFAULT_VIM_OPTIONS, { rows: 24, columns: 40 });
  editor.setText(TEXT);
  editor.render(40);
  editor.handleInput("\x1b");
  editor.render(40);

  // Jump to the middle of the wrapped first line and back to line start:
  // key replay cannot land here exactly on a wrapped prompt.
  editor.handleInput("j");
  editor.handleInput("g");
  editor.handleInput("g");
  expect(editor.getCursor()).toEqual({ line: 0, col: 0 });
});
