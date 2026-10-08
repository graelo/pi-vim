import type { VimFiniteActionId } from "./types.ts";

import { TRUSTED_JS_OPTION_PATHS, type TrustedJsOptionPath } from "./config-property-paths.ts";
import { DEFAULT_VIM_OPTIONS, VIM_MOTION_OPERATOR_ACTIONS } from "./config.ts";
import { PROTECTED_SHORTCUTS } from "./customization.ts";
import {
  KEYMAP_COMMAND_DESCRIPTORS,
  KEYMAP_INSERT_DESCRIPTORS,
  KEYMAP_MARK_DESCRIPTORS,
  KEYMAP_MACRO_DESCRIPTORS,
  KEYMAP_MOTION_DESCRIPTORS,
  KEYMAP_OPERATOR_DESCRIPTORS,
  KEYMAP_TEXT_OBJECT_KIND_DESCRIPTORS,
  KEYMAP_TEXT_OBJECT_TARGET_DESCRIPTORS,
} from "./keymap-descriptors.ts";
import {
  mappingScopesForKeymapEntry,
  VIM_MAPPING_SCOPES,
  type VimMappingFamily,
  type VimMappingScope,
} from "./mapping-scopes.ts";

export { VIM_MAPPING_SCOPES, type VimMappingScope } from "./mapping-scopes.ts";

type ActionSource = "keymap-descriptor" | "trusted-config-api";

export type VimActionMetadata = {
  id: string;
  source: ActionSource;
  defaults: readonly string[];
  scopes: readonly VimMappingScope[];
  factoryPath?: string;
  publicScopes?: readonly VimMappingScope[];
  aliases?: readonly string[];
  anchor?: string;
};

type ActionFactoryPath<Id extends VimFiniteActionId> = Id extends "command.easymotion"
  ? "vim.action.command.easymotion.goToChar()"
  : `vim.action.${Id}()`;

type ActionAliases<Id extends VimFiniteActionId> = Id extends "command.easymotion"
  ? readonly ["vim.action.command.easymotion()"]
  : Id extends `insert.${infer Action}`
    ? readonly [`vim.prompt.${Action}()`]
    : readonly [];

type NormalVisualScopes = readonly ["normal", "visual", "visualLine", "visualBlock"];
type PublicActionScopes<Id extends VimFiniteActionId> = Id extends "escape"
  ? readonly ["insert", "visual", "visualLine", "visualBlock", "operatorPending"]
  : Id extends `operator.${string}`
    ? NormalVisualScopes
    : Id extends "motion.halfPageDown" | "motion.halfPageUp"
      ? NormalVisualScopes
      : Id extends `motion.${string}`
        ? readonly ["normal", "visual", "visualLine", "visualBlock", "operatorPending"]
        : Id extends "command.insertLineStart" | "command.insertLineEnd"
          ? readonly ["normal", "visualBlock"]
          : Id extends "command.pasteAfter"
            ? readonly ["normal", "visualLine"]
            : Id extends
                  | "command.insertBefore"
                  | "command.insertAfter"
                  | "command.openLineBelow"
                  | "command.openLineAbove"
                  | "command.visualChar"
                  | "command.visualLine"
                  | "command.visualBlock"
                  | "command.deleteChar"
                  | "command.deleteCharBefore"
                  | "command.deleteToLineEnd"
                  | "command.changeToLineEnd"
                  | "command.yankLine"
                  | "command.joinLine"
                  | "command.toggleCase"
                  | "command.replaceChar"
                  | "command.startSearch"
                  | "command.startSearchBackward"
                  | "command.repeatSearch"
                  | "command.repeatSearchReverse"
                  | "command.startExCommand"
              ? NormalVisualScopes
              : Id extends `command.${string}` | `macro.${string}`
                ? readonly ["normal"]
                : Id extends "mark.set"
                  ? readonly ["normal"]
                  : Id extends `mark.${string}`
                    ? NormalVisualScopes
                    : Id extends `insert.${string}`
                      ? readonly ["insert"]
                      : Id extends `textObject.${string}`
                        ? readonly ["operatorPending"]
                        : NormalVisualScopes;

