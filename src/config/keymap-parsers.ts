import type {
  ResolvedVimInsertKeymap,
  ResolvedVimKeymap,
  VimCommandAction,
  VimMotionAction,
  VimMotionOperatorAction,
  VimOperatorAction,
  VimTextObjectKind,
  VimTextObjectTarget,
} from "../types.ts";
import { MAPPING_TOKEN_SEPARATOR } from "../mapping-scopes.ts";

import {
  COMMAND_ACTION_SET,
  INSERT_ACTION_SET,
  MACRO_ACTION_SET,
  MARK_ACTION_SET,
  MOTION_ACTION_SET,
  MOTION_OPERATOR_ACTION_SET,
  OPERATOR_ACTION_SET,
  OPERATOR_MOTION_ACTION_SET,
  REMAP_MODES,
  TEXT_OBJECT_KIND_SET,
  TEXT_OBJECT_TARGET_SET,
} from "./defaults.ts";
import {
  isPrintableTextSequence,
  isRecord,
  parseActionStringArray,
  parseStringArray,
  warnRemovedSettings,
} from "./fields.ts";
import type { PartialKeymapOptions } from "./types.ts";

function parseInsertEscapeArray(
  value: unknown,
  sourceLabel: string,
  warnings: string[],
  options: { allowProtectedKey?: (key: string) => boolean } = {},
): string[] | undefined {
  if (value === undefined) return undefined;
  if (Array.isArray(value) && value.length === 0) return [];
  const label = `${sourceLabel}: keymap.escape`;
  const sequences = parseStringArray(value, label, warnings, options);
  const parsed = sequences?.filter((sequence) => {
    if (!isPrintableTextSequence(sequence)) return true;
    warnings.push(
      `${label} contains unsupported printable text sequence ${sequence.replaceAll(MAPPING_TOKEN_SEPARATOR, "")}`,
    );
    return false;
  });
  return parsed && parsed.length > 0 ? parsed : undefined;
}

function printableBindingKeys(
  keys: readonly string[],
  label: string,
  warnings: string[],
): string[] {
  return keys.filter((sequence) => {
    if (!isPrintableTextSequence(sequence)) return true;
    warnings.push(
      `${label} contains unsupported printable text sequence ${sequence.replaceAll(MAPPING_TOKEN_SEPARATOR, "")}`,
    );
    return false;
  });
}

function warnDuplicateBinding(
  seen: Map<string, string>,
  key: string,
  action: string,
  label: string,
  warnings: string[],
): void {
  const previous = seen.get(key);
  if (previous && previous !== action)
    warnings.push(`${label} ${key} for ${previous} and ${action}`);
  else seen.set(key, action);
}

function parseInsertBinding(
  action: string,
  bindings: unknown,
  sourceLabel: string,
  warnings: string[],
  options: {
    allowProtectedKey?: (key: string) => boolean;
    allowProtectedBinding?: (action: keyof ResolvedVimInsertKeymap, key: string) => boolean;
  },
): string[] | undefined {
  const insertAction = action as keyof ResolvedVimInsertKeymap;
  const label = `${sourceLabel}: keymap.insert.${action}`;
  const keys = parseStringArray(bindings, label, warnings, {
    allowProtectedKey: (key) =>
      options.allowProtectedBinding?.(insertAction, key) === true ||
      options.allowProtectedKey?.(key) === true,
  });
  return keys ? printableBindingKeys(keys, label, warnings) : undefined;
}

function parseInsertBindings(
  value: unknown,
  sourceLabel: string,
  warnings: string[],
  options: {
    allowProtectedKey?: (key: string) => boolean;
    allowProtectedBinding?: (action: keyof ResolvedVimInsertKeymap, key: string) => boolean;
  } = {},
): Partial<ResolvedVimInsertKeymap> | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) {
    warnings.push(`${sourceLabel}: keymap.insert must be an object`);
    return undefined;
  }
  const parsed: Partial<ResolvedVimInsertKeymap> = {};
  const seen = new Map<string, string>();
  for (const [action, bindings] of Object.entries(value)) {
    if (!INSERT_ACTION_SET.has(action)) {
      warnings.push(`${sourceLabel}: unsupported keymap.insert.${action}`);
      continue;
    }
    const keys = parseInsertBinding(action, bindings, sourceLabel, warnings, options);
    // An explicit [] clears inherited bindings; a list whose keys were all rejected does not.
    const clears = Array.isArray(bindings) && bindings.length === 0;
    if (!keys || (keys.length === 0 && !clears)) continue;
    parsed[action as keyof ResolvedVimInsertKeymap] = keys;
    for (const key of keys) {
      warnDuplicateBinding(
        seen,
        key,
        action,
        `${sourceLabel}: duplicate keymap.insert binding`,
        warnings,
      );
    }
  }
  return Object.keys(parsed).length > 0 ? parsed : undefined;
}

