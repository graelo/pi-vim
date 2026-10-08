import type {
  ResolvedBlockRange,
  ResolvedCharacterRange,
  ResolvedDestination,
  ResolvedLineRange,
} from "./range.ts";
import type {
  EditResult,
  LineRange,
  Position,
  PromptStructureTarget,
  ResolvedVimPromptStructures,
  TextRange,
  VimMotion,
  VimRegister,
  VimTextObject,
  VimTextObjectKind,
} from "./types.ts";

import { resolvePromptStructureRange } from "./prompt-structures.ts";
import {
  blockSelectionText,
  isVisualCellSelected,
  isVisualLineSelected,
  linewiseSelectionText,
  normalizeBlockRange,
  normalizeLineRange,
  normalizeRange,
  selectionText,
  type VisualSelectionKind,
  visualBlockSelectionSummary,
  visualLineSelectionSummary,
  visualSelectionSummary,
  visualSelectionText,
} from "./visual-selection.ts";

export type { VisualSelectionKind, VisualSelectionMode } from "./visual-selection.ts";
export {
  blockSelectionText,
  isVisualCellSelected,
  isVisualLineSelected,
  linewiseSelectionText,
  normalizeBlockRange,
  normalizeLineRange,
  normalizeRange,
  selectionText,
  visualBlockSelectionSummary,
  visualLineSelectionSummary,
  visualSelectionSummary,
  visualSelectionText,
};

export type BufferNavigationTarget = "start" | "end" | "firstNonBlank" | "matchingPair";

function splitText(text: string): string[] {
  const lines = text.split("\n");
  return lines.length === 0 ? [""] : lines;
}

function joinLines(lines: string[]): string {
  return (lines.length === 0 ? [""] : lines).join("\n");
}

function clampPosition(lines: string[], position: Position): Position {
  const safeLines = lines.length === 0 ? [""] : lines;
  const line = Math.max(0, Math.min(position.line, safeLines.length - 1));
  const length = safeLines[line]?.length ?? 0;
  const col = Math.max(0, Math.min(position.col, length));
  return { line, col };
}

function comparePositions(a: Position, b: Position): number {
  if (a.line !== b.line) return a.line - b.line;
  return a.col - b.col;
}

function firstNonBlankColumn(line: string): number {
  const match = /\S/.exec(line);
  return match?.index ?? 0;
}

function lineStartOffsets(lines: string[]): number[] {
  const starts: number[] = [];
  let offset = 0;
  for (const line of lines) {
    starts.push(offset);
    offset += line.length + 1;
  }
  return starts;
}

function positionToOffset(text: string, position: Position): number {
  const lines = splitText(text);
  const pos = clampPosition(lines, position);
  const starts = lineStartOffsets(lines);
  return (starts[pos.line] ?? 0) + pos.col;
}

function offsetToPosition(text: string, offset: number): Position {
  const safeOffset = Math.max(0, Math.min(offset, text.length));
  const lines = splitText(text);
  let consumed = 0;

  for (let line = 0; line < lines.length; line++) {
    const length = lines[line]?.length ?? 0;
    if (safeOffset <= consumed + length) return { line, col: safeOffset - consumed };
    consumed += length + 1;
  }

  const lastLine = Math.max(0, lines.length - 1);
  return { line: lastLine, col: lines[lastLine]?.length ?? 0 };
}

