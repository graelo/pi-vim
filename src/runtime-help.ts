import type { ResolvedVimEditorOptions } from "./types.ts";

import type { VimDiagnostics } from "./customization.ts";

export type RuntimeHelpCategory =
  | "modes"
  | "motions"
  | "editing"
  | "search"
  | "ex"
  | "registers"
  | "marks"
  | "macros"
  | "settings"
  | "shortcuts"
  | "diagnostics";

export type RuntimeHelpEntry = {
  id: string;
  category: RuntimeHelpCategory;
  topics: readonly string[];
  summary: string;
  examples: readonly string[];
  limits: readonly string[];
  /** Mirrored doc anchor in docs/features.md: `<!-- runtime-help:<id> -->` */
  docsAnchor?: string;
  /** Required OpenSpec spec file path backing this entry. */
  specAnchor?: string;
  /** Required test file paths backing this entry. */
  testAnchors?: readonly string[];
};

type RuntimeHelpRegistryEntry = RuntimeHelpEntry &
  Required<Pick<RuntimeHelpEntry, "docsAnchor" | "specAnchor" | "testAnchors">>;

export type RuntimeHelpContext = {
  options: ResolvedVimEditorOptions;
  diagnostics?: VimDiagnostics;
};

const ENTRIES = [
  {
    id: "runtime-help",
    category: "diagnostics",
    topics: ["help", "messages", "runtime", "inspect", "vim"],
    summary:
      ":help and :keybindings show compact source-backed pi-vim help; :vim inspect summarizes current prompt-local state; :messages shows recent runtime messages",
    examples: [":help search", ":keybindings", ":vim inspect", ":messages"],
    limits: ["finite topics only", "no pager", "no Vim help tags"],
    docsAnchor: "runtime-help:runtime-help",
    specAnchor: "openspec/specs/vim-ex-command-line/spec.md",
    testAnchors: ["test/runtime-help.test.ts", "test/ex.test.ts", "test/modal.test.ts"],
  },
  {
    id: "search",
    category: "search",
    topics: ["search", "/", "?", "nohlsearch", "noh"],
    summary:
      "prompt search uses /, ?, n, and N; :noh/:nohlsearch clear visible highlights while keeping repeat-search state",
    examples: ["/term", "?term", ":nohlsearch"],
    limits: ["prompt-local", "literal by default", "no cross-prompt history"],
    docsAnchor: "runtime-help:search",
    specAnchor: "openspec/specs/vim-search/spec.md",
    testAnchors: ["test/modal.test.ts", "test/vim-editor.test.ts"],
  },
  {
    id: "ex",
    category: "ex",
    topics: ["ex", ":", "substitute", "s", "commands", "repeat", "register", "line", "quit", "q"],
    summary:
      "finite Ex command-line supports :s substitution, :& repeat substitution, bare line jumps, line commands with register operands, diagnostics, runtime help, and :q/:quit Pi shutdown",
    examples: [":3", ":$", ":s/old/new/", ":%s/old/new/gn", ":&", ":delete a", ":q", ":help ex"],
    limits: [
      "no Vimscript",
      "no confirmation flag",
      "no shell/file/window commands",
      ":q!/:wq/:x/:qa unsupported",
    ],
    docsAnchor: "runtime-help:ex",
    specAnchor: "openspec/specs/vim-ex-command-line/spec.md",
    testAnchors: ["test/ex.test.ts", "test/modal.test.ts"],
  },
  {
    id: "customization",
    category: "diagnostics",
    topics: ["keybindings", "keymap", "mapcheck", "vimdoctor", "customization"],
    summary:
      ":keybindings, :keymap, :mapcheck, and :vimdoctor explain finite actions, bindings, protected shortcuts, and settings warnings",
    examples: [":keybindings redo", ":keymap redo", ":mapcheck ctrl+p", ":vimdoctor"],
    limits: ["no full command palette", "no .vimrc", "no Vimscript"],
    docsAnchor: "runtime-help:customization-diagnostics",
    specAnchor: "openspec/specs/vim-customization-diagnostics/spec.md",
    testAnchors: ["test/customization.test.ts", "test/modal.test.ts"],
  },
  {
    id: "motions",
    category: "motions",
    topics: ["motions", "motion", "word", "WORD", "ge", "gE"],
    summary:
      "normal and visual modes support prompt-local motions including word/WORD movement, previous word end, line, buffer, pair, search, mark, and character-search targets",
    examples: ["W", "gE", "dW", "cE", "dge"],
    limits: ["prompt-local", "no subword/camelCase motions", "no display-line motions"],
    docsAnchor: "runtime-help:motions",
    specAnchor: "openspec/specs/extended-vim-keybindings/spec.md",
    testAnchors: ["test/commands.test.ts", "test/buffer.test.ts", "test/modal.test.ts"],
  },
  {
    id: "surround",
    category: "editing",
    topics: ["surround", "ys", "yss", "ds", "cs"],
    summary:
      "ys{target}{char} and yss{char} add a pair, ds{char} deletes and cs{old}{new} changes the nearest pair, and visual S wraps the selection, with vim-surround pair rules",
    examples: ["ysiw)", 'yss"', "ds(", "cs\"'", "viwS]"],
    limits: ["no tags or function surrounds", "no newline variants", "no visual block"],
    docsAnchor: "runtime-help:surround",
    specAnchor: "openspec/specs/vim-surround/spec.md",
    testAnchors: ["test/surround.test.ts", "test/modal.test.ts", "test/vim-editor.test.ts"],
  },
  {
    id: "registers",
    category: "registers",
    topics: ["registers", "register", "clipboard", "black-hole", "unnamed", '"+', '"*', '"_'],
    summary:
      'registers are prompt-local; unnamed and a-z named registers work with yank/delete/change/paste, "_ discards, and "+/"* copy to and paste from host clipboard with prompt-local mirror fallback',
    examples: ['"ayy', '"ap', '"_dd', '"+yy', ":yank +", ":put *"],
    limits: [
      "no full Vim register parity",
      "normal-mode clipboard reads depend on platform tools",
      "no numbered/expression/read-only registers",
    ],
    docsAnchor: "runtime-help:registers",
    specAnchor: "openspec/specs/vim-named-registers/spec.md",
    testAnchors: ["test/registers.test.ts", "test/modal.test.ts", "test/vim-editor.test.ts"],
  },
  {
    id: "marks",
    category: "marks",
    topics: ["marks", "mark", "jump"],
    summary:
      "marks are prompt-local in-memory slots set and jumped inside the current editor session",
    examples: ["ma", "`a", "'a"],
    limits: ["no persistent marks", "no file marks", "slots are configurable"],
    docsAnchor: "runtime-help:marks",
    specAnchor: "openspec/specs/vim-marks/spec.md",
    testAnchors: ["test/modal.test.ts", "test/config.test.ts"],
  },
  {
    id: "macros",
    category: "macros",
    topics: ["macros", "macro", "record", "replay"],
    summary: "macros record and replay prompt-local input sequences with bounded replay steps",
    examples: ["qa...q", "@a"],
    limits: ["in-memory only", "bounded replay", "slots are configurable"],
    docsAnchor: "runtime-help:macros",
    specAnchor: "openspec/specs/vim-macro-recording/spec.md",
    testAnchors: ["test/modal.test.ts", "test/config.test.ts"],
  },
  {
    id: "settings",
    category: "settings",
    topics: ["settings", "config", "piVim", "options"],
    summary:
      "piVim JSON settings control finite editor options; trusted global JavaScript setup and API: https://github.com/graelo/pi-vim/blob/main/docs/config.md#basic-setup",
    examples: ["piVim.preset", "piVim.keymap", "/vim reload"],
    limits: ["field-by-field validation", "trusted JavaScript is global and unsandboxed"],
    docsAnchor: "runtime-help:settings",
    specAnchor: "openspec/specs/pi-vim-documentation/spec.md",
    testAnchors: ["test/config.test.ts"],
  },
] as const satisfies readonly RuntimeHelpRegistryEntry[];