function isAllowedMotionShortcut(group: string, action: string, key: string): boolean {
  return (
    group === "motions" &&
    ((action === "halfPageDown" && key === "ctrl+d") ||
      (action === "halfPageUp" && key === "ctrl+u"))
  );
}

function parseKeyBindingKeys(
  bindings: unknown,
  sourceLabel: string,
  group: string,
  action: string,
  warnings: string[],
  options: { singleKeyOnly?: boolean; allowProtectedKey?: (key: string) => boolean },
): string[] | undefined {
  return parseStringArray(bindings, `${sourceLabel}: keymap.${group}.${action}`, warnings, {
    ...options,
    allowProtectedKey: (key) =>
      isAllowedMotionShortcut(group, action, key) || options.allowProtectedKey?.(key) === true,
  });
}

function parseKeyBindings<T extends string>(
  value: unknown,
  allowed: Set<string>,
  sourceLabel: string,
  group: string,
  warnings: string[],
  options: { singleKeyOnly?: boolean; allowProtectedKey?: (key: string) => boolean } = {},
): Partial<Record<T, string[]>> | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) {
    warnings.push(`${sourceLabel}: keymap.${group} must be an object`);
    return undefined;
  }
  const parsed: Partial<Record<T, string[]>> = {};
  const seen = new Map<string, string>();
  for (const [action, bindings] of Object.entries(value)) {
    if (!allowed.has(action)) {
      warnings.push(`${sourceLabel}: unsupported keymap.${group}.${action}`);
      continue;
    }
    const keys = parseKeyBindingKeys(bindings, sourceLabel, group, action, warnings, options);
    if (!keys) continue;
    parsed[action as T] = keys;
    for (const key of keys) {
      warnDuplicateBinding(
        seen,
        key,
        action,
        `${sourceLabel}: duplicate keymap.${group} binding`,
        warnings,
      );
    }
  }
  return Object.keys(parsed).length > 0 ? parsed : undefined;
}

function parseTextObjects(
  value: unknown,
  sourceLabel: string,
  warnings: string[],
  allowProtectedKey: (key: string) => boolean,
): PartialKeymapOptions["textObjects"] | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) {
    warnings.push(`${sourceLabel}: keymap.textObjects must be an object`);
    return undefined;
  }
  const options = { singleKeyOnly: true, allowProtectedKey };
  const kinds = parseKeyBindings<VimTextObjectKind>(
    value.kinds,
    TEXT_OBJECT_KIND_SET,
    sourceLabel,
    "textObjects.kinds",
    warnings,
    options,
  );
  const targets = parseKeyBindings<VimTextObjectTarget>(
    value.targets,
    TEXT_OBJECT_TARGET_SET,
    sourceLabel,
    "textObjects.targets",
    warnings,
    options,
  );
  return kinds || targets ? { kinds, targets } : undefined;
}

function parseOperatorMotions(
  value: unknown,
  sourceLabel: string,
  warnings: string[],
): PartialKeymapOptions["operatorMotions"] | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) {
    warnings.push(`${sourceLabel}: keymap.operatorMotions must be an object`);
    return undefined;
  }
  const parsed: Partial<Record<VimMotionOperatorAction, VimMotionAction[]>> = {};
  for (const [operator, motions] of Object.entries(value)) {
    if (!MOTION_OPERATOR_ACTION_SET.has(operator)) {
      warnings.push(`${sourceLabel}: unsupported keymap.operatorMotions.${operator}`);
      continue;
    }
    const actions = parseActionStringArray<VimMotionAction>(
      motions,
      OPERATOR_MOTION_ACTION_SET,
      `${sourceLabel}: keymap.operatorMotions.${operator} contains unsupported operator motion`,
      warnings,
    );
    if (actions) parsed[operator as VimMotionOperatorAction] = actions;
  }
  return Object.keys(parsed).length > 0 ? parsed : undefined;
}