function offsetToPositionFromLineStarts(
  lines: string[],
  starts: number[],
  offset: number,
  textLength: number,
): Position {
  const safeOffset = Math.max(0, Math.min(offset, textLength));
  let low = 0;
  let high = Math.max(0, starts.length - 1);
  let line = 0;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if ((starts[mid] ?? 0) <= safeOffset) {
      line = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  const lineStart = starts[line] ?? 0;
  const lineLength = lines[line]?.length ?? 0;
  return { line, col: Math.max(0, Math.min(safeOffset - lineStart, lineLength)) };
}

function lineBoundsForPosition(
  text: string,
  position: Position,
): { start: number; end: number; line: string } {
  const lines = splitText(text);
  const pos = clampPosition(lines, position);
  const starts = lineStartOffsets(lines);
  const line = lines[pos.line] ?? "";
  const start = starts[pos.line] ?? 0;
  return { start, end: start + line.length, line };
}

function isWhitespace(char: string | undefined): boolean {
  return char === undefined || /\s/.test(char);
}

function isKeywordWordChar(char: string | undefined): boolean {
  return char !== undefined && /[A-Za-z0-9_]/.test(char);
}

function wordKind(char: string | undefined): "keyword" | "punctuation" | "whitespace" {
  if (isWhitespace(char)) return "whitespace";
  return isKeywordWordChar(char) ? "keyword" : "punctuation";
}

type WordBoundaryModel = "small" | "big";

type WordBoundaryKind = "keyword" | "punctuation" | "word" | "whitespace";

function boundaryKind(model: WordBoundaryModel, char: string | undefined): WordBoundaryKind {
  if (model === "small") return wordKind(char);
  return isWhitespace(char) ? "whitespace" : "word";
}

function isSameBoundaryKind(
  model: WordBoundaryModel,
  left: string | undefined,
  right: string | undefined,
): boolean {
  const leftKind = boundaryKind(model, left);
  return leftKind !== "whitespace" && leftKind === boundaryKind(model, right);
}

function nextWordStartOffsetFor(model: WordBoundaryModel, text: string, offset: number): number {
  let index = Math.max(0, Math.min(offset, text.length));
  if (index >= text.length) return index;

  const kind = boundaryKind(model, text[index]);
  if (kind !== "whitespace") {
    while (index < text.length && boundaryKind(model, text[index]) === kind) index++;
  }

  while (index < text.length && isWhitespace(text[index])) index++;
  return index;
}

function nextWordStartOffset(text: string, offset: number): number {
  return nextWordStartOffsetFor("small", text, offset);
}

function nextWORDStartOffset(text: string, offset: number): number {
  return nextWordStartOffsetFor("big", text, offset);
}

function skipWhitespace(text: string, index: number): number {
  while (index < text.length && isWhitespace(text[index])) index++;
  return index;
}

function boundaryEndOffset(model: WordBoundaryModel, text: string, index: number): number {
  const kind = boundaryKind(model, text[index]);
  while (index + 1 < text.length && boundaryKind(model, text[index + 1]) === kind) index++;
  return index;
}

function wordEndOffsetFor(model: WordBoundaryModel, text: string, offset: number): number {
  let index = Math.max(0, Math.min(offset, text.length));
  if (index >= text.length) return text.length;
  if (isWhitespace(text[index])) index = skipWhitespace(text, index);
  else if (isSameBoundaryKind(model, text[index], text[index + 1]))
    return boundaryEndOffset(model, text, index);
  else index++;
  if (index >= text.length) return text.length;
  index = skipWhitespace(text, index);
  return index >= text.length ? text.length : boundaryEndOffset(model, text, index);
}
function wordEndOffset(text: string, offset: number): number {
  return wordEndOffsetFor("small", text, offset);
}

function wordEndWORDOffset(text: string, offset: number): number {
  return wordEndOffsetFor("big", text, offset);
}

function previousWordEndOffsetFor(model: WordBoundaryModel, text: string, offset: number): number {
  const current = Math.max(0, Math.min(offset, text.length));
  if (current === 0 || text.length === 0) return 0;

  let index = current - 1;
  if (current < text.length && isSameBoundaryKind(model, text[index], text[current])) {
    const kind = boundaryKind(model, text[current]);
    while (index >= 0 && boundaryKind(model, text[index]) === kind) index--;
  }
  while (index >= 0 && isWhitespace(text[index])) index--;
  return Math.max(0, index);
}

function previousWordEndOffset(text: string, offset: number): number {
  return previousWordEndOffsetFor("small", text, offset);
}

function previousWordEndWORDOffset(text: string, offset: number): number {
  return previousWordEndOffsetFor("big", text, offset);
}

function previousWordStartOffsetFor(
  model: WordBoundaryModel,
  text: string,
  offset: number,
): number {
  let index = Math.max(0, Math.min(offset, text.length));
  if (index === 0) return 0;

  index--;
  while (index > 0 && isWhitespace(text[index])) index--;
  const kind = boundaryKind(model, text[index]);
  while (index > 0 && boundaryKind(model, text[index - 1]) === kind) index--;
  return index;
}

function previousWordStartOffset(text: string, offset: number): number {
  return previousWordStartOffsetFor("small", text, offset);
}

function previousWORDStartOffset(text: string, offset: number): number {
  return previousWordStartOffsetFor("big", text, offset);
}

function orderedOffsetRange(
  start: number,
  end: number,
): { start: number; end: number } | undefined {
  const ordered = { start: Math.min(start, end), end: Math.max(start, end) };
  return ordered.start === ordered.end ? undefined : ordered;
}

function motionTargetOffset(text: string, offset: number, motion: VimMotion): number {
  const cursor = offsetToPosition(text, offset);
  const bounds = lineBoundsForPosition(text, cursor);
  if (motion === "l") return Math.min(text.length, offset + 1);
  if (motion === "h") return Math.max(0, offset - 1);
  if (motion === "$") return bounds.end;
  if (motion === "0") return bounds.start;
  if (motion === "^") return bounds.start + firstNonBlankColumn(bounds.line);
  if (motion === "w") return nextWordStartOffset(text, offset);
  if (motion === "W") return nextWORDStartOffset(text, offset);
  if (motion === "e") return wordEndOffset(text, offset);
  if (motion === "E") return wordEndWORDOffset(text, offset);
  if (motion === "ge") return previousWordEndOffset(text, offset);
  if (motion === "gE") return previousWordEndWORDOffset(text, offset);
  if (motion === "B") return previousWORDStartOffset(text, offset);
  return previousWordStartOffset(text, offset);
}

function paragraphMotionOffsetRange(
  text: string,
  cursor: Position,
  motion: "}" | "{",
  count: number,
): { start: number; end: number } | undefined {
  const current = positionToOffset(text, cursor);
  const lines = splitText(text);
  let pos = clampPosition(lines, cursor);
  const step = motion === "}" ? paragraphForwardStep : paragraphBackwardStep;
  for (let index = 0; index < Math.max(1, count); index++) {
    const next = step(lines, pos);
    if (comparePositions(next, pos) === 0) break;
    pos = next;
  }
  const target = positionToOffset(text, pos);
  return target === current ? undefined : orderedOffsetRange(current, target);
}

function standardMotionOffsetRange(
  text: string,
  current: number,
  motion: VimMotion,
  count: number,
): { start: number; end: number } | undefined {
  let target = current;
  for (let index = 0; index < Math.max(1, count); index++) {
    const next = motionTargetOffset(text, target, motion);
    if (next === target) break;
    target = next;
  }
  if ((motion === "e" || motion === "E") && target >= current)
    return orderedOffsetRange(current, Math.min(text.length, target + 1));
  if ((motion === "ge" || motion === "gE") && target <= current)
    return orderedOffsetRange(target, current);
  if (motion === "l" && target >= current)
    return orderedOffsetRange(current, Math.min(text.length, target));
  return orderedOffsetRange(current, target);
}

function motionOffsetRange(
  text: string,
  cursor: Position,
  motion: VimMotion,
  count = 1,
): { start: number; end: number } | undefined {
  const current = positionToOffset(text, cursor);
  if (motion === "%") {
    const target = navigateBuffer(text, cursor, "matchingPair");
    if (!target) return undefined;
    const targetOffset = positionToOffset(text, target);
    return targetOffset === current
      ? undefined
      : orderedOffsetRange(
          Math.min(current, targetOffset),
          Math.min(text.length, Math.max(current, targetOffset) + 1),
        );
  }
  if (motion === "}" || motion === "{")
    return paragraphMotionOffsetRange(text, cursor, motion, count);
  if (motion === ")" || motion === "(") {
    const direction = motion === ")" ? "forward" : "backward";
    return orderedOffsetRange(current, sentenceTargetOffset(text, current, direction, count));
  }
  return standardMotionOffsetRange(text, current, motion, count);
}
function motionLineRange(
  text: string,
  cursor: Position,
  motion: VimMotion,
  count = 1,
): LineRange | undefined {
  const lines = splitText(text);
  const pos = clampPosition(lines, cursor);
  const lastLine = Math.max(0, lines.length - 1);
  if (motion === "j") {
    const target = Math.min(lastLine, pos.line + Math.max(1, count));
    return target === pos.line ? undefined : { startLine: pos.line, endLine: target };
  }
  if (motion === "k") {
    const target = Math.max(0, pos.line - Math.max(1, count));
    return target === pos.line ? undefined : { startLine: target, endLine: pos.line };
  }
  if (motion === "gg") return pos.line === 0 ? undefined : { startLine: 0, endLine: pos.line };
  if (motion === "G")
    return pos.line === lastLine ? undefined : { startLine: pos.line, endLine: lastLine };
  return undefined;
}

function deleteOffsetRange(text: string, start: number, end: number): EditResult {
  const range = orderedOffsetRange(start, end);
  if (!range) return { text, cursor: offsetToPosition(text, start), changed: false };

  const removed = text.slice(range.start, range.end);
  if (removed.length === 0)
    return { text, cursor: offsetToPosition(text, range.start), changed: false };

  const nextText = text.slice(0, range.start) + text.slice(range.end);
  return {
    text: nextText,
    cursor: offsetToPosition(nextText, range.start),
    register: { type: "char", text: removed },
    changed: nextText !== text,
  };
}

function transformCaseOffsetRange(
  text: string,
  start: number,
  end: number,
  action: CaseTransformAction,
): EditResult {
  const range = orderedOffsetRange(start, end);
  if (!range) return { text, cursor: offsetToPosition(text, start), changed: false };
  const nextText =
    text.slice(0, range.start) +
    transformCaseText(text.slice(range.start, range.end), action) +
    text.slice(range.end);
  return {
    text: nextText,
    cursor: offsetToPosition(nextText, range.start),
    changed: nextText !== text,
  };
}

export function bufferStartPosition(): Position {
  return { line: 0, col: 0 };
}

export function bufferEndPosition(text: string): Position {
  const lines = splitText(text);
  const line = Math.max(0, lines.length - 1);
  return { line, col: lines[line]?.length ?? 0 };
}

export function firstNonBlankPosition(text: string, cursor: Position): Position {
  const lines = splitText(text);
  const pos = clampPosition(lines, cursor);
  return { line: pos.line, col: firstNonBlankColumn(lines[pos.line] ?? "") };
}

const OPEN_TO_CLOSE: Record<string, string> = { "(": ")", "[": "]", "{": "}" };
const CLOSE_TO_OPEN: Record<string, string> = { ")": "(", "]": "[", "}": "{" };

function isPairChar(char: string | undefined): boolean {
  return (
    char !== undefined && (OPEN_TO_CLOSE[char] !== undefined || CLOSE_TO_OPEN[char] !== undefined)
  );
}

function bracketAtOrAfterCursorOnLine(text: string, cursor: Position): number | undefined {
  const start = positionToOffset(text, cursor);
  const { end } = lineBoundsForPosition(text, cursor);
  for (let offset = start; offset < end; offset++) {
    if (isPairChar(text[offset])) return offset;
  }
  return undefined;
}

function matchingBracketOffset(
  text: string,
  bracketOffset: number,
  bracket: string,
  match: string,
  step: number,
): number | undefined {
  let depth = 0;
  for (let offset = bracketOffset; offset >= 0 && offset < text.length; offset += step) {
    if (text[offset] === bracket) depth++;
    if (text[offset] === match) depth--;
    if (depth === 0) return offset;
  }
  return undefined;
}

export function matchingPairPosition(text: string, cursor: Position): Position | undefined {
  const bracketOffset = bracketAtOrAfterCursorOnLine(text, cursor);
  const bracket = bracketOffset === undefined ? undefined : text[bracketOffset];
  if (bracketOffset === undefined || !bracket) return undefined;
  const close = OPEN_TO_CLOSE[bracket];
  const offset = close
    ? matchingBracketOffset(text, bracketOffset, bracket, close, 1)
    : CLOSE_TO_OPEN[bracket]
      ? matchingBracketOffset(text, bracketOffset, bracket, CLOSE_TO_OPEN[bracket], -1)
      : undefined;
  return offset === undefined ? undefined : offsetToPosition(text, offset);
}
export function normalizeBufferPosition(text: string, cursor: Position): Position {
  return clampPosition(splitText(text), cursor);
}

export function moveByPromptLines(text: string, cursor: Position, lineDelta: number): Position {
  const lines = splitText(text);
  const pos = clampPosition(lines, cursor);
  const line = Math.max(0, Math.min(pos.line + lineDelta, lines.length - 1));
  return { line, col: Math.max(0, Math.min(pos.col, lines[line]?.length ?? 0)) };
}

export type SubstituteLineRangeOptions = {
  range: LineRange;
  pattern: string;
  replacement: string;
  global: boolean;
  ignoreCase: boolean;
  originalCursor: Position;
};

export type SubstituteLineRangeResult = {
  edit: EditResult;
  matches: number;
  ranges: TextRange[];
};

function literalIndexOf(
  line: string,
  pattern: string,
  fromIndex: number,
  ignoreCase: boolean,
): number {
  if (!ignoreCase) return line.indexOf(pattern, fromIndex);
  return line.toLocaleLowerCase().indexOf(pattern.toLocaleLowerCase(), fromIndex);
}

function substituteLineLiteral(
  line: string,
  pattern: string,
  replacement: string,
  global: boolean,
  ignoreCase: boolean,
): { line: string; matches: number; ranges: Array<{ start: number; end: number }> } {
  let nextLine = "";
  let cursor = 0;
  let matches = 0;
  const ranges: Array<{ start: number; end: number }> = [];

  while (cursor <= line.length) {
    const match = literalIndexOf(line, pattern, cursor, ignoreCase);
    if (match < 0) break;
    matches++;
    ranges.push({ start: match, end: match + pattern.length - 1 });
    nextLine += line.slice(cursor, match) + replacement;
    cursor = match + pattern.length;
    if (!global) break;
  }

  if (matches === 0) return { line, matches, ranges };
  return { line: nextLine + line.slice(cursor), matches, ranges };
}

type LineSubstitutionSuccess = {
  ok: true;
  line: string;
  matches: number;
  ranges: Array<{ start: number; end: number }>;
};

type LineSubstitutionResult = LineSubstitutionSuccess | { ok: false; message: string };

function substituteLineRange(
  text: string,
  options: SubstituteLineRangeOptions,
  substituteLine: (line: string) => LineSubstitutionResult,
): SubstituteLineRangeResult | { ok: false; message: string } {
  const lines = splitText(text);
  const startLine = Math.max(0, Math.min(options.range.startLine, lines.length - 1));
  const endLine = Math.max(0, Math.min(options.range.endLine, lines.length - 1));
  const nextLines = [...lines];
  let matches = 0;
  const ranges: TextRange[] = [];

  for (let lineIndex = startLine; lineIndex <= endLine; lineIndex++) {
    const result = substituteLine(nextLines[lineIndex] ?? "");
    if (!result.ok) return result;
    nextLines[lineIndex] = result.line;
    matches += result.matches;
    for (const range of result.ranges) {
      ranges.push({
        start: { line: lineIndex, col: range.start },
        end: { line: lineIndex, col: range.end },
      });
    }
  }

  const nextText = joinLines(nextLines);
  return {
    matches,
    ranges,
    edit: {
      text: nextText,
      cursor: clampPosition(nextLines, options.originalCursor),
      changed: nextText !== text,
    },
  };
}

export function substituteLineRangeLiteral(
  text: string,
  options: SubstituteLineRangeOptions,
): SubstituteLineRangeResult {
  const result = substituteLineRange(text, options, (line) => ({
    ok: true,
    ...substituteLineLiteral(
      line,
      options.pattern,
      options.replacement,
      options.global,
      options.ignoreCase,
    ),
  }));
  if ("ok" in result) throw new Error(result.message);
  return result;
}

export type SubstituteLineRangeRegexResult =
  | ({ ok: true } & SubstituteLineRangeResult)
  | { ok: false; message: string };

function substituteLineRegex(
  line: string,
  regex: RegExp,
  replacement: string,
  global: boolean,
): LineSubstitutionSuccess | { ok: false; message: string } {
  let nextLine = "";
  let cursor = 0;
  let matches = 0;
  const ranges: Array<{ start: number; end: number }> = [];
  regex.lastIndex = 0;

  while (cursor <= line.length) {
    regex.lastIndex = cursor;
    const match = regex.exec(line);
    if (!match) break;
    if (match[0].length === 0)
      return { ok: false, message: "Regex pattern cannot match empty text" };
    matches++;
    if (matches > REGEX_SEARCH_MATCH_MAX_COUNT)
      return { ok: false, message: "Regex match count exceeded" };
    ranges.push({ start: match.index, end: match.index + match[0].length - 1 });
    nextLine += line.slice(cursor, match.index) + replacement;
    cursor = match.index + match[0].length;
    if (!global) break;
  }

  if (matches === 0) return { ok: true, line, matches, ranges };
  return { ok: true, line: nextLine + line.slice(cursor), matches, ranges };
}

export function substituteLineRangeRegex(
  text: string,
  options: SubstituteLineRangeOptions,
): SubstituteLineRangeRegexResult {
  if (options.pattern.length === 0) return { ok: false, message: "Regex pattern cannot be empty" };
  if (options.pattern.length > REGEX_SEARCH_PATTERN_MAX_LENGTH)
    return { ok: false, message: "Regex pattern too long" };
  if (text.length > REGEX_SEARCH_SUBJECT_MAX_LENGTH)
    return { ok: false, message: "Regex subject too long" };

  let regex: RegExp;
  try {
    regex = new RegExp(options.pattern, options.ignoreCase ? "gi" : "g");
  } catch {
    return { ok: false, message: "Invalid regex pattern" };
  }

  const result = substituteLineRange(text, options, (line) =>
    substituteLineRegex(line, regex, options.replacement, options.global),
  );
  if ("ok" in result) return result;
  if (result.matches > REGEX_SEARCH_MATCH_MAX_COUNT)
    return { ok: false, message: "Regex match count exceeded" };
  return { ok: true, ...result };
}

export type ExLineEditResult =
  | { ok: true; edit: EditResult; lines: number }
  | { ok: false; message: string };

export type ExLineYankResult = { register: VimRegister; lines: number };

function clampLineRange(lines: string[], range: LineRange): LineRange {
  const last = Math.max(0, lines.length - 1);
  return {
    startLine: Math.max(0, Math.min(range.startLine, last)),
    endLine: Math.max(0, Math.min(range.endLine, last)),
  };
}

function lineCountForRange(range: LineRange): number {
  return range.endLine - range.startLine + 1;
}

export function deleteExLineRange(text: string, range: LineRange): ExLineEditResult {
  const lines = splitText(text);
  const safeRange = clampLineRange(lines, range);
  return {
    ok: true,
    edit: deleteLineRange(
      text,
      { line: safeRange.startLine, col: 0 },
      { line: safeRange.endLine, col: 0 },
    ),
    lines: lineCountForRange(safeRange),
  };
}

export function yankExLineRange(text: string, range: LineRange): ExLineYankResult {
  const lines = splitText(text);
  const safeRange = clampLineRange(lines, range);
  return {
    register: yankLineRange(
      text,
      { line: safeRange.startLine, col: 0 },
      { line: safeRange.endLine, col: 0 },
    ),
    lines: lineCountForRange(safeRange),
  };
}

export function putExRegisterAfterRange(
  text: string,
  range: LineRange,
  register: VimRegister | undefined,
): ExLineEditResult {
  if (!register || register.text.length === 0) return { ok: false, message: "Register is empty" };

  const lines = splitText(text);
  const safeRange = clampLineRange(lines, range);
  const inserted = register.text.split("\n");
  const insertAt = Math.min(lines.length, safeRange.endLine + 1);
  const nextLines = [...lines.slice(0, insertAt), ...inserted, ...lines.slice(insertAt)];
  const nextText = joinLines(nextLines);
  return {
    ok: true,
    lines: inserted.length,
    edit: {
      text: nextText,
      cursor: { line: insertAt, col: 0 },
      changed: nextText !== text,
    },
  };
}

export function copyExLineRange(
  text: string,
  range: LineRange,
  destination: number,
): ExLineEditResult {
  const lines = splitText(text);
  const safeRange = clampLineRange(lines, range);
  if (destination < -1 || destination >= lines.length)
    return { ok: false, message: "Invalid Ex destination" };

  const copied = lines.slice(safeRange.startLine, safeRange.endLine + 1);
  const insertAt = destination + 1;
  const nextLines = [...lines.slice(0, insertAt), ...copied, ...lines.slice(insertAt)];
  const nextText = joinLines(nextLines);
  return {
    ok: true,
    lines: copied.length,
    edit: {
      text: nextText,
      cursor: { line: insertAt, col: 0 },
      changed: nextText !== text,
    },
  };
}

export function moveExLineRange(
  text: string,
  range: LineRange,
  destination: number,
): ExLineEditResult {
  const lines = splitText(text);
  const safeRange = clampLineRange(lines, range);
  if (destination < -1 || destination >= lines.length)
    return { ok: false, message: "Invalid Ex destination" };
  if (destination >= safeRange.startLine && destination <= safeRange.endLine)
    return { ok: false, message: "Ex move destination overlaps range" };

  const moved = lines.slice(safeRange.startLine, safeRange.endLine + 1);
  const remaining = [...lines.slice(0, safeRange.startLine), ...lines.slice(safeRange.endLine + 1)];
  let insertAt = destination + 1;
  if (destination > safeRange.endLine) insertAt -= moved.length;
  const nextLines = [...remaining.slice(0, insertAt), ...moved, ...remaining.slice(insertAt)];
  const nextText = joinLines(nextLines);
  return {
    ok: true,
    lines: moved.length,
    edit: {
      text: nextText,
      cursor: { line: insertAt, col: 0 },
      changed: nextText !== text,
    },
  };
}

export function deleteResolvedLineRange(text: string, target: ResolvedLineRange): ExLineEditResult {
  return deleteExLineRange(text, target.range);
}

export function yankResolvedLineRange(text: string, target: ResolvedLineRange): ExLineYankResult {
  return yankExLineRange(text, target.range);
}

export function putRegisterAfterResolvedLineRange(
  text: string,
  target: ResolvedLineRange,
  register: VimRegister | undefined,
): ExLineEditResult {
  return putExRegisterAfterRange(text, target.range, register);
}

export function copyResolvedLineRange(
  text: string,
  target: ResolvedLineRange,
  destination: ResolvedDestination,
): ExLineEditResult {
  return copyExLineRange(text, target.range, destination.destination);
}

export function moveResolvedLineRange(
  text: string,
  target: ResolvedLineRange,
  destination: ResolvedDestination,
): ExLineEditResult {
  return moveExLineRange(text, target.range, destination.destination);
}

export function deleteResolvedCharacterRange(
  text: string,
  target: ResolvedCharacterRange,
): EditResult {
  return deleteRange(text, target.range.start, target.range.end);
}

export function yankResolvedCharacterRange(
  text: string,
  target: ResolvedCharacterRange,
): VimRegister {
  return { type: "char", text: selectionText(text, target.range.start, target.range.end) };
}

export function deleteResolvedBlockRange(text: string, target: ResolvedBlockRange): EditResult {
  return deleteBlockRange(
    text,
    { line: target.range.startLine, col: target.range.startCol },
    { line: target.range.endLine, col: target.range.endCol },
  );
}

function replaceLineRange(
  text: string,
  range: LineRange,
  replacement: readonly string[],
  cursor: Position,
): ExLineEditResult {
  const lines = splitText(text);
  const safeRange = clampLineRange(lines, range);
  const nextLines = [
    ...lines.slice(0, safeRange.startLine),
    ...replacement,
    ...lines.slice(safeRange.endLine + 1),
  ];
  const nextText = joinLines(nextLines.length === 0 ? [""] : nextLines);
  return {
    ok: true,
    lines: lineCountForRange(safeRange),
    edit: {
      text: nextText,
      cursor: clampPosition(splitText(nextText), cursor),
      changed: nextText !== text,
    },
  };
}

function dedentLine(line: string): string {
  if (line.startsWith("  ")) return line.slice(2);
  if (line.startsWith("\t")) return line.slice(1);
  if (line.startsWith(" ")) return line.slice(1);
  return line;
}

export type LineShiftAction = "indent" | "dedent";

function shiftLinesOnce(
  text: string,
  range: LineRange,
  action: LineShiftAction,
  originalCursor: Position,
): ExLineEditResult {
  const lines = splitText(text);
  const safeRange = clampLineRange(lines, range);
  const selected = lines.slice(safeRange.startLine, safeRange.endLine + 1);
  const replacement =
    action === "indent" ? selected.map((line) => `  ${line}`) : selected.map(dedentLine);
  return replaceLineRange(text, safeRange, replacement, originalCursor);
}

export function shiftLineRange(
  text: string,
  range: LineRange,
  action: LineShiftAction,
  originalCursor: Position,
  depth = 1,
): ExLineEditResult {
  let currentText = text;
  let currentResult: ExLineEditResult | undefined;
  let changed = false;
  for (let i = 0; i < Math.max(1, depth); i += 1) {
    currentResult = shiftLinesOnce(currentText, range, action, originalCursor);
    if (!currentResult.ok) return currentResult;
    changed ||= currentResult.edit.changed;
    currentText = currentResult.edit.text;
  }
  if (!currentResult?.ok) return shiftLinesOnce(text, range, action, originalCursor);
  return { ...currentResult, edit: { ...currentResult.edit, changed } };
}

export function shiftLinesFromCursor(
  text: string,
  cursor: Position,
  count: number,
  action: LineShiftAction,
): ExLineEditResult {
  const lines = splitText(text);
  const pos = clampPosition(lines, cursor);
  const endLine = Math.min(lines.length - 1, pos.line + Math.max(1, count) - 1);
  return shiftLineRange(text, { startLine: pos.line, endLine }, action, cursor);
}

export function joinExLineRange(
  text: string,
  range: LineRange,
  rangeExplicit: boolean,
): ExLineEditResult {
  const lines = splitText(text);
  const safeRange = rangeExplicit
    ? clampLineRange(lines, range)
    : clampLineRange(lines, {
        startLine: range.startLine,
        endLine: Math.min(lines.length - 1, range.startLine + 1),
      });
  const count = lineCountForRange(safeRange);
  if (count < 2) return { ok: false, message: "Not enough lines to join" };

  const [first = "", ...rest] = lines.slice(safeRange.startLine, safeRange.endLine + 1);
  let joined = first.trimEnd();
  for (const line of rest) {
    const right = line.trimStart();
    const separator = joined.length > 0 && right.length > 0 ? " " : "";
    joined = `${joined}${separator}${right}`;
  }
  const nextLines = [
    ...lines.slice(0, safeRange.startLine),
    joined,
    ...lines.slice(safeRange.endLine + 1),
  ];
  const nextText = joinLines(nextLines);
  return {
    ok: true,
    lines: count,
    edit: {
      text: nextText,
      cursor: {
        line: safeRange.startLine,
        col: Math.min((first ?? "").trimEnd().length, joined.length),
      },
      changed: nextText !== text,
    },
  };
}

export function exactMarkPosition(text: string, mark: Position): Position {
  return normalizeBufferPosition(text, mark);
}

export function lineMarkPosition(text: string, mark: Position): Position {
  return firstNonBlankPosition(text, mark);
}

export function deleteMarkRange(text: string, cursor: Position, mark: Position): EditResult {
  return deleteRange(text, cursor, mark);
}

export function yankMarkRange(
  text: string,
  cursor: Position,
  mark: Position,
): VimRegister | undefined {
  return yankVisualSelection(text, cursor, mark, "char");
}

export function deleteLineMarkRange(text: string, cursor: Position, mark: Position): EditResult {
  return deleteLineRange(text, cursor, mark);
}

export function yankLineMarkRange(text: string, cursor: Position, mark: Position): VimRegister {
  return yankLineRange(text, cursor, mark);
}

export function navigateBuffer(
  text: string,
  cursor: Position,
  target: "matchingPair",
): Position | undefined;
export function navigateBuffer(
  text: string,
  cursor: Position,
  target: Exclude<BufferNavigationTarget, "matchingPair">,
): Position;
export function navigateBuffer(
  text: string,
  cursor: Position,
  target: BufferNavigationTarget,
): Position | undefined;
export function navigateBuffer(
  text: string,
  cursor: Position,
  target: BufferNavigationTarget,
): Position | undefined {
  switch (target) {
    case "start":
      return bufferStartPosition();
    case "end":
      return bufferEndPosition(text);
    case "firstNonBlank":
      return firstNonBlankPosition(text, cursor);
    case "matchingPair":
      return matchingPairPosition(text, cursor);
  }
}

export function deleteRange(text: string, anchor: Position, active: Position): EditResult {
  const lines = splitText(text);
  const range = normalizeRange(lines, anchor, active);
  const selected = selectionText(text, range.start, range.end);
  if (selected.length === 0) {
    return { text, cursor: range.start, changed: false };
  }

  const { start, end } = range;
  let nextLines: string[];
  let cursor: Position;

  if (start.line === end.line) {
    const line = lines[start.line] ?? "";
    const endExclusive = Math.min(end.col + 1, line.length);
    const nextLine = line.slice(0, start.col) + line.slice(endExclusive);
    nextLines = [...lines.slice(0, start.line), nextLine, ...lines.slice(start.line + 1)];
    cursor = { line: start.line, col: Math.min(start.col, nextLine.length) };
  } else {
    const first = lines[start.line] ?? "";
    const last = lines[end.line] ?? "";
    const endExclusive = Math.min(end.col + 1, last.length);
    const merged = first.slice(0, start.col) + last.slice(endExclusive);
    nextLines = [...lines.slice(0, start.line), merged, ...lines.slice(end.line + 1)];
    cursor = { line: start.line, col: Math.min(start.col, merged.length) };
  }

  if (nextLines.length === 0) nextLines = [""];
  const nextText = joinLines(nextLines);
  return {
    text: nextText,
    cursor: clampPosition(nextLines, cursor),
    register: { type: "char", text: selected },
    changed: nextText !== text,
  };
}

export function insertBlockText(
  text: string,
  anchor: Position,
  active: Position,
  insertText: string,
  placement: "start" | "end",
  skipLine?: number,
): EditResult {
  if (insertText.length === 0) return { text, cursor: anchor, changed: false };

  const lines = splitText(text);
  const range = normalizeBlockRange(lines, anchor, active);
  const nextLines = [...lines];
  const col = placement === "start" ? range.startCol : range.endCol + 1;

  for (let lineIndex = range.startLine; lineIndex <= range.endLine; lineIndex++) {
    if (lineIndex === skipLine) continue;
    const line = nextLines[lineIndex] ?? "";
    const insertCol = Math.min(col, line.length);
    nextLines[lineIndex] = line.slice(0, insertCol) + insertText + line.slice(insertCol);
  }

  const nextText = joinLines(nextLines);
  return {
    text: nextText,
    cursor: clampPosition(nextLines, {
      line: range.startLine,
      col: Math.min(col + insertText.length, nextLines[range.startLine]?.length ?? 0),
    }),
    changed: nextText !== text,
  };
}

export function deleteBlockRange(text: string, anchor: Position, active: Position): EditResult {
  const lines = splitText(text);
  const range = normalizeBlockRange(lines, anchor, active);
  const selected = blockSelectionText(text, anchor, active);
  const nextLines = [...lines];

  for (let lineIndex = range.startLine; lineIndex <= range.endLine; lineIndex++) {
    const line = nextLines[lineIndex] ?? "";
    const start = Math.min(range.startCol, line.length);
    const end = Math.min(range.endCol + 1, line.length);
    nextLines[lineIndex] = line.slice(0, start) + line.slice(end);
  }

  const nextText = joinLines(nextLines);
  const cursor = clampPosition(nextLines, { line: range.startLine, col: range.startCol });
  return {
    text: nextText,
    cursor,
    register: selected.length > 0 ? { type: "char", text: selected } : undefined,
    changed: nextText !== text,
  };
}

export function deleteLineRange(text: string, anchor: Position, active: Position): EditResult {
  const lines = splitText(text);
  const range = normalizeLineRange(lines, anchor, active);
  const selected = linewiseSelectionText(text, anchor, active);

  if (lines.length === 1) {
    return {
      text: "",
      cursor: { line: 0, col: 0 },
      register: { type: "line", text: selected },
      changed: text !== "",
    };
  }

  let nextLines = [...lines.slice(0, range.startLine), ...lines.slice(range.endLine + 1)];
  if (nextLines.length === 0) nextLines = [""];
  const cursorLine = Math.min(range.startLine, nextLines.length - 1);
  const nextText = joinLines(nextLines);
  return {
    text: nextText,
    cursor: { line: cursorLine, col: 0 },
    register: { type: "line", text: selected },
    changed: nextText !== text,
  };
}

function replaceVisualLines(
  lines: string[],
  anchor: Position,
  active: Position,
  char: string,
): EditResult {
  const range = normalizeLineRange(lines, anchor, active);
  const selected = linewiseSelectionText(joinLines(lines), anchor, active);
  const nextLines = lines.map((line, index) =>
    index >= range.startLine && index <= range.endLine ? char.repeat(line.length) : line,
  );
  const text = joinLines(nextLines);
  return {
    text,
    cursor: { line: range.startLine, col: 0 },
    register: { type: "line", text: selected },
    changed: text !== joinLines(lines),
  };
}

function replaceVisualBlock(
  lines: string[],
  text: string,
  anchor: Position,
  active: Position,
  char: string,
): EditResult {
  const range = normalizeBlockRange(lines, anchor, active);
  const selected = blockSelectionText(text, anchor, active);
  const nextLines = lines.map((line, index) => {
    if (index < range.startLine || index > range.endLine) return line;
    const start = Math.min(range.startCol, line.length);
    const end = Math.min(range.endCol + 1, line.length);
    return line.slice(0, start) + char.repeat(end - start) + line.slice(end);
  });
  const nextText = joinLines(nextLines);
  return {
    text: nextText,
    cursor: clampPosition(nextLines, { line: range.startLine, col: range.startCol }),
    register: selected ? { type: "char", text: selected } : undefined,
    changed: nextText !== text,
  };
}

function replaceVisualChars(
  lines: string[],
  text: string,
  anchor: Position,
  active: Position,
  char: string,
): EditResult {
  const range = normalizeRange(lines, anchor, active);
  const selected = selectionText(text, range.start, range.end);
  const nextLines = lines.map((line, index) => {
    if (index < range.start.line || index > range.end.line) return line;
    const start = index === range.start.line ? Math.min(range.start.col, line.length) : 0;
    const end = index === range.end.line ? Math.min(range.end.col + 1, line.length) : line.length;
    return line.slice(0, start) + char.repeat(end - start) + line.slice(end);
  });
  const nextText = joinLines(nextLines);
  return {
    text: nextText,
    cursor: clampPosition(nextLines, range.start),
    register: selected ? { type: "char", text: selected } : undefined,
    changed: nextText !== text,
  };
}

export function replaceVisualRangeChars(
  text: string,
  anchor: Position,
  active: Position,
  kind: "char" | "line" | "block",
  char: string,
): EditResult {
  if (!char || char === "\n")
    return { text, cursor: normalizeBufferPosition(text, anchor), changed: false };
  const lines = splitText(text);
  if (kind === "line") return replaceVisualLines(lines, anchor, active, char);
  if (kind === "block") return replaceVisualBlock(lines, text, anchor, active, char);
  return replaceVisualChars(lines, text, anchor, active, char);
}
export function replaceLineRangeWithRegister(
  text: string,
  anchor: Position,
  active: Position,
  register: VimRegister | undefined,
): EditResult {
  const lines = splitText(text);
  const range = normalizeLineRange(lines, anchor, active);
  const selected = linewiseSelectionText(text, anchor, active);
  if (!register || register.text.length === 0) {
    return {
      text,
      cursor: { line: range.startLine, col: 0 },
      changed: false,
    };
  }

  const inserted = register.text.split("\n");
  let nextLines = [
    ...lines.slice(0, range.startLine),
    ...inserted,
    ...lines.slice(range.endLine + 1),
  ];
  if (nextLines.length === 0) nextLines = [""];

  const nextText = joinLines(nextLines);
  return {
    text: nextText,
    cursor: { line: range.startLine, col: 0 },
    register: { type: "line", text: selected },
    changed: nextText !== text,
  };
}

export function deleteCharAt(text: string, cursor: Position, count = 1): EditResult {
  const lines = splitText(text);
  const pos = clampPosition(lines, cursor);
  const line = lines[pos.line] ?? "";
  if (pos.col >= line.length) {
    return { text, cursor: pos, changed: false };
  }
  const endCol = Math.min(line.length - 1, pos.col + Math.max(1, count) - 1);
  return deleteRange(text, pos, { line: pos.line, col: endCol });
}

export function deleteCharBefore(text: string, cursor: Position, count = 1): EditResult {
  const lines = splitText(text);
  const pos = clampPosition(lines, cursor);
  if (pos.col <= 0) return { text, cursor: pos, changed: false };
  const startCol = Math.max(0, pos.col - Math.max(1, count));
  return deleteRange(text, { line: pos.line, col: startCol }, { line: pos.line, col: pos.col - 1 });
}

export function replaceCharAt(text: string, cursor: Position, char: string, count = 1): EditResult {
  const lines = splitText(text);
  const pos = clampPosition(lines, cursor);
  const line = lines[pos.line] ?? "";
  if (pos.col >= line.length || char.length === 0 || char === "\n") {
    return { text, cursor: pos, changed: false };
  }
  const length = Math.min(Math.max(1, count), line.length - pos.col);
  const nextLine = line.slice(0, pos.col) + char.repeat(length) + line.slice(pos.col + length);
  const nextLines = [...lines];
  nextLines[pos.line] = nextLine;
  const nextText = joinLines(nextLines);
  return {
    text: nextText,
    cursor: pos,
    register: { type: "char", text: line.slice(pos.col, pos.col + length) },
    changed: nextText !== text,
  };
}

export function substituteCharAt(text: string, cursor: Position, count = 1): EditResult {
  return deleteCharAt(text, cursor, count);
}

function toggleCaseChar(char: string): string {
  const upper = char.toUpperCase();
  const lower = char.toLowerCase();
  const toggled =
    char === lower && char !== upper ? upper : char === upper && char !== lower ? lower : char;
  return oneCodePointOrOriginal(char, toggled);
}

function oneCodePointOrOriginal(original: string, transformed: string): string {
  return Array.from(transformed).length === 1 ? transformed : original;
}

export type CaseTransformAction = "lowercase" | "uppercase" | "toggleCase";

function transformCaseChar(char: string, action: CaseTransformAction): string {
  if (action === "lowercase") return oneCodePointOrOriginal(char, char.toLowerCase());
  if (action === "uppercase") return oneCodePointOrOriginal(char, char.toUpperCase());
  return toggleCaseChar(char);
}

function transformCaseText(text: string, action: CaseTransformAction): string {
  return [...text].map((char) => transformCaseChar(char, action)).join("");
}

function codePointSpans(line: string): Array<{ start: number; end: number }> {
  const spans: Array<{ start: number; end: number }> = [];
  let offset = 0;
  for (const char of line) {
    const start = offset;
    offset += char.length;
    spans.push({ start, end: offset });
  }
  return spans;
}

export function toggleCaseAt(text: string, cursor: Position, count = 1): EditResult {
  const lines = splitText(text);
  const pos = clampPosition(lines, cursor);
  const line = lines[pos.line] ?? "";
  if (pos.col >= line.length) return { text, cursor: pos, changed: false };

  const spans = codePointSpans(line);
  const startIndex = spans.findIndex((span) => pos.col >= span.start && pos.col < span.end);
  if (startIndex < 0) return { text, cursor: pos, changed: false };
  const selected = spans.slice(startIndex, startIndex + Math.max(1, count));
  const end = selected.at(-1)?.end ?? spans[startIndex]?.end ?? pos.col;
  const start = spans[startIndex]?.start ?? pos.col;
  const target = line.slice(start, end);
  const toggled = transformCaseText(target, "toggleCase");
  const nextLine = line.slice(0, start) + toggled + line.slice(end);
  const nextLines = [...lines];
  nextLines[pos.line] = nextLine;
  const nextText = joinLines(nextLines);
  const nextCursorCol = start + toggled.length - (Array.from(toggled).at(-1)?.length ?? 1);
  return {
    text: nextText,
    cursor: { line: pos.line, col: nextCursorCol },
    changed: nextText !== text,
  };
}

export function transformCaseVisualRange(
  text: string,
  anchor: Position,
  active: Position,
  kind: "char" | "line" | "block",
  action: CaseTransformAction,
): EditResult {
  const lines = splitText(text);

  if (kind === "line") {
    const range = normalizeLineRange(lines, anchor, active);
    const nextLines = [...lines];
    for (let lineIndex = range.startLine; lineIndex <= range.endLine; lineIndex++) {
      nextLines[lineIndex] = transformCaseText(nextLines[lineIndex] ?? "", action);
    }
    const nextText = joinLines(nextLines);
    return {
      text: nextText,
      cursor: { line: range.startLine, col: 0 },
      changed: nextText !== text,
    };
  }

  if (kind === "block") {
    const range = normalizeBlockRange(lines, anchor, active);
    const nextLines = [...lines];
    for (let lineIndex = range.startLine; lineIndex <= range.endLine; lineIndex++) {
      const line = nextLines[lineIndex] ?? "";
      const start = Math.min(range.startCol, line.length);
      const end = Math.min(range.endCol + 1, line.length);
      nextLines[lineIndex] =
        line.slice(0, start) + transformCaseText(line.slice(start, end), action) + line.slice(end);
    }
    const nextText = joinLines(nextLines);
    return {
      text: nextText,
      cursor: clampPosition(nextLines, { line: range.startLine, col: range.startCol }),
      changed: nextText !== text,
    };
  }

  const range = normalizeRange(lines, anchor, active);
  const nextLines = [...lines];
  for (let lineIndex = range.start.line; lineIndex <= range.end.line; lineIndex++) {
    const line = nextLines[lineIndex] ?? "";
    const start = lineIndex === range.start.line ? Math.min(range.start.col, line.length) : 0;
    const end =
      lineIndex === range.end.line ? Math.min(range.end.col + 1, line.length) : line.length;
    nextLines[lineIndex] =
      line.slice(0, start) + transformCaseText(line.slice(start, end), action) + line.slice(end);
  }
  const nextText = joinLines(nextLines);
  return {
    text: nextText,
    cursor: clampPosition(nextLines, range.start),
    changed: nextText !== text,
  };
}

export function toggleCaseVisualRange(
  text: string,
  anchor: Position,
  active: Position,
  kind: "char" | "line" | "block",
): EditResult {
  return transformCaseVisualRange(text, anchor, active, kind, "toggleCase");
}

export function transformCaseLineCount(
  text: string,
  cursor: Position,
  count: number,
  action: CaseTransformAction,
): EditResult {
  const lines = splitText(text);
  const pos = clampPosition(lines, cursor);
  const endLine = Math.min(lines.length - 1, pos.line + Math.max(1, count) - 1);
  return transformCaseVisualRange(
    text,
    { line: pos.line, col: 0 },
    { line: endLine, col: 0 },
    "line",
    action,
  );
}

export function transformCaseByMotion(
  text: string,
  cursor: Position,
  motion: VimMotion,
  count: number,
  action: CaseTransformAction,
): EditResult {
  const lineRange = motionLineRange(text, cursor, motion, count);
  if (lineRange) {
    return transformCaseVisualRange(
      text,
      { line: lineRange.startLine, col: 0 },
      { line: lineRange.endLine, col: 0 },
      "line",
      action,
    );
  }
  const range = motionOffsetRange(text, cursor, motion, count);
  if (!range) return { text, cursor: clampPosition(splitText(text), cursor), changed: false };
  return transformCaseOffsetRange(text, range.start, range.end, action);
}

export function adjustNumberAtOrAfterCursor(
  text: string,
  cursor: Position,
  delta: number,
): EditResult {
  const lines = splitText(text);
  const pos = clampPosition(lines, cursor);
  const line = lines[pos.line] ?? "";
  const search = line.slice(pos.col);
  const match = /[+-]?\d+/.exec(search);
  if (!match || match.index === undefined) return { text, cursor: pos, changed: false };
  const startCol = pos.col + match.index;
  const raw = match[0] ?? "";
  const nextNumber = String(Number.parseInt(raw, 10) + delta);
  const nextLine = line.slice(0, startCol) + nextNumber + line.slice(startCol + raw.length);
  const nextLines = [...lines];
  nextLines[pos.line] = nextLine;
  const nextText = joinLines(nextLines);
  return { text: nextText, cursor: { line: pos.line, col: startCol }, changed: nextText !== text };
}

export type CharSearchKind = "findForward" | "findBackward" | "tillForward" | "tillBackward";
export type SearchDirection = "forward" | "backward";

export function findSearchHighlightRanges(
  text: string,
  query: string,
  maxRanges = Number.POSITIVE_INFINITY,
): TextRange[] {
  if (query.length === 0 || query.includes("\n") || maxRanges <= 0) return [];
  const lines = splitText(text);
  const starts = lineStartOffsets(lines);
  const toPosition = (target: number) =>
    offsetToPositionFromLineStarts(lines, starts, target, text.length);
  const ranges: TextRange[] = [];
  let offset = 0;
  while (ranges.length < maxRanges) {
    const match = text.indexOf(query, offset);
    if (match < 0) break;
    const end = Math.max(match, Math.min(text.length, match + query.length) - 1);
    ranges.push({ start: toPosition(match), end: toPosition(end) });
    offset = match + query.length;
  }
  return ranges;
}

export type SearchMatcher =
  | { mode: "literal"; query: string }
  | { mode: "regex"; query: string; regex: RegExp };

export type SearchMatch = { position: Position; length: number };

export const REGEX_SEARCH_PATTERN_MAX_LENGTH = 256;
export const REGEX_SEARCH_SUBJECT_MAX_LENGTH = 50_000;
export const REGEX_SEARCH_MATCH_MAX_COUNT = 10_000;

export function compileRegexSearchMatcher(
  query: string,
): { ok: true; matcher: SearchMatcher } | { ok: false; message: string } {
  if (query.length > REGEX_SEARCH_PATTERN_MAX_LENGTH)
    return { ok: false, message: "Regex pattern too long" };
  try {
    const regex = new RegExp(query, "g");
    if (regex.exec("")?.[0] === "")
      return { ok: false, message: "Regex pattern cannot match empty text" };
    return { ok: true, matcher: { mode: "regex", query, regex } };
  } catch {
    return { ok: false, message: "Invalid regex pattern" };
  }
}

export function findSearchMatch(
  text: string,
  cursor: Position,
  query: string,
  direction: SearchDirection = "forward",
): Position | undefined {
  return findSearchMatchWithMatcher(text, cursor, { mode: "literal", query }, direction)?.position;
}

export function wordUnderCursor(text: string, cursor: Position): string | undefined {
  const offset = positionToOffset(text, cursor);
  const at = text[offset];
  if (isKeywordWordChar(at)) {
    let start = offset;
    let end = offset + 1;
    while (start > 0 && isKeywordWordChar(text[start - 1])) start--;
    while (end < text.length && isKeywordWordChar(text[end])) end++;
    return text.slice(start, end);
  }
  const before = text[offset - 1];
  if (isKeywordWordChar(before)) {
    let start = offset - 1;
    while (start > 0 && isKeywordWordChar(text[start - 1])) start--;
    return text.slice(start, offset);
  }
  return undefined;
}

export function findSearchMatchWithMatcher(
  text: string,
  cursor: Position,
  matcher: SearchMatcher,
  direction: SearchDirection = "forward",
): SearchMatch | undefined {
  if (matcher.query.length === 0 || matcher.query.includes("\n")) return undefined;
  if (matcher.mode === "literal")
    return findLiteralSearchMatch(text, cursor, matcher.query, direction);
  if (text.length > REGEX_SEARCH_SUBJECT_MAX_LENGTH) return undefined;
  return findRegexSearchMatch(text, cursor, matcher.regex, direction);
}

function findLiteralSearchMatch(
  text: string,
  cursor: Position,
  query: string,
  direction: SearchDirection,
): SearchMatch | undefined {
  const start = positionToOffset(text, cursor);
  if (direction === "forward") {
    const later = text.indexOf(query, Math.min(text.length, start + 1));
    if (later >= 0) return { position: offsetToPosition(text, later), length: query.length };
    const wrapped = text.indexOf(query, 0);
    return wrapped >= 0
      ? { position: offsetToPosition(text, wrapped), length: query.length }
      : undefined;
  }

  const earlier = start > 0 ? text.lastIndexOf(query, start - 1) : -1;
  if (earlier >= 0) return { position: offsetToPosition(text, earlier), length: query.length };
  const wrapped = text.lastIndexOf(query);
  return wrapped >= 0
    ? { position: offsetToPosition(text, wrapped), length: query.length }
    : undefined;
}

function regexMatches(
  text: string,
  regex: RegExp,
): { offset: number; length: number }[] | undefined {
  const matches: { offset: number; length: number }[] = [];
  regex.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match[0].length === 0) return undefined;
    matches.push({ offset: match.index, length: match[0].length });
    if (matches.length > REGEX_SEARCH_MATCH_MAX_COUNT) return undefined;
  }
  return matches;
}