type VimPublicActionMetadataFor<Id extends VimFiniteActionId> = Omit<
  VimActionMetadata,
  "id" | "factoryPath" | "publicScopes" | "aliases" | "anchor"
> & {
  id: Id;
  factoryPath: ActionFactoryPath<Id>;
  publicScopes: PublicActionScopes<Id>;
  aliases: ActionAliases<Id>;
  anchor: string;
};

export type VimPublicActionMetadata = {
  [Id in VimFiniteActionId]: VimPublicActionMetadataFor<Id>;
}[VimFiniteActionId];

function actionAnchor(id: string): string {
  return `config-action-${id.replaceAll(".", "-")}`;
}

function publicActionFields<Id extends VimFiniteActionId>(
  id: Id,
  publicScopes: readonly VimMappingScope[],
): Pick<VimPublicActionMetadataFor<Id>, "factoryPath" | "publicScopes" | "aliases" | "anchor"> {
  const factoryPath =
    id === "command.easymotion" ? "vim.action.command.easymotion.goToChar()" : `vim.action.${id}()`;
  const aliases =
    id === "command.easymotion"
      ? ["vim.action.command.easymotion()"]
      : id.startsWith("insert.")
        ? [`vim.prompt.${id.slice("insert.".length)}()`]
        : [];
  return {
    factoryPath: factoryPath as ActionFactoryPath<Id>,
    publicScopes: publicScopes as PublicActionScopes<Id>,
    aliases: aliases as unknown as ActionAliases<Id>,
    anchor: actionAnchor(id),
  };
}

function descriptorMetadata(
  family: VimMappingFamily,
  descriptors: Record<string, { defaults: readonly string[] }>,
): VimPublicActionMetadata[] {
  return Object.entries(descriptors).map(([action, descriptor]) => {
    const id = `${family}.${action}` as VimFiniteActionId;
    return {
      id,
      source: "keymap-descriptor",
      defaults: descriptor.defaults,
      scopes: mappingScopesForKeymapEntry(family, action),
      ...publicActionFields(
        id,
        mappingScopesForKeymapEntry(family, action).filter(
          (scope) => family !== "mark" || scope !== "operatorPending",
        ),
      ),
    } as VimPublicActionMetadata;
  });
}

export const VIM_ACTION_METADATA: readonly VimPublicActionMetadata[] = [
  {
    id: "escape",
    source: "trusted-config-api",
    defaults: [],
    scopes: [],
    ...publicActionFields(
      "escape",
      VIM_MAPPING_SCOPES.filter((scope) => scope !== "normal"),
    ),
  },
  ...descriptorMetadata("operator", KEYMAP_OPERATOR_DESCRIPTORS),
  ...descriptorMetadata("motion", KEYMAP_MOTION_DESCRIPTORS),
  ...descriptorMetadata("command", KEYMAP_COMMAND_DESCRIPTORS),
  ...descriptorMetadata("macro", KEYMAP_MACRO_DESCRIPTORS),
  ...descriptorMetadata("mark", KEYMAP_MARK_DESCRIPTORS),
  ...descriptorMetadata("insert", KEYMAP_INSERT_DESCRIPTORS),
  ...descriptorMetadata("textObject.kind", KEYMAP_TEXT_OBJECT_KIND_DESCRIPTORS),
  ...descriptorMetadata("textObject.target", KEYMAP_TEXT_OBJECT_TARGET_DESCRIPTORS),
];

type PropertyFacts = {
  acceptedShape: string;
  assignment: string;
  jsonPaths: readonly string[];
  aliases: readonly string[];
};

