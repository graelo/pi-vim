import type { ResolvedVimKeymap } from "../types.ts";
import { protectedShortcutForKey } from "../customization.ts";
import { encodeMappingTokens, MAPPING_TOKEN_SEPARATOR } from "../mapping-scopes.ts";

import { LEADER_TOKEN, LEADER_TOKEN_PATTERN } from "./key-normalization.ts";
import type { PartialKeymapOptions } from "./types.ts";

type ExpandedLeaderSequence = { sequence?: string; usesLeader: boolean };

type LeaderExpansionContext = {
  leader: string | undefined;
  warnings: string[];
  expand: boolean;
};

function expandLeaderSequence(
  sequence: string,
  label: string,
  context: LeaderExpansionContext,
): ExpandedLeaderSequence {
  if (!/<leader>/i.test(sequence)) return { sequence, usesLeader: false };
  if (!sequence.toLowerCase().startsWith(LEADER_TOKEN)) {
    context.warnings.push(`${label} contains <leader> after another key`);
    return { usesLeader: false };
  }
  if (!context.leader) {
    context.warnings.push(`${label} uses <leader> but leader is unset`);
    return { usesLeader: false };
  }
  const suffix = sequence.replace(/^(?:<leader>)+/i, "").replaceAll(MAPPING_TOKEN_SEPARATOR, "");
  const protectedShortcut = protectedShortcutForKey(suffix);
  if (protectedShortcut) {
    context.warnings.push(
      `${label} contains protected key ${suffix} (${protectedShortcut.reason})`,
    );
    return { usesLeader: false };
  }
  if (sequence.toLowerCase() === LEADER_TOKEN) {
    context.warnings.push(`${label} cannot bind a lone <leader>`);
    return { usesLeader: false };
  }
  const expanded = sequence.includes(MAPPING_TOKEN_SEPARATOR)
    ? encodeMappingTokens(
        sequence
          .split(MAPPING_TOKEN_SEPARATOR)
          .map((token) => (token.toLowerCase() === LEADER_TOKEN ? context.leader! : token)),
      )
    : sequence.replace(LEADER_TOKEN_PATTERN, context.leader);
  return {
    sequence: context.expand ? expanded : sequence,
    usesLeader: true,
  };
}

export function resolvedLeaderKey(
  sequence: string,
  leader: string | undefined,
): string | undefined {
  return expandLeaderSequence(sequence, "project mapping", {
    leader,
    warnings: [],
    expand: true,
  }).sequence;
}

function expandBindingArray(
  bindings: string[],
  label: string,
  context: LeaderExpansionContext,
): { bindings?: string[]; usesLeader: boolean } {
  if (bindings.length === 0) return { bindings: [], usesLeader: false };
  const expanded: string[] = [];
  let usesLeader = false;
  for (const binding of bindings) {
    const result = expandLeaderSequence(binding, label, context);
    if (result.sequence) expanded.push(result.sequence);
    usesLeader ||= result.usesLeader;
  }
  return { bindings: expanded.length > 0 ? expanded : undefined, usesLeader };
}

function expandBindingRecord(
  record: Partial<Record<string, string[]>> | undefined,
  label: string,
  context: LeaderExpansionContext,
): boolean {
  if (!record) return false;
  let usesLeader = false;
  for (const [action, bindings] of Object.entries(record)) {
    if (!bindings) continue;
    const expanded = expandBindingArray(bindings, `${label}.${action}`, context);
    if (expanded.bindings) record[action] = expanded.bindings;
    else delete record[action];
    usesLeader ||= expanded.usesLeader;
  }
  return usesLeader;
}

function expandLeaderRecordMappings(
  overlay: PartialKeymapOptions,
  context: LeaderExpansionContext,
): boolean {
  const expandRecord = (record: object | undefined, label: string) =>
    expandBindingRecord(record as Partial<Record<string, string[]>> | undefined, label, context);
  if (overlay.escape)
    overlay.escape = expandBindingArray(
      overlay.escape,
      "resolved settings: keymap.escape",
      context,
    ).bindings;
  let usesLeader = false;
  for (const [record, label] of [
    [overlay.operators, "operators"],
    [overlay.motions, "motions"],
    [overlay.commands, "commands"],
    [overlay.macros, "macros"],
    [overlay.marks, "marks"],
  ] as const)
    usesLeader ||= expandRecord(record, `resolved settings: keymap.${label}`);
  expandRecord(overlay.textObjects?.kinds, "resolved settings: keymap.textObjects.kinds");
  expandRecord(overlay.textObjects?.targets, "resolved settings: keymap.textObjects.targets");
  expandRecord(overlay.insert, "resolved settings: keymap.insert");
  return usesLeader;
}

function expandLeaderUnmaps(
  overlay: PartialKeymapOptions,
  context: LeaderExpansionContext,
): boolean {
  let usesLeader = false;
  if (overlay.unmaps)
    overlay.unmaps = overlay.unmaps.flatMap((unmap) => {
      const result = expandLeaderSequence(unmap.key, "resolved settings: keymap.unmaps", context);
      usesLeader ||= result.usesLeader;
      return result.sequence ? [{ ...unmap, key: result.sequence }] : [];
    });
  return usesLeader;
}

function expandLeaderScopedMappings(
  overlay: PartialKeymapOptions,
  context: LeaderExpansionContext,
): boolean {
  let usesLeader = false;
  if (overlay.scoped)
    overlay.scoped = overlay.scoped.flatMap((binding) => {
      const result = expandLeaderSequence(
        binding.key,
        `resolved settings: keymap.${binding.actionId}`,
        context,
      );
      usesLeader ||= result.usesLeader;
      return result.sequence ? [{ ...binding, key: result.sequence }] : [];
    });
  if (overlay.remaps)
    overlay.remaps = {
      accepted: overlay.remaps.accepted.flatMap((remap) => {
        const result = expandLeaderSequence(remap.key, "resolved settings: keymap.remaps", context);
        usesLeader ||= result.usesLeader;
        return result.sequence ? [{ ...remap, key: result.sequence }] : [];
      }),
    };
  return usesLeader;
}

export function expandLeaderMappings(
  overlay: PartialKeymapOptions,
  leader: string | undefined,
  expand = true,
): { usesLeader: boolean; warnings: string[] } {
  const context: LeaderExpansionContext = { leader, warnings: [], expand };
  const recordUsesLeader = expandLeaderRecordMappings(overlay, context);
  const unmapUsesLeader = expandLeaderUnmaps(overlay, context);
  const scopedUsesLeader = expandLeaderScopedMappings(overlay, context);
  return {
    usesLeader: recordUsesLeader || unmapUsesLeader || scopedUsesLeader,
    warnings: context.warnings,
  };
}

export function reserveLeaderPrefix(target: ResolvedVimKeymap, leader: string): void {
  const remove = <K extends string>(record: Record<K, readonly string[]>): Record<K, string[]> =>
    Object.fromEntries(
      Object.entries(record).map(([action, bindings]) => [
        action,
        (bindings as readonly string[]).filter(
          (binding) => binding !== leader && !binding.startsWith(leader),
        ),
      ]),
    ) as Record<K, string[]>;

  target.operators = remove(target.operators);
  target.motions = remove(target.motions);
  target.commands = remove(target.commands);
  target.macros = remove(target.macros);
  target.marks = remove(target.marks);
  target.textObjects = {
    kinds: remove(target.textObjects.kinds),
    targets: remove(target.textObjects.targets),
  };
  target.remaps = {
    accepted: target.remaps.accepted.filter(
      (remap) => remap.key !== leader && !remap.key.startsWith(leader),
    ),
  };
}
