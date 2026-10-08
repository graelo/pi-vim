import type {
  ResolvedVimKeymap,
  VimCommandAction,
  VimMotionAction,
  VimOperatorAction,
  VimTextObjectKind,
  VimTextObjectTarget,
} from "./types.ts";

export type GrammarBinding = { sequence: string; label: string };

export type KeymapGrammarEntry =
  | { family: "operator"; id: VimOperatorAction; sequence: string; label: string }
  | { family: "motion"; id: VimMotionAction; sequence: string; label: string }
  | { family: "command"; id: VimCommandAction; sequence: string; label: string }
  | { family: "macro"; id: string; sequence: string; label: string }
  | { family: "mark"; id: string; sequence: string; label: string }
  | { family: "textObjectKind"; id: VimTextObjectKind; sequence: string; label: string }
  | { family: "textObjectTarget"; id: VimTextObjectTarget; sequence: string; label: string };

function grammarEntries<Family extends KeymapGrammarEntry["family"]>(
  family: Family,
  prefix: string,
  mappings: Readonly<Record<string, readonly string[]>>,
): Extract<KeymapGrammarEntry, { family: Family }>[] {
  return Object.entries(mappings).flatMap(([id, sequences]) =>
    sequences.map(
      (sequence) =>
        ({ family, id, sequence, label: `${prefix}.${id}` }) as Extract<
          KeymapGrammarEntry,
          { family: Family }
        >,
    ),
  );
}

export function grammarEntriesForKeymap(keymap: ResolvedVimKeymap): KeymapGrammarEntry[] {
  return [
    ...grammarEntries("operator", "operators", keymap.operators),
    ...grammarEntries("motion", "motions", keymap.motions),
    ...grammarEntries("command", "commands", keymap.commands),
    ...grammarEntries("macro", "macros", keymap.macros),
    ...grammarEntries("mark", "marks", keymap.marks),
    ...grammarEntries("textObjectKind", "textObjects.kinds", keymap.textObjects.kinds),
    ...grammarEntries("textObjectTarget", "textObjects.targets", keymap.textObjects.targets),
  ];
}

export function grammarBindingsForKeymap(keymap: ResolvedVimKeymap): GrammarBinding[] {
  return grammarEntriesForKeymap(keymap).map(({ sequence, label }) => ({ sequence, label }));
}

export function grammarConflictForActionKey(
  key: string,
  grammarBindings: readonly GrammarBinding[],
): string | undefined {
  const exact = grammarBindings.find((binding) => binding.sequence === key);
  if (exact) return `conflicts with ${exact.label}`;
  const prefix = grammarBindings.find((binding) => {
    if (key.includes("+") || binding.sequence.includes("+")) return false;
    return key.startsWith(binding.sequence) || binding.sequence.startsWith(key);
  });
  return prefix ? `prefix-shadow conflict with ${prefix.label}` : undefined;
}

const OPERATOR_TARGET_COMMANDS = [
  "findCharForward",
  "findCharBackward",
  "tillCharForward",
  "tillCharBackward",
  "repeatCharSearch",
  "repeatCharSearchReverse",
  "startSearch",
  "startSearchBackward",
] as const satisfies readonly VimCommandAction[];

function sequencesOverlap(left: string, right: string): boolean {
  return left.startsWith(right) || right.startsWith(left);
}

/**
 * Whether `sequence` extends the bound operator sequence `operatorSequence`
 * with keys that are not a target of that operator (motion, text-object kind,
 * character search, search, mark jump, count, or line form). Such bindings,
 * like `ys` after `y`, coexist with the operator instead of conflicting.
 */
export function isOperatorExtension(
  keymap: ResolvedVimKeymap,
  operatorSequence: string,
  sequence: string,
): boolean {
  if (sequence.length <= operatorSequence.length || !sequence.startsWith(operatorSequence))
    return false;
  const operator = (
    Object.entries(keymap.operators) as [VimOperatorAction, readonly string[]][]
  ).find(([, sequences]) => sequences.includes(operatorSequence))?.[0];
  if (!operator) return false;
  const rest = sequence.slice(operatorSequence.length);
  if (/^[1-9]/.test(rest)) return false;
  const targets = [
    ...Object.values(keymap.motions).flat(),
    ...Object.values(keymap.textObjects.kinds).flat(),
    ...keymap.marks.jumpExact,
    ...keymap.marks.jumpLine,
    ...OPERATOR_TARGET_COMMANDS.flatMap((command) => keymap.commands[command]),
    ...keymap.operators[operator],
    operatorSequence.slice(-1),
  ];
  return !targets.some((target) => target.length > 0 && sequencesOverlap(rest, target));
}