const PROPERTY_FACTS = {
  preset: {
    acceptedShape: '"minimal" | "prompt-safe" | "vim-heavy"',
    assignment: "applies selected preset baseline, then replaces preset value",
    jsonPaths: ["piVim.preset"],
    aliases: [],
  },
  leader: {
    acceptedShape: "one printable character or null",
    assignment: "replaces leader; null clears it",
    jsonPaths: ["piVim.leader"],
    aliases: ["vim.g.mapleader"],
  },
  startMode: {
    acceptedShape: '"insert" | "normal"',
    assignment: "replaces startup mode",
    jsonPaths: ["piVim.startMode"],
    aliases: [],
  },
  "cursor.insert": {
    acceptedShape: '"block" | "bar" | "underline"',
    assignment: "replaces cursor style",
    jsonPaths: ["piVim.cursor.insert"],
    aliases: [],
  },
  "cursor.normal": {
    acceptedShape: '"block" | "bar" | "underline"',
    assignment: "replaces cursor style",
    jsonPaths: ["piVim.cursor.normal"],
    aliases: [],
  },
  "cursor.visual": {
    acceptedShape: '"block" | "bar" | "underline"',
    assignment: "replaces cursor style",
    jsonPaths: ["piVim.cursor.visual"],
    aliases: [],
  },
  "cursor.visualLine": {
    acceptedShape: '"block" | "bar" | "underline"',
    assignment: "replaces cursor style",
    jsonPaths: ["piVim.cursor.visualLine"],
    aliases: [],
  },
  "cursor.visualBlock": {
    acceptedShape: '"block" | "bar" | "underline"',
    assignment: "replaces cursor style",
    jsonPaths: ["piVim.cursor.visualBlock"],
    aliases: [],
  },
  "keymap.operatorMotions": {
    acceptedShape: "partial record of operator names to motion-name arrays",
    assignment: "replaces operator-motion allow-list",
    jsonPaths: ["piVim.keymap.operatorMotions"],
    aliases: [],
  },
  "ui.status.enabled": {
    acceptedShape: "boolean",
    assignment: "replaces value",
    jsonPaths: ["piVim.ui.status.enabled"],
    aliases: [],
  },
  "ui.status.position": {
    acceptedShape: '"left" | "right"',
    assignment: "replaces value",
    jsonPaths: ["piVim.ui.status.position"],
    aliases: [],
  },
  "ui.status.items": {
    acceptedShape: 'readonly ("mode" | "pendingOperator" | "selection" | "cursorPosition")[]',
    assignment: "replaces item list",
    jsonPaths: ["piVim.ui.status.items"],
    aliases: [],
  },
  "ui.mode.enabled": {
    acceptedShape: "boolean",
    assignment: "replaces value",
    jsonPaths: ["piVim.ui.mode.enabled"],
    aliases: [],
  },
  "ui.mode.labels": {
    acceptedShape: "partial record of Vim modes to strings",
    assignment: "replaces whole record; does not merge keys",
    jsonPaths: ["piVim.ui.mode.labels"],
    aliases: [],
  },
  "ui.mode.narrowLabels": {
    acceptedShape: "partial record of Vim modes to strings",
    assignment: "replaces whole record; does not merge keys",
    jsonPaths: ["piVim.ui.mode.narrowLabels"],
    aliases: [],
  },
  "ui.selection.enabled": {
    acceptedShape: "boolean",
    assignment: "replaces value",
    jsonPaths: ["piVim.ui.selection.enabled"],
    aliases: [],
  },
  "ui.selection.previewMaxChars": {
    acceptedShape: "non-negative integer",
    assignment: "replaces value",
    jsonPaths: ["piVim.ui.selection.previewMaxChars"],
    aliases: [],
  },
  "ui.cursorPosition.enabled": {
    acceptedShape: "boolean",
    assignment: "replaces value",
    jsonPaths: ["piVim.ui.cursorPosition.enabled"],
    aliases: [],
  },
  "ui.cursorPosition.base": {
    acceptedShape: "0 | 1",
    assignment: "replaces value",
    jsonPaths: ["piVim.ui.cursorPosition.base"],
    aliases: [],
  },
  "ui.cursorPosition.format": {
    acceptedShape: "string",
    assignment: "replaces value",
    jsonPaths: ["piVim.ui.cursorPosition.format"],
    aliases: [],
  },
  "ui.workbench.reservedRows": {
    acceptedShape: "integer from 0 through 5",
    assignment: "replaces value",
    jsonPaths: ["piVim.ui.workbench.reservedRows"],
    aliases: [],
  },
  "macros.enabled": {
    acceptedShape: "boolean",
    assignment: "replaces value",
    jsonPaths: ["piVim.macros.enabled"],
    aliases: [],
  },
  "macros.slots": {
    acceptedShape: "readonly lowercase register-name[]",
    assignment: "replaces slot list",
    jsonPaths: ["piVim.macros.slots"],
    aliases: [],
  },
  "macros.maxReplaySteps": {
    acceptedShape: "positive integer",
    assignment: "replaces value",
    jsonPaths: ["piVim.macros.maxReplaySteps"],
    aliases: [],
  },
  "marks.enabled": {
    acceptedShape: "boolean",
    assignment: "replaces value",
    jsonPaths: ["piVim.marks.enabled"],
    aliases: [],
  },
  "marks.slots": {
    acceptedShape: "readonly lowercase register-name[]",
    assignment: "replaces slot list",
    jsonPaths: ["piVim.marks.slots"],
    aliases: [],
  },
  "search.highlight": {
    acceptedShape: "boolean",
    assignment: "replaces value",
    jsonPaths: ["piVim.search.highlight"],
    aliases: [],
  },
  "search.highlightCurrent": {
    acceptedShape: "boolean",
    assignment: "replaces value",
    jsonPaths: ["piVim.search.highlightCurrent"],
    aliases: [],
  },
  "search.clearOnCancel": {
    acceptedShape: "boolean",
    assignment: "replaces value",
    jsonPaths: ["piVim.search.clearOnCancel"],
    aliases: [],
  },
  "search.clearOnInsert": {
    acceptedShape: "boolean",
    assignment: "replaces value",
    jsonPaths: ["piVim.search.clearOnInsert"],
    aliases: [],
  },
  "search.maxHighlights": {
    acceptedShape: "non-negative integer",
    assignment: "replaces value",
    jsonPaths: ["piVim.search.maxHighlights"],
    aliases: [],
  },
  "exCommand.autocomplete": {
    acceptedShape: "boolean",
    assignment: "replaces value",
    jsonPaths: ["piVim.exCommand.autocomplete"],
    aliases: [],
  },
  "feedback.noop": {
    acceptedShape: '"off" | "status"',
    assignment: "replaces value",
    jsonPaths: ["piVim.feedback.noop"],
    aliases: [],
  },
  "promptStructures.enabled": {
    acceptedShape: "boolean",
    assignment: "replaces value",
    jsonPaths: ["piVim.promptStructures.enabled"],
    aliases: [],
  },
  "promptStructures.targets": {
    acceptedShape: "partial record of prompt-structure targets to booleans",
    assignment: "replaces whole record; does not merge keys",
    jsonPaths: ["piVim.promptStructures.targets"],
    aliases: [],
  },
} as const satisfies Record<TrustedJsOptionPath, PropertyFacts>;

