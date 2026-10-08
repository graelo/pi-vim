import type { LineRange, Position, VimMode, VimOperatorAction } from "../types.ts";
import type { SearchDirection } from "./types.ts";

export type WorkbenchKind = "search" | "ex";
export type WorkbenchPrefix = "/" | "?" | ":";

export type WorkbenchHistoryDirection = "previous" | "next";

export type SearchWorkbench = {
  kind: "search";
  prefix: "/" | "?";
  text: string;
  direction: SearchDirection;
  operator?: VimOperatorAction;
  historyIndex?: number;
  historyDraft?: string;
};

export type ExWorkbench = {
  kind: "ex";
  prefix: ":";
  text: string;
  sourceMode: Extract<VimMode, "normal" | "visual" | "visualLine" | "visualBlock">;
  visualAnchor?: Position;
  visualCursor?: Position;
  visualRange?: LineRange;
  historyIndex?: number;
  historyDraft?: string;
};

export type PendingWorkbench = SearchWorkbench | ExWorkbench;

export function workbenchDisplayText(entry: PendingWorkbench): string {
  return `${entry.prefix}${entry.text}`;
}

function clearNavigation<T extends PendingWorkbench>(entry: T): T {
  const { historyIndex: _historyIndex, historyDraft: _historyDraft, ...rest } = entry;
  return rest as T;
}

function resetDraftState<T extends PendingWorkbench>(entry: T): T {
  return clearNavigation(entry);
}

export function appendWorkbenchText<T extends PendingWorkbench>(entry: T, text: string): T {
  if (text.length === 0) return entry;
  return { ...resetDraftState(entry), text: entry.text + text } as T;
}

export function backspaceWorkbenchText<T extends PendingWorkbench>(entry: T): T {
  if (entry.text.length === 0) return resetDraftState(entry);
  return { ...resetDraftState(entry), text: entry.text.slice(0, -1) } as T;
}

export function navigateWorkbenchHistory<T extends PendingWorkbench>(
  entry: T,
  history: readonly string[],
  direction: WorkbenchHistoryDirection,
): T {
  if (history.length === 0) return entry;

  const draft = entry.historyDraft ?? entry.text;
  const currentIndex = entry.historyIndex;
  const nextIndex =
    direction === "previous"
      ? Math.max(0, currentIndex === undefined ? history.length - 1 : currentIndex - 1)
      : currentIndex === undefined
        ? undefined
        : currentIndex + 1;

  if (nextIndex === undefined) return entry;
  if (nextIndex >= history.length) {
    const restored = { ...entry, text: draft, historyIndex: undefined, historyDraft: undefined };
    return restored as T;
  }

  const next = {
    ...entry,
    text: history[nextIndex] ?? draft,
    historyIndex: nextIndex,
    historyDraft: draft,
  };
  return next as T;
}