function findRegexSearchMatch(
  text: string,
  cursor: Position,
  regex: RegExp,
  direction: SearchDirection,
): SearchMatch | undefined {
  const matches = regexMatches(text, regex);
  if (!matches || matches.length === 0) return undefined;
  const start = positionToOffset(text, cursor);
  const found =
    direction === "forward"
      ? (matches.find((match) => match.offset > start) ?? matches[0])
      : (matches.findLast((match) => match.offset < start) ?? matches.at(-1));
  return found
    ? { position: offsetToPosition(text, found.offset), length: found.length }
    : undefined;
}

function searchRangeEnd(text: string, target: Position, length: number): Position {
  const targetOffset = positionToOffset(text, target);
  const endOffset = Math.max(targetOffset, Math.min(text.length, targetOffset + length) - 1);
  return offsetToPosition(text, endOffset);
}

export function deleteSearchMatchRange(
  text: string,
  cursor: Position,
  match: SearchMatch,
): EditResult {
  const active =
    comparePositions(cursor, match.position) <= 0
      ? searchRangeEnd(text, match.position, match.length)
      : match.position;
  return deleteRange(text, cursor, active);
}

export function yankSearchMatchRange(
  text: string,
  cursor: Position,
  match: SearchMatch,
): VimRegister | undefined {
  const active =
    comparePositions(cursor, match.position) <= 0
      ? searchRangeEnd(text, match.position, match.length)
      : match.position;
  return yankVisualSelection(text, cursor, active, "char");
}

