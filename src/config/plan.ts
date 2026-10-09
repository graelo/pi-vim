import type { ResolvedVimKeymap, ResolvedVimEditorOptions } from "../types.ts";

import { grammarEntriesForKeymap, isOperatorExtension } from "../keymap-grammar.ts";
import {
  displayMappingSequence,
  mappingSequencePrefixes,
  mappingScopesForKeymapEntry,
  mappingSequencesOverlap,
  VIM_MAPPING_SCOPES,
  type VimMappingScope,
} from "../mapping-scopes.ts";

import { escapeAliasesForScope } from "./accessors.ts";
import { cloneResolvedVimOptions } from "./clone.ts";
import { ACTION_BINDING_MODES, DEFAULT_VIM_KEYMAP } from "./defaults.ts";
import type { VimConfigPlan, VimPlanBinding, VimScopeLookup } from "./types.ts";

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function hasStrictPrefixConflict(left: string, right: string): boolean {
  return left !== right && mappingSequencesOverlap(left, right);
}

type ResolvedVimRemap = ResolvedVimKeymap["remaps"]["accepted"][number];

type ScopedPlanSource = ResolvedVimRemap | ResolvedVimKeymap["scoped"][number];

type VimPlanCandidate = {
  sequence: string;
  binding: VimPlanBinding;
  source?: ScopedPlanSource;
};

function retainAcceptedScopes<T extends ScopedPlanSource>(
  bindings: readonly T[],
  acceptedScopes: ReadonlyMap<ScopedPlanSource, ReadonlySet<VimMappingScope>>,
): T[] {
  return bindings.flatMap((binding) => {
    const requestedModes = binding.modes ?? ACTION_BINDING_MODES;
    const acceptedModes = requestedModes.filter((mode) => acceptedScopes.get(binding)?.has(mode));
    if (acceptedModes.length === 0) return [];
    return acceptedModes.length === requestedModes.length
      ? [binding]
      : [{ ...binding, modes: acceptedModes }];
  });
}

function extendsPlanOperator(
  keymap: ResolvedVimKeymap,
  left: { sequence: string; binding: VimPlanBinding },
  right: { sequence: string; binding: VimPlanBinding },
): boolean {
  const [shorter, longer] =
    left.sequence.length < right.sequence.length ? [left, right] : [right, left];
  return (
    shorter.binding.id.startsWith("operator.") &&
    isOperatorExtension(keymap, shorter.sequence, longer.sequence)
  );
}

function compilePlanScope(
  keymap: ResolvedVimKeymap,
  scope: VimMappingScope,
  candidates: readonly VimPlanCandidate[],
  warnings: string[],
  acceptedScopes: Map<ScopedPlanSource, Set<VimMappingScope>>,
): VimScopeLookup {
  const exact = Object.create(null) as Record<string, VimPlanBinding>;
  const exactCandidates = Object.create(null) as Record<string, VimPlanCandidate>;
  for (const candidate of candidates) {
    const strictPrefix = Object.keys(exact).find(
      (sequence) =>
        hasStrictPrefixConflict(sequence, candidate.sequence) &&
        !extendsPlanOperator(keymap, { sequence, binding: exact[sequence]! }, candidate),
    );
    if (strictPrefix) {
      const warning = `resolved settings: rejected ${candidate.binding.id}.${candidate.sequence} in ${scope}: strict-prefix conflict with ${exact[strictPrefix]!.id}.${strictPrefix}`;
      if (!warnings.includes(warning)) warnings.push(warning);
      continue;
    }
    exact[candidate.sequence] = candidate.binding;
    exactCandidates[candidate.sequence] = candidate;
  }
  for (const candidate of Object.values(exactCandidates)) {
    if (!candidate.source) continue;
    const accepted = acceptedScopes.get(candidate.source) ?? new Set<VimMappingScope>();
    accepted.add(scope);
    acceptedScopes.set(candidate.source, accepted);
  }

  const prefixes = Object.create(null) as Record<string, string[]>;
  for (const sequence of Object.keys(exact)) {
    for (const prefix of mappingSequencePrefixes(sequence)) {
      (prefixes[prefix] ??= []).push(sequence);
    }
  }
  return { exact, prefixes };
}

function addPlanCandidate(
  keymap: ResolvedVimKeymap,
  candidates: Record<VimMappingScope, VimPlanCandidate[]>,
  scopes: readonly VimMappingScope[],
  sequence: string,
  binding: VimPlanBinding,
  source?: ScopedPlanSource,
): void {
  for (const scope of scopes)
    if (!keymap.unmaps.some((unmap) => unmap.key === sequence && unmap.modes.includes(scope)))
      candidates[scope].push({ sequence, binding, source });
}

