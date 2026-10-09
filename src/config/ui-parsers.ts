import type { CursorStyle, CursorStyles, ResolvedVimUi, VimMode, VimStatusItem } from "../types.ts";

import {
  CURSOR_STYLES,
  STATUS_ITEM_SET,
  UI_STATUS_POSITIONS,
  VIM_MODES,
  WORKBENCH_RESERVED_ROWS_MAX,
} from "./defaults.ts";
import { booleanField, enumField, intField, isRecord, parseActionStringArray } from "./fields.ts";
import type { PartialUiOptions } from "./types.ts";

function parseModeLabelMap(
  value: unknown,
  sourceLabel: string,
  field: "labels" | "narrowLabels",
  warnings: string[],
): Partial<Record<VimMode, string>> | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) {
    warnings.push(`${sourceLabel}: ui.mode.${field} must be an object`);
    return undefined;
  }

  const labels: Partial<Record<VimMode, string>> = {};
  for (const mode of VIM_MODES) {
    const label = value[mode];
    if (label === undefined) continue;
    if (typeof label === "string" && label.length > 0) labels[mode] = label;
    else warnings.push(`${sourceLabel}: ui.mode.${field}.${mode} must be a non-empty string`);
  }
  return Object.keys(labels).length > 0 ? labels : undefined;
}

function parseUiStatus(
  value: unknown,
  sourceLabel: string,
  warnings: string[],
): Partial<ResolvedVimUi["status"]> | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) {
    warnings.push(`${sourceLabel}: ui.status must be an object`);
    return undefined;
  }
  const status: Partial<ResolvedVimUi["status"]> = {};
  const statusEnabled = booleanField(
    value.enabled,
    `${sourceLabel}: ui.status.enabled must be a boolean`,
    warnings,
  );
  if (statusEnabled !== undefined) status.enabled = statusEnabled;
  const position = enumField<"left" | "right">(
    value.position,
    `${sourceLabel}: ui.status.position must be "left" or "right"`,
    warnings,
    UI_STATUS_POSITIONS,
  );
  if (position) status.position = position;
  if (value.items !== undefined) {
    const items = parseActionStringArray<VimStatusItem>(
      value.items,
      STATUS_ITEM_SET,
      `${sourceLabel}: ui.status.items`,
      warnings,
    );
    if (items) status.items = items;
  }
  return status;
}

function parseUiMode(
  value: unknown,
  sourceLabel: string,
  warnings: string[],
): PartialUiOptions["mode"] | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) {
    warnings.push(`${sourceLabel}: ui.mode must be an object`);
    return undefined;
  }
  const mode: NonNullable<PartialUiOptions["mode"]> = {};
  const modeEnabled = booleanField(
    value.enabled,
    `${sourceLabel}: ui.mode.enabled must be a boolean`,
    warnings,
  );
  if (modeEnabled !== undefined) mode.enabled = modeEnabled;
  mode.labels = parseModeLabelMap(value.labels, sourceLabel, "labels", warnings);
  mode.narrowLabels = parseModeLabelMap(value.narrowLabels, sourceLabel, "narrowLabels", warnings);
  return mode;
}

function parseUiSelection(
  value: unknown,
  sourceLabel: string,
  warnings: string[],
): Partial<ResolvedVimUi["selection"]> | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) {
    warnings.push(`${sourceLabel}: ui.selection must be an object`);
    return undefined;
  }
  const selection: Partial<ResolvedVimUi["selection"]> = {};
  const selectionEnabled = booleanField(
    value.enabled,
    `${sourceLabel}: ui.selection.enabled must be a boolean`,
    warnings,
  );
  if (selectionEnabled !== undefined) selection.enabled = selectionEnabled;
  const previewMaxChars = intField(
    value.previewMaxChars,
    `${sourceLabel}: ui.selection.previewMaxChars must be a non-negative integer`,
    warnings,
    0,
  );
  if (previewMaxChars !== undefined) selection.previewMaxChars = previewMaxChars;
  return selection;
}

function parseUiCursorPosition(
  value: unknown,
  sourceLabel: string,
  warnings: string[],
): Partial<ResolvedVimUi["cursorPosition"]> | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) {
    warnings.push(`${sourceLabel}: ui.cursorPosition must be an object`);
    return undefined;
  }
  const cursorPosition: Partial<ResolvedVimUi["cursorPosition"]> = {};
  const cursorPositionEnabled = booleanField(
    value.enabled,
    `${sourceLabel}: ui.cursorPosition.enabled must be a boolean`,
    warnings,
  );
  if (cursorPositionEnabled !== undefined) cursorPosition.enabled = cursorPositionEnabled;
  if (value.base === 0 || value.base === 1) cursorPosition.base = value.base;
  else if (value.base !== undefined)
    warnings.push(`${sourceLabel}: ui.cursorPosition.base must be 0 or 1`);
  if (
    typeof value.format === "string" &&
    value.format.includes("{line}") &&
    value.format.includes("{column}")
  )
    cursorPosition.format = value.format;
  else if (value.format !== undefined)
    warnings.push(`${sourceLabel}: ui.cursorPosition.format must include {line} and {column}`);
  return cursorPosition;
}

function parseUiWorkbench(
  value: unknown,
  sourceLabel: string,
  warnings: string[],
): Partial<ResolvedVimUi["workbench"]> | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) {
    warnings.push(`${sourceLabel}: ui.workbench must be an object`);
    return undefined;
  }
  const workbench: Partial<ResolvedVimUi["workbench"]> = {};
  const reservedRows = intField(
    value.reservedRows,
    `${sourceLabel}: ui.workbench.reservedRows must be an integer between 0 and ${WORKBENCH_RESERVED_ROWS_MAX}`,
    warnings,
    0,
    WORKBENCH_RESERVED_ROWS_MAX,
  );
  if (reservedRows !== undefined) workbench.reservedRows = reservedRows;
  return workbench;
}

export function parseUi(
  value: unknown,
  sourceLabel: string,
): { partial?: PartialUiOptions; warnings: string[] } {
  const warnings: string[] = [];
  if (value === undefined) return { warnings };
  if (!isRecord(value)) return { warnings: [`${sourceLabel}: ui must be an object`] };
  const partial: PartialUiOptions = {};
  partial.status = parseUiStatus(value.status, sourceLabel, warnings);
  partial.mode = parseUiMode(value.mode, sourceLabel, warnings);
  partial.selection = parseUiSelection(value.selection, sourceLabel, warnings);
  partial.cursorPosition = parseUiCursorPosition(value.cursorPosition, sourceLabel, warnings);
  partial.workbench = parseUiWorkbench(value.workbench, sourceLabel, warnings);
  return { partial, warnings };
}

export function parseCursorStyles(
  value: unknown,
  sourceLabel: string,
  warnings: string[],
): Partial<CursorStyles> | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) {
    warnings.push(`${sourceLabel}: cursor must be an object`);
    return undefined;
  }
  const cursor: Partial<CursorStyles> = {};
  for (const mode of VIM_MODES) {
    const style = enumField<CursorStyle>(
      value[mode],
      `${sourceLabel}: unsupported cursor.${mode}`,
      warnings,
      CURSOR_STYLES,
    );
    if (style) cursor[mode] = style;
  }
  return cursor;
}