export function deleteSearchRange(
  text: string,
  cursor: Position,
  target: Position,
  query: string,
): EditResult {
  return deleteSearchMatchRange(text, cursor, { position: target, length: query.length });
}

export function yankSearchRange(
  text: string,
  cursor: Position,
  target: Position,
  query: string,
): VimRegister | undefined {
  return yankSearchMatchRange(text, cursor, { position: target, length: query.length });
}

export function findCharOnLine(
  text: string,
  cursor: Position,
  kind: CharSearchKind,
  target: string,
  count = 1,
): Position | undefined {
  const lines = splitText(text);
  const pos = clampPosition(lines, cursor);
  const found = charSearchMatchColumn(lines[pos.line] ?? "", pos.col, kind, target, count);
  if (found === undefined) return undefined;
  const offset = kind === "tillForward" ? -1 : kind === "tillBackward" ? 1 : 0;
  return {
    line: pos.line,
    col: Math.max(0, Math.min((lines[pos.line] ?? "").length, found + offset)),
  };
}
function charSearchMatchColumn(
  line: string,
  cursorCol: number,
  kind: CharSearchKind,
  target: string,
  count = 1,
): number | undefined {
  if (target.length !== 1 || target === "\n") return undefined;
  const forward = kind === "findForward" || kind === "tillForward";
  let remaining = Math.max(1, count);
  if (forward) {
    for (let index = cursorCol + 1; index < line.length; index++) {
      if (line[index] === target && --remaining === 0) return index;
    }
    return undefined;
  }
  for (let index = cursorCol - 1; index >= 0; index--) {
    if (line[index] === target && --remaining === 0) return index;
  }
  return undefined;
}

