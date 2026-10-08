import type { ActiveRegisterTarget } from "./modal/types.ts";
import type { LineRange } from "./types.ts";

import { parseExDestination, parseExLineRange } from "./range.ts";

export type ExParseContext = {
  lineCount: number;
  cursorLine: number;
  visualRange?: LineRange;
};

export type ParsedExSubstitution = {
  type: "substitute";
  command: "s" | "substitute";
  range: LineRange;
  rangeExplicit: boolean;
  pattern: string;
  replacement: string;
  global: boolean;
  ignoreCase: boolean;
  countOnly: boolean;
  noError: boolean;
  matcherMode: "literal" | "regex";
};

export type ParsedExRepeatSubstitution = {
  type: "repeatSubstitute";
  command: "&" | "&&";
  range: LineRange;
  rangeExplicit: boolean;
};

export type ParsedExRegisterOperand = ActiveRegisterTarget;

export type ParsedExLineCommand = {
  type: "delete" | "yank" | "put" | "join";
  command: string;
  range: LineRange;
  rangeExplicit: boolean;
  register?: ParsedExRegisterOperand;
};

export type ParsedExDestinationCommand = {
  type: "copy" | "move";
  command: string;
  range: LineRange;
  rangeExplicit: boolean;
  destination: number;
};

export type ParsedExDiagnosticCommand = {
  type: "diagnostic";
  command: "vimdoctor" | "keymap" | "mapcheck" | "actions";
  query?: string;
};

export type ParsedExRuntimeHelpCommand = {
  type: "runtimeHelp";
  command: "help" | "messages";
  query?: string;
};

export type ParsedExKeybindingsCommand = {
  type: "keybindings";
  command: "keybindings";
  query?: string;
};

export type ParsedExInspectCommand = {
  type: "inspect";
  command: "vimmode";
  query: "inspect";
};

export type ParsedExQuitCommand = {
  type: "quit";
  command: "q" | "quit";
  range: LineRange;
  rangeExplicit: boolean;
};

export type ExParseResult =
  | ParsedExSubstitution
  | ParsedExRepeatSubstitution
  | ParsedExLineCommand
  | ParsedExDestinationCommand
  | ParsedExDiagnosticCommand
  | ParsedExRuntimeHelpCommand
  | ParsedExKeybindingsCommand
  | ParsedExInspectCommand
  | { type: "nohlsearch"; command: "noh" | "nohlsearch" }
  | ParsedExQuitCommand
  | { type: "lineJump"; range: LineRange; line: number }
  | { type: "empty" }
  | { type: "error"; message: string };

type ParsedCommandName =
  | "s"
  | "substitute"
  | "d"
  | "delete"
  | "y"
  | "yank"
  | "pu"
  | "put"
  | "t"
  | "copy"
  | "m"
  | "move"
  | "j"
  | "join"
  | "vimdoctor"
  | "keymap"
  | "mapcheck"
  | "actions"
  | "help"
  | "messages"
  | "keybindings"
  | "vimmode"
  | "noh"
  | "nohlsearch"
  | "q"
  | "quit";

type ParsedCommandType =
  | "substitute"
  | "delete"
  | "yank"
  | "put"
  | "copy"
  | "move"
  | "join"
  | "diagnostic"
  | "runtimeHelp"
  | "keybindings"
  | "inspect"
  | "nohlsearch"
  | "quit";

type ParsedCommand = {
  name: string;
  type: ParsedCommandType;
};

const COMMAND_TYPES: Record<ParsedCommandName, ParsedCommandType> = {
  s: "substitute",
  substitute: "substitute",
  d: "delete",
  delete: "delete",
  y: "yank",
  yank: "yank",
  pu: "put",
  put: "put",
  t: "copy",
  copy: "copy",
  m: "move",
  move: "move",
  j: "join",
  join: "join",
  vimdoctor: "diagnostic",
  keymap: "diagnostic",
  mapcheck: "diagnostic",
  actions: "diagnostic",
  help: "runtimeHelp",
  messages: "runtimeHelp",
  keybindings: "keybindings",
  vimmode: "inspect",
  noh: "nohlsearch",
  nohlsearch: "nohlsearch",
  q: "quit",
  quit: "quit",
};

