import type { GrammarBinding } from "../keymap-grammar.ts";
import type { ResolvedVimKeymap } from "../types.ts";
import {
  grammarBindingsForKeymap,
  grammarConflictForActionKey,
  grammarEntriesForKeymap,
  isOperatorExtension,
} from "../keymap-grammar.ts";
import {
  isAtomicMappingSequence,
  mappingScopesForKeymapEntry,
  type VimMappingScope,
} from "../mapping-scopes.ts";

import { DEFAULT_VIM_KEYMAP } from "./defaults.ts";

export function rejectShowKeybindingsConflicts(keymap: ResolvedVimKeymap): string[] {
  const warnings: string[] = [];
  const grammarBindings = grammarBindingsForKeymap(keymap).filter(
    (binding) => binding.label !== "commands.showKeybindings",
  );
  const accepted: string[] = [];
  for (const key of keymap.commands.showKeybindings) {
    const reason = grammarConflictForActionKey(key, grammarBindings);
    if (reason) {
      warnings.push(
        `resolved settings: rejected keymap.commands.showKeybindings.${key}: ${reason}`,
      );
    } else {
      accepted.push(key);
    }
  }
  keymap.commands = { ...keymap.commands, showKeybindings: accepted };
  return warnings;
}

type ScopedGrammarBinding = GrammarBinding & { scopes: readonly VimMappingScope[] };

function scopedGrammarBindings(keymap: ResolvedVimKeymap): ScopedGrammarBinding[] {
  return grammarEntriesForKeymap(keymap).map((entry) => ({
    sequence: entry.sequence,
    label: entry.label,
    scopes: mappingScopesForKeymapEntry(entry.family, entry.id),
  }));
}

function scopesIntersect(left: ScopedGrammarBinding, right: ScopedGrammarBinding): boolean {
  return left.scopes.some((scope) => right.scopes.includes(scope));
}

function duplicateBindingWarnings(bindings: readonly ScopedGrammarBinding[]): string[] {
  const warnings: string[] = [];
  const seen = new Map<string, ScopedGrammarBinding[]>();
  for (const binding of bindings) {
    const previous = (seen.get(binding.sequence) ?? []).find(
      (candidate) => candidate.label !== binding.label && scopesIntersect(candidate, binding),
    );
    if (previous)
      warnings.push(
        `resolved settings: duplicate keymap binding ${binding.sequence} for ${previous.label} and ${binding.label}`,
      );
    else seen.set(binding.sequence, [...(seen.get(binding.sequence) ?? []), binding]);
  }
  return warnings;
}

function textObjectConflictWarnings(
  kind: "kinds" | "targets",
  entries: Record<string, readonly string[]>,
  defaults: Record<string, readonly string[]>,
  primaryBindings: readonly GrammarBinding[],
): string[] {
  const warnings: string[] = [];
  for (const [name, sequences] of Object.entries(entries))
    for (const sequence of sequences) {
      if (defaults[name]?.includes(sequence)) continue;
      const binding = primaryBindings.find((candidate) => candidate.sequence === sequence);
      if (binding)
        warnings.push(
          `resolved settings: duplicate keymap binding ${sequence} for ${binding.label} and textObjects.${kind}.${name}`,
        );
    }
  return warnings;
}

function shadowedBindingWarnings(
  keymap: ResolvedVimKeymap,
  bindings: readonly ScopedGrammarBinding[],
): string[] {
  const warnings: string[] = [];
  for (const first of bindings)
    for (const second of bindings) {
      if (first === second || second.sequence.length <= first.sequence.length) continue;
      if (
        isAtomicMappingSequence(first.sequence) ||
        isAtomicMappingSequence(second.sequence) ||
        !second.sequence.startsWith(first.sequence) ||
        !scopesIntersect(first, second) ||
        (first.label.startsWith("operators.") &&
          isOperatorExtension(keymap, first.sequence, second.sequence))
      )
        continue;
      warnings.push(
        `resolved settings: keymap binding ${first.sequence} for ${first.label} is shadowed by longer binding ${second.sequence} for ${second.label}`,
      );
    }
  return warnings;
}

export function detectKeymapConflicts(keymap: ResolvedVimKeymap): string[] {
  const bindings = scopedGrammarBindings(keymap).filter(
    (binding) => !binding.label.startsWith("textObjects."),
  );
  const primary = bindings.filter((binding) =>
    ["operators.", "motions.", "commands."].some((prefix) => binding.label.startsWith(prefix)),
  );
  return [
    ...duplicateBindingWarnings(bindings),
    ...textObjectConflictWarnings(
      "kinds",
      keymap.textObjects.kinds,
      DEFAULT_VIM_KEYMAP.textObjects.kinds,
      primary,
    ),
    ...textObjectConflictWarnings(
      "targets",
      keymap.textObjects.targets,
      DEFAULT_VIM_KEYMAP.textObjects.targets,
      primary,
    ),
    ...shadowedBindingWarnings(keymap, bindings),
  ];
}
