/**
 * Public config seam: re-exports the `src/config/` modules (see ADR-0010).
 */
export {
  cursorStyleForMode,
  easymotionForOptions,
  escapeAliasesForScope,
  feedbackForOptions,
  keymapForOptions,
  macrosForOptions,
  marksForOptions,
  promptStructuresForOptions,
  searchForOptions,
  uiForOptions,
} from "./config/accessors.ts";
export { cloneResolvedVimOptions } from "./config/clone.ts";
export {
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
  PROMPT_STRUCTURE_TARGETS,
  VIM_COMMAND_ACTIONS,
  VIM_MOTION_ACTIONS,
  VIM_MOTION_OPERATOR_ACTIONS,
  VIM_OPERATOR_ACTIONS,
  VIM_STATUS_ITEMS,
  VIM_TEXT_OBJECT_KINDS,
  VIM_TEXT_OBJECT_TARGETS,
} from "./config/defaults.ts";
export { createVimConfigPlan } from "./config/plan.ts";
export { loadVimOptions, resolveVimOptions } from "./config/resolve.ts";
export type {
  VimConfigLoadOptions,
  VimConfigLoadResult,
  VimConfigPlan,
  VimPlanBinding,
  VimRuntimeConfiguration,
  VimScopeLookup,
} from "./config/types.ts";
