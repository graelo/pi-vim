import type {
  CursorStyle,
  PromptStructureTarget,
  ResolvedVimExCommand,
  ResolvedVimKeymap,
  ResolvedVimMacros,
  ResolvedVimMarks,
  ResolvedVimPromptStructures,
  ResolvedVimSearch,
  ResolvedVimEasymotion,
  ResolvedVimUi,
  StartupMode,
  VimActionBindingMode,
  VimCommandAction,
  ResolvedVimEditorOptions,
  VimFeedbackOptions,
  VimMode,
  VimMotionAction,
  VimMotionOperatorAction,
  VimOperatorAction,
  VimPreset,
  VimStatusItem,
  VimTextObjectKind,
  VimTextObjectTarget,
} from "../types.ts";
import {
  deriveActionKeys,
  deriveActionsWhere,
  deriveDefaultKeyBindings,
  deriveSet,
  KEYMAP_COMMAND_DESCRIPTORS,
  KEYMAP_INSERT_DESCRIPTORS,
  KEYMAP_MARK_DESCRIPTORS,
  KEYMAP_MACRO_DESCRIPTORS,
  KEYMAP_MOTION_DESCRIPTORS,
  KEYMAP_OPERATOR_DESCRIPTORS,
  KEYMAP_TEXT_OBJECT_KIND_DESCRIPTORS,
  KEYMAP_TEXT_OBJECT_TARGET_DESCRIPTORS,
} from "../keymap-descriptors.ts";
import { VIM_PRESETS } from "../types.ts";

export const VIM_MODES = [
  "insert",
  "normal",
  "visual",
  "visualLine",
  "visualBlock",
] as const satisfies readonly VimMode[];

export const REMAP_MODES = new Set<VimActionBindingMode>([
  "normal",
  "visual",
  "visualLine",
  "visualBlock",
]);

export const START_MODES = new Set<StartupMode>(["insert", "normal"]);

export const CURSOR_STYLES = new Set<CursorStyle>(["block", "bar", "underline"]);

export const VIM_MOTION_OPERATOR_ACTIONS = deriveActionsWhere(
  KEYMAP_OPERATOR_DESCRIPTORS,
  (descriptor) => "motionOperator" in descriptor && Boolean(descriptor.motionOperator),
) as readonly VimMotionOperatorAction[];

export const VIM_OPERATOR_ACTIONS = deriveActionKeys(
  KEYMAP_OPERATOR_DESCRIPTORS,
) as readonly VimOperatorAction[];

export const VIM_MOTION_ACTIONS = deriveActionKeys(
  KEYMAP_MOTION_DESCRIPTORS,
) as readonly VimMotionAction[];

export const VIM_COMMAND_ACTIONS = deriveActionKeys(
  KEYMAP_COMMAND_DESCRIPTORS,
) as readonly VimCommandAction[];

export const MACRO_ACTION_SET = deriveSet(KEYMAP_MACRO_DESCRIPTORS);

export const MARK_ACTION_SET = deriveSet(KEYMAP_MARK_DESCRIPTORS);

export const VIM_STATUS_ITEMS = [
  "mode",
  "pendingOperator",
  "selection",
  "cursorPosition",
] as const satisfies readonly VimStatusItem[];

export const VIM_TEXT_OBJECT_KINDS = deriveActionKeys(
  KEYMAP_TEXT_OBJECT_KIND_DESCRIPTORS,
) as VimTextObjectKind[];

export const VIM_TEXT_OBJECT_TARGETS = deriveActionKeys(
  KEYMAP_TEXT_OBJECT_TARGET_DESCRIPTORS,
) as VimTextObjectTarget[];

export const PROMPT_STRUCTURE_TARGETS = [
  "codeFence",
  "headingSection",
  "listItem",
  "tag",
  "errorBlock",
] as const satisfies readonly PromptStructureTarget[];

export const MOTION_OPERATOR_ACTION_SET = new Set<string>(VIM_MOTION_OPERATOR_ACTIONS);

export const OPERATOR_ACTION_SET = deriveSet(KEYMAP_OPERATOR_DESCRIPTORS);

export const MOTION_ACTION_SET = deriveSet(KEYMAP_MOTION_DESCRIPTORS);

export const COMMAND_ACTION_SET = deriveSet(KEYMAP_COMMAND_DESCRIPTORS);

export const INSERT_ACTION_SET = deriveSet(KEYMAP_INSERT_DESCRIPTORS);

const LOWERCASE_SLOT_KEYS = "abcdefghijklmnopqrstuvwxyz".split("");

const OPERATOR_MOTION_ACTIONS = VIM_MOTION_ACTIONS.filter(
  (action) => action !== "halfPageDown" && action !== "halfPageUp",
);

export const OPERATOR_MOTION_ACTION_SET = new Set<string>(OPERATOR_MOTION_ACTIONS);

export const STATUS_ITEM_SET = new Set<string>(VIM_STATUS_ITEMS);

export const TEXT_OBJECT_KIND_SET = deriveSet(KEYMAP_TEXT_OBJECT_KIND_DESCRIPTORS);

export const TEXT_OBJECT_TARGET_SET = deriveSet(KEYMAP_TEXT_OBJECT_TARGET_DESCRIPTORS);

export const PROMPT_STRUCTURE_TARGET_SET = new Set<string>(PROMPT_STRUCTURE_TARGETS);

export const VIM_PRESET_SET = new Set<VimPreset>(VIM_PRESETS);

export const ACTION_BINDING_MODES: readonly VimActionBindingMode[] = [
  "normal",
  "visual",
  "visualLine",
  "visualBlock",
];

