import type {
  PromptStructureTarget,
  StartupMode,
  VimFeedbackOptions,
  VimPreset,
} from "../types.ts";

import { isPrintableLeader } from "../config-js.ts";

import {
  NOOP_FEEDBACK_VALUES,
  PROMPT_STRUCTURE_TARGET_SET,
  START_MODES,
  VIM_PRESET_SET,
} from "./defaults.ts";
import {
  booleanField,
  enumField,
  intField,
  isRecord,
  parseBooleanMap,
  parseLowercaseSlots,
  warnRemovedSettings,
} from "./fields.ts";
import { parseKeymap } from "./keymap-parsers.ts";
import type {
  PartialExCommandOptions,
  PartialFeedbackOptions,
  PartialMacroOptions,
  PartialMarkOptions,
  PartialPromptStructureOptions,
  PartialSearchOptions,
  PartialVimOptions,
} from "./types.ts";
import { parseCursorStyles, parseUi } from "./ui-parsers.ts";

function parseMacros(
  value: unknown,
  sourceLabel: string,
): { partial?: PartialMacroOptions; warnings: string[] } {
  const warnings: string[] = [];
  const partial: PartialMacroOptions = {};
  if (value === undefined) return { warnings };
  if (!isRecord(value)) {
    warnings.push(`${sourceLabel}: macros must be an object`);
    return { warnings };
  }

  const enabled = booleanField(
    value.enabled,
    `${sourceLabel}: macros.enabled must be a boolean`,
    warnings,
  );
  if (enabled !== undefined) partial.enabled = enabled;

  if (value.slots !== undefined) {
    const slots = parseLowercaseSlots(value.slots, `${sourceLabel}: macros.slots`, warnings);
    if (slots) partial.slots = slots;
  }

  const maxReplaySteps = intField(
    value.maxReplaySteps,
    `${sourceLabel}: macros.maxReplaySteps must be a positive integer`,
    warnings,
    1,
  );
  if (maxReplaySteps !== undefined) partial.maxReplaySteps = maxReplaySteps;

  return Object.keys(partial).length > 0 ? { partial, warnings } : { warnings };
}

function parseSearch(
  value: unknown,
  sourceLabel: string,
): { partial?: PartialSearchOptions; warnings: string[] } {
  const warnings: string[] = [];
  const partial: PartialSearchOptions = {};
  if (value === undefined) return { warnings };
  if (!isRecord(value)) {
    warnings.push(`${sourceLabel}: search must be an object`);
    return { warnings };
  }

  for (const field of [
    "highlight",
    "highlightCurrent",
    "clearOnCancel",
    "clearOnInsert",
  ] as const) {
    const enabled = booleanField(
      value[field],
      `${sourceLabel}: search.${field} must be a boolean`,
      warnings,
    );
    if (enabled !== undefined) partial[field] = enabled;
  }

  const maxHighlights = intField(
    value.maxHighlights,
    `${sourceLabel}: search.maxHighlights must be a non-negative integer`,
    warnings,
    0,
  );
  if (maxHighlights !== undefined) partial.maxHighlights = maxHighlights;

  return Object.keys(partial).length > 0 ? { partial, warnings } : { warnings };
}

function parseFeedback(
  value: unknown,
  sourceLabel: string,
): { partial?: PartialFeedbackOptions; warnings: string[] } {
  const warnings: string[] = [];
  const partial: PartialFeedbackOptions = {};
  if (value === undefined) return { warnings };
  if (!isRecord(value)) {
    warnings.push(`${sourceLabel}: feedback must be an object`);
    return { warnings };
  }

  const noop = enumField<VimFeedbackOptions["noop"]>(
    value.noop,
    `${sourceLabel}: feedback.noop must be off or status`,
    warnings,
    NOOP_FEEDBACK_VALUES,
  );
  if (noop) partial.noop = noop;

  return Object.keys(partial).length > 0 ? { partial, warnings } : { warnings };
}

function parseExCommand(
  value: unknown,
  sourceLabel: string,
): { partial?: PartialExCommandOptions; warnings: string[] } {
  const warnings: string[] = [];
  if (value === undefined) return { warnings };
  if (!isRecord(value)) {
    warnings.push(`${sourceLabel}: exCommand must be an object`);
    return { warnings };
  }
  const partial: PartialExCommandOptions = {};
  const autocomplete = booleanField(
    value.autocomplete,
    `${sourceLabel}: exCommand.autocomplete must be a boolean`,
    warnings,
  );
  if (autocomplete !== undefined) partial.autocomplete = autocomplete;
  return Object.keys(partial).length > 0 ? { partial, warnings } : { warnings };
}

