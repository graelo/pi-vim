import { describe, expect, test } from "vitest";
import { existsSync, readFileSync } from "node:fs";

import { DEFAULT_VIM_OPTIONS } from "../src/config.ts";
import { parseExCommand } from "../src/ex.ts";
import { runtimeHelpEntries, runtimeHelpMessage } from "../src/runtime-help.ts";
import { POPUP_COMMAND_DOCS_METADATA } from "./support/runtime-docs-metadata.ts";

// Docs are compared with whitespace collapsed, so Markdown reflow never breaks these checks.
// Assert on identifiers, anchors, settings paths, commands, and stated non-goals, not on wording.
const readDoc = (path: string) => readFileSync(path, "utf8").replace(/\s+/g, " ");
const readme = readDoc("README.md");
const configDoc = readDoc("docs/config.md");
const featuresDoc = readDoc("docs/features.md");
const settingsDoc = readDoc("docs/settings.md");
const allUserDocs = `${configDoc}\n${featuresDoc}\n${settingsDoc}`;
const globalConfigExamples = [
  "examples/pi-vim.config.js",
  "examples/keymaps.config.js",
  "examples/async.config.js",
  "examples/imported-preset.config.js",
].map((path) => readFileSync(path, "utf8"));

describe("config guide documentation", () => {
  test("trusted config guide order and discovery links stay stable", () => {
    const sections = ["basic-setup", "generated-properties", "advanced-setup", "safety-semantics"];
    const positions = sections.map((anchor) => configDoc.indexOf(`id="${anchor}"`));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual(positions.toSorted((a, b) => a - b));
    expect(configDoc).toContain("unsandboxed trusted code");
    expect(configDoc).toContain("full Pi process privileges");
    expect(readme).toContain("docs/config.md#basic-setup");
    expect(settingsDoc).toContain("config.md#basic-setup");
    expect(runtimeHelpMessage("settings", { options: DEFAULT_VIM_OPTIONS })).toContain(
      "docs/config.md#basic-setup",
    );
  });

  test("global config examples resolve types from Pi's installed package", () => {
    const annotation =
      '/** @type {import("./npm/node_modules/@graelo/pi-vim/config").VimConfig} */';
    for (const example of globalConfigExamples) expect(example).toContain(annotation);
  });

  test("reload docs name every preserved and cleared lifecycle state", () => {
    const reloadSemantics =
      configDoc.match(/Reload preserves.+?cursor style apply immediately\./)?.[0] ?? "";
    for (const state of [
      "pending count",
      "key prefix",
      "character target",
      "register target",
      "mark target",
      "macro target",
    ]) {
      expect(reloadSemantics).toContain(state);
    }
    expect(reloadSemantics).toContain("It clears");
  });

  test("runtime help registry entries carry drift anchors", () => {
    const entries = runtimeHelpEntries({ options: DEFAULT_VIM_OPTIONS });
    for (const entry of entries) {
      expect(entry.docsAnchor).toBeTruthy();
      expect(entry.specAnchor).toBeTruthy();
      expect(entry.testAnchors.length).toBeGreaterThanOrEqual(1);
    }
  });

  test("runtime help registry anchors exist in feature docs, specs, and tests", () => {
    for (const entry of runtimeHelpEntries({ options: DEFAULT_VIM_OPTIONS })) {
      expect(featuresDoc).toContain(`<!-- ${entry.docsAnchor} -->`);
      expect(existsSync(entry.specAnchor)).toBe(true);
      for (const testAnchor of entry.testAnchors) expect(existsSync(testAnchor)).toBe(true);
    }
  });
});

describe("documentation behavior", () => {
  test("feature docs describe every popup-backed read-only Ex command", () => {
    for (const entry of POPUP_COMMAND_DOCS_METADATA) {
      expect(featuresDoc).toContain(entry.command);
      expect(featuresDoc).toContain(`<!-- ${entry.docsAnchor} -->`);
      expect(parseExCommand(entry.parserExample, { lineCount: 5, cursorLine: 1 }).type).not.toBe(
        "error",
      );
    }
  });

  test("docs cover WORD and previous-end motion names without lowercase retune claims", () => {
    for (const key of ["`W`", "`B`", "`E`", "`ge`", "`gE`", "dW", "cE", "ygE"]) {
      expect(featuresDoc).toContain(key);
    }
    for (const action of [
      "wordForwardBig",
      "wordBackwardBig",
      "wordEndBig",
      "wordPreviousEnd",
      "wordPreviousEndBig",
    ]) {
      expect(settingsDoc).toContain(action);
    }
    expect(settingsDoc).toContain('["W"]');
    expect(settingsDoc).toContain('["B"]');
    expect(settingsDoc).toContain('["E"]');
    expect(settingsDoc).toContain('["ge"]');
    expect(settingsDoc).toContain('["gE"]');
    expect(allUserDocs).not.toMatch(/lowercase[^.]{0,80}punctuation-aware/i);
    expect(allUserDocs).toContain("no subword/camelCase navigation");
    expect(allUserDocs).toContain("display-line motions");
  });

  test("docs cover paragraph motion and text object names and defaults", () => {
    for (const key of ["`{`", "`}`", "`ip`", "`ap`", "d}", "c{", "dap"]) {
      expect(featuresDoc).toContain(key);
    }
    for (const action of ["paragraphForward", "paragraphBackward"]) {
      expect(settingsDoc).toContain(action);
    }
    expect(settingsDoc).toContain("textObjects.targets.paragraph");
    expect(settingsDoc).toContain('["{"]');
    expect(settingsDoc).toContain('["}"]');
    expect(settingsDoc).toContain('["p"]');
  });

  test("docs cannot regress :noh or :nohlsearch into unsupported claims", () => {
    const forbidden =
      /(?:unsupported|not supported|no support)[^.]{0,120}:(?:noh|nohlsearch)|:(?:noh|nohlsearch)[^.]{0,120}(?:unsupported|not supported|no support)/i;
    expect(allUserDocs.match(forbidden)?.[0]).toBeUndefined();
    expect(featuresDoc).toContain(":nohlsearch");
    expect(settingsDoc).toContain(":noh");
  });
});

