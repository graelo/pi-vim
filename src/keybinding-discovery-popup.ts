import type { ExMessage, EditorSnapshot, ModalState } from "./modal/types.ts";
import type { ReadOnlyPopup } from "./read-only-popup.ts";
import type { ResolvedVimEditorOptions, VimDiagnostics } from "./types.ts";

import { keymapForOptions, macrosForOptions, marksForOptions } from "./config.ts";
import {
  actionsMessage,
  doctorMessage,
  keybindingCatalogLines,
  keybindingDetailLines,
  keymapMessage,
  mapcheckMessage,
} from "./customization.ts";
import { runtimeMessagesMessage, vimmodeInspectMessage } from "./modal/inspect.ts";
import { popupFromMessage } from "./read-only-popup.ts";
import { runtimeHelpMessage } from "./runtime-help.ts";

export {
  HELP_POPUP_BODY_ROWS,
  popupFromMessage,
  scrollHelpPopup,
  splitPopupMessage,
  type HelpPopup,
  type ReadOnlyPopup,
  type ReadOnlyPopupSource,
} from "./read-only-popup.ts";

export type RuntimeHelpPopupCommand = {
  command: "help" | "messages";
  query?: string;
};

export type DiagnosticPopupCommand = {
  command: "vimdoctor" | "keymap" | "mapcheck" | "actions";
  query?: string;
};

export type InspectPopupInput = {
  state: ModalState;
  snapshot: EditorSnapshot;
  options: ResolvedVimEditorOptions;
  diagnostics?: VimDiagnostics;
};

export function keybindingsPopup(
  options: ResolvedVimEditorOptions,
  diagnostics: VimDiagnostics = { warnings: [] },
  query?: string,
): ReadOnlyPopup {
  const keymap = keymapForOptions(options);
  const context = {
    keymap,
    macros: macrosForOptions(options),
    marks: marksForOptions(options),
    warnings: diagnostics.warnings,
  };
  const trimmedQuery = query?.trim();
  return {
    title: trimmedQuery ? `:keybindings ${trimmedQuery}` : ":keybindings",
    source: "keybindings",
    query: trimmedQuery || undefined,
    scrollOffset: 0,
    lines: trimmedQuery
      ? keybindingDetailLines(context, trimmedQuery)
      : keybindingCatalogLines(context),
  };
}

export function runtimeHelpPopup(
  command: RuntimeHelpPopupCommand,
  options: ResolvedVimEditorOptions,
  diagnostics: VimDiagnostics = { warnings: [] },
  messages?: readonly ExMessage[],
): ReadOnlyPopup {
  const context = { options, diagnostics };
  const message =
    command.command === "help"
      ? runtimeHelpMessage(command.query, context)
      : runtimeMessagesMessage(messages);
  return popupFromMessage({
    title: command.query ? `:${command.command} ${command.query}` : `:${command.command}`,
    source: command.command,
    query: command.query,
    message,
  });
}

export function diagnosticPopup(
  command: DiagnosticPopupCommand,
  options: ResolvedVimEditorOptions,
  diagnostics: VimDiagnostics = { warnings: [] },
): ReadOnlyPopup {
  const keymap = keymapForOptions(options);
  const macros = macrosForOptions(options);
  const marks = marksForOptions(options);
  const message =
    command.command === "vimdoctor"
      ? doctorMessage(options, diagnostics)
      : command.command === "keymap"
        ? keymapMessage(keymap, command.query, macros, marks)
        : command.command === "mapcheck"
          ? mapcheckMessage(keymap, command.query ?? "", diagnostics.warnings)
          : actionsMessage(keymap, command.query, macros, marks);
  return popupFromMessage({
    title: command.query ? `:${command.command} ${command.query}` : `:${command.command}`,
    source: command.command,
    query: command.query,
    message,
  });
}

export function inspectPopup(input: InspectPopupInput): ReadOnlyPopup {
  return popupFromMessage({
    title: ":vimmode inspect",
    source: "inspect",
    message: vimmodeInspectMessage(input),
  });
}
