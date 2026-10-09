import { expect, test } from "vitest";
import { p, applyModalKeys } from "./shared.ts";

const para = "alpha\nbeta\n\ngamma\n\ndelta\nepsilon";

test("normal { and } move across paragraphs", () => {
  expect(applyModalKeys({ mode: "normal" }, para, p(0, 2), ["}"]).cursor).toEqual(p(3, 0));
  expect(applyModalKeys({ mode: "normal" }, para, p(3, 0), ["}"]).cursor).toEqual(p(5, 0));
  expect(applyModalKeys({ mode: "normal" }, para, p(6, 3), ["{"]).cursor).toEqual(p(5, 0));
  expect(applyModalKeys({ mode: "normal" }, para, p(3, 0), ["{"]).cursor).toEqual(p(0, 0));
  expect(applyModalKeys({ mode: "normal" }, para, p(0, 0), ["2", "}"]).cursor).toEqual(p(5, 0));
});

test("visual { and } preserve anchor and move active cursor", () => {
  const visual = applyModalKeys({ mode: "visual", visualAnchor: p(0, 0) }, para, p(0, 0), ["}"]);
  expect(visual.state.visualAnchor).toEqual(p(0, 0));
  expect(visual.cursor).toEqual(p(3, 0));
});

test("d} deletes through separator and writes character register", () => {
  const deleted = applyModalKeys({ mode: "normal" }, para, p(0, 0), ["d", "}"]);
  expect(deleted.text).toBe("gamma\n\ndelta\nepsilon");
  expect(deleted.state.register).toEqual({ type: "char", text: "alpha\nbeta\n\n" });
  expect(deleted.state.mode).toBe("normal");
});

test("c{ changes toward paragraph start and enters insert mode", () => {
  const text = "alpha\n\ngamma\nline";
  const changed = applyModalKeys({ mode: "normal" }, text, p(3, 2), ["c", "{"]);
  expect(changed.text).toBe("alpha\n\nne");
  expect(changed.state.register).toEqual({ type: "char", text: "gamma\nli" });
  expect(changed.state.mode).toBe("insert");
});

test("y} yanks paragraph motion range without changing text", () => {
  const yanked = applyModalKeys({ mode: "normal" }, para, p(0, 0), ["y", "}"]);
  expect(yanked.text).toBe(para);
  expect(yanked.state.register).toEqual({ type: "char", text: "alpha\nbeta\n\n" });
});

test("dip and dap edit paragraph text objects", () => {
  const text = "para1\n\npara2\n\npara3";
  const inner = applyModalKeys({ mode: "normal" }, text, p(0, 2), ["d", "i", "p"]);
  expect(inner.text).toBe("\npara2\n\npara3");
  expect(inner.state.register).toEqual({ type: "char", text: "para1\n" });

  const around = applyModalKeys({ mode: "normal" }, text, p(0, 2), ["d", "a", "p"]);
  expect(around.text).toBe("para2\n\npara3");
  expect(around.state.register).toEqual({ type: "char", text: "para1\n\n" });
});

test("missing paragraph text object is a safe no-op", () => {
  const noOp = applyModalKeys({ mode: "normal" }, "\n\n", p(0, 0), ["d", "i", "p"]);
  expect(noOp.text).toBe("\n\n");
  expect(noOp.state.register).toBeUndefined();
  expect(noOp.state.pending).toBeUndefined();
});

test("paragraph delete is repeatable with dot", () => {
  const text = "para1\n\npara2\n\npara3\n\npara4";
  const first = applyModalKeys({ mode: "normal" }, text, p(0, 0), ["d", "a", "p"]);
  expect(first.text).toBe("para2\n\npara3\n\npara4");
  const repeated = applyModalKeys(first.state, first.text, p(0, 0), ["."]);
  expect(repeated.text).toBe("para3\n\npara4");
});

const prose = "Foo bar. Baz qux. End.";

test("normal ( and ) move across sentences", () => {
  expect(applyModalKeys({ mode: "normal" }, prose, p(0, 4), [")"]).cursor).toEqual(p(0, 9));
  expect(applyModalKeys({ mode: "normal" }, prose, p(0, 12), ["("]).cursor).toEqual(p(0, 9));
  expect(applyModalKeys({ mode: "normal" }, prose, p(0, 9), ["("]).cursor).toEqual(p(0, 0));
  expect(applyModalKeys({ mode: "normal" }, prose, p(0, 0), ["2", ")"]).cursor).toEqual(p(0, 18));
});

test("visual ( and ) preserve anchor and move active cursor", () => {
  for (const mode of ["visual", "visualLine", "visualBlock"] as const) {
    const visual = applyModalKeys({ mode, visualAnchor: p(0, 0) }, prose, p(0, 0), [")"]);
    expect(visual.state.mode).toBe(mode);
    expect(visual.state.visualAnchor).toEqual(p(0, 0));
    expect(visual.cursor).toEqual(p(0, 9));
  }
});

test("d) deletes to the next sentence and writes character register", () => {
  const deleted = applyModalKeys({ mode: "normal" }, "Foo bar. Baz qux.", p(0, 4), ["d", ")"]);
  expect(deleted.text).toBe("Foo Baz qux.");
  expect(deleted.state.register).toEqual({ type: "char", text: "bar. " });
  expect(deleted.state.mode).toBe("normal");
});

test("c( changes back to sentence start and enters insert mode", () => {
  const changed = applyModalKeys({ mode: "normal" }, prose, p(0, 13), ["c", "("]);
  expect(changed.text).toBe("Foo bar. qux. End.");
  expect(changed.state.register).toEqual({ type: "char", text: "Baz " });
  expect(changed.state.mode).toBe("insert");
  expect(changed.cursor).toEqual(p(0, 9));
});

test("register prefix applies to sentence operators", () => {
  const deleted = applyModalKeys({ mode: "normal" }, prose, p(0, 0), ['"', "a", "d", ")"]);
  expect(deleted.text).toBe("Baz qux. End.");
  expect(deleted.state.namedRegisters?.a).toEqual({ type: "char", text: "Foo bar. " });
});

test("dis and das edit sentence text objects", () => {
  const inner = applyModalKeys({ mode: "normal" }, prose, p(0, 10), ["d", "i", "s"]);
  expect(inner.text).toBe("Foo bar.  End.");
  expect(inner.state.register).toEqual({ type: "char", text: "Baz qux." });
  const around = applyModalKeys({ mode: "normal" }, prose, p(0, 10), ["d", "a", "s"]);
  expect(around.text).toBe("Foo bar. End.");
});

test("missing sentence text object is a safe no-op", () => {
  const noOp = applyModalKeys({ mode: "normal" }, "\n\n", p(0, 0), ["d", "a", "s"]);
  expect(noOp.text).toBe("\n\n");
  expect(noOp.state.register).toBeUndefined();
  expect(noOp.state.pending).toBeUndefined();
});

test("sentence deletes are repeatable with dot", () => {
  const first = applyModalKeys({ mode: "normal" }, prose, p(0, 0), ["d", "a", "s"]);
  expect(first.text).toBe("Baz qux. End.");
  expect(applyModalKeys(first.state, first.text, p(0, 0), ["."]).text).toBe("End.");
  const motion = applyModalKeys({ mode: "normal" }, prose, p(0, 0), ["d", ")"]);
  expect(applyModalKeys(motion.state, motion.text, p(0, 0), ["."]).text).toBe("End.");
});
