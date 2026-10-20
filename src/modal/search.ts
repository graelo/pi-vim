import type { SearchMatcher, SearchMatcherMode } from "../buffer.ts";
import type { VimOperatorAction } from "../types.ts";
import type {
  EditorSnapshot,
  ModalEffect,
  ModalOptions,
  ModalState,
  ModalUpdate,
  PendingSearchTarget,
  SearchHistoryEntry,
} from "./types.ts";

import {
  compileRegexSearchMatcher,
  deleteSearchMatchRange,
  findSearchMatchWithMatcher,
  wordUnderCursor,
  yankSearchMatchRange,
} from "../buffer.ts";
import { searchForOptions } from "../config.ts";
import {
  clearCommandPending,
  clearPending,
  clearSearchHighlight,
  editState,
  invalidate,
  keyMatches,
  keySequence,
  modeUpdate,
  resetAndDelegate,
  withEffects,
  withRuntimeMessage,
  withSearchHighlight,
  yankUpdate,
} from "./core.ts";
import { clearRegisterTarget } from "./registers.ts";

export function pendingSearchDisplay(target: PendingSearchTarget | undefined): string | undefined {
  if (!target) return undefined;
  return `${target.direction === "backward" ? "?" : "/"}${target.query}`;
}

export function searchHistoryEntryKey(entry: { query: string; matcherMode: string }): string {
  return `${entry.matcherMode}:${entry.query}`;
}

function oppositeSearchDirection(direction: "forward" | "backward"): "forward" | "backward" {
  return direction === "forward" ? "backward" : "forward";
}

export function startSearchUpdate(
  state: ModalState,
  direction: "forward" | "backward" = "forward",
  operator?: VimOperatorAction,
): ModalUpdate {
  return invalidate({
    ...clearPending(clearRegisterTarget(state)),
    pendingSearch: { query: "", direction, operator },
  });
}

const SEARCH_HISTORY_LIMIT = 50;

type ResolvedSearchQuery = {
  query: string;
  matcherMode: SearchMatcherMode;
  matcher: SearchMatcher;
};

type ResolvedSearchResult =
  | { ok: true; value?: ResolvedSearchQuery }
  | { ok: false; message: string };

function resolvedSearchQuery(query: string, matcherMode: SearchMatcherMode): ResolvedSearchResult {
  if (matcherMode === "regex") {
    const compiled = compileRegexSearchMatcher(query);
    return compiled.ok
      ? { ok: true, value: { query, matcherMode, matcher: compiled.matcher } }
      : compiled;
  }
  return {
    ok: true,
    value: { query, matcherMode, matcher: { mode: matcherMode, query } },
  };
}

function resolveSearchQuery(
  rawQuery: string,
  previous: ModalState["lastSearch"],
  historyMatcherMode?: SearchMatcherMode,
): ResolvedSearchResult {
  if (rawQuery.length === 0) {
    if (!previous) return { ok: true };
    return resolvedSearchQuery(previous.query, previous.matcherMode ?? "literal");
  }

  if (rawQuery.startsWith("\\r")) {
    const query = rawQuery.slice(2);
    return query.length === 0 ? { ok: true } : resolvedSearchQuery(query, "regex");
  }

  return resolvedSearchQuery(rawQuery, historyMatcherMode === "word" ? "word" : "literal");
}

function addSearchHistory(
  history: readonly SearchHistoryEntry[] | undefined,
  entry: SearchHistoryEntry,
): SearchHistoryEntry[] {
  const current = history ?? [];
  const deduped = current.filter(
    (item) => item.query !== entry.query || item.matcherMode !== entry.matcherMode,
  );
  return [...deduped, entry].slice(-SEARCH_HISTORY_LIMIT);
}

function completeResolvedSearch(
  state: ModalState,
  snapshot: EditorSnapshot,
  options: ModalOptions,
  query: string,
  matcherMode: SearchMatcherMode,
  matcher: SearchMatcher,
  direction: "forward" | "backward",
): ModalUpdate {
  const baseState = clearPending(state);
  const target = findSearchMatchWithMatcher(snapshot.text, snapshot.cursor, matcher, direction);
  if (!target) return invalidate(baseState);
  const searchState = { query, direction, matcherMode };
  const searchHistory = addSearchHistory(state.searchHistory, { query, matcherMode });
  const searchedState = { ...baseState, lastSearch: searchState, searchHistory };
  return withEffects(
    withSearchHighlight(searchedState, options, query, target.position, matcherMode),
    [{ type: "restoreCursor", position: target.position }, { type: "invalidate" }],
  );
}

export function searchWordUnderCursor(
  state: ModalState,
  snapshot: EditorSnapshot,
  options: ModalOptions,
  direction: "forward" | "backward",
): ModalUpdate {
  const word = wordUnderCursor(snapshot.text, snapshot.cursor);
  if (!word) return invalidate(clearCommandPending(state));
  return completeResolvedSearch(
    state,
    snapshot,
    options,
    word,
    "word",
    { mode: "word", query: word },
    direction,
  );
}

