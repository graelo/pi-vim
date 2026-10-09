import type {
  ResolvedVimInsertKeymap,
  ResolvedVimKeymap,
  VimActionBindingMode,
  VimMotionAction,
  VimMotionOperatorAction,
} from "../types.ts";
import { isOperatorExtension } from "../keymap-grammar.ts";
import {
  mappingScopesForKeymapEntry,
  mappingSequencesOverlap,
  type VimMappingFamily,
  type VimMappingScope,
} from "../mapping-scopes.ts";

import { cloneKeymap } from "./clone.ts";
import { ACTION_BINDING_MODES } from "./defaults.ts";
import { removeJsMappings, restoreJsUnmaps } from "./js-layer.ts";
import { expandLeaderMappings, reserveLeaderPrefix, resolvedLeaderKey } from "./leader.ts";
import type { PartialKeymapOptions, ProjectExactMapping } from "./types.ts";

function addBindingSequences(
  sequences: Set<string>,
  record: Partial<Record<string, readonly string[]>> | undefined,
): void {
  for (const bindings of Object.values(record ?? {}))
    for (const sequence of bindings ?? []) sequences.add(sequence);
}

function configuredTopLevelKeymapSequences(partial: PartialKeymapOptions): Set<string> {
  const sequences = new Set<string>();
  for (const group of [partial.operators, partial.motions, partial.macros, partial.marks])
    addBindingSequences(sequences, group);
  const commands = { ...partial.commands };
  delete commands.showKeybindings;
  addBindingSequences(sequences, commands);
  for (const remap of partial.remaps?.accepted ?? []) sequences.add(remap.key);
  return sequences;
}

function removeTopLevelKeymapSequences(target: ResolvedVimKeymap, sequences: Set<string>): void {
  if (sequences.size === 0) return;
  const conflicts = (binding: string, sequence: string): boolean =>
    mappingSequencesOverlap(binding, sequence) &&
    !isOperatorExtension(target, binding, sequence) &&
    !isOperatorExtension(target, sequence, binding);
  const remove = <K extends string>(record: Record<K, readonly string[]>): Record<K, string[]> => {
    const next = {} as Record<K, string[]>;
    for (const action of Object.keys(record) as K[]) {
      next[action] = record[action].filter(
        (binding) => ![...sequences].some((sequence) => conflicts(binding, sequence)),
      );
    }
    return next;
  };

  target.operators = remove(target.operators);
  target.motions = remove(target.motions);
  target.commands = remove(target.commands);
  target.macros = remove(target.macros);
  target.marks = remove(target.marks);
  target.remaps = {
    accepted: target.remaps.accepted.filter(
      (remap) => ![...sequences].some((sequence) => mappingSequencesOverlap(remap.key, sequence)),
    ),
  };
}

export function remainingScopedModes(
  modes: readonly VimActionBindingMode[] | undefined,
  removedModes: readonly VimMappingScope[],
): readonly VimActionBindingMode[] {
  return (modes ?? ACTION_BINDING_MODES).filter((mode) => !removedModes.includes(mode));
}

function removeScopedKeymapBindings(
  target: ResolvedVimKeymap,
  unmap: { key: string; modes: readonly VimMappingScope[] },
): void {
  target.remaps.accepted = target.remaps.accepted.flatMap((mapping) => {
    if (mapping.key !== unmap.key) return [mapping];
    const modes = remainingScopedModes(mapping.modes, unmap.modes);
    return modes.length ? [{ ...mapping, modes }] : [];
  });
  target.scoped = target.scoped.flatMap((binding) => {
    if (binding.key !== unmap.key) return [binding];
    const modes = binding.modes.filter((mode) => !unmap.modes.includes(mode));
    return modes.length ? [{ ...binding, modes }] : [];
  });
}

function mergeOperatorMotions(
  current: Partial<Record<VimMotionOperatorAction, readonly VimMotionAction[]>>,
  next: Partial<Record<VimMotionOperatorAction, readonly VimMotionAction[]>>,
  replace?: boolean,
): Partial<Record<VimMotionOperatorAction, readonly VimMotionAction[]>> {
  return replace ? { ...next } : { ...current, ...next };
}

function applyKeymapUnmaps(
  target: ResolvedVimKeymap,
  unmaps: readonly NonNullable<PartialKeymapOptions["unmaps"]>[number][],
): void {
  target.unmaps = [...target.unmaps, ...unmaps];
  for (const unmap of unmaps) {
    if (unmap.modes.includes("insert"))
      for (const action of Object.keys(target.insert) as Array<keyof ResolvedVimInsertKeymap>)
        target.insert[action] = target.insert[action].filter((key) => key !== unmap.key);
    removeScopedKeymapBindings(target, unmap);
  }
}