function charSearchOperatorOffsetRange(
  text: string,
  cursor: Position,
  kind: CharSearchKind,
  target: string,
  count = 1,
  searchCursorOffset = 0,
): { start: number; end: number; cursor: Position } | undefined {
  const lines = splitText(text);
  const pos = clampPosition(lines, cursor);
  const bounds = lineBoundsForPosition(text, pos);
  const found = charSearchMatchColumn(
    bounds.line,
    pos.col + searchCursorOffset,
    kind,
    target,
    count,
  );
  if (found === undefined) return undefined;

  // Vim: `f`/`t` are inclusive (`dt,` before an adjacent `,` removes the cursor
  // character); `F`/`T` are exclusive and keep it.
  const range =
    kind === "findForward"
      ? { start: pos.col, end: found + 1 }
      : kind === "tillForward"
        ? { start: pos.col, end: found }
        : kind === "findBackward"
          ? { start: found, end: pos.col }
          : { start: found + 1, end: pos.col };
  if (range.end <= range.start) return undefined;
  return { start: bounds.start + range.start, end: bounds.start + range.end, cursor: pos };
}

export function deleteByCharSearch(
  text: string,
  cursor: Position,
  kind: CharSearchKind,
  target: string,
  count = 1,
  searchCursorOffset = 0,
): EditResult {
  const range = charSearchOperatorOffsetRange(
    text,
    cursor,
    kind,
    target,
    count,
    searchCursorOffset,
  );
  if (!range) return { text, cursor: clampPosition(splitText(text), cursor), changed: false };
  return deleteOffsetRange(text, range.start, range.end);
}

export function yankByCharSearch(
  text: string,
  cursor: Position,
  kind: CharSearchKind,
  target: string,
  count = 1,
  searchCursorOffset = 0,
): VimRegister | undefined {
  const range = charSearchOperatorOffsetRange(
    text,
    cursor,
    kind,
    target,
    count,
    searchCursorOffset,
  );
  if (!range) return undefined;
  const selected = text.slice(range.start, range.end);
  return selected.length > 0 ? { type: "char", text: selected } : undefined;
}

function countedWordPosition(
  text: string,
  cursor: Position,
  count: number,
  nextOffset: (text: string, offset: number) => number,
): Position {
  let offset = positionToOffset(text, cursor);
  for (let index = 0; index < Math.max(1, count); index++) {
    const next = nextOffset(text, offset);
    if (next === offset) break;
    offset = next;
  }
  return offsetToPosition(text, offset);
}

export function wordForwardPosition(text: string, cursor: Position, count = 1): Position {
  return countedWordPosition(text, cursor, count, nextWordStartOffset);
}

export function wordBackwardPosition(text: string, cursor: Position, count = 1): Position {
  return countedWordPosition(text, cursor, count, previousWordStartOffset);
}

export function wordEndPosition(text: string, cursor: Position, count = 1): Position {
  return countedWordPosition(text, cursor, count, wordEndOffset);
}

export function wordForwardBigPosition(text: string, cursor: Position, count = 1): Position {
  return countedWordPosition(text, cursor, count, nextWORDStartOffset);
}

export function wordBackwardBigPosition(text: string, cursor: Position, count = 1): Position {
  return countedWordPosition(text, cursor, count, previousWORDStartOffset);
}

export function wordEndBigPosition(text: string, cursor: Position, count = 1): Position {
  return countedWordPosition(text, cursor, count, wordEndWORDOffset);
}

export function wordPreviousEndPosition(text: string, cursor: Position, count = 1): Position {
  return countedWordPosition(text, cursor, count, previousWordEndOffset);
}

export function wordPreviousEndBigPosition(text: string, cursor: Position, count = 1): Position {
  return countedWordPosition(text, cursor, count, previousWordEndWORDOffset);
}

function isBlankLine(line: string): boolean {
  return line.trim().length === 0;
}

function paragraphRunStart(lines: string[], line: number): number {
  let start = line;
  while (start > 0 && !isBlankLine(lines[start - 1]!)) start--;
  return start;
}

function paragraphRunEnd(lines: string[], line: number): number {
  let end = line;
  while (end < lines.length - 1 && !isBlankLine(lines[end + 1]!)) end++;
  return end;
}

function promptEndPosition(lines: string[]): Position {
  const line = Math.max(0, lines.length - 1);
  return { line, col: lines[line]?.length ?? 0 };
}

