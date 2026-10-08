import { expect, test } from "vitest";
import type { ModalState } from "../../src/modal/types.ts";
import { modalPendingDisplay } from "../../src/modal/engine.ts";
import { p, applyModalKeys } from "./shared.ts";

const normal: ModalState = { mode: "normal" };

const keysOf = (sequence: string) => [...sequence];

test("ys waits for the surround character before editing", () => {
  const pending = applyModalKeys(normal, "say hello world", p(0, 5), keysOf("ysiw"));
  expect(pending.text).toBe("say hello world");
  expect(pending.state.pendingSurround).toMatchObject({ kind: "add", keys: "ysiw" });
  expect(modalPendingDisplay(pending.state)).toBe("ysiw");

  const done = applyModalKeys(normal, "say hello world", p(0, 5), keysOf("ysiw)"));
  expect(done.text).toBe("say (hello) world");
  expect(done.cursor).toEqual(p(0, 4));
  expect(done.state.mode).toBe("normal");
  expect(done.state.pendingSurround).toBeUndefined();
});

test("surround covers motions, char searches, line form, and counts", () => {
  expect(applyModalKeys(normal, "hello world", p(0, 0), keysOf('ysw"')).text).toBe('"hello" world');
  expect(applyModalKeys(normal, "call ab, c", p(0, 5), keysOf("yst,]")).text).toBe("call [ab], c");
  expect(applyModalKeys(normal, "  fix the bug", p(0, 4), keysOf("yss)")).text).toBe(
    "  (fix the bug)",
  );
  expect(applyModalKeys(normal, "one\ntwo", p(0, 0), keysOf('2yss"')).text).toBe('"one\ntwo"');
  expect(applyModalKeys(normal, "a b c", p(0, 0), keysOf("ys2w)")).text).toBe("(a b) c");
  expect(applyModalKeys(normal, "a b c", p(0, 0), keysOf("2ysw)")).text).toBe("(a b) c");
  expect(applyModalKeys(normal, "a\nb\n\nc", p(0, 0), keysOf("ysip}")).text).toBe(
    "{\na\nb\n}\n\nc",
  );
});

test("ds and cs remove and replace surrounding pairs", () => {
  expect(applyModalKeys(normal, "f(a, b)", p(0, 2), keysOf("ds)")).text).toBe("fa, b");
  expect(applyModalKeys(normal, "( a )", p(0, 2), keysOf("ds(")).text).toBe("a");
  expect(applyModalKeys(normal, '"hi"', p(0, 1), keysOf("cs\"'")).text).toBe("'hi'");
  expect(applyModalKeys(normal, "[x]", p(0, 1), keysOf("cs]{")).text).toBe("{ x }");
  expect(applyModalKeys(normal, "(a (b))", p(0, 4), keysOf("2ds)")).text).toBe("a (b)");
  expect(applyModalKeys(normal, '"hi"', p(0, 0), keysOf("cs\"'")).text).toBe("'hi'");
  const change = applyModalKeys(normal, '"hi"', p(0, 1), keysOf('cs"'));
  expect(modalPendingDisplay(change.state)).toBe('cs"');
});

test("Esc, rejected keys, and missing pairs cancel surround without editing", () => {
  for (const keys of [
    ["y", "s", "i", "w", "\u001b"],
    keysOf("ysiwx"),
    keysOf("ysiw<"),
    keysOf("ds\u001b"),
    keysOf("dsx"),
    keysOf('cs"x'),
    keysOf("ds)"),
  ]) {
    const result = applyModalKeys(normal, "say hello", p(0, 5), keys);
    expect(result.text).toBe("say hello");
    expect(result.state.mode).toBe("normal");
    expect(result.state.pendingSurround).toBeUndefined();
    expect(result.state.pending).toBeUndefined();
  }
});

test("surround changes repeat with dot and leave registers alone", () => {
  const register = { type: "char" as const, text: "keep" };
  const start: ModalState = { mode: "normal", register };
  const added = applyModalKeys(start, "one two", p(0, 0), keysOf('ysiw"'));
  expect(added.text).toBe('"one" two');
  expect(added.state.register).toEqual(register);
  expect(added.state.lastRepeatableChange).toMatchObject({ type: "surround", char: '"' });
  const repeated = applyModalKeys(added.state, added.text, p(0, 6), ["."]);
  expect(repeated.text).toBe('"one" "two"');

  const changed = applyModalKeys(start, '"a" "b"', p(0, 1), keysOf("cs\"'"));
  expect(applyModalKeys(changed.state, changed.text, p(0, 5), ["."]).text).toBe("'a' 'b'");

  const deleted = applyModalKeys(start, "(a) (b)", p(0, 1), keysOf("ds)"));
  expect(deleted.state.register).toEqual(register);
  expect(applyModalKeys(deleted.state, deleted.text, p(0, 3), ["."]).text).toBe("a b");
});

test("visual S surrounds characterwise and linewise selections", () => {
  const charwise = applyModalKeys(normal, "say hello", p(0, 4), keysOf("veS'"));
  expect(charwise.text).toBe("say 'hello'");
  expect(charwise.state.mode).toBe("normal");
  expect(charwise.state.lastVisualSelection).toBeDefined();
  expect(charwise.state.lastRepeatableChange).toBeUndefined();

  expect(applyModalKeys(normal, "a\nb", p(0, 0), keysOf("VjS)")).text).toBe("(\na\nb\n)");

  const pendingSelection = applyModalKeys(normal, "say hello", p(0, 4), keysOf("veS"));
  expect(pendingSelection.state.mode).toBe("normal");
  expect(modalPendingDisplay(pendingSelection.state)).toBe("S");
});

test("normal S still substitutes the line", () => {
  const result = applyModalKeys(normal, "abc", p(0, 1), ["S"]);
  expect(result.text).toBe("");
  expect(result.state.mode).toBe("insert");
});

test("surround after a named-register prefix writes no register", () => {
  const result = applyModalKeys(normal, "one", p(0, 0), keysOf('"ayss)'));
  expect(result.text).toBe("(one)");
  expect(result.state.namedRegisters).toBeUndefined();
  expect(result.state.pendingRegister).toBeUndefined();
});