function addPlanGrammarCandidates(
  keymap: ResolvedVimKeymap,
  candidates: Record<VimMappingScope, VimPlanCandidate[]>,
): void {
  for (const entry of grammarEntriesForKeymap(keymap))
    addPlanCandidate(
      keymap,
      candidates,
      mappingScopesForKeymapEntry(entry.family, entry.id),
      entry.sequence,
      { kind: "keymap", id: `${entry.family}.${entry.id}` },
    );
  for (const scope of ["insert", "visual", "visualLine", "visualBlock", "operatorPending"] as const)
    for (const sequence of escapeAliasesForScope(keymap, scope))
      addPlanCandidate(keymap, candidates, [scope], sequence, { kind: "escape", id: "escape" });
  for (const [action, sequences] of Object.entries(keymap.insert))
    for (const sequence of sequences)
      addPlanCandidate(keymap, candidates, ["insert"], sequence, { kind: "insert", id: action });
  for (const [action, sequences] of Object.entries(keymap.commands)) {
    if (!mappingScopesForKeymapEntry("command", action).includes("normal")) continue;
    for (const sequence of sequences)
      addPlanCandidate(keymap, candidates, ["normal"], sequence, {
        kind: "command",
        id: `command.${action}`,
      });
  }
}

function addPlanScopedCandidates(
  keymap: ResolvedVimKeymap,
  candidates: Record<VimMappingScope, VimPlanCandidate[]>,
): void {
  for (const remap of keymap.remaps.accepted)
    addPlanCandidate(
      keymap,
      candidates,
      remap.modes ?? ACTION_BINDING_MODES,
      remap.key,
      { kind: "remap", id: "remap", inputs: remap.inputs },
      remap,
    );
  for (const binding of keymap.scoped)
    addPlanCandidate(
      keymap,
      candidates,
      binding.modes,
      binding.key,
      binding.actionId === "escape"
        ? { kind: "escape", id: "escape" }
        : { kind: "keymap", id: binding.actionId },
      binding,
    );
}

function populatePlanCandidates(
  keymap: ResolvedVimKeymap,
  candidates: Record<VimMappingScope, VimPlanCandidate[]>,
): void {
  addPlanGrammarCandidates(keymap, candidates);
  addPlanScopedCandidates(keymap, candidates);
}

function compilePlanScopes(
  keymap: ResolvedVimKeymap,
  candidates: Record<VimMappingScope, VimPlanCandidate[]>,
  warnings: readonly string[],
): {
  scopes: Record<VimMappingScope, VimScopeLookup>;
  warnings: string[];
  acceptedScopes: Map<ScopedPlanSource, Set<VimMappingScope>>;
} {
  for (const scope of VIM_MAPPING_SCOPES)
    candidates[scope].sort(
      (left, right) => (left.source?.__sourceOrder ?? -1) - (right.source?.__sourceOrder ?? -1),
    );
  const compileWarnings = [...warnings];
  const acceptedScopes = new Map<ScopedPlanSource, Set<VimMappingScope>>();
  const scopes = Object.fromEntries(
    VIM_MAPPING_SCOPES.map((scope) => [
      scope,
      compilePlanScope(keymap, scope, candidates[scope], compileWarnings, acceptedScopes),
    ]),
  ) as Record<VimMappingScope, VimScopeLookup>;
  return { scopes, warnings: compileWarnings, acceptedScopes };
}

function removePlanSourceOrder(keymap: ResolvedVimKeymap): void {
  for (const remap of keymap.remaps.accepted) delete remap.__sourceOrder;
  for (const binding of keymap.scoped) delete binding.__sourceOrder;
}

export function createVimConfigPlan(
  options: ResolvedVimEditorOptions,
  warnings: readonly string[],
): VimConfigPlan {
  const planOptions = cloneResolvedVimOptions(options);
  const candidates = Object.fromEntries(
    VIM_MAPPING_SCOPES.map((scope) => [scope, [] as VimPlanCandidate[]]),
  ) as Record<VimMappingScope, VimPlanCandidate[]>;
  populatePlanCandidates(planOptions.keymap ?? DEFAULT_VIM_KEYMAP, candidates);
  const compiled = compilePlanScopes(
    planOptions.keymap ?? DEFAULT_VIM_KEYMAP,
    candidates,
    warnings,
  );
  if (planOptions.keymap) {
    planOptions.keymap.remaps.accepted = retainAcceptedScopes(
      planOptions.keymap.remaps.accepted,
      compiled.acceptedScopes,
    );
    planOptions.keymap.scoped = retainAcceptedScopes(
      planOptions.keymap.scoped,
      compiled.acceptedScopes,
    );
    removePlanSourceOrder(planOptions.keymap);
  }
  return deepFreeze({
    options: planOptions,
    diagnostics: { warnings: compiled.warnings.map(displayMappingSequence) },
    scopes: compiled.scopes,
  });
}