type PropertyMetadataFor<Path extends TrustedJsOptionPath> = {
  id: Path;
  path: `vim.${Path}`;
  configPath: Path;
  anchor: string;
  defaultValue: unknown;
} & (typeof PROPERTY_FACTS)[Path];

export type VimConfigPropertyMetadata = {
  [Path in TrustedJsOptionPath]: PropertyMetadataFor<Path>;
}[TrustedJsOptionPath];

function propertyAnchor(path: string): string {
  return `config-property-${path.replaceAll(".", "-")}`;
}

export const VIM_CONFIG_PROPERTY_METADATA: readonly VimConfigPropertyMetadata[] =
  TRUSTED_JS_OPTION_PATHS.map(
    (configPath) =>
      ({
        id: configPath,
        path: `vim.${configPath}` as `vim.${TrustedJsOptionPath}`,
        configPath,
        anchor: propertyAnchor(configPath),
        defaultValue: valueAtPath(configPath),
        ...PROPERTY_FACTS[configPath],
      }) as VimConfigPropertyMetadata,
  );

export type ConfigLeaf = {
  path: string;
  defaultValue: unknown;
  protectedShortcuts?: typeof PROTECTED_SHORTCUTS;
};

function valueAtPath(path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>((value, key) => (value as Record<string, unknown>)[key], DEFAULT_VIM_OPTIONS);
}