function commandType(command: ParsedCommandName): ParsedCommandType {
  return COMMAND_TYPES[command];
}

export type ExCommandSuggestionKind = ParsedCommandType | "repeatSubstitute";

function parseCommand(
  source: string,
): { ok: true; command: ParsedCommand; rest: string } | { ok: false; message: string } {
  const trimmed = source.trimStart();
  const name = /^[A-Za-z]+/.exec(trimmed)?.[0];
  if (!name) return { ok: false, message: `Unsupported Ex command: ${trimmed[0] ?? ""}` };

  const supported = new Set<string>([
    "s",
    "substitute",
    "d",
    "delete",
    "y",
    "yank",
    "pu",
    "put",
    "t",
    "copy",
    "m",
    "move",
    "j",
    "join",
    "vimdoctor",
    "keymap",
    "mapcheck",
    "actions",
    "help",
    "messages",
    "keybindings",
    "vimmode",
    "noh",
    "nohlsearch",
    "q",
    "quit",
  ]);
  if (supported.has(name)) {
    const type = commandType(name as ParsedCommandName);
    return { ok: true, command: { name, type }, rest: trimmed.slice(name.length) };
  }
  return { ok: false, message: `Unsupported Ex command: ${name}` };
}

function isValidDelimiter(delimiter: string | undefined): delimiter is string {
  return Boolean(
    delimiter &&
      delimiter.length === 1 &&
      delimiter.charCodeAt(0) >= 32 &&
      !/[A-Za-z0-9\s\\]/.test(delimiter),
  );
}

function readDelimited(
  source: string,
  delimiter: string,
): { value: string; rest: string; closed: boolean } {
  let value = "";
  for (let index = 0; index < source.length; index++) {
    const char = source[index];
    if (char === "\\") {
      const next = source[index + 1];
      if (next === delimiter || next === "\\") {
        value += next;
        index++;
      } else {
        value += char;
      }
      continue;
    }
    if (char === delimiter) return { value, rest: source.slice(index + 1), closed: true };
    value += char;
  }
  return { value, rest: "", closed: false };
}

function parseSubstitutionArgs(source: string):
  | {
      ok: true;
      pattern: string;
      replacement: string;
      global: boolean;
      ignoreCase: boolean;
      countOnly: boolean;
      noError: boolean;
      matcherMode: "literal" | "regex";
    }
  | { ok: false; message: string } {
  const delimiter = source[0];
  if (!isValidDelimiter(delimiter)) return { ok: false, message: "Invalid substitution delimiter" };

  const pattern = readDelimited(source.slice(1), delimiter);
  if (!pattern.closed) return { ok: false, message: "Invalid substitution syntax" };
  if (pattern.value.length === 0)
    return { ok: false, message: "Substitution pattern cannot be empty" };

  const replacement = readDelimited(pattern.rest, delimiter);
  if (!replacement.closed) {
    return {
      ok: true,
      pattern: pattern.value,
      replacement: replacement.value,
      global: false,
      ignoreCase: false,
      countOnly: false,
      noError: false,
      matcherMode: "literal",
    };
  }

  let global = false;
  let ignoreCase = false;
  let countOnly = false;
  let noError = false;
  let matcherMode: "literal" | "regex" = "literal";
  for (const flag of replacement.rest) {
    if (flag === "g") global = true;
    else if (flag === "i") ignoreCase = true;
    else if (flag === "r") matcherMode = "regex";
    else if (flag === "n") countOnly = true;
    else if (flag === "e") noError = true;
    else return { ok: false, message: `Unsupported substitution flag: ${flag}` };
  }
  return {
    ok: true,
    pattern: pattern.value,
    replacement: replacement.value,
    global,
    ignoreCase,
    countOnly,
    noError,
    matcherMode,
  };
}

