import type { Position } from "./types.ts";

/** Offset range `[start, end)` into prompt text. */
export type OffsetRange = { start: number; end: number };

export function splitText(text: string): string[] {
  const lines = text.split("\n");
  return lines.length === 0 ? [""] : lines;
}

export function clampPosition(lines: string[], position: Position): Position {
  const safeLines = lines.length === 0 ? [""] : lines;
  const line = Math.max(0, Math.min(position.line, safeLines.length - 1));
  const length = safeLines[line]?.length ?? 0;
  const col = Math.max(0, Math.min(position.col, length));
  return { line, col };
}

export function comparePositions(a: Position, b: Position): number {
  if (a.line !== b.line) return a.line - b.line;
  return a.col - b.col;
}

export function lineStartOffsets(lines: string[]): number[] {
  const starts: number[] = [];
  let offset = 0;
  for (const line of lines) {
    starts.push(offset);
    offset += line.length + 1;
  }
  return starts;
}

export function positionToOffset(text: string, position: Position): number {
  const lines = splitText(text);
  const pos = clampPosition(lines, position);
  const starts = lineStartOffsets(lines);
  return (starts[pos.line] ?? 0) + pos.col;
}

export function offsetToPosition(text: string, offset: number): Position {
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
