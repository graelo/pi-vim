import type {
  ResolvedVimInsertKeymap,
  VimCommandAction,
  VimEditorOptions,
  ResolvedVimEditorOptions,
  VimMode,
  VimPreset,
} from "../types.ts";

import {
  optionValueAtPath,
  setOptionPath,
  type VimJsConfigOperation,
  type VimJsConfigRules,
} from "../config-js.ts";
import type { VimMappingScope } from "../mapping-scopes.ts";

import { cloneResolvedVimOptions } from "./clone.ts";
import { isRecord } from "./fields.ts";
import { additiveKeymapLayer, remainingScopedModes } from "./keymap-layers.ts";
import { resolvedLeaderKey } from "./leader.ts";
import { mergePartialOptions, presetOptions } from "./merge.ts";
import type { resolveVimOptions } from "./resolve.ts";
import { parsePiVim } from "./settings-parsers.ts";
import type { PartialKeymapOptions, PartialVimOptions } from "./types.ts";

function configRuleFor(path: string, value: unknown): ReturnType<VimJsConfigRules["validate"]> {
  const config: Record<string, unknown> = {};
  setOptionPath(config, path, value);
  const parsed = parsePiVim(config, "global JS config");
  const parsedValue = optionValueAtPath(parsed.partial, path);
  const unknownRecordMember =
    isRecord(value) &&
    isRecord(parsedValue) &&
    Object.keys(value).some((key) => !Object.hasOwn(parsedValue, key));
  if (parsed.warnings.length === 0 && parsedValue !== undefined && !unknownRecordMember) {
    return { ok: true, value: parsedValue };
  }
  const message = parsed.warnings[0] ?? `unsupported ${path}`;
  return { ok: false, message: message.replace(/^global JS config: /, "") };
}

export function jsConfigRules(): VimJsConfigRules {
  return {
    validate: configRuleFor,
    applyPreset(state, preset) {
      const options = cloneResolvedVimOptions(state as ResolvedVimEditorOptions);
      mergePartialOptions(options, presetOptions(preset));
      return options as unknown as Record<string, unknown>;
    },
  };
}

function jsMappingMatches(candidate: string, key: string, leader?: string | null): boolean {
  return leader === undefined
    ? candidate === key
    : resolvedLeaderKey(candidate, leader ?? undefined) === key;
}

function removeJsInsertMappings(
  keymap: PartialKeymapOptions,
  key: string,
  leader?: string | null,
): void {
  if (!keymap.insert) return;
  for (const action of Object.keys(keymap.insert) as Array<keyof ResolvedVimInsertKeymap>) {
    keymap.insert[action] = keymap.insert[action]?.filter(
      (binding) => !jsMappingMatches(binding, key, leader),
    );
  }
}

export function removeJsMappings(
  keymap: PartialKeymapOptions,
  key: string,
  modes: readonly VimMappingScope[],
  leader?: string | null,
): void {
  if (modes.includes("insert")) removeJsInsertMappings(keymap, key, leader);
  if (keymap.remaps) {
    keymap.remaps.accepted = keymap.remaps.accepted.flatMap((mapping) => {
      if (!jsMappingMatches(mapping.key, key, leader)) return [mapping];
      const remainingModes = remainingScopedModes(mapping.modes, modes);
      return remainingModes.length ? [{ ...mapping, modes: remainingModes }] : [];
    });
  }
  if (keymap.scoped) {
    keymap.scoped = keymap.scoped.flatMap((binding) => {
      if (!jsMappingMatches(binding.key, key, leader)) return [binding];
      const remainingModes = binding.modes.filter((mode) => !modes.includes(mode as VimMode));
      return remainingModes.length ? [{ ...binding, modes: remainingModes }] : [];
    });
  }
}

function editorModes(modes: readonly VimMappingScope[]): VimMode[] {
  return modes.filter((mode): mode is VimMode => mode !== "operatorPending");
}