function leaves(paths: readonly string[]): ConfigLeaf[] {
  return paths.map((path) => ({
    path,
    defaultValue: valueAtPath(path),
    ...(path === "keymap.allowProtectedOverrides"
      ? { protectedShortcuts: PROTECTED_SHORTCUTS }
      : {}),
  }));
}

const modes = ["insert", "normal", "visual", "visualLine", "visualBlock"];

export const CONFIG_LEAVES: readonly ConfigLeaf[] = leaves([
  "preset",
  "leader",
  "startMode",
  ...modes.map((mode) => `cursor.${mode}`),
  "keymap.escape",
  ...Object.keys(KEYMAP_OPERATOR_DESCRIPTORS).map((action) => `keymap.operators.${action}`),
  ...Object.keys(KEYMAP_MOTION_DESCRIPTORS).map((action) => `keymap.motions.${action}`),
  ...Object.keys(KEYMAP_COMMAND_DESCRIPTORS).map((action) => `keymap.commands.${action}`),
  ...Object.keys(KEYMAP_MACRO_DESCRIPTORS).map((action) => `keymap.macros.${action}`),
  ...Object.keys(KEYMAP_MARK_DESCRIPTORS).map((action) => `keymap.marks.${action}`),
  ...Object.keys(KEYMAP_TEXT_OBJECT_KIND_DESCRIPTORS).map(
    (action) => `keymap.textObjects.kinds.${action}`,
  ),
  ...Object.keys(KEYMAP_TEXT_OBJECT_TARGET_DESCRIPTORS).map(
    (action) => `keymap.textObjects.targets.${action}`,
  ),
  ...VIM_MOTION_OPERATOR_ACTIONS.map((action) => `keymap.operatorMotions.${action}`),
  ...Object.keys(KEYMAP_INSERT_DESCRIPTORS).map((action) => `keymap.insert.${action}`),
  "keymap.remaps.accepted",
  "keymap.allowProtectedOverrides",
  "ui.status.enabled",
  "ui.status.position",
  "ui.status.items",
  "ui.mode.enabled",
  ...modes.flatMap((mode) => [`ui.mode.labels.${mode}`, `ui.mode.narrowLabels.${mode}`]),
  "ui.selection.enabled",
  "ui.selection.previewMaxChars",
  "ui.cursorPosition.enabled",
  "ui.cursorPosition.base",
  "ui.cursorPosition.format",
  "ui.workbench.reservedRows",
  "macros.enabled",
  "macros.slots",
  "macros.maxReplaySteps",
  "marks.enabled",
  "marks.slots",
  "search.highlight",
  "search.highlightCurrent",
  "search.clearOnCancel",
  "search.clearOnInsert",
  "search.maxHighlights",
  "exCommand.autocomplete",
  "easymotion.labelColor",
  "feedback.noop",
  "promptStructures.enabled",
  ...Object.keys(DEFAULT_VIM_OPTIONS.promptStructures!.targets).map(
    (target) => `promptStructures.targets.${target}`,
  ),
]);