export const NOOP_FEEDBACK_VALUES = new Set<VimFeedbackOptions["noop"]>(["off", "status"]);

export const UI_STATUS_POSITIONS = new Set(["left", "right"]);

export const WORKBENCH_RESERVED_ROWS_MAX = 5;

function freezeArrayRecord<T extends Record<string, readonly string[]>>(
  record: T,
): { readonly [K in keyof T]: readonly string[] } {
  return Object.freeze(
    Object.fromEntries(
      Object.entries(record).map(([key, values]) => [key, Object.freeze([...values])]),
    ) as { [K in keyof T]: readonly string[] },
  );
}

export const DEFAULT_VIM_KEYMAP = Object.freeze({
  escape: Object.freeze([]),
  operators: freezeArrayRecord(deriveDefaultKeyBindings(KEYMAP_OPERATOR_DESCRIPTORS)),
  motions: freezeArrayRecord(deriveDefaultKeyBindings(KEYMAP_MOTION_DESCRIPTORS)),
  macros: freezeArrayRecord(deriveDefaultKeyBindings(KEYMAP_MACRO_DESCRIPTORS)),
  marks: freezeArrayRecord(deriveDefaultKeyBindings(KEYMAP_MARK_DESCRIPTORS)),
  textObjects: Object.freeze({
    kinds: freezeArrayRecord(deriveDefaultKeyBindings(KEYMAP_TEXT_OBJECT_KIND_DESCRIPTORS)),
    targets: freezeArrayRecord(deriveDefaultKeyBindings(KEYMAP_TEXT_OBJECT_TARGET_DESCRIPTORS)),
  }),
  commands: freezeArrayRecord(deriveDefaultKeyBindings(KEYMAP_COMMAND_DESCRIPTORS)),
  operatorMotions: freezeArrayRecord(
    Object.fromEntries(
      VIM_MOTION_OPERATOR_ACTIONS.map((action) => [action, OPERATOR_MOTION_ACTIONS]),
    ),
  ),
  insert: freezeArrayRecord(deriveDefaultKeyBindings(KEYMAP_INSERT_DESCRIPTORS)),
  remaps: Object.freeze({
    accepted: Object.freeze([]),
  }),
  scoped: Object.freeze([]),
  unmaps: Object.freeze([]),
}) as unknown as ResolvedVimKeymap;

export const DEFAULT_VIM_UI = Object.freeze({
  status: Object.freeze({
    enabled: true,
    position: "left",
    items: Object.freeze(["mode", "pendingOperator", "selection", "cursorPosition"]),
  }),
  mode: Object.freeze({
    enabled: true,
    labels: Object.freeze({
      insert: "INSERT",
      normal: "NORMAL",
      visual: "VISUAL",
      visualLine: "V-LINE",
      visualBlock: "V-BLOCK",
    }),
    narrowLabels: Object.freeze({
      insert: "I",
      normal: "N",
      visual: "V",
      visualLine: "VL",
      visualBlock: "VB",
    }),
  }),
  selection: Object.freeze({
    enabled: true,
    previewMaxChars: 16,
  }),
  cursorPosition: Object.freeze({
    enabled: true,
    base: 1,
    format: "{line}:{column}",
  }),
  workbench: Object.freeze({
    reservedRows: 0,
  }),
}) as unknown as ResolvedVimUi;

export const DEFAULT_VIM_MACROS = Object.freeze({
  enabled: true,
  slots: Object.freeze(LOWERCASE_SLOT_KEYS),
  maxReplaySteps: 1000,
}) as unknown as ResolvedVimMacros;

export const DEFAULT_VIM_MARKS = Object.freeze({
  enabled: true,
  slots: Object.freeze(LOWERCASE_SLOT_KEYS),
}) as unknown as ResolvedVimMarks;

export const DEFAULT_VIM_SEARCH = Object.freeze({
  highlight: true,
  highlightCurrent: true,
  clearOnCancel: true,
  clearOnInsert: true,
  maxHighlights: 200,
}) as unknown as ResolvedVimSearch;

export const DEFAULT_VIM_EASYMOTION = Object.freeze({
  labelColor: "\x1b[31m",
}) as unknown as ResolvedVimEasymotion;

export const DEFAULT_VIM_EX_COMMAND = Object.freeze({
  autocomplete: true,
}) as unknown as ResolvedVimExCommand;

export const DEFAULT_VIM_PROMPT_STRUCTURES = Object.freeze({
  enabled: true,
  targets: Object.freeze({
    codeFence: true,
    headingSection: true,
    listItem: true,
    tag: true,
    errorBlock: true,
  }),
}) as unknown as ResolvedVimPromptStructures;

export const DEFAULT_VIM_FEEDBACK = Object.freeze({
  noop: "off",
}) as unknown as VimFeedbackOptions;

export const DEFAULT_VIM_OPTIONS: ResolvedVimEditorOptions = Object.freeze({
  startMode: "insert",
  cursor: Object.freeze({
    insert: "bar",
    normal: "block",
    visual: "block",
    visualLine: "block",
    visualBlock: "block",
  }),
  keymap: DEFAULT_VIM_KEYMAP,
  ui: DEFAULT_VIM_UI,
  macros: DEFAULT_VIM_MACROS,
  marks: DEFAULT_VIM_MARKS,
  search: DEFAULT_VIM_SEARCH,
  easymotion: DEFAULT_VIM_EASYMOTION,
  exCommand: DEFAULT_VIM_EX_COMMAND,
  feedback: DEFAULT_VIM_FEEDBACK,
  promptStructures: DEFAULT_VIM_PROMPT_STRUCTURES,
});
