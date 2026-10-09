import type {
  ResolvedVimExCommand,
  ResolvedVimKeymap,
  ResolvedVimMacros,
  ResolvedVimMarks,
  ResolvedVimPromptStructures,
  ResolvedVimSearch,
  ResolvedVimEasymotion,
  ResolvedVimUi,
  ResolvedVimEditorOptions,
  VimFeedbackOptions,
} from "../types.ts";

import {
  DEFAULT_VIM_EASYMOTION,
  DEFAULT_VIM_EX_COMMAND,
  DEFAULT_VIM_FEEDBACK,
  DEFAULT_VIM_KEYMAP,
  DEFAULT_VIM_MACROS,
  DEFAULT_VIM_MARKS,
  DEFAULT_VIM_OPTIONS,
  DEFAULT_VIM_PROMPT_STRUCTURES,
  DEFAULT_VIM_SEARCH,
  DEFAULT_VIM_UI,
} from "./defaults.ts";

function cloneArrayRecord<T extends Record<string, readonly unknown[]>>(
  record: T,
): { [K in keyof T]: Array<T[K][number]> } {
  return Object.fromEntries(Object.entries(record).map(([key, values]) => [key, [...values]])) as {
    [K in keyof T]: Array<T[K][number]>;
  };
}

function clonePlainRecord<T extends Record<string, unknown>>(record: T): T {
  return { ...record };
}

export function cloneKeymap(keymap: ResolvedVimKeymap = DEFAULT_VIM_KEYMAP): ResolvedVimKeymap {
  return {
    leader: keymap.leader,
    escape: [...keymap.escape],
    operators: cloneArrayRecord(keymap.operators),
    motions: cloneArrayRecord(keymap.motions),
    macros: cloneArrayRecord(keymap.macros),
    marks: cloneArrayRecord(keymap.marks),
    textObjects: {
      kinds: cloneArrayRecord(keymap.textObjects.kinds),
      targets: cloneArrayRecord(keymap.textObjects.targets),
    },
    commands: cloneArrayRecord(keymap.commands),
    operatorMotions: cloneArrayRecord(keymap.operatorMotions),
    insert: {
      openLineBelow: [...keymap.insert.openLineBelow],
      openLineAbove: [...keymap.insert.openLineAbove],
      deleteWordBackward: [...keymap.insert.deleteWordBackward],
      deleteWordForward: [...keymap.insert.deleteWordForward],
      deleteLineBackward: [...keymap.insert.deleteLineBackward],
      deleteLineForward: [...keymap.insert.deleteLineForward],
      moveWordBackward: [...keymap.insert.moveWordBackward],
      moveWordForward: [...keymap.insert.moveWordForward],
      moveLineStart: [...keymap.insert.moveLineStart],
      moveLineEnd: [...keymap.insert.moveLineEnd],
    },
    remaps: {
      accepted: keymap.remaps.accepted.map((binding) => ({
        ...binding,
        inputs: [...binding.inputs],
        modes: binding.modes ? [...binding.modes] : undefined,
      })),
    },
    scoped: keymap.scoped.map((binding) => ({
      ...binding,
      modes: [...binding.modes],
      args: binding.args ? { ...binding.args } : undefined,
    })),
    unmaps: keymap.unmaps.map((unmap) => ({ ...unmap, modes: [...unmap.modes] })),
  };
}

export function cloneMacros(macros: ResolvedVimMacros = DEFAULT_VIM_MACROS): ResolvedVimMacros {
  return {
    enabled: macros.enabled,
    slots: [...macros.slots],
    maxReplaySteps: macros.maxReplaySteps,
  };
}

export function cloneMarks(marks: ResolvedVimMarks = DEFAULT_VIM_MARKS): ResolvedVimMarks {
  return {
    enabled: marks.enabled,
    slots: [...marks.slots],
  };
}

export function cloneSearch(search: ResolvedVimSearch = DEFAULT_VIM_SEARCH): ResolvedVimSearch {
  return { ...search };
}

export function cloneEasymotion(
  easymotion: ResolvedVimEasymotion = DEFAULT_VIM_EASYMOTION,
): ResolvedVimEasymotion {
  return { ...easymotion };
}

export function cloneExCommand(
  exCommand: ResolvedVimExCommand = DEFAULT_VIM_EX_COMMAND,
): ResolvedVimExCommand {
  return { ...exCommand };
}

export function cloneFeedback(
  feedback: VimFeedbackOptions = DEFAULT_VIM_FEEDBACK,
): VimFeedbackOptions {
  return { ...feedback };
}

export function clonePromptStructures(
  promptStructures: ResolvedVimPromptStructures = DEFAULT_VIM_PROMPT_STRUCTURES,
): ResolvedVimPromptStructures {
  return { enabled: promptStructures.enabled, targets: { ...promptStructures.targets } };
}

export function cloneUi(ui: ResolvedVimUi = DEFAULT_VIM_UI): ResolvedVimUi {
  return {
    status: {
      enabled: ui.status.enabled,
      position: ui.status.position,
      items: [...ui.status.items],
    },
    mode: {
      enabled: ui.mode.enabled,
      labels: clonePlainRecord(ui.mode.labels),
      narrowLabels: clonePlainRecord(ui.mode.narrowLabels),
    },
    selection: clonePlainRecord(ui.selection),
    cursorPosition: clonePlainRecord(ui.cursorPosition),
    workbench: clonePlainRecord(ui.workbench),
  };
}

export function cloneResolvedVimOptions(
  options: ResolvedVimEditorOptions = DEFAULT_VIM_OPTIONS,
): ResolvedVimEditorOptions {
  return {
    preset: options.preset,
    leader: options.leader,
    startMode: options.startMode,
    cursor: { ...options.cursor },
    keymap: options.keymap ? cloneKeymap(options.keymap) : undefined,
    ui: options.ui ? cloneUi(options.ui) : undefined,
    macros: options.macros ? cloneMacros(options.macros) : undefined,
    marks: options.marks ? cloneMarks(options.marks) : undefined,
    search: options.search ? cloneSearch(options.search) : undefined,
    easymotion: options.easymotion ? cloneEasymotion(options.easymotion) : undefined,
    exCommand: options.exCommand ? cloneExCommand(options.exCommand) : undefined,
    feedback: options.feedback ? cloneFeedback(options.feedback) : undefined,
    promptStructures: options.promptStructures
      ? clonePromptStructures(options.promptStructures)
      : undefined,
  };
}

export function cloneDefaultOptions(): ResolvedVimEditorOptions {
  return cloneResolvedVimOptions();
}