export function runtimeHelpEntries(
  _context?: RuntimeHelpContext,
): readonly RuntimeHelpRegistryEntry[] {
  return ENTRIES;
}

export function runtimeHelpMessage(topic: string | undefined, context: RuntimeHelpContext): string {
  const query = topic?.trim();
  if (!query) {
    return "help: :help <topic>, :keybindings [query], :vim inspect, :messages, :keymap, :mapcheck, :vimdoctor";
  }
  const entry = findEntry(query);
  return entry ? compactEntry(entry, context) : `help: no match for ${query}`;
}

export function runtimeMessagesMessage(messages: readonly { text: string }[] | undefined): string {
  if (!messages || messages.length === 0) return "messages: none retained";
  const latest = messages.at(-1)!;
  return `messages: ${messages.length} retained; latest: ${latest.text}`;
}

function findEntry(query: string): RuntimeHelpEntry | undefined {
  const needle = query.toLowerCase();
  const exact = ENTRIES.find(
    (entry) =>
      entry.id === needle ||
      entry.category === needle ||
      (entry.topics as readonly string[]).includes(needle),
  );
  if (exact) return exact;
  return ENTRIES.find((entry) => {
    const haystack = [entry.id, entry.category, ...entry.topics, entry.summary, ...entry.examples]
      .join(" ")
      .toLowerCase();
    return haystack.includes(needle);
  });
}

function compactEntry(entry: RuntimeHelpEntry, _context: RuntimeHelpContext): string {
  const limit = entry.limits[0] ? ` limit: ${entry.limits.join(", ")}` : "";
  return `${entry.id}: ${entry.summary}; examples ${entry.examples.join(", ")};${limit}`;
}