export function restoreJsUnmaps(
  keymap: PartialKeymapOptions,
  key: string,
  modes: readonly VimMappingScope[],
  leader?: string | null,
): void {
  keymap.unmaps = keymap.unmaps?.flatMap((unmap) => {
    const unmapKey =
      leader === undefined ? unmap.key : resolvedLeaderKey(unmap.key, leader ?? undefined);
    if (unmapKey !== key) return [unmap];
    const remainingModes = unmap.modes.filter((mode) => !modes.includes(mode));
    return remainingModes.length ? [{ ...unmap, modes: remainingModes }] : [];
  });
}

function applyJsUnmap(
  keymap: PartialKeymapOptions,
  operation: Extract<VimJsConfigOperation, { kind: "unmap" }>,
): void {
  removeJsMappings(keymap, operation.key, editorModes(operation.modes));
  (keymap.unmaps ??= []).push({ key: operation.key, modes: operation.modes });
}

function applyJsInsertMapping(
  keymap: PartialKeymapOptions,
  mapping: Extract<Extract<VimJsConfigOperation, { kind: "map" }>["mapping"], { kind: "insert" }>,
  sourceOrder: number,
): void {
  removeJsMappings(keymap, mapping.key, ["insert"]);
  restoreJsUnmaps(keymap, mapping.key, ["insert"]);
  const insert = (keymap.insert ??= {});
  insert[mapping.action] = [...(insert[mapping.action] ?? []), mapping.key];
  keymap.scoped = [
    ...(keymap.scoped ?? []),
    {
      actionId: `insert.${mapping.action}`,
      key: mapping.key,
      modes: ["insert"],
      allowProtected: mapping.allowProtected,
      desc: mapping.desc,
      __sourceOrder: sourceOrder,
    },
  ];
}

function applyJsScopedMapping(
  keymap: PartialKeymapOptions,
  mapping: Exclude<Extract<VimJsConfigOperation, { kind: "map" }>["mapping"], { kind: "insert" }>,
  sourceOrder: number,
): void {
  restoreJsUnmaps(keymap, mapping.key, mapping.modes);
  if (mapping.kind === "command") {
    removeJsMappings(keymap, mapping.key, mapping.modes);
    const commands = (keymap.commands ??= {}) as Partial<Record<VimCommandAction, string[]>>;
    commands[mapping.command as VimCommandAction] = [
      ...(commands[mapping.command as VimCommandAction] ?? []),
      mapping.key,
    ];
    return;
  }
  if (mapping.kind === "descriptor") {
    keymap.scoped = (keymap.scoped ?? []).flatMap((binding) => {
      if (binding.key !== mapping.key) return [binding];
      const modes = binding.modes.filter((mode) => !mapping.modes.includes(mode));
      return modes.length ? [{ ...binding, modes }] : [];
    });
    keymap.scoped = [
      ...keymap.scoped,
      {
        actionId: mapping.actionId,
        key: mapping.key,
        modes: mapping.modes,
        args: mapping.args,
        allowProtected: mapping.allowProtected,
        desc: mapping.desc,
        __sourceOrder: sourceOrder,
      },
    ];
    return;
  }
  removeJsMappings(keymap, mapping.key, mapping.modes);
  const remaps = (keymap.remaps ??= { accepted: [] });
  remaps.accepted = [
    ...remaps.accepted,
    {
      key: mapping.key,
      inputs: mapping.inputs,
      modes: mapping.modes,
      allowProtected: mapping.allowProtected,
      desc: mapping.desc,
      __sourceOrder: sourceOrder,
    },
  ];
}

function partialFromJsOperations(operations: readonly VimJsConfigOperation[]): VimEditorOptions {
  const partial: VimEditorOptions = {};
  for (const [sourceOrder, operation] of operations.entries()) {
    if (operation.kind === "preset") partial.preset = operation.preset;
    else if (operation.kind === "unmap")
      applyJsUnmap((partial.keymap ??= {}) as PartialKeymapOptions, operation);
    else if (operation.kind === "map") {
      const keymap = (partial.keymap ??= {}) as PartialKeymapOptions;
      if (operation.mapping.kind === "insert")
        applyJsInsertMapping(keymap, operation.mapping, sourceOrder);
      else applyJsScopedMapping(keymap, operation.mapping, sourceOrder);
    }
  }
  return partial;
}

