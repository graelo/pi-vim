import type {
  CursorStyle,
  ResolvedVimKeymap,
  ResolvedVimMacros,
  ResolvedVimMarks,
  ResolvedVimPromptStructures,
  ResolvedVimSearch,
  ResolvedVimEasymotion,
  ResolvedVimUi,
  ResolvedVimEditorOptions,
  VimFeedbackOptions,
  VimMode,
} from "../types.ts";
import type { VimMappingScope } from "../mapping-scopes.ts";

import {
  DEFAULT_VIM_EASYMOTION,
  DEFAULT_VIM_FEEDBACK,
  DEFAULT_VIM_KEYMAP,
  DEFAULT_VIM_MACROS,
  DEFAULT_VIM_MARKS,
  DEFAULT_VIM_OPTIONS,
  DEFAULT_VIM_PROMPT_STRUCTURES,
  DEFAULT_VIM_SEARCH,
  DEFAULT_VIM_UI,
} from "./defaults.ts";

export function keymapForOptions(options: ResolvedVimEditorOptions): ResolvedVimKeymap {
  return options.keymap ?? DEFAULT_VIM_KEYMAP;
}

export function escapeAliasesForScope(
  keymap: ResolvedVimKeymap,
  scope: Extract<
    VimMappingScope,
    "insert" | "visual" | "visualLine" | "visualBlock" | "operatorPending"
  >,
): string[] {
  return [
    ...keymap.escape,
    ...keymap.scoped
      .filter((binding) => binding.actionId === "escape" && binding.modes.includes(scope))
      .map((binding) => binding.key),
  ].filter(
    (key, index, aliases) =>
      !keymap.unmaps.some((unmap) => unmap.key === key && unmap.modes.includes(scope)) &&
      aliases.indexOf(key) === index,
  );
}

export function uiForOptions(options: ResolvedVimEditorOptions): ResolvedVimUi {
  return options.ui ?? DEFAULT_VIM_UI;
}

export function macrosForOptions(options: ResolvedVimEditorOptions): ResolvedVimMacros {
  return options.macros ?? DEFAULT_VIM_MACROS;
}

export function marksForOptions(options: ResolvedVimEditorOptions): ResolvedVimMarks {
  return options.marks ?? DEFAULT_VIM_MARKS;
}

export function easymotionForOptions(options: ResolvedVimEditorOptions): ResolvedVimEasymotion {
  return options.easymotion ?? DEFAULT_VIM_EASYMOTION;
}

export function searchForOptions(options: ResolvedVimEditorOptions): ResolvedVimSearch {
  return options.search ?? DEFAULT_VIM_SEARCH;
}

export function feedbackForOptions(options: ResolvedVimEditorOptions): VimFeedbackOptions {
  return options.feedback ?? DEFAULT_VIM_FEEDBACK;
}

export function promptStructuresForOptions(
  options: ResolvedVimEditorOptions,
): ResolvedVimPromptStructures {
  return options.promptStructures ?? DEFAULT_VIM_PROMPT_STRUCTURES;
}

export function cursorStyleForMode(options: ResolvedVimEditorOptions, mode: VimMode): CursorStyle {
  return options.cursor[mode] ?? DEFAULT_VIM_OPTIONS.cursor[mode];
}
