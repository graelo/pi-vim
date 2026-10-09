import { loadConfig } from "@graelo/pi-ext-config";

import type { ResolvedVimEditorOptions } from "../types.ts";

import { defaultJsConfigPath, loadVimJsConfig, VIM_EXTENSION_ID } from "../config-js.ts";

import { cloneDefaultOptions } from "./clone.ts";
import { detectKeymapConflicts, rejectShowKeybindingsConflicts } from "./conflicts.ts";
import { DEFAULT_VIM_KEYMAP } from "./defaults.ts";
import { applyJsOptionOperations, compileJsConfig, jsConfigRules } from "./js-layer.ts";
import {
  additiveKeymapLayer,
  applyProjectExactPrecedence,
  resolveKeymapFromLayers,
} from "./keymap-layers.ts";
import { mergePartialOptions, presetOptions } from "./merge.ts";
import { createVimConfigPlan } from "./plan.ts";
import { parsePiVim } from "./settings-parsers.ts";
import type {
  PartialKeymapOptions,
  PartialVimOptions,
  VimConfigLoadOptions,
  VimConfigLoadResult,
  VimConfigPlan,
  VimJsConfigResult,
} from "./types.ts";

function applyProjectLayer(
  options: ResolvedVimEditorOptions,
  keymapLayers: PartialKeymapOptions[],
  project: PartialVimOptions,
): void {
  const projectLayers: PartialKeymapOptions[] = [];
  if (project.preset) {
    const preset = presetOptions(project.preset);
    mergePartialOptions(options, preset);
    if (preset.keymap) projectLayers.push(preset.keymap);
  }
  mergePartialOptions(options, project);
  if (project.keymap) projectLayers.push(project.keymap);
  for (const layer of projectLayers) {
    applyProjectExactPrecedence(keymapLayers, layer, options.leader);
    keymapLayers.push(layer);
  }
}

function compileResolvedKeymap(
  options: ResolvedVimEditorOptions,
  keymapLayers: PartialKeymapOptions[],
  warnings: string[],
): VimConfigPlan {
  const keymapResolution =
    keymapLayers.length > 0 ? resolveKeymapFromLayers(keymapLayers, options.leader) : undefined;
  if (keymapResolution) {
    options.keymap = keymapResolution.keymap;
    warnings.push(...keymapResolution.warnings);
  }

  const keymap = options.keymap ?? DEFAULT_VIM_KEYMAP;
  warnings.push(...rejectShowKeybindingsConflicts(keymap), ...detectKeymapConflicts(keymap));
  return createVimConfigPlan(options, warnings);
}

function applyParsedSettings(
  options: ResolvedVimEditorOptions,
  keymapLayers: PartialKeymapOptions[],
  parsed: ReturnType<typeof parsePiVim>,
): void {
  if (parsed.partial.preset) {
    const preset = presetOptions(parsed.partial.preset);
    mergePartialOptions(options, preset);
    if (preset.keymap) keymapLayers.push(preset.keymap);
  }
  mergePartialOptions(options, parsed.partial);
  if (parsed.partial.keymap) keymapLayers.push(parsed.partial.keymap);
}

function applyJsConfiguration(
  options: ResolvedVimEditorOptions,
  keymapLayers: PartialKeymapOptions[],
  jsConfig: VimJsConfigResult | undefined,
  warnings: string[],
): void {
  const compiled = jsConfig?.operations ? undefined : compileJsConfig(jsConfig);
  if (jsConfig?.operations)
    applyJsOptionOperations(options, keymapLayers, jsConfig.operations, warnings);
  const parsed = parsePiVim(compiled?.source, "global JS config");
  const appendKeymap =
    !jsConfig?.operations && (jsConfig?.kind === "success" || jsConfig?.appendKeymap);
  const partial =
    appendKeymap && parsed.partial.keymap
      ? {
          ...parsed.partial,
          keymap: {
            ...additiveKeymapLayer(keymapLayers, parsed.partial.keymap),
            unmaps: compiled?.unmaps,
          },
        }
      : parsed.partial;
  applyParsedSettings(options, keymapLayers, { ...parsed, partial });
  warnings.push(...(jsConfig?.warnings ?? []), ...parsed.warnings);
}

export function resolveVimOptions(
  globalConfig: unknown,
  projectConfig?: unknown,
  jsConfig?: VimJsConfigResult,
): VimConfigLoadResult {
  const options = cloneDefaultOptions();
  const warnings: string[] = [];
  const keymapLayers: PartialKeymapOptions[] = [];
  const parsedGlobal = parsePiVim(globalConfig, "global config");
  applyParsedSettings(options, keymapLayers, parsedGlobal);
  warnings.push(...parsedGlobal.warnings);
  applyJsConfiguration(options, keymapLayers, jsConfig, warnings);
  const parsedProject = parsePiVim(projectConfig, "project config");
  applyProjectLayer(options, keymapLayers, parsedProject.partial);
  warnings.push(...parsedProject.warnings);
  const plan = compileResolvedKeymap(options, keymapLayers, warnings);
  return {
    plan,
    options: plan.options,
    warnings: plan.diagnostics.warnings,
    fatal: jsConfig?.kind === "fatal",
  };
}

type VimConfigFiles = {
  globalConfig: unknown;
  projectConfig: unknown;
  diagnostics: string[];
};

/**
 * Read the global and (when trusted) project `config.json` separately: pi-vim
 * layers them itself, so the library only locates and parses the files.
 */
function readVimConfigFiles(options: VimConfigLoadOptions): VimConfigFiles {
  const location = { cwd: options.cwd, agentDir: options.agentDir };
  const global = loadConfig<Record<string, unknown>>(
    VIM_EXTENSION_ID,
    {},
    {
      ...location,
      includeProject: false,
    },
  );
  const globalConfig = global.sources.length > 0 ? global.config : undefined;
  if (!options.isProjectTrusted)
    return { globalConfig, projectConfig: undefined, diagnostics: global.diagnostics };

  const project = loadConfig<Record<string, unknown>>(VIM_EXTENSION_ID, {}, location);
  const projectPath = project.candidates.length === 2 ? project.candidates[0] : undefined;
  const projectConfig =
    projectPath !== undefined && project.sources[0] === projectPath ? project.config : undefined;
  return {
    globalConfig,
    projectConfig,
    diagnostics: [...new Set([...global.diagnostics, ...project.diagnostics])],
  };
}

export async function loadVimOptions(
  loadOptions: VimConfigLoadOptions = {},
): Promise<VimConfigLoadResult> {
  const files = readVimConfigFiles(loadOptions);
  const globalSeed = resolveVimOptions(files.globalConfig).options;
  const jsRead = await loadVimJsConfig(
    loadOptions.jsConfigPath ?? defaultJsConfigPath(loadOptions.agentDir),
    globalSeed as unknown as Record<string, unknown>,
    jsConfigRules(),
  );
  const resolved = resolveVimOptions(files.globalConfig, files.projectConfig, jsRead);

  const warnings = [...files.diagnostics, ...resolved.warnings];
  const plan = createVimConfigPlan(resolved.options, warnings);
  return {
    plan,
    options: plan.options,
    warnings: plan.diagnostics.warnings,
    fatal: resolved.fatal,
  };
}