const JS_REPLACED_RECORD_PATHS = new Set([
  "ui.mode.labels",
  "ui.mode.narrowLabels",
  "promptStructures.targets",
]);

function replaceJsRecord(
  options: ResolvedVimEditorOptions,
  path: string,
  partial: PartialVimOptions,
): void {
  if (!JS_REPLACED_RECORD_PATHS.has(path)) return;
  const value = optionValueAtPath(partial, path);
  if (value !== undefined)
    setOptionPath(options as unknown as Record<string, unknown>, path, value);
}

function appendJsMapLayer(
  keymapLayers: PartialKeymapOptions[],
  operations: readonly VimJsConfigOperation[],
  warnings: string[],
): void {
  if (operations.length === 0) return;
  const source = partialFromJsOperations(operations);
  const rawKeymap = source.keymap as PartialKeymapOptions | undefined;
  const parsed = parsePiVim(source, "global JS config");
  if (!parsed.partial.keymap) return;
  warnings.push(...parsed.warnings);
  const layer = additiveKeymapLayer(keymapLayers, parsed.partial.keymap);
  layer.unmaps = rawKeymap?.unmaps;
  // Parsed insert bindings carry existing key-shape and protected-shortcut validation.
  // Do not restore raw descriptor entries that validation rejected.
  layer.scoped = rawKeymap?.scoped?.filter((binding) => {
    if (!binding.actionId.startsWith("insert.")) return true;
    const action = binding.actionId.slice("insert.".length) as keyof ResolvedVimInsertKeymap;
    return parsed.partial.keymap?.insert?.[action]?.includes(binding.key) ?? false;
  });
  keymapLayers.push(layer);
}

function applyJsPreset(
  options: ResolvedVimEditorOptions,
  keymapLayers: PartialKeymapOptions[],
  preset: VimPreset,
): void {
  const partial = presetOptions(preset);
  mergePartialOptions(options, partial);
  if (partial.keymap) keymapLayers.push(partial.keymap);
}

function applyJsLeaf(
  options: ResolvedVimEditorOptions,
  keymapLayers: PartialKeymapOptions[],
  operation: Extract<VimJsConfigOperation, { kind: "leaf" }>,
  warnings: string[],
): void {
  const value: Record<string, unknown> = {};
  setOptionPath(value, operation.path, operation.value);
  const parsed = parsePiVim(value, "global JS config");
  mergePartialOptions(options, parsed.partial);
  replaceJsRecord(options, operation.path, parsed.partial);
  if (parsed.partial.keymap && operation.path === "keymap.operatorMotions")
    parsed.partial.keymap.replaceOperatorMotions = true;
  if (parsed.partial.keymap) keymapLayers.push(parsed.partial.keymap);
  warnings.push(...parsed.warnings);
}

export function applyJsOptionOperations(
  options: ResolvedVimEditorOptions,
  keymapLayers: PartialKeymapOptions[],
  operations: readonly VimJsConfigOperation[],
  warnings: string[],
): void {
  let mapOperations: VimJsConfigOperation[] = [];
  for (const operation of operations) {
    if (operation.kind === "map" || operation.kind === "unmap") {
      mapOperations.push(operation);
      continue;
    }
    appendJsMapLayer(keymapLayers, mapOperations, warnings);
    mapOperations = [];
    if (operation.kind === "preset") applyJsPreset(options, keymapLayers, operation.preset);
    else applyJsLeaf(options, keymapLayers, operation, warnings);
  }
  appendJsMapLayer(keymapLayers, mapOperations, warnings);
}

export function compileJsConfig(jsConfig: Parameters<typeof resolveVimOptions>[2]): {
  source: unknown;
  unmaps: PartialKeymapOptions["unmaps"] | undefined;
} {
  const compiled = jsConfig?.operations ? partialFromJsOperations(jsConfig.operations) : undefined;
  return {
    source: compiled ?? jsConfig?.partial,
    unmaps: (compiled?.keymap as PartialKeymapOptions | undefined)?.unmaps,
  };
}