function rejectTrailingArgs(rest: string): ExParseResult | undefined {
  return rest.trim().length > 0
    ? { type: "error", message: "Unexpected Ex command arguments" }
    : undefined;
}

function parseRegisterOperand(
  rest: string,
): { ok: true; register?: ParsedExRegisterOperand } | { ok: false; message: string } {
  const operand = rest.trim();
  if (operand.length === 0) return { ok: true };
  if (operand.length !== 1) return { ok: false, message: "Invalid Ex register operand" };
  if (/^[A-Za-z]$/.test(operand)) {
    return {
      ok: true,
      register: {
        kind: "named",
        slot: operand.toLowerCase(),
        append: operand >= "A" && operand <= "Z",
      },
    };
  }
  if (operand === '"') return { ok: true, register: { kind: "unnamed" } };
  if (operand === "_") return { ok: true, register: { kind: "blackHole" } };
  if (operand === "+" || operand === "*") {
    return { ok: true, register: { kind: "clipboard", slot: operand } };
  }
  return { ok: false, message: "Invalid Ex register operand" };
}

type ParsedCommandInput = { command: ParsedCommand; rest: string };

function parseSubstitutionCommand(
  command: ParsedCommandInput,
  range: LineRange,
  rangeExplicit: boolean,
): ExParseResult {
  const args = parseSubstitutionArgs(command.rest);
  if (!args.ok) return { type: "error", message: args.message };
  return {
    type: "substitute",
    command: command.command.name as "s" | "substitute",
    range,
    rangeExplicit,
    pattern: args.pattern,
    replacement: args.replacement,
    global: args.global,
    ignoreCase: args.ignoreCase,
    countOnly: args.countOnly,
    noError: args.noError,
    matcherMode: args.matcherMode,
  };
}

function parseDestinationCommand(
  command: ParsedCommandInput,
  range: LineRange,
  rangeExplicit: boolean,
  context: ExParseContext,
): ExParseResult {
  const destination = parseExDestination(command.rest, context);
  if (!destination.ok) return { type: "error", message: destination.error.message };
  return {
    type: command.command.type as "copy" | "move",
    command: command.command.name,
    range,
    rangeExplicit,
    destination: destination.value.destination,
  };
}

function parseDiagnosticCommand(command: ParsedCommandInput): ExParseResult {
  const args = command.rest.trim();
  const name = command.command.name as ParsedExDiagnosticCommand["command"];
  if (name === "vimdoctor" && args.length > 0)
    return { type: "error", message: "Unexpected Ex command arguments" };
  if (name === "mapcheck" && args.length === 0)
    return { type: "error", message: "Missing mapcheck key" };
  return args.length > 0
    ? { type: "diagnostic", command: name, query: args }
    : { type: "diagnostic", command: name };
}

function parseRuntimeHelpCommand(command: ParsedCommandInput): ExParseResult {
  const args = command.rest.trim();
  const name = command.command.name as ParsedExRuntimeHelpCommand["command"];
  if (name === "messages" && args.length > 0)
    return { type: "error", message: "Unexpected Ex command arguments" };
  return args.length > 0
    ? { type: "runtimeHelp", command: name, query: args }
    : { type: "runtimeHelp", command: name };
}

function parseLineCommand(
  command: ParsedCommandInput,
  range: LineRange,
  rangeExplicit: boolean,
): ExParseResult {
  const register = parseRegisterOperand(command.rest);
  if (!register.ok) return { type: "error", message: register.message };
  return {
    type: command.command.type as "delete" | "yank" | "put",
    command: command.command.name,
    range,
    rangeExplicit,
    ...(register.register ? { register: register.register } : {}),
  };
}

function parseMetadataCommand(command: ParsedCommandInput): ExParseResult {
  if (command.command.type === "keybindings") {
    const query = command.rest.trim();
    return query
      ? { type: "keybindings", command: "keybindings", query }
      : { type: "keybindings", command: "keybindings" };
  }
  return command.rest.trim() === "inspect"
    ? { type: "inspect", command: "vimmode", query: "inspect" }
    : { type: "error", message: "Unexpected Ex command arguments" };
}

