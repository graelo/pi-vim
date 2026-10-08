export type DiagnosticActionCategory = "diagnostic" | "runtimeHelp";

export type DiagnosticActionEntry = {
  id: `pi-vim.${string}`;
  category: DiagnosticActionCategory;
  command: string;
  topics: readonly string[];
  description: string;
  examples: readonly string[];
  bindable: false;
};

function entry(
  id: DiagnosticActionEntry["id"],
  category: DiagnosticActionCategory,
  command: string,
  topics: readonly string[],
  description: string,
  examples: readonly string[],
): DiagnosticActionEntry {
  return {
    id,
    category,
    command,
    topics,
    description,
    examples,
    bindable: false,
  };
}

export const DIAGNOSTIC_ACTIONS = [
  entry(
    "pi-vim.doctor",
    "diagnostic",
    ":vimdoctor",
    ["vimdoctor", "doctor", "customization", "warnings", "health"],
    "metadata-only diagnostic action for retained customization warning health",
    [":vimdoctor"],
  ),
  entry(
    "pi-vim.keymap",
    "diagnostic",
    ":keymap",
    ["keymap", "bindings", "keys"],
    "metadata-only diagnostic action for resolved keymap binding summaries",
    [":keymap redo"],
  ),
  entry(
    "pi-vim.keybindings",
    "diagnostic",
    ":keybindings",
    ["keybindings", "bindings", "keys", "effective keybindings"],
    "metadata-only diagnostic action for effective keybinding discovery popup",
    [":keybindings", ":keybindings redo"],
  ),
  entry(
    "pi-vim.mapcheck",
    "diagnostic",
    ":mapcheck",
    ["mapcheck", "protected", "shortcut", "key ownership"],
    "metadata-only diagnostic action for one-key mapping and protected shortcut checks",
    [":mapcheck ctrl+p"],
  ),
  entry(
    "pi-vim.help",
    "runtimeHelp",
    ":help",
    ["help", "topic", "diagnostics", "runtime help"],
    "metadata-only runtimeHelp action for finite source-backed help topics",
    [":help diagnostics", ":help keymap"],
  ),
  entry(
    "pi-vim.messages",
    "runtimeHelp",
    ":messages",
    ["messages", "message history", "runtime messages"],
    "metadata-only runtimeHelp action for bounded prompt-local runtime message history",
    [":messages"],
  ),
  entry(
    "pi-vim.inspect",
    "diagnostic",
    ":vim inspect",
    ["vim inspect", "inspect", "state", "runtime state"],
    "metadata-only diagnostic action for bounded prompt-local editor state inspection",
    [":vim inspect"],
  ),
] as const satisfies readonly DiagnosticActionEntry[];

export function diagnosticActionEntries(): readonly DiagnosticActionEntry[] {
  return DIAGNOSTIC_ACTIONS;
}

export function searchDiagnosticActions(query = ""): DiagnosticActionEntry[] {
  const needle = query.trim().toLowerCase();
  const entries = [...DIAGNOSTIC_ACTIONS];
  if (!needle) return entries;
  return entries.filter((entry) => {
    const haystack = [
      entry.id,
      entry.category,
      entry.command,
      entry.description,
      ...entry.topics,
      ...entry.examples,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(needle);
  });
}

export function diagnosticActionMessage(entry: DiagnosticActionEntry): string {
  return `${entry.id} ${entry.category} command=${entry.command} metadata-only not bindable — ${entry.description}`;
}
