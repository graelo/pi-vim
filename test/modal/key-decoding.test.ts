import { expect, test } from "vitest";
import { insertKeySequence, keySequence } from "../../src/modal/core.ts";

test.each([
  ["plain uppercase", "X", "X"],
  ["Kitty with shifted key", "\x1b[120:88;2u", "X"],
  ["Kitty without shifted key", "\x1b[120;2u", "X"],
  ["modifyOtherKeys uppercase", "\x1b[27;2;88~", "X"],
  ["modifyOtherKeys lowercase", "\x1b[27;2;120~", "X"],
  ["plain lowercase", "x", "x"],
  ["unshifted Kitty letter", "\x1b[120u", "x"],
  ["shifted non-letter", "\x1b[49;2u", "1"],
  ["ctrl+shift+letter", "\x1b[120;6u", "shift+ctrl+x"],
])("decodes %s", (_, data, expected) => {
  expect(keySequence(data)).toBe(expected);
  expect(insertKeySequence(data)).toBe(expected);
});
