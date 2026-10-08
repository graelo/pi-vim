import type { EditResult, Position } from "./types.ts";

import {
  type DelimitedOffsetRange,
  enclosingBracketRange,
  quotePairRange,
  type SurroundRange,
} from "./buffer.ts";

/** Text added before and after the surrounded range. */
export type SurroundPair = { open: string; close: string };

/** Pair that `ds` and `cs` look for around the cursor. */
export type SurroundDeleteTarget =
  | { kind: "bracket"; open: string; close: string; trim: boolean }
  | { kind: "char"; char: string };

const BRACKETS: Readonly<Record<string, { open: string; close: string; opening: boolean }>> = {
  "(": { open: "(", close: ")", opening: true },
  ")": { open: "(", close: ")", opening: false },
  b: { open: "(", close: ")", opening: false },
  "{": { open: "{", close: "}", opening: true },
  "}": { open: "{", close: "}", opening: false },
  B: { open: "{", close: "}", opening: false },
  "[": { open: "[", close: "]", opening: true },
  "]": { open: "[", close: "]", opening: false },
  r: { open: "[", close: "]", opening: false },
  "<": { open: "<", close: ">", opening: true },
  ">": { open: "<", close: ">", opening: false },
  a: { open: "<", close: ">", opening: false },
};

function isPunctuation(char: string): boolean {
  return /^[!-/:-@[-`{-~]$/.test(char);
}

/** Pair added by `ys`, `cs`, and visual `S` for a surround character. */
export function surroundPairFor(char: string): SurroundPair | undefined {
  const bracket = BRACKETS[char];
  if (bracket && char !== "<") {
    return bracket.opening
      ? { open: `${bracket.open} `, close: ` ${bracket.close}` }
      : { open: bracket.open, close: bracket.close };
  }
  if (char === "<" || !isPunctuation(char)) return undefined;
  return { open: char, close: char };
}

/** Pair that `ds` and `cs` remove for a target character. */
export function surroundTargetFor(char: string): SurroundDeleteTarget | undefined {
  const bracket = BRACKETS[char];
  if (bracket)
    return { kind: "bracket", open: bracket.open, close: bracket.close, trim: bracket.opening };
  return isPunctuation(char) ? { kind: "char", char } : undefined;
}

function offsetToPosition(text: string, offset: number): Position {
  const before = text.slice(0, offset);
  const line = before.split("\n").length - 1;
  return { line, col: offset - (before.lastIndexOf("\n") + 1) };
}

function unchanged(text: string, cursor: Position): EditResult {
  return { text, cursor, changed: false };
}

function edited(text: string, cursorOffset: number): EditResult {
  return { text, cursor: offsetToPosition(text, cursorOffset), changed: true };
}

/** Wrap `range`; linewise ranges get the pair on their own lines, without inner spaces. */
export function addSurround(
  text: string,
  cursor: Position,
  range: SurroundRange | undefined,
  pair: SurroundPair,
): EditResult {
  if (!range || range.end <= range.start) return unchanged(text, cursor);
  const inner = text.slice(range.start, range.end);
  const wrapped = range.linewise
    ? `${pair.open.trim()}\n${inner}\n${pair.close.trim()}`
    : `${pair.open}${inner}${pair.close}`;
  return edited(text.slice(0, range.start) + wrapped + text.slice(range.end), range.start);
}

function targetRange(
  text: string,
  cursor: Position,
  target: SurroundDeleteTarget,
  count: number,
): DelimitedOffsetRange | undefined {
  if (target.kind === "bracket")
    return enclosingBracketRange(text, cursor, target.open, target.close, count);
  return quotePairRange(text, cursor, target.char);
}

function innerText(text: string, range: DelimitedOffsetRange, target: SurroundDeleteTarget) {
  const inner = text.slice(range.start + 1, range.end - 1);
  return target.kind === "bracket" && target.trim ? inner.replace(/^[ \t]+|[ \t]+$/g, "") : inner;
}

/** Remove the nearest pair matching `target`; the cursor lands where the opening character was. */
export function deleteSurround(
  text: string,
  cursor: Position,
  target: SurroundDeleteTarget,
  count = 1,
): EditResult {
  const range = targetRange(text, cursor, target, count);
  if (!range) return unchanged(text, cursor);
  const next = text.slice(0, range.start) + innerText(text, range, target) + text.slice(range.end);
  return edited(next, range.start);
}

/** Replace the nearest pair matching `target` with `pair`. */
export function changeSurround(
  text: string,
  cursor: Position,
  target: SurroundDeleteTarget,
  pair: SurroundPair,
  count = 1,
): EditResult {
  const range = targetRange(text, cursor, target, count);
  if (!range) return unchanged(text, cursor);
  const inner = innerText(text, range, target);
  const next = `${text.slice(0, range.start)}${pair.open}${inner}${pair.close}${text.slice(range.end)}`;
  return edited(next, range.start);
}