function paragraphForwardStep(lines: string[], pos: Position): Position {
  const lastLine = lines.length - 1;
  let index = pos.line;
  if (!isBlankLine(lines[index]!)) {
    index = paragraphRunEnd(lines, index) + 1;
  }
  while (index <= lastLine && isBlankLine(lines[index]!)) index++;
  if (index > lastLine) return promptEndPosition(lines);
  return { line: index, col: 0 };
}

function paragraphBackwardStep(lines: string[], pos: Position): Position {
  if (!isBlankLine(lines[pos.line]!)) {
    const runStart = paragraphRunStart(lines, pos.line);
    if (pos.line > runStart || pos.col > 0) return { line: runStart, col: 0 };
    let index = runStart - 1;
    while (index >= 0 && isBlankLine(lines[index]!)) index--;
    if (index < 0) return { line: 0, col: 0 };
    return { line: paragraphRunStart(lines, index), col: 0 };
  }
  let index = pos.line - 1;
  while (index >= 0 && isBlankLine(lines[index]!)) index--;
  if (index < 0) return { line: 0, col: 0 };
  return { line: paragraphRunStart(lines, index), col: 0 };
}

function countedParagraphPosition(
  text: string,
  cursor: Position,
  count: number,
  step: (lines: string[], pos: Position) => Position,
): Position {
  const lines = splitText(text);
  let pos = clampPosition(lines, cursor);
  const repetitions = Math.max(1, count);
  for (let index = 0; index < repetitions; index++) {
    const next = step(lines, pos);
    if (comparePositions(next, pos) === 0) break;
    pos = next;
  }
  return pos;
}

export function paragraphForwardPosition(text: string, cursor: Position, count = 1): Position {
  return countedParagraphPosition(text, cursor, count, paragraphForwardStep);
}

export function paragraphBackwardPosition(text: string, cursor: Position, count = 1): Position {
  return countedParagraphPosition(text, cursor, count, paragraphBackwardStep);
}

/** Offset range `[start, end)` of one sentence, from its first character through its closers. */
type SentenceSpan = { start: number; end: number };

/** A nonblank line run as offsets `[start, end)`, with its sentences. */
type SentenceParagraph = { start: number; end: number; endLine: number; spans: SentenceSpan[] };

const SENTENCE_TERMINATORS = ".!?";
const SENTENCE_CLOSERS = ")]\"'";

function isSentenceSpace(char: string | undefined): boolean {
  return char === undefined || char === " " || char === "\t" || char === "\n";
}

/**
 * Sentences in `[start, end)` per `:help sentence`: a sentence ends at `.`,
 * `!`, or `?`, then any closers, then a blank or the end of the line.
 */
function paragraphSentences(text: string, start: number, end: number): SentenceSpan[] {
  const spans: SentenceSpan[] = [];
  let open: number | undefined;
  let lastNonBlank = start;
  for (let index = start; index < end; index++) {
    const char = text[index]!;
    if (isSentenceSpace(char)) continue;
    open ??= index;
    lastNonBlank = index + 1;
    if (!SENTENCE_TERMINATORS.includes(char)) continue;
    let after = index + 1;
    while (after < end && SENTENCE_CLOSERS.includes(text[after]!)) after++;
    if (after < end && !isSentenceSpace(text[after])) continue;
    spans.push({ start: open, end: after });
    open = undefined;
    index = after - 1;
  }
  if (open !== undefined) spans.push({ start: open, end: lastNonBlank });
  return spans;
}

function sentenceParagraph(
  text: string,
  lines: string[],
  starts: number[],
  line: number,
): SentenceParagraph {
  const runStart = paragraphRunStart(lines, line);
  const endLine = paragraphRunEnd(lines, line);
  const start = starts[runStart]!;
  const end = starts[endLine]! + lines[endLine]!.length;
  return { start, end, endLine, spans: paragraphSentences(text, start, end) };
}

/** Sentence starts in prompt order, including the first line of each blank run after a paragraph. */
function sentenceStarts(text: string): number[] {
  const lines = splitText(text);
  const starts = lineStartOffsets(lines);
  const result: number[] = [];
  let line = 0;
  while (line < lines.length) {
    if (isBlankLine(lines[line]!)) {
      line++;
      continue;
    }
    const paragraph = sentenceParagraph(text, lines, starts, line);
    for (const span of paragraph.spans) result.push(span.start);
    line = paragraph.endLine + 1;
    if (line < lines.length) result.push(starts[line]!);
  }
  return result;
}

function sentenceTargetOffset(
  text: string,
  offset: number,
  direction: "forward" | "backward",
  count: number,
): number {
  const starts = sentenceStarts(text);
  let target = offset;
  for (let index = 0; index < Math.max(1, count); index++) {
    const next =
      direction === "forward"
        ? (starts.find((start) => start > target) ?? text.length)
        : (starts.findLast((start) => start < target) ?? 0);
    if (next === target) break;
    target = next;
  }
  return target;
}

export function sentenceForwardPosition(text: string, cursor: Position, count = 1): Position {
  const offset = sentenceTargetOffset(text, positionToOffset(text, cursor), "forward", count);
  return offsetToPosition(text, offset);
}

export function sentenceBackwardPosition(text: string, cursor: Position, count = 1): Position {
  const offset = sentenceTargetOffset(text, positionToOffset(text, cursor), "backward", count);
  return offsetToPosition(text, offset);
}

export function deleteByMotion(
  text: string,
  cursor: Position,
  motion: VimMotion,
  count = 1,
): EditResult {
  const lineRange = motionLineRange(text, cursor, motion, count);
  if (lineRange) {
    return deleteLineRange(
      text,
      { line: lineRange.startLine, col: 0 },
      { line: lineRange.endLine, col: 0 },
    );
  }
  const range = motionOffsetRange(text, cursor, motion, count);
  if (!range) return { text, cursor: clampPosition(splitText(text), cursor), changed: false };
  return deleteOffsetRange(text, range.start, range.end);
}

export function yankByMotion(
  text: string,
  cursor: Position,
  motion: VimMotion,
  count = 1,
): VimRegister | undefined {
  const lineRange = motionLineRange(text, cursor, motion, count);
  if (lineRange) {
    return yankLineRange(
      text,
      { line: lineRange.startLine, col: 0 },
      { line: lineRange.endLine, col: 0 },
    );
  }
  const range = motionOffsetRange(text, cursor, motion, count);
  if (!range) return undefined;
  const selected = text.slice(range.start, range.end);
  if (selected.length === 0) return undefined;
  return { type: "char", text: selected };
}

export function yankLine(text: string, cursor: Position): VimRegister {
  const lines = splitText(text);
  const pos = clampPosition(lines, cursor);
  return { type: "line", text: lines[pos.line] ?? "" };
}

export function yankLineRange(text: string, anchor: Position, active: Position): VimRegister {
  return { type: "line", text: linewiseSelectionText(text, anchor, active) };
}

export function yankVisualSelection(
  text: string,
  anchor: Position,
  active: Position,
  kind: VisualSelectionKind,
): VimRegister | undefined {
  if (kind === "line") return yankLineRange(text, anchor, active);

  const selected =
    kind === "block"
      ? blockSelectionText(text, anchor, active)
      : selectionText(text, anchor, active);
  return selected.length > 0 ? { type: "char", text: selected } : undefined;
}

export function deleteLine(text: string, cursor: Position, count = 1): EditResult {
  const lines = splitText(text);
  const pos = clampPosition(lines, cursor);
  const endLine = Math.min(lines.length - 1, pos.line + Math.max(1, count) - 1);
  return deleteLineRange(text, pos, { line: endLine, col: 0 });
}

export function changeLine(text: string, cursor: Position, count = 1): EditResult {
  const lines = splitText(text);
  const pos = clampPosition(lines, cursor);
  const endLine = Math.min(lines.length - 1, pos.line + Math.max(1, count) - 1);
  const removed = lines.slice(pos.line, endLine + 1).join("\n");
  const nextLines = [...lines.slice(0, pos.line), "", ...lines.slice(endLine + 1)];
  const nextText = joinLines(nextLines);
  return {
    text: nextText,
    cursor: { line: pos.line, col: 0 },
    register: { type: "line", text: removed },
    changed: nextText !== text,
  };
}

export function yankLineCount(text: string, cursor: Position, count = 1): VimRegister {
  const lines = splitText(text);
  const pos = clampPosition(lines, cursor);
  const endLine = Math.min(lines.length - 1, pos.line + Math.max(1, count) - 1);
  return { type: "line", text: lines.slice(pos.line, endLine + 1).join("\n") };
}

export function insertWordBackwardPosition(text: string, cursor: Position): Position {
  return wordBackwardPosition(text, cursor);
}

export function insertWordForwardPosition(text: string, cursor: Position): Position {
  return wordForwardPosition(text, cursor);
}

export function insertLineStartPosition(text: string, cursor: Position): Position {
  const lines = splitText(text);
  const pos = clampPosition(lines, cursor);
  return { line: pos.line, col: 0 };
}

export function insertLineEndPosition(text: string, cursor: Position): Position {
  const lines = splitText(text);
  const pos = clampPosition(lines, cursor);
  return { line: pos.line, col: lines[pos.line]?.length ?? 0 };
}

export function insertDeleteWordBackward(text: string, cursor: Position): EditResult {
  const lines = splitText(text);
  const pos = clampPosition(lines, cursor);
  const start = wordBackwardPosition(text, pos);
  if (comparePositions(start, pos) === 0) return { text, cursor: pos, changed: false };
  const startOffset = positionToOffset(text, start);
  const endOffset = positionToOffset(text, pos);
  const nextText = text.slice(0, startOffset) + text.slice(endOffset);
  const nextLines = splitText(nextText);
  return { text: nextText, cursor: clampPosition(nextLines, start), changed: nextText !== text };
}

export function insertDeleteWordForward(text: string, cursor: Position): EditResult {
  const lines = splitText(text);
  const pos = clampPosition(lines, cursor);
  const target = wordForwardPosition(text, pos);
  if (comparePositions(target, pos) === 0) return { text, cursor: pos, changed: false };
  const startOffset = positionToOffset(text, pos);
  const endOffset = positionToOffset(text, target);
  const nextText = text.slice(0, startOffset) + text.slice(endOffset);
  const nextLines = splitText(nextText);
  return { text: nextText, cursor: clampPosition(nextLines, pos), changed: nextText !== text };
}

export function insertDeleteLineBackward(text: string, cursor: Position): EditResult {
  const lines = splitText(text);
  const pos = clampPosition(lines, cursor);
  if (pos.col === 0) return { text, cursor: pos, changed: false };
  const line = lines[pos.line] ?? "";
  const nextLine = line.slice(pos.col);
  const nextLines = [...lines.slice(0, pos.line), nextLine, ...lines.slice(pos.line + 1)];
  const nextText = joinLines(nextLines);
  return { text: nextText, cursor: { line: pos.line, col: 0 }, changed: nextText !== text };
}

export function insertDeleteLineForward(text: string, cursor: Position): EditResult {
  const lines = splitText(text);
  const pos = clampPosition(lines, cursor);
  const line = lines[pos.line] ?? "";
  if (pos.col < line.length) {
    const nextLine = line.slice(0, pos.col);
    const nextLines = [...lines.slice(0, pos.line), nextLine, ...lines.slice(pos.line + 1)];
    const nextText = joinLines(nextLines);
    return { text: nextText, cursor: { line: pos.line, col: pos.col }, changed: nextText !== text };
  }
  if (pos.line >= lines.length - 1) return { text, cursor: pos, changed: false };
  const nextLines = [
    ...lines.slice(0, pos.line),
    line + (lines[pos.line + 1] ?? ""),
    ...lines.slice(pos.line + 2),
  ];
  const nextText = joinLines(nextLines);
  return {
    text: nextText,
    cursor: { line: pos.line, col: line.length },
    changed: nextText !== text,
  };
}

export function openLineBelow(text: string, cursor: Position): EditResult {
  if (text.length === 0) return { text, cursor: { line: 0, col: 0 }, changed: false };
  const lines = splitText(text);
  const pos = clampPosition(lines, cursor);
  const nextLines = [...lines.slice(0, pos.line + 1), "", ...lines.slice(pos.line + 1)];
  return {
    text: joinLines(nextLines),
    cursor: { line: pos.line + 1, col: 0 },
    changed: true,
  };
}

