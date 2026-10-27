// Repro: cursor-drift between the modal engine and Pi's base editor.
//
// These tests document a known bug family (see analysis): VimEditor syncs the
// base editor's cursor by replaying raw arrow-key sequences
// (`restoreCursor`, `applyAdapterCommand`), but Pi's `Editor` interprets:
//   - up/down as *visual* (word-wrapped) row moves, with prompt-history
//     hijack at the top and move-to-line-end at the bottom,
//   - left/right as *grapheme* moves that wrap across logical lines.
// The modal engine, in contrast, computes motions and edits in logical
// lines/columns from `getCursor()`. On wrapped prompts the two models
// diverge, so a subsequent delete (x, dd, D, ...) hits a different line than
// the one the user moved to.
//
// They use `test.fails` so `npm test` stays green while the bugs are open.
import type { Component, OverlayOptions } from "@earendil-works/pi-tui";
import { expect, test } from "vitest";

import type { ResolvedVimEditorOptions, VimDiagnostics } from "../src/types.ts";
import { createVimConfigPlan, DEFAULT_VIM_OPTIONS } from "../src/config.ts";
import { VimEditor } from "../src/vim-editor.ts";

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

test.fails("j from a wrapped line moves one visual row, not one logical line", () => {
  const { editor } = createEditor(DEFAULT_VIM_OPTIONS, { rows: 24, columns: 40 });
  editor.setText(TEXT);
  editor.render(40); // insert-mode frame: base editor learns wrap width 40
  editor.handleInput("\x1b"); // -> normal
  editor.render(40);

  editor.handleInput("g");
  editor.handleInput("g");
  expect(editor.getCursor()).toEqual({ line: 0, col: 0 });

  editor.handleInput("j");
  // Vim semantics: logical line 1 ("SECOND"). Actual: { line: 0, col: 39 }
  // (the wrap column of the long first line).
  expect(editor.getCursor()).toEqual({ line: 1, col: 0 });
});

test.fails("j then dd deletes a different line than the one targeted", () => {
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

  // Expected: "SECOND" is deleted. Actual: the whole wrapped first line
  // (both of its screen rows) is deleted instead.
  expect(editor.getText()).toBe([LONG, "THIRD"].join("\n"));
});

test.fails("G (restoreCursor path) drifts on wrapped lines", () => {
  const { editor } = createEditor(DEFAULT_VIM_OPTIONS, { rows: 24, columns: 40 });
  editor.setText(TEXT);
  editor.render(40);
  editor.handleInput("\x1b");
  editor.render(40);

  editor.handleInput("g");
  editor.handleInput("g");
  editor.handleInput("G"); // vim: go to last logical line ("THIRD")
  // Actual: lands on logical line 1 ("SECOND") because two replayed
  // down-arrows only traverse two visual rows.
  expect(editor.getCursor().line).toBe(2);
});

test.fails("k on the first line at col 0 replaces the buffer with a history entry", () => {
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
  // Actual: Pi's editor treats up-arrow at col 0 on the first visual line as
  // prompt-history navigation and swaps the buffer text.
  expect(editor.getText()).toBe("current prompt");
});

test.fails("l at end of line moves to the next logical line", () => {
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
  // Actual: Pi's right-arrow wraps to the next logical line, so a following
  // `x` deletes on the next line.
  expect(editor.getCursor()).toEqual({ line: 0, col: 2 });
});
