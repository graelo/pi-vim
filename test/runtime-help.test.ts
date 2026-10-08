import { describe, expect, test } from "vitest";

import { DEFAULT_VIM_OPTIONS } from "../src/config.ts";
import {
  diagnosticPopup,
  inspectPopup,
  runtimeHelpPopup,
} from "../src/keybinding-discovery-popup.ts";
import { runtimeHelpEntries, runtimeHelpMessage } from "../src/runtime-help.ts";

const context = { options: DEFAULT_VIM_OPTIONS, diagnostics: { warnings: [] } };

describe("runtime help registry", () => {
  test("general help lists finite entry points", () => {
    const message = runtimeHelpMessage(undefined, context);

    expect(message).toContain(":help <topic>");
    expect(message).not.toContain(":features");
    expect(message).toContain(":messages");
    expect(message).not.toContain(":actions");
    expect(message).toContain(":keymap");
    expect(message).toContain(":mapcheck");
    expect(message).toContain(":vimdoctor");
  });

  test("topic help reports supported behavior and limits", () => {
    expect(runtimeHelpMessage("search", context)).toContain("prompt search");
    expect(runtimeHelpMessage("search", context)).toContain("no cross-prompt history");
    expect(runtimeHelpMessage("ex", context)).toContain(":s");
    expect(runtimeHelpMessage("registers", context)).toContain('"+');
    expect(runtimeHelpMessage("registers", context)).toContain(
      "clipboard reads depend on platform tools",
    );
    expect(runtimeHelpMessage("clipboard", context)).toContain("mirror fallback");
    expect(runtimeHelpMessage("diagnostics", context)).toContain("metadata-only");
    expect(runtimeHelpMessage("diagnostics", context)).toContain("not bindable");
    expect(runtimeHelpMessage("vimscript", context)).toBe("help: no match for vimscript");
  });

  test("read-only popup builders expose titles and bounded line arrays", () => {
    const help = runtimeHelpPopup({ command: "help", query: "search" }, DEFAULT_VIM_OPTIONS);
    const keymap = diagnosticPopup({ command: "keymap", query: "redo" }, DEFAULT_VIM_OPTIONS);
    const mapcheck = diagnosticPopup({ command: "mapcheck", query: "ctrl+p" }, DEFAULT_VIM_OPTIONS);
    const doctor = diagnosticPopup({ command: "vimdoctor" }, DEFAULT_VIM_OPTIONS);

    expect(help).toMatchObject({ title: ":help search", source: "help", query: "search" });
    expect(keymap).toMatchObject({ title: ":keymap redo", source: "keymap" });
    expect(mapcheck).toMatchObject({ title: ":mapcheck ctrl+p", source: "mapcheck" });
    expect(doctor).toMatchObject({ title: ":vimdoctor", source: "vimdoctor" });
    for (const popup of [help, keymap, mapcheck, doctor]) {
      expect(popup.scrollOffset).toBe(0);
      expect(popup.lines.length).toBeGreaterThan(0);
      expect(popup.lines.every((line) => line.trim().length > 0)).toBe(true);
    }
  });

  test("read-only popup builders keep no-match and empty states visible", () => {
    expect(
      runtimeHelpPopup({ command: "help", query: "vimscript" }, DEFAULT_VIM_OPTIONS).lines,
    ).toContain("help: no match for vimscript");
    expect(runtimeHelpPopup({ command: "messages" }, DEFAULT_VIM_OPTIONS).lines).toContain(
      "messages: none retained",
    );
  });

  test("inspect popup summarizes state without raw prompt text", () => {
    const popup = inspectPopup({
      state: { mode: "normal" },
      snapshot: {
        text: "secret raw prompt",
        lines: ["secret raw prompt"],
        cursor: { line: 0, col: 0 },
      },
      options: DEFAULT_VIM_OPTIONS,
      diagnostics: { warnings: [] },
    });

    expect(popup.title).toBe(":vim inspect");
    expect(popup.source).toBe("inspect");
    expect(popup.lines.join("\n")).toContain("mode=normal");
    expect(popup.lines.join("\n")).not.toContain("secret raw prompt");
  });

  test("registry entries carry drift anchors", () => {
    for (const entry of runtimeHelpEntries(context)) {
      expect(entry.id.length).toBeGreaterThan(0);
      expect(entry.topics.length).toBeGreaterThan(0);
      expect(entry.summary.length).toBeGreaterThan(0);
      expect(entry.examples.length).toBeGreaterThan(0);
      expect(entry.limits.length).toBeGreaterThan(0);
      expect(entry.docsAnchor.length).toBeGreaterThan(0);
      expect(entry.specAnchor.length).toBeGreaterThan(0);
      expect(entry.testAnchors.length).toBeGreaterThanOrEqual(1);
    }
  });
});