export function parseKeymap(
  value: unknown,
  sourceLabel: string,
): { partial?: PartialKeymapOptions; warnings: string[] } {
  const warnings: string[] = [];
  const partial: PartialKeymapOptions = {};
  if (value === undefined) return { warnings };
  if (!isRecord(value)) {
    warnings.push(`${sourceLabel}: keymap must be an object`);
    return { warnings };
  }

  partial.allowProtectedOverrides = parseAllowProtectedOverrides(
    value.allowProtectedOverrides,
    sourceLabel,
    warnings,
  );
  const allowProtectedKey: (key: string) => boolean = partial.allowProtectedOverrides
    ? (key: string) => partial.allowProtectedOverrides!.includes(key)
    : () => false;

  partial.escape = parseInsertEscapeArray(value.escape, sourceLabel, warnings, {
    allowProtectedKey,
  });

  partial.operators = parseKeyBindings<VimOperatorAction>(
    value.operators,
    OPERATOR_ACTION_SET,
    sourceLabel,
    "operators",
    warnings,
    { allowProtectedKey },
  );
  partial.motions = parseKeyBindings<VimMotionAction>(
    value.motions,
    MOTION_ACTION_SET,
    sourceLabel,
    "motions",
    warnings,
    { allowProtectedKey },
  );
  partial.commands = parseKeyBindings<VimCommandAction>(
    value.commands,
    COMMAND_ACTION_SET,
    sourceLabel,
    "commands",
    warnings,
    { allowProtectedKey },
  );
  partial.macros = parseKeyBindings<keyof ResolvedVimKeymap["macros"]>(
    value.macros,
    MACRO_ACTION_SET,
    sourceLabel,
    "macros",
    warnings,
    { allowProtectedKey },
  );
  partial.marks = parseKeyBindings<keyof ResolvedVimKeymap["marks"]>(
    value.marks,
    MARK_ACTION_SET,
    sourceLabel,
    "marks",
    warnings,
    { allowProtectedKey },
  );

  const scopedAllowProtected = (action: keyof ResolvedVimInsertKeymap, key: string) =>
    Array.isArray(value.scoped) &&
    value.scoped.some(
      (binding) =>
        isRecord(binding) &&
        binding.actionId === `insert.${action}` &&
        binding.key === key &&
        binding.allowProtected === true,
    );
  partial.insert = parseInsertBindings(value.insert, sourceLabel, warnings, {
    allowProtectedKey,
    allowProtectedBinding: scopedAllowProtected,
  });

  partial.textObjects = parseTextObjects(
    value.textObjects,
    sourceLabel,
    warnings,
    allowProtectedKey,
  );
  partial.operatorMotions = parseOperatorMotions(value.operatorMotions, sourceLabel, warnings);

  partial.remaps = parseRemaps(value.remaps, sourceLabel, warnings);
  warnRemovedSettings(value, ["actions", "actionPresets"], `${sourceLabel}: keymap.`, warnings);

  return { partial, warnings };
}

function parseRemaps(
  value: unknown,
  sourceLabel: string,
  warnings: string[],
): ResolvedVimKeymap["remaps"] | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value) || !Array.isArray(value.accepted)) {
    warnings.push(`${sourceLabel}: keymap.remaps must be an internal remap object`);
    return undefined;
  }

  const accepted = value.accepted.filter(
    (entry): entry is ResolvedVimKeymap["remaps"]["accepted"][number] => {
      if (!isRecord(entry)) return false;
      if (typeof entry.key !== "string" || !Array.isArray(entry.inputs)) return false;
      if (!entry.inputs.every((input) => typeof input === "string")) return false;
      if (entry.modes === undefined) return true;
      return Array.isArray(entry.modes) && entry.modes.every((mode) => REMAP_MODES.has(mode));
    },
  );
  return accepted.length > 0 ? { accepted } : undefined;
}

function parseAllowProtectedOverrides(
  value: unknown,
  sourceLabel: string,
  warnings: string[],
): string[] | undefined {
  if (value === undefined) return undefined;
  const label = `${sourceLabel}: keymap.allowProtectedOverrides`;
  return parseStringArray(value, label, warnings, {
    allowProtectedKey: () => true,
  });
}