function completeSearch(
  state: ModalState,
  snapshot: EditorSnapshot,
  options: ModalOptions,
  search: PendingSearchTarget,
): ModalUpdate {
  const resolved = resolveSearchQuery(search.query, state.lastSearch, search.historyMatcherMode);
  const baseState = clearPending(state);
  if (!resolved.ok)
    return invalidate(withRuntimeMessage(baseState, { kind: "error", text: resolved.message }));
  if (!resolved.value) return invalidate(baseState);

  const target = findSearchMatchWithMatcher(
    snapshot.text,
    snapshot.cursor,
    resolved.value.matcher,
    search.direction,
  );
  if (!target) return invalidate(baseState);

  const searchState = {
    query: resolved.value.query,
    direction: search.direction,
    matcherMode: resolved.value.matcherMode,
  };
  const searchHistory = addSearchHistory(state.searchHistory, {
    query: resolved.value.query,
    matcherMode: resolved.value.matcherMode,
  });
  const searchedState = { ...baseState, lastSearch: searchState, searchHistory };
  if (search.operator) {
    if (search.operator === "yank") {
      const register = yankSearchMatchRange(snapshot.text, snapshot.cursor, target);
      return yankUpdate(
        withSearchHighlight(
          searchedState,
          options,
          resolved.value.query,
          target.position,
          resolved.value.matcherMode,
        ),
        register,
      );
    }

    const result = deleteSearchMatchRange(snapshot.text, snapshot.cursor, target);
    const edited = clearSearchHighlight(editState(searchedState, result));
    const effects: ModalEffect[] = [{ type: "edit", result }];
    if (search.operator === "change") return modeUpdate(edited, "insert", options, effects);
    return withEffects(edited, effects);
  }

  return completeResolvedSearch(
    state,
    snapshot,
    options,
    resolved.value.query,
    resolved.value.matcherMode,
    resolved.value.matcher,
    search.direction,
  );
}

export function repeatSearch(
  state: ModalState,
  snapshot: EditorSnapshot,
  options: ModalOptions,
  reverse: boolean,
): ModalUpdate {
  if (!state.lastSearch) return invalidate(clearCommandPending(state));
  const direction = reverse
    ? oppositeSearchDirection(state.lastSearch.direction)
    : state.lastSearch.direction;
  const resolved = resolveSearchQuery("", state.lastSearch);
  if (!resolved.ok || !resolved.value) return invalidate(clearCommandPending(state));
  const target = findSearchMatchWithMatcher(
    snapshot.text,
    snapshot.cursor,
    resolved.value.matcher,
    direction,
  );
  if (!target) return invalidate(clearCommandPending(state));
  return withEffects(
    withSearchHighlight(
      clearCommandPending(state),
      options,
      state.lastSearch.query,
      target.position,
      resolved.value.matcherMode,
    ),
    [{ type: "restoreCursor", position: target.position }, { type: "invalidate" }],
  );
}

function historyText(entry: SearchHistoryEntry): string {
  return entry.matcherMode === "regex" ? `\\r${entry.query}` : entry.query;
}

function navigateSearchHistory(
  state: ModalState,
  search: PendingSearchTarget,
  direction: "previous" | "next",
): ModalState {
  const history = state.searchHistory ?? [];
  if (history.length === 0) return state;
  const draft = search.historyDraft ?? search.query;
  const currentIndex = search.historyIndex;
  const nextIndex =
    direction === "previous"
      ? Math.max(0, currentIndex === undefined ? history.length - 1 : currentIndex - 1)
      : currentIndex === undefined
        ? undefined
        : currentIndex + 1;
  if (nextIndex === undefined) return state;
  if (nextIndex >= history.length) {
    return {
      ...state,
      pendingSearch: {
        ...search,
        query: draft,
        historyIndex: undefined,
        historyDraft: undefined,
        historyMatcherMode: undefined,
      },
    };
  }
  const entry = history[nextIndex];
  if (!entry) return state;
  return {
    ...state,
    pendingSearch: {
      ...search,
      query: historyText(entry),
      historyIndex: nextIndex,
      historyDraft: draft,
      historyMatcherMode: entry.matcherMode,
    },
  };
}

export function handlePendingSearchInput(
  state: ModalState,
  snapshot: EditorSnapshot,
  options: ModalOptions,
  data: string,
): ModalUpdate {
  const search = state.pendingSearch;
  if (!search) return invalidate(state);
  if (keyMatches(data, "escape")) {
    const cleared = clearPending(state);
    return invalidate(
      searchForOptions(options).clearOnCancel ? clearSearchHighlight(cleared) : cleared,
    );
  }
  if (keyMatches(data, "ctrl+c") || keyMatches(data, "ctrl+g"))
    return resetAndDelegate(state, options, data);
  if (keyMatches(data, "enter") || keyMatches(data, "return")) {
    return completeSearch(state, snapshot, options, search);
  }
  if (keyMatches(data, "backspace")) {
    if (search.query.length === 0) return invalidate(state);
    return invalidate({
      ...state,
      pendingSearch: {
        ...search,
        query: search.query.slice(0, -1),
        historyIndex: undefined,
        historyDraft: undefined,
        historyMatcherMode: undefined,
      },
    });
  }
  if (keyMatches(data, "up")) return invalidate(navigateSearchHistory(state, search, "previous"));
  if (keyMatches(data, "down")) return invalidate(navigateSearchHistory(state, search, "next"));

  const key = keySequence(data);
  if (key?.length !== 1) return invalidate(state);
  return invalidate({
    ...state,
    pendingSearch: {
      ...search,
      query: search.query + key,
      historyIndex: undefined,
      historyDraft: undefined,
      historyMatcherMode: undefined,
    },
  });
}