describe("documentation data contracts", () => {
  test("settings docs stay aligned with source-backed defaults", () => {
    const defaults: Record<string, string> = {
      "piVim.startMode": `"${DEFAULT_VIM_OPTIONS.startMode}"`,
      "piVim.cursor.insert": `"${DEFAULT_VIM_OPTIONS.cursor.insert}"`,
      "piVim.cursor.normal": `"${DEFAULT_VIM_OPTIONS.cursor.normal}"`,
      "piVim.keymap.escape": JSON.stringify(DEFAULT_VIM_OPTIONS.keymap!.escape),
      "piVim.search.highlight": String(DEFAULT_VIM_OPTIONS.search!.highlight),
      "piVim.search.maxHighlights": String(DEFAULT_VIM_OPTIONS.search!.maxHighlights),
      "piVim.feedback.noop": `"${DEFAULT_VIM_OPTIONS.feedback!.noop}"`,
      "piVim.ui.workbench.reservedRows": String(DEFAULT_VIM_OPTIONS.ui!.workbench.reservedRows),
      "piVim.macros.enabled": String(DEFAULT_VIM_OPTIONS.macros!.enabled),
      "piVim.marks.enabled": String(DEFAULT_VIM_OPTIONS.marks!.enabled),
      "piVim.promptStructures.enabled": String(DEFAULT_VIM_OPTIONS.promptStructures!.enabled),
    };

    for (const [path, defaultValue] of Object.entries(defaults)) {
      expect(settingsDoc).toContain(path);
      expect(settingsDoc).toContain(defaultValue);
    }
  });

  test("Ex docs do not list shipped Ex behavior as unsupported", () => {
    for (const phrase of [
      "no repeat substitution",
      "no range offsets",
      "no semicolon ranges",
      "no Ex register operands",
    ]) {
      expect(featuresDoc).not.toContain(phrase);
    }
    expect(featuresDoc).toContain(":&");
    expect(featuresDoc).toContain(":delete a");
    expect(featuresDoc).toContain("piVim.ui.workbench.reservedRows");
  });
});

describe("keybinding popup documentation", () => {
  test("read-only popup docs stay aligned with the keybindings command", () => {
    expect(featuresDoc).toContain(`<!-- ${POPUP_COMMAND_DOCS_METADATA[0]!.docsAnchor} -->`);
    expect(featuresDoc).toContain(":keybindings");
    expect(featuresDoc).toContain(":keybindings <query>");
    expect(settingsDoc).toContain("piVim.keymap.commands.showKeybindings");
    expect(settingsDoc).toContain("piVim.keymap.escape");
    expect(featuresDoc).toContain("piVim.keymap.escape");
    expect(featuresDoc).toContain("Esc");
    expect(featuresDoc).toContain("Ctrl-C");
    expect(featuresDoc).toContain("Ctrl-G");
    expect(featuresDoc).toContain("no runtime `:map`");
    expect(featuresDoc).toContain("no runtime `:action`");
    expect(featuresDoc).toContain("no recursive mappings");
    expect(featuresDoc).toContain("no Vimscript");
    expect(featuresDoc).toContain("no command palette");
    expect(featuresDoc).toContain("no Vim help tags");
    expect(featuresDoc).toContain("no default keybinding for `:keybindings`");
    expect(featuresDoc).toContain("no unbounded output log");
    for (const removed of [":features", ":changelog", ":actions", "prompt.transform."]) {
      expect(allUserDocs).not.toContain(removed);
    }
  });
});

describe("release documentation", () => {
  test("release docs include checks and package contents inspection", () => {
    expect(readme).toContain("npm run check");
    expect(readme).toContain("npm pack --dry-run");
  });
});