function mergeKeymapRecords(target: ResolvedVimKeymap, partial: PartialKeymapOptions): void {
  if (partial.escape) target.escape = [...partial.escape];
  if (partial.operators) target.operators = { ...target.operators, ...partial.operators };
  if (partial.motions) target.motions = { ...target.motions, ...partial.motions };
  if (partial.commands) target.commands = { ...target.commands, ...partial.commands };
  if (partial.macros) target.macros = { ...target.macros, ...partial.macros };
  if (partial.marks) target.marks = { ...target.marks, ...partial.marks };
  if (partial.insert) target.insert = { ...target.insert, ...partial.insert };
  if (partial.textObjects)
    target.textObjects = {
      kinds: { ...target.textObjects.kinds, ...partial.textObjects.kinds },
      targets: { ...target.textObjects.targets, ...partial.textObjects.targets },
    };
  if (partial.operatorMotions)
    target.operatorMotions = mergeOperatorMotions(
      target.operatorMotions,
      partial.operatorMotions,
      partial.replaceOperatorMotions,
    ) as typeof target.operatorMotions;
}

function mergeScopedBindings(
  target: ResolvedVimKeymap,
  bindings: readonly ResolvedVimKeymap["scoped"][number][],
): void {
  for (const binding of bindings)
    target.scoped = [
      ...target.scoped.flatMap((current) => {
        if (current.key !== binding.key) return [current];
        const modes = current.modes.filter((mode) => !binding.modes.includes(mode));
        return modes.length ? [{ ...current, modes }] : [];
      }),
      binding,
    ];
}

export function mergeKeymap(target: ResolvedVimKeymap, partial: PartialKeymapOptions): void {
  const unmaps = partial.unmaps ?? [];
  applyKeymapUnmaps(target, unmaps);
  removeTopLevelKeymapSequences(target, configuredTopLevelKeymapSequences(partial));
  mergeKeymapRecords(target, partial);
  if (partial.remaps)
    target.remaps = { accepted: [...target.remaps.accepted, ...partial.remaps.accepted] };
  if (partial.scoped) mergeScopedBindings(target, partial.scoped);
  for (const unmap of unmaps) removeScopedKeymapBindings(target, unmap);
}

export function additiveKeymapLayer(
  layers: readonly PartialKeymapOptions[],
  partial: PartialKeymapOptions,
): PartialKeymapOptions {
  const base = keymapOverlayFromLayers(layers);
  const next: PartialKeymapOptions = { ...partial };
  if (partial.insert) {
    const insert: Partial<ResolvedVimInsertKeymap> = {};
    for (const [action, keys] of Object.entries(partial.insert)) {
      const typedAction = action as keyof ResolvedVimInsertKeymap;
      insert[typedAction] = [...(base.insert?.[typedAction] ?? []), ...keys];
    }
    next.insert = insert;
  }
  if (partial.scoped) next.scoped = [...(base.scoped ?? []), ...partial.scoped];
  return next;
}

function removePartialRemaps(target: PartialKeymapOptions, sequences: Set<string>): void {
  if (!target.remaps || sequences.size === 0) return;
  target.remaps = {
    accepted: target.remaps.accepted.filter(
      (remap) => ![...sequences].some((sequence) => mappingSequencesOverlap(remap.key, sequence)),
    ),
  };
}

function mergeKeymapOverlayRecords(
  target: PartialKeymapOptions,
  partial: PartialKeymapOptions,
): void {
  if (partial.escape) target.escape = [...partial.escape];
  if (partial.operators) target.operators = { ...target.operators, ...partial.operators };
  if (partial.motions) target.motions = { ...target.motions, ...partial.motions };
  if (partial.commands) target.commands = { ...target.commands, ...partial.commands };
  if (partial.macros) target.macros = { ...target.macros, ...partial.macros };
  if (partial.marks) target.marks = { ...target.marks, ...partial.marks };
  if (partial.insert) target.insert = { ...target.insert, ...partial.insert };
  if (partial.textObjects)
    target.textObjects = {
      kinds: { ...target.textObjects?.kinds, ...partial.textObjects.kinds },
      targets: { ...target.textObjects?.targets, ...partial.textObjects.targets },
    };
  if (partial.operatorMotions)
    target.operatorMotions = mergeOperatorMotions(
      target.operatorMotions ?? {},
      partial.operatorMotions,
      partial.replaceOperatorMotions,
    ) as typeof target.operatorMotions;
}

function mergeKeymapOverlay(target: PartialKeymapOptions, partial: PartialKeymapOptions): void {
  if (partial.replaceOperatorMotions) target.replaceOperatorMotions = true;
  removePartialRemaps(target, configuredTopLevelKeymapSequences(partial));
  mergeKeymapOverlayRecords(target, partial);
  if (partial.remaps)
    target.remaps = { accepted: [...(target.remaps?.accepted ?? []), ...partial.remaps.accepted] };
  if (partial.scoped) target.scoped = [...(target.scoped ?? []), ...partial.scoped];
  if (partial.unmaps) target.unmaps = [...(target.unmaps ?? []), ...partial.unmaps];
}

