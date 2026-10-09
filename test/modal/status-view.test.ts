import { expect, test } from "vitest";
import { resolveVimOptions } from "../../src/config.ts";
import { modalModeLabel, modalStatus, modalVisualStatus } from "../../src/modal/view.ts";
import { cursor } from "./shared.ts";

test("mode labels shorten at narrow widths", () => {
  expect(modalModeLabel("visualLine", 40)).toBe("V-LINE");
  expect(modalModeLabel("visualLine", 4)).toBe("VL");
});

test("visual status summarizes selections without TUI objects", () => {
  expect(
    modalVisualStatus({
      mode: "visual",
      text: "abcd",
      cursor: { line: 0, col: 2 },
      visualAnchor: { line: 0, col: 1 },
      width: 40,
    }),
  ).toContain("2 chars");

  expect(
    modalVisualStatus({
      mode: "visualLine",
      text: "one\ntwo",
      cursor: { line: 1, col: 0 },
      visualAnchor: { line: 0, col: 0 },
      width: 40,
    }),
  ).toContain("2 lines");

  expect(
    modalVisualStatus({
      mode: "visualBlock",
      text: "abcd\nefgh",
      cursor: { line: 1, col: 2 },
      visualAnchor: { line: 0, col: 1 },
      width: 40,
    }),
  ).toContain("2x2 block");
});

test("modal status respects UI item config and cursor position format", () => {
  const status = modalStatus({
    mode: "normal",
    text: "one\ntwo",
    cursor: { line: 1, col: 2 },
    width: 40,
    pending: "d",
    ui: {
      status: {
        enabled: true,
        position: "left",
        items: ["cursorPosition", "mode", "pendingOperator"],
      },
      mode: {
        enabled: true,
        labels: {
          insert: "INS",
          normal: "CMD",
          visual: "VIS",
          visualLine: "VLN",
          visualBlock: "VBLK",
        },
        narrowLabels: {
          insert: "I",
          normal: "C",
          visual: "V",
          visualLine: "VL",
          visualBlock: "VB",
        },
        colors: {},
      },
      selection: { enabled: false, previewMaxChars: 4 },
      cursorPosition: { enabled: true, base: 1, format: "L{line}:C{column}" },
      workbench: { reservedRows: 0 },
    },
  });

  expect(status.left.trim()).toBe("L2:C3 CMD d…");
  expect(status.right).toBe("");
});

test("modal status moves the complete status group to the right", () => {
  const ui = resolveVimOptions({
    ui: {
      status: {
        position: "right",
        items: ["cursorPosition", "mode", "pendingOperator"],
      },
    },
  }).options.ui;
  const status = modalStatus({
    mode: "normal",
    text: "abc",
    cursor,
    width: 40,
    pending: "d",
    recordingSlot: "a",
    ui,
  });
  const visual = modalStatus({
    mode: "visual",
    text: "abc",
    cursor: { line: 0, col: 1 },
    visualAnchor: cursor,
    width: 40,
    ui: resolveVimOptions({
      ui: { status: { position: "right", items: ["selection", "mode"] } },
    }).options.ui,
  });

  expect(status).toEqual({ left: "", right: " 1:1 NORMAL REC a d… " });
  expect(visual).toEqual({ left: "", right: " 2 chars · ab VISUAL " });
});

