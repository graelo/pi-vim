import type { DiagnosticActionEntry } from "../../src/diagnostic-actions.ts";
export type DocsDriftMetadata = {
  docsAnchor: string;
  specAnchor: string;
  testAnchors: readonly string[];
};

export type DiagnosticActionDocsMetadata = DocsDriftMetadata & {
  id: DiagnosticActionEntry["id"];
};

export type PopupCommandDocsMetadata = {
  command: string;
  parserExample: string;
  docsAnchor: string;
};

export const DIAGNOSTIC_ACTION_DOCS_METADATA = [
  "vimmode.doctor",
  "vimmode.keymap",
  "vimmode.keybindings",
  "vimmode.mapcheck",
  "vimmode.help",
  "vimmode.messages",
  "vimmode.inspect",
].map((id) => ({
  id,
  docsAnchor: `diagnostic-actions:${id}`,
  specAnchor: "openspec/specs/vim-customization-diagnostics/spec.md",
  testAnchors: ["test/diagnostic-actions.test.ts"],
})) as readonly DiagnosticActionDocsMetadata[];

export const POPUP_COMMAND_DOCS_METADATA = [
  {
    command: ":help",
    parserExample: "help",
    docsAnchor: "runtime-help:keybinding-discovery-popup",
  },
  {
    command: ":help <topic>",
    parserExample: "help search",
    docsAnchor: "runtime-help:keybinding-discovery-popup",
  },
  {
    command: ":keybindings",
    parserExample: "keybindings",
    docsAnchor: "runtime-help:keybinding-discovery-popup",
  },
  {
    command: ":keybindings <query>",
    parserExample: "keybindings redo",
    docsAnchor: "runtime-help:keybinding-discovery-popup",
  },
  {
    command: ":keymap",
    parserExample: "keymap",
    docsAnchor: "runtime-help:keybinding-discovery-popup",
  },
  {
    command: ":keymap <action>",
    parserExample: "keymap redo",
    docsAnchor: "runtime-help:keybinding-discovery-popup",
  },
  {
    command: ":mapcheck <key>",
    parserExample: "mapcheck ctrl+p",
    docsAnchor: "runtime-help:keybinding-discovery-popup",
  },
  {
    command: ":messages",
    parserExample: "messages",
    docsAnchor: "runtime-help:keybinding-discovery-popup",
  },
  {
    command: ":vimmode inspect",
    parserExample: "vimmode inspect",
    docsAnchor: "runtime-help:keybinding-discovery-popup",
  },
  {
    command: ":vimdoctor",
    parserExample: "vimdoctor",
    docsAnchor: "runtime-help:keybinding-discovery-popup",
  },
] as const satisfies readonly PopupCommandDocsMetadata[];