export function openLineAbove(text: string, cursor: Position): EditResult {
  if (text.length === 0) return { text, cursor: { line: 0, col: 0 }, changed: false };
  const lines = splitText(text);
  const pos = clampPosition(lines, cursor);
  const nextLines = [...lines.slice(0, pos.line), "", ...lines.slice(pos.line)];
  return {
    text: joinLines(nextLines),
    cursor: { line: pos.line, col: 0 },
    changed: true,
  };
}

export function joinLineWithNext(text: string, cursor: Position): EditResult {
  const lines = splitText(text);
  const pos = clampPosition(lines, cursor);
  if (pos.line >= lines.length - 1) return { text, cursor: pos, changed: false };

  const left = (lines[pos.line] ?? "").trimEnd();
  const right = (lines[pos.line + 1] ?? "").trimStart();
  const separator = left.length > 0 && right.length > 0 ? " " : "";
  const joined = `${left}${separator}${right}`;
  const nextLines = [...lines.slice(0, pos.line), joined, ...lines.slice(pos.line + 2)];

  return {
    text: joinLines(nextLines),
    cursor: { line: pos.line, col: left.length },
    changed: true,
  };
}

/** `count` copies of `register` for a counted put (`3p`); linewise copies stack as lines. */
export function repeatRegister(
  register: VimRegister | undefined,
  count = 1,
): VimRegister | undefined {
  if (!register || count <= 1) return register;
  const copies = Array.from({ length: count }, () => register.text);
  return { ...register, text: copies.join(register.type === "line" ? "\n" : "") };
}

export function pasteRegister(
  text: string,
  cursor: Position,
  register: VimRegister | undefined,
): EditResult {
  if (!register || register.text.length === 0) {
    return { text, cursor: clampPosition(splitText(text), cursor), changed: false };
  }

  const lines = splitText(text);
  const pos = clampPosition(lines, cursor);

  if (register.type === "line") {
    const inserted = register.text.split("\n");
    const nextLines = [...lines.slice(0, pos.line + 1), ...inserted, ...lines.slice(pos.line + 1)];
    return {
      text: joinLines(nextLines),
      cursor: { line: pos.line + 1, col: 0 },
      changed: true,
    };
  }

  const line = lines[pos.line] ?? "";
  const insertCol = line.length === 0 ? 0 : Math.min(pos.col + 1, line.length);
  const before = line.slice(0, insertCol);
  const after = line.slice(insertCol);
  const insertedLines = register.text.split("\n");
  let nextLines: string[];
  let nextCursor: Position;

  if (insertedLines.length === 1) {
    const inserted = insertedLines[0] ?? "";
    nextLines = [...lines];
    nextLines[pos.line] = before + inserted + after;
    nextCursor = { line: pos.line, col: insertCol + inserted.length - 1 };
  } else {
    const firstInserted = insertedLines[0] ?? "";
    const lastInserted = insertedLines[insertedLines.length - 1] ?? "";
    const middle = insertedLines.slice(1, -1);
    nextLines = [
      ...lines.slice(0, pos.line),
      before + firstInserted,
      ...middle,
      lastInserted + after,
      ...lines.slice(pos.line + 1),
    ];
    nextCursor = {
      line: pos.line + insertedLines.length - 1,
      col: Math.max(0, lastInserted.length - 1),
    };
  }

  return {
    text: joinLines(nextLines),
    cursor: clampPosition(nextLines, nextCursor),
    changed: true,
  };
}

export function pasteRegisterBefore(
  text: string,
  cursor: Position,
  register: VimRegister | undefined,
): EditResult {
  if (!register || register.text.length === 0) {
    return { text, cursor: clampPosition(splitText(text), cursor), changed: false };
  }

  if (register.type === "line" && text.length === 0) {
    return { text: register.text, cursor: { line: 0, col: 0 }, changed: true };
  }

  const lines = splitText(text);
  const pos = clampPosition(lines, cursor);

  if (register.type === "line") {
    const inserted = register.text.split("\n");
    const nextLines = [...lines.slice(0, pos.line), ...inserted, ...lines.slice(pos.line)];
    return {
      text: joinLines(nextLines),
      cursor: { line: pos.line, col: 0 },
      changed: true,
    };
  }

  const line = lines[pos.line] ?? "";
  const insertCol = Math.min(pos.col, line.length);
  const before = line.slice(0, insertCol);
  const after = line.slice(insertCol);
  const insertedLines = register.text.split("\n");
  let nextLines: string[];

  if (insertedLines.length === 1) {
    const inserted = insertedLines[0] ?? "";
    nextLines = [...lines];
    nextLines[pos.line] = before + inserted + after;
  } else {
    const firstInserted = insertedLines[0] ?? "";
    const lastInserted = insertedLines[insertedLines.length - 1] ?? "";
    const middle = insertedLines.slice(1, -1);
    nextLines = [
      ...lines.slice(0, pos.line),
      before + firstInserted,
      ...middle,
      lastInserted + after,
      ...lines.slice(pos.line + 1),
    ];
  }

  return {
    text: joinLines(nextLines),
    cursor: { line: pos.line, col: insertCol },
    changed: true,
  };
}

function bracketStartOffset(
  text: string,
  current: number,
  open: string,
  close: string,
): number | undefined {
  let depth = 0;
  for (let offset = current; offset >= 0; offset--) {
    if (text[offset] === close) depth++;
    if (text[offset] === open && depth-- === 0) return offset;
  }
  return undefined;
}

function bracketEndOffset(
  text: string,
  start: number,
  open: string,
  close: string,
): number | undefined {
  let depth = 0;
  for (let offset = start; offset < text.length; offset++) {
    if (text[offset] === open) depth++;
    if (text[offset] === close && --depth === 0) return offset + 1;
  }
  return undefined;
}

type OffsetRange = { start: number; end: number };

/** Character class of a word run; line breaks end every run. */
function wordRunKind(model: WordBoundaryModel, char: string | undefined) {
  return char === undefined || char === "\n" ? undefined : boundaryKind(model, char);
}

function runRange(text: string, index: number, model: WordBoundaryModel): OffsetRange {
  const kind = wordRunKind(model, text[index]);
  let start = index;
  while (start > 0 && wordRunKind(model, text[start - 1]) === kind) start--;
  let end = index + 1;
  while (end < text.length && wordRunKind(model, text[end]) === kind) end++;
  return { start, end };
}

/** Add blanks after `range`, or before it when there are none after (Vim `aw`, `a"`). */
function aroundWordRange(text: string, range: OffsetRange): OffsetRange {
  let end = range.end;
  while (end < text.length && isWhitespace(text[end]) && text[end] !== "\n") end++;
  if (end !== range.end) return { start: range.start, end };
  let start = range.start;
  while (start > 0 && isWhitespace(text[start - 1]) && text[start - 1] !== "\n") start--;
  return { start, end: range.end };
}

/** Vim `iw`/`aw` (small model) and `iW`/`aW` (big model) at `cursor`. */
function wordTextObjectOffsets(
  text: string,
  cursor: Position,
  model: WordBoundaryModel,
  kind: VimTextObjectKind,
): OffsetRange | undefined {
  let index = positionToOffset(text, cursor);
  if (wordRunKind(model, text[index]) === undefined) {
    if (index > 0 && wordRunKind(model, text[index - 1]) !== undefined) index--;
    else return undefined;
  }
  const run = runRange(text, index, model);
  if (kind === "inner") return run;
  if (wordRunKind(model, text[index]) !== "whitespace") return aroundWordRange(text, run);
  return wordRunKind(model, text[run.end]) === undefined
    ? run
    : { start: run.start, end: runRange(text, run.end, model).end };
}

/**
 * Quote pair around the cursor, as Vim's quote text objects find it: a cursor
 * on a quote pairs quotes from the start of the line; otherwise the nearest
 * quote before the cursor opens the string, or the first string after the
 * cursor is used when there is none before. Backslash-escaped quotes are
 * skipped.
 */
export function quotePairRange(
  text: string,
  cursor: Position,
  quote: string,
): DelimitedOffsetRange | undefined {
  const bounds = lineBoundsForPosition(text, cursor);
  const col = positionToOffset(text, cursor) - bounds.start;
  const quotes: number[] = [];
  for (let index = 0; index < bounds.line.length; index++) {
    if (bounds.line[index] === "\\" && quote !== "\\") index++;
    else if (bounds.line[index] === quote) quotes.push(index);
  }
  const at = quotes.indexOf(col);
  let pair: [number | undefined, number | undefined];
  if (at >= 0) pair = at % 2 === 0 ? [col, quotes[at + 1]] : [quotes[at - 1], col];
  else {
    const before = quotes.filter((index) => index < col).at(-1);
    const after = quotes.filter((index) => index > (before ?? col));
    pair = before === undefined ? [after[0], after[1]] : [before, after[0]];
  }
  const [open, close] = pair;
  if (open === undefined || close === undefined) return undefined;
  return { start: bounds.start + open, end: bounds.start + close + 1 };
}

function delimiterRange(
  text: string,
  cursor: Position,
  target: VimTextObject["target"],
  kind: VimTextObjectKind,
): OffsetRange | undefined {
  const delimiters: Partial<Record<VimTextObject["target"], [string, string]>> = {
    singleQuote: ["'", "'"],
    doubleQuote: ['"', '"'],
    backtick: ["`", "`"],
    paren: ["(", ")"],
    bracket: ["[", "]"],
    brace: ["{", "}"],
  };
  const pair = delimiters[target];
  if (!pair) return undefined;
  if (pair[0] === pair[1]) {
    const range = quotePairRange(text, cursor, pair[0]);
    return range && kind === "around" ? aroundWordRange(text, range) : range;
  }
  return enclosingBracketRange(text, cursor, pair[0], pair[1]);
}

function baseTextObjectRange(
  text: string,
  cursor: Position,
  textObject: VimTextObject,
  promptStructures?: ResolvedVimPromptStructures,
): OffsetRange | undefined {
  if (textObject.target === "word" || textObject.target === "bigWord") {
    const model = textObject.target === "word" ? "small" : "big";
    return wordTextObjectOffsets(text, cursor, model, textObject.kind);
  }
  const delimiter = delimiterRange(text, cursor, textObject.target, textObject.kind);
  if (delimiter) return delimiter;
  if (isOffsetTextObjectTarget(textObject.target))
    return offsetTextObjectRange(text, cursor, textObject);
  const structure = promptStructureTextObjectRange(text, cursor, textObject, promptStructures);
  return structure && { start: structure.start, end: structure.endExclusive };
}

function isDelimiterTarget(target: VimTextObject["target"]): boolean {
  return ["singleQuote", "doubleQuote", "backtick", "paren", "bracket", "brace"].includes(target);
}

export function textObjectRange(
  text: string,
  cursor: Position,
  textObject: VimTextObject,
  promptStructures?: ResolvedVimPromptStructures,
): { start: Position; end: Position } | undefined {
  const range = baseTextObjectRange(text, cursor, textObject, promptStructures);
  if (!range) return undefined;
  const inner = textObject.kind === "inner" && isDelimiterTarget(textObject.target);
  const start = inner ? range.start + 1 : range.start;
  const endExclusive = inner ? range.end - 1 : range.end;
  if (start >= endExclusive) return undefined;
  return { start: offsetToPosition(text, start), end: offsetToPosition(text, endExclusive - 1) };
}

function isPromptStructureTarget(target: VimTextObject["target"]): target is PromptStructureTarget {
  return ![
    "word",
    "bigWord",
    "singleQuote",
    "doubleQuote",
    "backtick",
    "paren",
    "bracket",
    "brace",
    "paragraph",
    "sentence",
  ].includes(target);
}

function blankRunEnd(lines: string[], start: number): number {
  let end = start;
  while (end + 1 < lines.length && isBlankLine(lines[end + 1]!)) end++;
  return end;
}

function blankRunStart(lines: string[], start: number): number {
  let begin = start;
  while (begin > 0 && isBlankLine(lines[begin - 1]!)) begin--;
  return begin;
}

