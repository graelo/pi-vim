import { expect, test } from "vitest";

import { renderMarkdownRows } from "../src/markdown-popup.ts";

const style = {
  accent: (text: string) => text,
  bold: (text: string) => text,
  dim: (text: string) => text,
};

test("keeps every wrapped bullet continuation indented", () => {
  expect(renderMarkdownRows("- word word word", 10, style)).toEqual(["• word", "  word", "  word"]);
});