function keymapOverlayFromLayers(layers: readonly PartialKeymapOptions[]): PartialKeymapOptions {
  const overlay: PartialKeymapOptions = {};
  for (const layer of layers) mergeKeymapOverlay(overlay, layer);
  return overlay;
}

function projectExactMappings(
  keymap: PartialKeymapOptions,
  leader?: string | null,
): ProjectExactMapping[] {
  const mappings: ProjectExactMapping[] = [];
  const add = (key: string, modes: readonly VimMappingScope[], actionId?: string) => {
    const finalKey = leader === undefined ? key : resolvedLeaderKey(key, leader ?? undefined);
    if (finalKey) mappings.push({ key: finalKey, modes, actionId });
  };
  const addRecord = (
    record: Partial<Record<string, readonly string[]>> | undefined,
    family: VimMappingFamily,
  ) => {
    for (const [action, bindings] of Object.entries(record ?? {})) {
      const modes = mappingScopesForKeymapEntry(family, action);
      for (const key of bindings ?? []) add(key, modes, `${family}.${action}`);
    }
  };

  for (const key of keymap.escape ?? []) {
    add(key, ["insert", "visual", "visualLine", "visualBlock"]);
  }
  addRecord(keymap.operators, "operator");
  addRecord(keymap.motions, "motion");
  addRecord(keymap.commands, "command");
  addRecord(keymap.macros, "macro");
  addRecord(keymap.marks, "mark");
  addRecord(keymap.insert, "insert");
  addRecord(keymap.textObjects?.kinds, "textObject.kind");
  addRecord(keymap.textObjects?.targets, "textObject.target");
  for (const remap of keymap.remaps?.accepted ?? []) {
    add(remap.key, remap.modes ?? ACTION_BINDING_MODES);
  }
  for (const binding of keymap.scoped ?? []) add(binding.key, binding.modes, binding.actionId);
  return mappings;
}

function removeJsActionMappings(
  keymap: PartialKeymapOptions,
  actionId: string,
  modes: readonly VimMappingScope[],
): void {
  if (!keymap.scoped) return;
  keymap.scoped = keymap.scoped.flatMap((binding) => {
    if (binding.actionId !== actionId) return [binding];
    const remaining = binding.modes.filter((mode) => !modes.includes(mode));
    return remaining.length ? [{ ...binding, modes: remaining }] : [];
  });
}

function projectConfiguredActions(
  keymap: PartialKeymapOptions,
): Array<{ actionId: string; modes: readonly VimMappingScope[] }> {
  const actions: Array<{ actionId: string; modes: readonly VimMappingScope[] }> = [];
  const addRecord = (
    record: Partial<Record<string, readonly unknown[]>> | undefined,
    family: VimMappingFamily,
  ) => {
    for (const action of Object.keys(record ?? {})) {
      actions.push({
        actionId: `${family}.${action}`,
        modes: mappingScopesForKeymapEntry(family, action),
      });
    }
  };
  addRecord(keymap.operators, "operator");
  addRecord(keymap.motions, "motion");
  addRecord(keymap.commands, "command");
  addRecord(keymap.macros, "macro");
  addRecord(keymap.marks, "mark");
  addRecord(keymap.insert, "insert");
  addRecord(keymap.textObjects?.kinds, "textObject.kind");
  addRecord(keymap.textObjects?.targets, "textObject.target");
  if (keymap.escape !== undefined) {
    actions.push({
      actionId: "escape",
      modes: ["insert", "visual", "visualLine", "visualBlock", "operatorPending"],
    });
  }
  return actions;
}

export function applyProjectExactPrecedence(
  lowerLayers: readonly PartialKeymapOptions[],
  project: PartialKeymapOptions,
  leader: string | undefined,
): void {
  for (const layer of lowerLayers) {
    for (const action of projectConfiguredActions(project)) {
      removeJsActionMappings(layer, action.actionId, action.modes);
    }
    for (const mapping of projectExactMappings(project, leader ?? null)) {
      removeJsMappings(layer, mapping.key, mapping.modes, leader ?? null);
      restoreJsUnmaps(layer, mapping.key, mapping.modes, leader ?? null);
    }
  }
}

export function resolveKeymapFromLayers(
  layers: readonly PartialKeymapOptions[],
  leader?: string,
): { keymap: ResolvedVimKeymap; warnings: string[] } {
  const warnings: string[] = [];
  for (const layer of layers) {
    warnings.push(...expandLeaderMappings(layer, leader, false).warnings);
  }
  const overlay = keymapOverlayFromLayers(layers);
  const expanded = expandLeaderMappings(overlay, leader);
  warnings.push(...expanded.warnings);
  const keymap = cloneKeymap();
  if (expanded.usesLeader && leader) {
    reserveLeaderPrefix(keymap, leader);
    keymap.leader = leader;
  }
  mergeKeymap(keymap, overlay);
  return { keymap, warnings };
}