function paragraphTextObjectOffsets(
  text: string,
  cursor: Position,
  kind: VimTextObjectKind,
): OffsetRange | undefined {
  const lines = splitText(text);
  const pos = clampPosition(lines, cursor);
  if (isBlankLine(lines[pos.line]!)) return undefined;
  const starts = lineStartOffsets(lines);
  const runStart = paragraphRunStart(lines, pos.line);
  const runEnd = paragraphRunEnd(lines, pos.line);
  const afterBody = runEnd + 1 < lines.length ? starts[runEnd + 1]! : text.length;
  if (kind === "inner") return { start: starts[runStart]!, end: afterBody };
  if (runEnd + 1 < lines.length && isBlankLine(lines[runEnd + 1]!)) {
    const separatorEnd = blankRunEnd(lines, runEnd + 1);
    return {
      start: starts[runStart]!,
      end: separatorEnd + 1 < lines.length ? starts[separatorEnd + 1]! : text.length,
    };
  }
  if (runStart > 0 && isBlankLine(lines[runStart - 1]!))
    return { start: starts[blankRunStart(lines, runStart - 1)]!, end: afterBody };
  return { start: starts[runStart]!, end: afterBody };
}

/**
 * `is` selects the sentence, or the blank run between sentences; `as` adds the
 * trailing blanks, or the leading blanks when there are none trailing.
 */
function sentenceTextObjectOffsets(
  text: string,
  cursor: Position,
  kind: VimTextObjectKind,
): OffsetRange | undefined {
  const lines = splitText(text);
  const pos = clampPosition(lines, cursor);
  if (isBlankLine(lines[pos.line]!)) return undefined;
  const starts = lineStartOffsets(lines);
  const paragraph = sentenceParagraph(text, lines, starts, pos.line);
  const offset = Math.min(starts[pos.line]! + pos.col, paragraph.end - 1);
  const spans = paragraph.spans;
  const index = spans.findIndex((span) => offset < span.end);
  const span = spans[index];
  if (span && offset >= span.start) {
    if (kind === "inner") return span;
    const trailingEnd = spans[index + 1]?.start ?? paragraph.end;
    if (trailingEnd > span.end) return { start: span.start, end: trailingEnd };
    return { start: spans[index - 1]?.end ?? paragraph.start, end: span.end };
  }
  const gap = {
    start: (index === -1 ? spans.at(-1)?.end : spans[index - 1]?.end) ?? paragraph.start,
    end: span?.start ?? paragraph.end,
  };
  if (kind === "inner") return gap;
  if (span) return { start: gap.start, end: span.end };
  return { start: spans.at(-1)?.start ?? gap.start, end: gap.end };
}

function isOffsetTextObjectTarget(target: VimTextObject["target"]): boolean {
  return target === "paragraph" || target === "sentence";
}

/** Paragraph and sentence objects resolve as offsets, since they may span line breaks. */
function offsetTextObjectRange(
  text: string,
  cursor: Position,
  textObject: VimTextObject,
): OffsetRange | undefined {
  if (textObject.target === "sentence")
    return sentenceTextObjectOffsets(text, cursor, textObject.kind);
  return paragraphTextObjectOffsets(text, cursor, textObject.kind);
}

function promptStructureTextObjectRange(
  text: string,
  cursor: Position,
  textObject: VimTextObject,
  promptStructures?: ResolvedVimPromptStructures,
) {
  if (!isPromptStructureTarget(textObject.target)) return undefined;
  if (
    promptStructures?.enabled === false ||
    promptStructures?.targets[textObject.target] === false
  ) {
    return undefined;
  }
  return resolvePromptStructureRange(text, cursor, {
    kind: textObject.kind,
    target: textObject.target,
  });
}

export function yankTextObject(
  text: string,
  cursor: Position,
  textObject: VimTextObject,
  promptStructures?: ResolvedVimPromptStructures,
): VimRegister | undefined {
  const structureRange = promptStructureTextObjectRange(text, cursor, textObject, promptStructures);
  if (structureRange)
    return { type: "char", text: text.slice(structureRange.start, structureRange.endExclusive) };
  if (isOffsetTextObjectTarget(textObject.target)) {
    const offsets = offsetTextObjectRange(text, cursor, textObject);
    if (!offsets || offsets.start >= offsets.end) return undefined;
    return { type: "char", text: text.slice(offsets.start, offsets.end) };
  }
  const range = textObjectRange(text, cursor, textObject, promptStructures);
  if (!range) return undefined;
  return yankVisualSelection(text, range.start, range.end, "char");
}

function isWholeLineRange(text: string, start: number, endExclusive: number): boolean {
  const startsAtLineStart = start === 0 || text[start - 1] === "\n";
  const endsAtLineEnd = endExclusive >= text.length || text[endExclusive] === "\n";
  return startsAtLineStart && endsAtLineEnd;
}

export function deleteTextObject(
  text: string,
  cursor: Position,
  textObject: VimTextObject,
  promptStructures?: ResolvedVimPromptStructures,
): EditResult {
  const structureRange = promptStructureTextObjectRange(text, cursor, textObject, promptStructures);
  if (structureRange) {
    let endExclusive = structureRange.endExclusive;
    if (
      isWholeLineRange(text, structureRange.start, structureRange.endExclusive) &&
      endExclusive < text.length &&
      text[endExclusive] === "\n"
    )
      endExclusive++;
    const nextText = text.slice(0, structureRange.start) + text.slice(endExclusive);
    return {
      text: nextText,
      cursor: offsetToPosition(nextText, structureRange.start),
      register: {
        type: "char",
        text: text.slice(structureRange.start, structureRange.endExclusive),
      },
      changed: nextText !== text,
    };
  }
  if (isOffsetTextObjectTarget(textObject.target)) {
    const offsets = offsetTextObjectRange(text, cursor, textObject);
    if (!offsets || offsets.start >= offsets.end)
      return { text, cursor: normalizeBufferPosition(text, cursor), changed: false };
    return deleteOffsetRange(text, offsets.start, offsets.end);
  }
  const range = textObjectRange(text, cursor, textObject, promptStructures);
  if (!range) return { text, cursor: normalizeBufferPosition(text, cursor), changed: false };
  return deleteRange(text, range.start, range.end);
}

export function transformCaseTextObject(
  text: string,
  cursor: Position,
  textObject: VimTextObject,
  action: CaseTransformAction,
  promptStructures?: ResolvedVimPromptStructures,
): EditResult {
  const structureRange = promptStructureTextObjectRange(text, cursor, textObject, promptStructures);
  if (structureRange) {
    return transformCaseOffsetRange(
      text,
      structureRange.start,
      structureRange.endExclusive,
      action,
    );
  }
  if (isOffsetTextObjectTarget(textObject.target)) {
    const offsets = offsetTextObjectRange(text, cursor, textObject);
    if (!offsets || offsets.start >= offsets.end)
      return { text, cursor: normalizeBufferPosition(text, cursor), changed: false };
    return transformCaseOffsetRange(text, offsets.start, offsets.end, action);
  }
  const range = textObjectRange(text, cursor, textObject, promptStructures);
  if (!range) return { text, cursor: normalizeBufferPosition(text, cursor), changed: false };
  return transformCaseVisualRange(text, range.start, range.end, "char", action);
}

/** Offset range `[start, end)` that includes both delimiters of a pair. */
export type DelimitedOffsetRange = { start: number; end: number };

/**
 * Nearest pair of `open`/`close` enclosing the cursor, nesting-aware and
 * across lines. A cursor on either delimiter belongs to that pair. `count`
 * selects the `count`th enclosing pair, innermost first.
 */
export function enclosingBracketRange(
  text: string,
  cursor: Position,
  open: string,
  close: string,
  count = 1,
): DelimitedOffsetRange | undefined {
  let current = positionToOffset(text, cursor);
  if (text[current] === close && current > 0) current--;
  let range: DelimitedOffsetRange | undefined;
  for (let index = 0; index < Math.max(1, count); index++) {
    const start = bracketStartOffset(text, current, open, close);
    const end = start === undefined ? undefined : bracketEndOffset(text, start, open, close);
    if (start === undefined || end === undefined) return undefined;
    range = { start, end };
    current = start - 1;
  }
  return range;
}

export type SurroundTargetSpec =
  | { type: "motion"; motion: VimMotion; count?: number }
  | { type: "textObject"; textObject: VimTextObject }
  | {
      type: "charSearch";
      kind: CharSearchKind;
      char: string;
      count?: number;
      searchCursorOffset?: number;
    }
  | { type: "line"; count?: number };

/** Text addressed by a surround target; linewise ranges cover whole lines. */
export type SurroundRange = { start: number; end: number; linewise: boolean };

function trimTrailingWhitespace(text: string, start: number, end: number): number {
  let trimmed = end;
  while (trimmed > start && isWhitespace(text[trimmed - 1])) trimmed--;
  return trimmed;
}

function linewiseSurroundRange(
  text: string,
  startLine: number,
  endLine: number,
  trimBlankLines = true,
): SurroundRange {
  const lines = splitText(text);
  const starts = lineStartOffsets(lines);
  let last = endLine;
  while (trimBlankLines && last > startLine && (lines[last] ?? "").trim() === "") last--;
  return {
    start: starts[startLine] ?? 0,
    end: (starts[last] ?? 0) + (lines[last]?.length ?? 0),
    linewise: true,
  };
}

function lineFormSurroundRange(
  text: string,
  cursor: Position,
  count: number,
): SurroundRange | undefined {
  const lines = splitText(text);
  const pos = clampPosition(lines, cursor);
  const starts = lineStartOffsets(lines);
  const lastLine = Math.min(lines.length - 1, pos.line + Math.max(1, count) - 1);
  const start = (starts[pos.line] ?? 0) + firstNonBlankColumn(lines[pos.line] ?? "");
  const end = trimTrailingWhitespace(
    text,
    start,
    (starts[lastLine] ?? 0) + (lines[lastLine]?.length ?? 0),
  );
  return end > start ? { start, end, linewise: false } : undefined;
}

function charwiseSurroundRange(
  text: string,
  range: { start: number; end: number } | undefined,
): SurroundRange | undefined {
  if (!range) return undefined;
  const end = trimTrailingWhitespace(text, range.start, range.end);
  return end > range.start ? { start: range.start, end, linewise: false } : undefined;
}

function textObjectSurroundRange(
  text: string,
  cursor: Position,
  textObject: VimTextObject,
  promptStructures?: ResolvedVimPromptStructures,
): SurroundRange | undefined {
  const range = textObjectRange(text, cursor, textObject, promptStructures);
  if (!range) return undefined;
  if (textObject.target === "paragraph")
    return linewiseSurroundRange(text, range.start.line, range.end.line);
  return charwiseSurroundRange(text, {
    start: positionToOffset(text, range.start),
    end: positionToOffset(text, range.end) + 1,
  });
}

/**
 * Range a surround target addresses. Charwise ranges exclude trailing
 * whitespace; `j`, `k`, `gg`, `G`, and the paragraph text object are linewise.
 */
export function surroundRangeFor(
  text: string,
  cursor: Position,
  target: SurroundTargetSpec,
  promptStructures?: ResolvedVimPromptStructures,
): SurroundRange | undefined {
  if (target.type === "line") return lineFormSurroundRange(text, cursor, target.count ?? 1);
  if (target.type === "textObject")
    return textObjectSurroundRange(text, cursor, target.textObject, promptStructures);
  if (target.type === "charSearch") {
    return charwiseSurroundRange(
      text,
      charSearchOperatorOffsetRange(
        text,
        cursor,
        target.kind,
        target.char,
        target.count ?? 1,
        target.searchCursorOffset ?? 0,
      ),
    );
  }
  const lineRange = motionLineRange(text, cursor, target.motion, target.count ?? 1);
  if (lineRange) return linewiseSurroundRange(text, lineRange.startLine, lineRange.endLine);
  return charwiseSurroundRange(
    text,
    motionOffsetRange(text, cursor, target.motion, target.count ?? 1),
  );
}

/** Range of a characterwise or linewise visual selection, for visual surround. */
export function visualSurroundRange(
  text: string,
  anchor: Position,
  cursor: Position,
  linewise: boolean,
): SurroundRange | undefined {
  if (linewise) {
    const range = normalizeLineRange(splitText(text), anchor, cursor);
    return linewiseSurroundRange(text, range.startLine, range.endLine, false);
  }
  const range = normalizeRange(splitText(text), anchor, cursor);
  return charwiseSurroundRange(text, {
    start: positionToOffset(text, range.start),
    end: Math.min(text.length, positionToOffset(text, range.end) + 1),
  });
}
