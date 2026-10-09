import type {
  CursorStyles,
  PromptStructureTarget,
  ResolvedVimInsertKeymap,
  ResolvedVimKeymap,
  ResolvedVimMacros,
  ResolvedVimMarks,
  ResolvedVimSearch,
  ResolvedVimEasymotion,
  StartupMode,
  VimCommandAction,
  ResolvedVimEditorOptions,
  VimDiagnostics,
  VimFeedbackOptions,
  VimMotionAction,
  VimMotionOperatorAction,
  VimOperatorAction,
  VimPreset,
  VimTextObjectKind,
  VimTextObjectTarget,
  VimUiEditorOptions,
} from "../types.ts";

import type { VimJsConfigOperation } from "../config-js.ts";
import type { VimMappingScope } from "../mapping-scopes.ts";

export type PartialVimOptions = {
  preset?: VimPreset;
  leader?: string | null;
  startMode?: StartupMode;
  cursor?: Partial<CursorStyles>;
  keymap?: PartialKeymapOptions;
  ui?: PartialUiOptions;
  macros?: PartialMacroOptions;
  marks?: PartialMarkOptions;
  search?: PartialSearchOptions;
  easymotion?: PartialVimEasymotionOptions;
  exCommand?: PartialExCommandOptions;
  feedback?: PartialFeedbackOptions;
  promptStructures?: PartialPromptStructureOptions;
};

export type PartialKeymapOptions = {
  escape?: string[];
  operators?: Partial<Record<VimOperatorAction, string[]>>;
  motions?: Partial<Record<VimMotionAction, string[]>>;
  commands?: Partial<Record<VimCommandAction, string[]>>;
  macros?: Partial<Record<keyof ResolvedVimKeymap["macros"], string[]>>;
  marks?: Partial<Record<keyof ResolvedVimKeymap["marks"], string[]>>;
  textObjects?: {
    kinds?: Partial<Record<VimTextObjectKind, string[]>>;
    targets?: Partial<Record<VimTextObjectTarget, string[]>>;
  };
  operatorMotions?: Partial<Record<VimMotionOperatorAction, VimMotionAction[]>>;
  replaceOperatorMotions?: boolean;
  insert?: Partial<ResolvedVimInsertKeymap>;
  remaps?: ResolvedVimKeymap["remaps"];
  scoped?: ResolvedVimKeymap["scoped"];
  unmaps?: Array<{ key: string; modes: readonly VimMappingScope[] }>;
  allowProtectedOverrides?: string[];
};

export type PartialMacroOptions = Partial<ResolvedVimMacros>;

export type PartialMarkOptions = Partial<ResolvedVimMarks>;

export type PartialSearchOptions = Partial<ResolvedVimSearch>;

export type PartialVimEasymotionOptions = Partial<ResolvedVimEasymotion>;

export type PartialFeedbackOptions = Partial<VimFeedbackOptions>;

export type PartialPromptStructureOptions = {
  enabled?: boolean;
  targets?: Partial<Record<PromptStructureTarget, boolean>>;
};

export type PartialUiOptions = VimUiEditorOptions;

export type VimPlanBinding =
  | { readonly kind: "keymap"; readonly id: string }
  | { readonly kind: "escape"; readonly id: "escape" }
  | { readonly kind: "insert"; readonly id: string }
  | { readonly kind: "command"; readonly id: string }
  | { readonly kind: "remap"; readonly id: "remap"; readonly inputs: readonly string[] };

export type VimScopeLookup = {
  readonly exact: Readonly<Record<string, VimPlanBinding>>;
  readonly prefixes: Readonly<Record<string, readonly string[]>>;
};

export type VimConfigPlan = {
  readonly options: ResolvedVimEditorOptions;
  readonly diagnostics: { readonly warnings: readonly string[] };
  readonly scopes: Readonly<Record<VimMappingScope, VimScopeLookup>>;
};

export type VimRuntimeConfiguration = {
  readonly plan: VimConfigPlan;
  readonly diagnostics: VimDiagnostics;
};

export type VimConfigLoadResult = {
  plan: VimConfigPlan;
  options: ResolvedVimEditorOptions;
  warnings: readonly string[];
  fatal?: boolean;
};

export type VimConfigLoadOptions = {
  /** Where to look for the project's git root. Defaults to `process.cwd()`. */
  cwd?: string;
  /** Overrides Pi's agent directory; intended for tests. */
  agentDir?: string;
  /** Pi's trust decision for the project; without it the project tier is skipped. */
  isProjectTrusted?: boolean;
  /** Overrides the trusted JS config path; intended for tests. */
  jsConfigPath?: string;
};

export type PartialExCommandOptions = {
  autocomplete?: boolean;
};

export type ProjectExactMapping = {
  key: string;
  modes: readonly VimMappingScope[];
  actionId?: string;
};

export type VimJsConfigResult = {
  kind?: "success" | "fatal" | "missing";
  operations?: readonly VimJsConfigOperation[];
  partial?: unknown;
  warnings?: readonly string[];
  appendKeymap?: boolean;
};