function parseMarks(
  value: unknown,
  sourceLabel: string,
): { partial?: PartialMarkOptions; warnings: string[] } {
  const warnings: string[] = [];
  const partial: PartialMarkOptions = {};
  if (value === undefined) return { warnings };
  if (!isRecord(value)) {
    warnings.push(`${sourceLabel}: marks must be an object`);
    return { warnings };
  }

  const enabled = booleanField(
    value.enabled,
    `${sourceLabel}: marks.enabled must be a boolean`,
    warnings,
  );
  if (enabled !== undefined) partial.enabled = enabled;

  if (value.slots !== undefined) {
    const slots = parseLowercaseSlots(value.slots, `${sourceLabel}: marks.slots`, warnings);
    if (slots) partial.slots = slots;
  }

  return Object.keys(partial).length > 0 ? { partial, warnings } : { warnings };
}

function parsePromptStructures(
  value: unknown,
  sourceLabel: string,
): { partial?: PartialPromptStructureOptions; warnings: string[] } {
  const warnings: string[] = [];
  const partial: PartialPromptStructureOptions = {};
  if (value === undefined) return { warnings };
  if (!isRecord(value)) {
    warnings.push(`${sourceLabel}: promptStructures must be an object`);
    return { warnings };
  }

  const enabled = booleanField(
    value.enabled,
    `${sourceLabel}: promptStructures.enabled must be a boolean`,
    warnings,
  );
  if (enabled !== undefined) partial.enabled = enabled;

  const targets = parseBooleanMap<PromptStructureTarget>(
    value.targets,
    PROMPT_STRUCTURE_TARGET_SET,
    `${sourceLabel}: promptStructures.targets`,
    warnings,
  );
  if (targets) partial.targets = targets;

  return Object.keys(partial).length > 0 ? { partial, warnings } : { warnings };
}

export function parsePiVim(
  value: unknown,
  sourceLabel: string,
): { partial: PartialVimOptions; warnings: string[] } {
  const warnings: string[] = [];
  const partial: PartialVimOptions = {};

  if (value === undefined) return { partial, warnings };
  if (!isRecord(value)) {
    warnings.push(`${sourceLabel} must be an object`);
    return { partial, warnings };
  }

  if (value.leader === null || isPrintableLeader(value.leader)) partial.leader = value.leader;
  else if (value.leader !== undefined)
    warnings.push(`${sourceLabel}: leader must be one printable character or null`);

  const preset = enumField<VimPreset>(
    value.preset,
    `${sourceLabel}: unsupported preset`,
    warnings,
    VIM_PRESET_SET,
  );
  if (preset) partial.preset = preset;

  const startMode = enumField<StartupMode>(
    value.startMode,
    `${sourceLabel}: unsupported startMode`,
    warnings,
    START_MODES,
  );
  if (startMode) partial.startMode = startMode;

  const cursor = parseCursorStyles(value.cursor, sourceLabel, warnings);
  if (cursor) partial.cursor = cursor;

  if (value.vimOptions !== undefined) {
    warnings.push(`${sourceLabel}: vimOptions is no longer supported; use ui`);
  }

  const keymap = parseKeymap(value.keymap, sourceLabel);
  partial.keymap = keymap.partial;
  warnings.push(...keymap.warnings);

  const ui = parseUi(value.ui, sourceLabel);
  partial.ui = ui.partial;
  warnings.push(...ui.warnings);

  const macros = parseMacros(value.macros, sourceLabel);
  partial.macros = macros.partial;
  warnings.push(...macros.warnings);

  const marks = parseMarks(value.marks, sourceLabel);
  partial.marks = marks.partial;
  warnings.push(...marks.warnings);

  const search = parseSearch(value.search, sourceLabel);
  partial.search = search.partial;
  warnings.push(...search.warnings);

  const exCommand = parseExCommand(value.exCommand, sourceLabel);
  partial.exCommand = exCommand.partial;
  warnings.push(...exCommand.warnings);

  const feedback = parseFeedback(value.feedback, sourceLabel);
  partial.feedback = feedback.partial;
  warnings.push(...feedback.warnings);

  warnRemovedSettings(value, ["promptTransforms"], `${sourceLabel}: `, warnings);
  const promptStructures = parsePromptStructures(value.promptStructures, sourceLabel);
  partial.promptStructures = promptStructures.partial;
  warnings.push(...promptStructures.warnings);

  return { partial, warnings };
}
