// Shared modal test fixtures and effect appliers.

import type { ModalEffect, ModalOptions, ModalState } from "../../src/modal/types.ts";
import type { EasymotionTarget } from "../../src/types.ts";
import { resolveVimOptions, type VimConfigPlan } from "../../src/config.ts";
import { handleModalInput as handleModalInputWithPlan } from "../../src/modal/engine.ts";
import { handleModalInputWithOptions as handleModalInput } from "../modal-test-helper.ts";

export const p = (line: number, col: number) => ({ line, col });
export const cursor = { line: 0, col: 0 };
export const options: ModalOptions = {
  startMode: "insert" as const,
  cursor: {
    insert: "bar" as const,
    normal: "block" as const,
    visual: "block" as const,
    visualLine: "block" as const,
    visualBlock: "block" as const,
  },
};
export const snapshot = { text: "abc", lines: ["abc"], cursor };
export const ctrlJ = "\u001b[106;5u";
export const superJ = "\u001b[106;9u";
export const ctrlW = "\u001b[119;5u";
export const altD = "\u001bd";
export const csiAltD = "\u001b[100;3u";
export const altF = "\u001bf";
export const csiAltF = "\u001b[102;3u";
export const ctrlE = "\u001b[101;5u";
export const ctrlP = "\u001b[112;5u";
export const altV = "\u001bv";
export const ctrlAltV = "\u001b[118;7u";
export const escapeOptions = resolveVimOptions({
  piVim: { keymap: { escape: ["<D-j>"] } },
}).options;

export function applyAdapterCommand(
  command: Extract<ModalEffect, { type: "adapterCommand" }>["command"],
  text: string,
  cursor: { line: number; col: number },
) {
  const lines = text.split("\n");
  const maxLine = lines.length - 1;
  const maxCol = (lines[cursor.line] ?? "").length;
  switch (command) {
    case "up":
      return {
        line: Math.max(0, cursor.line - 1),
        col: Math.min(cursor.col, (lines[Math.max(0, cursor.line - 1)] ?? "").length),
      };
    case "down":
      return {
        line: Math.min(maxLine, cursor.line + 1),
        col: Math.min(cursor.col, (lines[Math.min(maxLine, cursor.line + 1)] ?? "").length),
      };
    case "left":
      return { line: cursor.line, col: Math.max(0, cursor.col - 1) };
    case "right":
      return { line: cursor.line, col: Math.min(maxCol, cursor.col + 1) };
    case "lineStart":
      return { line: cursor.line, col: 0 };
    case "lineEnd":
      return { line: cursor.line, col: maxCol };
  }
  return cursor;
}

export function applyModalEffects(
  effects: ModalEffect[],
  text: string,
  cursor: { line: number; col: number },
) {
  for (const effect of effects) {
    if (effect.type === "edit") {
      text = effect.result.text;
      cursor = effect.result.cursor;
    }
    if (effect.type === "restoreCursor") cursor = effect.position;
    if (effect.type === "adapterCommand")
      cursor = applyAdapterCommand(effect.command, text, cursor);
  }
  return { text, cursor };
}

export function applyModalKeys(
  initialState: ModalState,
  initialText: string,
  initialCursor: { line: number; col: number },
  keys: readonly string[],
  configuration: ModalOptions | VimConfigPlan = options,
  terminalRows?: number,
) {
  let state = initialState;
  let text = initialText;
  let cursor = initialCursor;
  const plan = "scopes" in configuration ? configuration : undefined;
  const modalOptions = "scopes" in configuration ? configuration.options : configuration;
  const effects: ModalEffect[] = [];

  for (const key of keys) {
    const editorSnapshot = { text, lines: text.split("\n"), cursor, terminalRows };
    const update = plan
      ? handleModalInputWithPlan(state, editorSnapshot, plan, key)
      : handleModalInput(state, editorSnapshot, modalOptions, key);
    state = update.state;
    effects.push(...update.effects);
    ({ text, cursor } = applyModalEffects(update.effects, text, cursor));
  }

  return { state, text, cursor, effects };
}

export const highlight = (targets: EasymotionTarget[]): ModalState => ({
  mode: "normal",
  pendingEasymotion: { kind: "highlight", targets },
});
