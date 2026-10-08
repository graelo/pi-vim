/**
 * Paragraph and sentence model for `{`, `}`, `(`, `)`, `ip`/`ap`, and
 * `is`/`as`. Paragraphs are runs of nonblank lines; sentences follow
 * `:help sentence` within a paragraph.
 */
import {
  clampPosition,
  comparePositions,
  lineStartOffsets,
  type OffsetRange,
  offsetToPosition,
  positionToOffset,
  splitText,
} from "./text-position.ts";
import type { Position, VimTextObject, VimTextObjectKind } from "./types.ts";

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

/** Target offset of a counted `{`, `}`, `(`, or `)` motion from `cursor`. */
export function proseMotionTargetOffset(
  text: string,
  cursor: Position,
  motion: "{" | "}" | "(" | ")",
  count: number,
): number {
  if (motion === "(" || motion === ")") {
    const direction = motion === ")" ? "forward" : "backward";
    return sentenceTargetOffset(text, positionToOffset(text, cursor), direction, count);
  }
  const step = motion === "}" ? paragraphForwardStep : paragraphBackwardStep;
  return positionToOffset(text, countedParagraphPosition(text, cursor, count, step));
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

export function isOffsetTextObjectTarget(target: VimTextObject["target"]): boolean {
  return target === "paragraph" || target === "sentence";
}

/** Paragraph and sentence objects resolve as offsets, since they may span line breaks. */
export function offsetTextObjectRange(
  text: string,
  cursor: Position,
  textObject: VimTextObject,
): OffsetRange | undefined {
  if (textObject.target === "sentence")
    return sentenceTextObjectOffsets(text, cursor, textObject.kind);
  return paragraphTextObjectOffsets(text, cursor, textObject.kind);
}