function parseParsedExCommand(
  command: ParsedCommandInput,
  range: LineRange,
  rangeExplicit: boolean,
  context: ExParseContext,
): ExParseResult {
  if (command.command.type === "substitute")
    return parseSubstitutionCommand(command, range, rangeExplicit);
  if (command.command.type === "copy" || command.command.type === "move")
    return parseDestinationCommand(command, range, rangeExplicit, context);
  if (command.command.type === "diagnostic") return parseDiagnosticCommand(command);
  if (command.command.type === "runtimeHelp") return parseRuntimeHelpCommand(command);
  if (["keybindings", "inspect"].includes(command.command.type))
    return parseMetadataCommand(command);
  if (["delete", "yank", "put"].includes(command.command.type))
    return parseLineCommand(command, range, rangeExplicit);
  const trailing = rejectTrailingArgs(command.rest);
  if (trailing) return trailing;
  if (command.command.type === "nohlsearch")
    return { type: "nohlsearch", command: command.command.name as "noh" | "nohlsearch" };
  if (command.command.type === "quit")
    return { type: "quit", command: command.command.name as "q" | "quit", range, rangeExplicit };
  return { type: "join", command: command.command.name, range, rangeExplicit };
}

export function parseExCommand(commandLine: string, context: ExParseContext): ExParseResult {
  const source = commandLine.trim();
  if (source.length === 0) return { type: "empty" };
  const range = parseExLineRange(source, context);
  if (!range.ok) return { type: "error", message: range.error.message };
  const repeat = range.value.rest.trim();
  if (repeat === "&" || repeat === "&&")
    return {
      type: "repeatSubstitute",
      command: repeat,
      range: range.value.range,
      rangeExplicit: range.value.explicit,
    };
  if (repeat.length === 0 && range.value.explicit) {
    if (range.value.ast.type === "single")
      return { type: "lineJump", range: range.value.range, line: range.value.range.startLine };
    return { type: "error", message: "Unsupported Ex command" };
  }
  const command = parseCommand(range.value.rest);
  if (!command.ok) return { type: "error", message: command.message };
  return parseParsedExCommand(command, range.value.range, range.value.explicit, context);
}

export function parseExSubstitution(commandLine: string, context: ExParseContext): ExParseResult {
  return parseExCommand(commandLine, context);
}

function stableUnique(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    if (seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

const CANDIDATE_NAMES_BY_COMMAND_TYPE: Record<string, string[]> = {
  substitute: ["s", "substitute"],
  delete: ["d", "delete"],
  yank: ["y", "yank"],
  put: ["pu", "put"],
  copy: ["t", "copy"],
  move: ["m", "move"],
  join: ["j", "join"],
  nohlsearch: ["noh", "nohlsearch"],
  quit: ["q", "quit"],
  repeatSubstitute: ["&", "&&"],
  lineJump: [] as string[],
  diagnostic: ["vimdoctor", "keymap", "mapcheck", "actions"],
  runtimeHelp: ["help", "messages"],
  keybindings: ["keybindings"],
  inspect: ["vimmode"],
};

const allBuiltInCandidateNames = Object.values(CANDIDATE_NAMES_BY_COMMAND_TYPE).flat().sort();

export function suggestExCommands(commandLine: string, context: ExParseContext): string[] {
  const source = commandLine.trim();
  if (source.length === 0) {
    return [...allBuiltInCandidateNames];
  }

  const range = parseExLineRange(source, context);
  const commandSource = range.ok ? range.value.rest.trim() : source;
  if (!/^[A-Za-z&]+$/.test(commandSource)) return [];

  const allCandidates = allBuiltInCandidateNames;
  if (commandSource.length === 0) return allCandidates;

  const prefix = commandSource;
  return stableUnique(allCandidates.filter((candidate) => candidate.startsWith(prefix))).sort();
}