test("right-positioned status honors mode visibility and narrow labels", () => {
  const configured = resolveVimOptions({
    ui: {
      status: { position: "right", items: ["mode"] },
      mode: {
        labels: { normal: "COMMAND" },
        narrowLabels: { normal: "C" },
        colors: {},
      },
    },
  }).options.ui;
  const narrow = modalStatus({ mode: "normal", text: "", cursor, width: 5, ui: configured });
  const hidden = modalStatus({
    mode: "normal",
    text: "",
    cursor,
    width: 40,
    ui: resolveVimOptions({ ui: { status: { position: "right" }, mode: { enabled: false } } })
      .options.ui,
  });
  const omitted = modalStatus({
    mode: "normal",
    text: "",
    cursor,
    width: 40,
    ui: resolveVimOptions({ ui: { status: { position: "right", items: ["cursorPosition"] } } })
      .options.ui,
  });
  const disabled = modalStatus({
    mode: "normal",
    text: "",
    cursor,
    width: 40,
    ui: resolveVimOptions({ ui: { status: { enabled: false, position: "right" } } }).options.ui,
  });

  expect(narrow.right).toBe(" C ");
  expect(hidden.right).toBe(" 1:1 ");
  expect(omitted.right).toBe(" 1:1 ");
  expect(disabled).toEqual({ left: "", right: "" });
});

test("modal status shows active macro recording", () => {
  const status = modalStatus({
    mode: "normal",
    text: "abc",
    cursor,
    width: 40,
    recordingSlot: "a",
  });

  expect(status.left.trim()).toContain("NORMAL REC a");

  const modeHidden = modalStatus({
    mode: "normal",
    text: "abc",
    cursor,
    width: 10,
    recordingSlot: "a",
    ui: {
      status: { enabled: true, position: "right", items: ["selection"] },
      mode: {
        enabled: false,
        labels: {
          insert: "INSERT",
          normal: "NORMAL",
          visual: "VISUAL",
          visualLine: "V-LINE",
          visualBlock: "V-BLOCK",
        },
        narrowLabels: {
          insert: "I",
          normal: "N",
          visual: "V",
          visualLine: "VL",
          visualBlock: "VB",
        },
        colors: {},
      },
      selection: { enabled: true, previewMaxChars: 16 },
      cursorPosition: { enabled: false, base: 1, format: "{line}:{column}" },
      workbench: { reservedRows: 0 },
    },
  });
  expect(modeHidden).toEqual({ left: "", right: " REC a " });
});

function modeStatus(
  mode: "normal" | "insert" | "visual" | "visualLine" | "visualBlock",
  colors: unknown,
  width = 40,
) {
  const ui = resolveVimOptions({ ui: { status: { items: ["mode"] }, mode: { colors } } }).options
    .ui;
  return modalStatus({ mode, text: "abc", cursor, visualAnchor: cursor, width, ui }).left;
}

test("mode colors render palette indices as a padded block", () => {
  expect(modeStatus("normal", { normal: { bg: 2, fg: 15 } })).toBe(
    " \x1b[48;5;2;38;5;15m NORMAL \x1b[0m ",
  );
});

test("mode colors render hex colors as 24-bit SGR", () => {
  expect(modeStatus("insert", { insert: { bg: "#268bd2", fg: "#FDF6E3" } })).toBe(
    " \x1b[48;2;38;139;210;38;2;253;246;227m INSERT \x1b[0m ",
  );
  expect(modeStatus("insert", { insert: { bg: "#268bd2" } })).toBe(
    " \x1b[48;2;38;139;210m INSERT \x1b[0m ",
  );
});

test("mode colors also wrap the narrow label", () => {
  expect(modeStatus("normal", { normal: { bg: 2 } }, 6)).toBe(" \x1b[48;5;2m N \x1b[0m ");
});

test("visual line and block fall back to visual colors unless set", () => {
  const colors = { visual: { bg: 5 }, visualBlock: { bg: 13 } };
  expect(modeStatus("visualLine", colors)).toBe(" \x1b[48;5;5m V-LINE \x1b[0m ");
  expect(modeStatus("visualBlock", colors)).toBe(" \x1b[48;5;13m V-BLOCK \x1b[0m ");
});

test("mode labels stay plain without colors for the current mode", () => {
  expect(modeStatus("normal", undefined)).toBe(" NORMAL ");
  expect(modeStatus("insert", { normal: { bg: 2 } })).toBe(" INSERT ");
  expect(modeStatus("normal", { normal: {} })).toBe(" NORMAL ");
});
