import type {
  ResolvedVimExCommand,
  ResolvedVimMacros,
  ResolvedVimMarks,
  ResolvedVimPromptStructures,
  ResolvedVimSearch,
  ResolvedVimEasymotion,
  ResolvedVimUi,
  ResolvedVimEditorOptions,
  VimFeedbackOptions,
  VimPreset,
} from "../types.ts";

import {
  cloneEasymotion,
  cloneExCommand,
  cloneFeedback,
  cloneKeymap,
  cloneMacros,
  cloneMarks,
  clonePromptStructures,
  cloneSearch,
  cloneUi,
} from "./clone.ts";
import { mergeKeymap } from "./keymap-layers.ts";
import type {
  PartialExCommandOptions,
  PartialFeedbackOptions,
  PartialMacroOptions,
  PartialMarkOptions,
  PartialPromptStructureOptions,
  PartialSearchOptions,
  PartialUiOptions,
  PartialVimEasymotionOptions,
  PartialVimOptions,
} from "./types.ts";

function mergeMacros(target: ResolvedVimMacros, partial: PartialMacroOptions): void {
  if (partial.enabled !== undefined) target.enabled = partial.enabled;
  if (partial.slots) target.slots = [...partial.slots];
  if (partial.maxReplaySteps) target.maxReplaySteps = partial.maxReplaySteps;
}

function mergeMarks(target: ResolvedVimMarks, partial: PartialMarkOptions): void {
  if (partial.enabled !== undefined) target.enabled = partial.enabled;
  if (partial.slots) target.slots = [...partial.slots];
}

function mergeSearch(target: ResolvedVimSearch, partial: PartialSearchOptions): void {
  Object.assign(target, partial);
}

function mergeEasymotion(
  target: ResolvedVimEasymotion,
  partial: PartialVimEasymotionOptions,
): void {
  if (partial.labelColor !== undefined) {
    target.labelColor = partial.labelColor;
  }
}

function mergeExCommand(target: ResolvedVimExCommand, partial: PartialExCommandOptions): void {
  Object.assign(target, partial);
}

function mergeFeedback(target: VimFeedbackOptions, partial: PartialFeedbackOptions): void {
  Object.assign(target, partial);
}

function mergePromptStructures(
  target: ResolvedVimPromptStructures,
  partial: PartialPromptStructureOptions,
): void {
  if (partial.enabled !== undefined) target.enabled = partial.enabled;
  if (partial.targets) target.targets = { ...target.targets, ...partial.targets };
}

function mergeUi(target: ResolvedVimUi, partial: PartialUiOptions): void {
  if (partial.status) target.status = { ...target.status, ...partial.status };
  if (partial.mode) {
    target.mode = {
      ...target.mode,
      enabled: partial.mode.enabled ?? target.mode.enabled,
      labels: { ...target.mode.labels, ...partial.mode.labels },
      narrowLabels: { ...target.mode.narrowLabels, ...partial.mode.narrowLabels },
      colors: { ...target.mode.colors, ...partial.mode.colors },
    };
  }
  if (partial.selection) target.selection = { ...target.selection, ...partial.selection };
  if (partial.cursorPosition) {
    target.cursorPosition = { ...target.cursorPosition, ...partial.cursorPosition };
  }
  if (partial.workbench) target.workbench = { ...target.workbench, ...partial.workbench };
}

export function presetOptions(preset: VimPreset): PartialVimOptions {
  if (preset === "minimal") {
    return {
      preset,
      ui: { status: { items: ["mode"] } },
      macros: { enabled: false },
      marks: { enabled: false },
      search: { highlightCurrent: false, maxHighlights: 50 },
    };
  }
  if (preset === "vim-heavy") {
    return {
      preset,
      startMode: "normal",
      keymap: { commands: { visualBlock: [] } },
      ui: { status: { items: ["mode", "pendingOperator", "selection", "cursorPosition"] } },
    };
  }
  return {
    preset,
    startMode: "insert",
    feedback: { noop: "off" },
    search: { clearOnInsert: true, maxHighlights: 200 },
  };
}

function mergedPartialValue<T, P>(
  current: T | undefined,
  value: P | undefined,
  clone: () => T,
  merge: (target: T, partial: P) => void,
): T | undefined {
  if (!value) return undefined;
  const target = current ?? clone();
  merge(target, value);
  return target;
}

export function mergePartialOptions(
  target: ResolvedVimEditorOptions,
  partial: PartialVimOptions,
): void {
  if (partial.preset) target.preset = partial.preset;
  if (partial.leader === null) delete target.leader;
  if (typeof partial.leader === "string") target.leader = partial.leader;
  if (partial.startMode) target.startMode = partial.startMode;
  if (partial.cursor) target.cursor = { ...target.cursor, ...partial.cursor };
  const keymap = mergedPartialValue(target.keymap, partial.keymap, cloneKeymap, mergeKeymap);
  const ui = mergedPartialValue(target.ui, partial.ui, cloneUi, mergeUi);
  const macros = mergedPartialValue(target.macros, partial.macros, cloneMacros, mergeMacros);
  const marks = mergedPartialValue(target.marks, partial.marks, cloneMarks, mergeMarks);
  const search = mergedPartialValue(target.search, partial.search, cloneSearch, mergeSearch);
  const easymotion = mergedPartialValue(
    target.easymotion,
    partial.easymotion,
    cloneEasymotion,
    mergeEasymotion,
  );
  const exCommand = mergedPartialValue(
    target.exCommand,
    partial.exCommand,
    cloneExCommand,
    mergeExCommand,
  );
  const feedback = mergedPartialValue(
    target.feedback,
    partial.feedback,
    cloneFeedback,
    mergeFeedback,
  );
  const promptStructures = mergedPartialValue(
    target.promptStructures,
    partial.promptStructures,
    clonePromptStructures,
    mergePromptStructures,
  );
  if (keymap) target.keymap = keymap;
  if (ui) target.ui = ui;
  if (macros) target.macros = macros;
  if (marks) target.marks = marks;
  if (search) target.search = search;
  if (easymotion) target.easymotion = easymotion;
  if (exCommand) target.exCommand = exCommand;
  if (feedback) target.feedback = feedback;
  if (promptStructures) target.promptStructures = promptStructures;
}
