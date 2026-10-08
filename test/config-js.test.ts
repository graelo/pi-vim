import { expect, test } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { resolveNormalCommand } from "../src/commands.ts";
import { loadVimJsConfig } from "../src/config-js.ts";
import { loadVimOptions, resolveVimOptions } from "../src/config.ts";
import { encodeMappingTokens } from "../src/mapping-scopes.ts";

function fixture() {
  const dir = mkdtempSync(join(tmpdir(), "pi-vim-js-config-"));
  const path = join(dir, "pi-vim.config.js");
  return {
    path,
    write: (content: string) => writeFileSync(path, content),
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}

function operations(result: Awaited<ReturnType<typeof loadVimJsConfig>>) {
  expect(result.kind).toBe("success");
  if (result.kind !== "success") throw new Error("expected successful JS config");
  return result.operations;
}

test("loads committed basic typed example without warnings", async () => {
  const result = await loadVimJsConfig(
    join(dirname(fileURLToPath(import.meta.url)), "../examples/pi-vim.config.js"),
  );
  expect(result.warnings).toEqual([]);
  expect(operations(result)).toEqual([
    { kind: "preset", preset: "prompt-safe" },
    { kind: "leaf", path: "leader", value: " " },
    { kind: "leaf", path: "startMode", value: "normal" },
    { kind: "leaf", path: "cursor.normal", value: "bar" },
    { kind: "leaf", path: "ui.status.position", value: "right" },
  ]);
});

test("missing JS config is quiet", async () => {
  const result = await loadVimJsConfig(join(tmpdir(), "missing-pi-vim.config.js"));
  expect(result).toEqual({ kind: "missing", warnings: [] });
});

test("loads vim.prompt builtins through string keybindings", async () => {
  const f = fixture();
  try {
    f.write(`
export default (vim) => {
  vim.keymap.set("i", "<A-w>", vim.prompt.deleteWordBackward());
};
`);
    const result = await loadVimJsConfig(f.path);
    expect(result.warnings).toEqual([]);
    expect(operations(result)).toEqual([
      { kind: "map", mapping: { kind: "insert", action: "deleteWordBackward", key: "alt+w" } },
    ]);
  } finally {
    f.cleanup();
  }
});

test("keeps command leaf and nested EasyMotion descriptor factories callable", async () => {
  const f = fixture();
  try {
    f.write(`
export default (vim) => {
  vim.keymap.set("n", "e", vim.action.command.easymotion());
  vim.keymap.set("n", "g", vim.action.command.easymotion.goToChar());
};`);
    const result = await loadVimJsConfig(f.path);
    expect(result.warnings).toEqual([]);
    expect(operations(result)).toEqual([
      {
        kind: "map",
        mapping: {
          kind: "descriptor",
          actionId: "command.easymotion",
          key: "e",
          modes: ["normal"],
        },
      },
      {
        kind: "map",
        mapping: {
          kind: "descriptor",
          actionId: "command.easymotion",
          key: "g",
          modes: ["normal"],
        },
      },
    ]);
  } finally {
    f.cleanup();
  }
});

test("runtime prefixes exclude scoped unmap tombstones and normal-only commands", () => {
  const normalWithoutLastDescendant = resolveVimOptions(undefined, undefined, {
    kind: "success",
    warnings: [],
    operations: [
      {
        kind: "map",
        mapping: {
          kind: "descriptor",
          actionId: "motion.wordForward",
          key: "zx",
          modes: ["normal"],
        },
      },
      { kind: "unmap", key: "zx", modes: ["normal"] },
    ],
  }).options.keymap!;
  expect(resolveNormalCommand("z", undefined, normalWithoutLastDescendant, "normal")).toEqual({
    type: "none",
  });

  const normalWithSibling = resolveVimOptions(undefined, undefined, {
    kind: "success",
    warnings: [],
    operations: [
      {
        kind: "map",
        mapping: {
          kind: "descriptor",
          actionId: "motion.wordForward",
          key: "zx",
          modes: ["normal"],
        },
      },
      {
        kind: "map",
        mapping: {
          kind: "descriptor",
          actionId: "motion.wordBackward",
          key: "zy",
          modes: ["normal"],
        },
      },
      { kind: "unmap", key: "zx", modes: ["normal"] },
    ],
  }).options.keymap!;
  const normalPrefix = resolveNormalCommand("z", undefined, normalWithSibling, "normal");
  expect(normalPrefix).toEqual({ type: "pending", pending: "z" });
  if (normalPrefix.type !== "pending") throw new Error("expected normal prefix");
  expect(
    resolveNormalCommand("y", normalPrefix.pending, normalWithSibling, "normal"),
  ).toMatchObject({
    type: "motion",
    motion: "wordBackward",
  });

  const operatorWithoutLastDescendant = resolveVimOptions(undefined, undefined, {
    kind: "success",
    warnings: [],
    operations: [
      {
        kind: "map",
        mapping: {
          kind: "descriptor",
          actionId: "motion.wordForward",
          key: "zx",
          modes: ["operatorPending"],
        },
      },
      { kind: "unmap", key: "zx", modes: ["operatorPending"] },
    ],
  }).options.keymap!;
  const deletePrefix = resolveNormalCommand(
    "d",
    undefined,
    operatorWithoutLastDescendant,
    "normal",
  );
  expect(deletePrefix.type).toBe("pending");
  if (deletePrefix.type !== "pending") throw new Error("expected delete pending");
  expect(resolveNormalCommand("z", deletePrefix.pending, operatorWithoutLastDescendant)).toEqual({
    type: "invalid",
  });

  const operatorWithSibling = resolveVimOptions(undefined, undefined, {
    kind: "success",
    warnings: [],
    operations: [
      {
        kind: "map",
        mapping: {
          kind: "descriptor",
          actionId: "motion.wordForward",
          key: "zx",
          modes: ["operatorPending"],
        },
      },
      {
        kind: "map",
        mapping: {
          kind: "descriptor",
          actionId: "motion.wordBackward",
          key: "zy",
          modes: ["operatorPending"],
        },
      },
      { kind: "unmap", key: "zx", modes: ["operatorPending"] },
    ],
  }).options.keymap!;
  const operatorPrefix = resolveNormalCommand("d", undefined, operatorWithSibling, "normal");
  expect(operatorPrefix.type).toBe("pending");
  if (operatorPrefix.type !== "pending") throw new Error("expected delete pending");
  const motionPrefix = resolveNormalCommand("z", operatorPrefix.pending, operatorWithSibling);
  expect(motionPrefix.type).toBe("pending");
  if (motionPrefix.type !== "pending") throw new Error("expected motion pending");
  expect(resolveNormalCommand("y", motionPrefix.pending, operatorWithSibling)).toMatchObject({
    type: "operatorMotion",
    motion: "wordBackward",
  });

  const tombstonedRepeat = resolveVimOptions(undefined, undefined, {
    kind: "success",
    warnings: [],
    operations: [
      {
        kind: "map",
        mapping: {
          kind: "descriptor",
          actionId: "operator.delete",
          key: "z",
          modes: ["normal"],
        },
      },
      { kind: "unmap", key: "z", modes: ["operatorPending"] },
    ],
  }).options.keymap!;
  const customDelete = resolveNormalCommand("z", undefined, tombstonedRepeat, "normal");
  expect(customDelete.type).toBe("pending");
  if (customDelete.type !== "pending") throw new Error("expected custom delete pending");
  expect(resolveNormalCommand("z", customDelete.pending, tombstonedRepeat)).toEqual({
    type: "invalid",
  });

  const normalOnlyCommand = resolveVimOptions(undefined, undefined, {
    kind: "success",
    warnings: [],
    operations: [
      {
        kind: "map",
        mapping: {
          kind: "descriptor",
          actionId: "command.undo",
          key: "zx",
          modes: ["normal"],
        },
      },
    ],
  }).options.keymap!;
  const pendingDelete = resolveNormalCommand("d", undefined, normalOnlyCommand, "normal");
  expect(pendingDelete.type).toBe("pending");
  if (pendingDelete.type !== "pending") throw new Error("expected delete pending");
  expect(resolveNormalCommand("z", pendingDelete.pending, normalOnlyCommand)).toEqual({
    type: "invalid",
  });

  const tombstonedOperatorCommands = resolveVimOptions(
    {
      piVim: {
        keymap: {
          commands: {
            startSearch: ["zx"],
            findChar: ["zy"],
            repeatCharSearch: ["zz"],
          },
        },
      },
    },
    undefined,
    {
      kind: "success",
      warnings: [],
      operations: [
        { kind: "unmap", key: "zx", modes: ["operatorPending"] },
        { kind: "unmap", key: "zy", modes: ["operatorPending"] },
        { kind: "unmap", key: "zz", modes: ["operatorPending"] },
      ],
    },
  ).options.keymap!;
  const operatorCommand = resolveNormalCommand("d", undefined, tombstonedOperatorCommands);
  expect(operatorCommand.type).toBe("pending");
  if (operatorCommand.type !== "pending") throw new Error("expected operator pending");
  expect(resolveNormalCommand("z", operatorCommand.pending, tombstonedOperatorCommands)).toEqual({
    type: "invalid",
  });
});

test("loads opaque finite action descriptors in canonical scopes", async () => {
  const f = fixture();
  try {
    f.write(`
export default (vim) => {
  vim.keymap.set("n", "H", vim.action.motion.wordForward(), { desc: "Next word" });
  vim.keymap.set("x", "Q", vim.action.motion.wordBackward());
  vim.keymap.set("o", "W", vim.action.textObject.target.word());
  vim.keymap.set("n", "undo", "undo");
};
`);
    const result = await loadVimJsConfig(f.path);
    expect(result.warnings).toEqual([]);
    expect(operations(result)).toEqual([
      {
        kind: "map",
        mapping: {
          kind: "descriptor",
          actionId: "motion.wordForward",
          key: "H",
          modes: ["normal"],
          desc: "Next word",
        },
      },
      {
        kind: "map",
        mapping: {
          kind: "descriptor",
          actionId: "motion.wordBackward",
          key: "Q",
          modes: ["visual", "visualLine", "visualBlock"],
        },
      },
      {
        kind: "map",
        mapping: {
          kind: "descriptor",
          actionId: "textObject.target.word",
          key: "W",
          modes: ["operatorPending"],
        },
      },
      {
        kind: "map",
        mapping: { kind: "remap", key: "undo", inputs: ["u", "n", "d", "o"], modes: ["normal"] },
      },
    ]);
    const resolved = resolveVimOptions(undefined, undefined, result);
    expect(resolved.plan.scopes.normal.exact.H).toEqual({
      kind: "keymap",
      id: "motion.wordForward",
    });
    expect(resolved.plan.scopes.visual.exact.Q).toEqual({
      kind: "keymap",
      id: "motion.wordBackward",
    });
    expect(resolved.plan.scopes.operatorPending.exact.W).toEqual({
      kind: "keymap",
      id: "textObject.target.word",
    });
    const keymap = resolved.options.keymap!;
    expect(resolveNormalCommand("H", undefined, keymap, "normal")).toMatchObject({
      type: "motion",
      motion: "wordForward",
    });
    const operator = resolveNormalCommand("d", undefined, keymap, "normal");
    expect(operator.type).toBe("pending");
    if (operator.type !== "pending") throw new Error("expected operator pending state");
    const kind = resolveNormalCommand("i", operator.pending, keymap, "normal");
    expect(kind.type).toBe("pending");
    if (kind.type !== "pending") throw new Error("expected text object pending state");
    expect(resolveNormalCommand("W", kind.pending, keymap, "normal")).toMatchObject({
      type: "operatorTextObject",
      textObject: { kind: "inner", target: "word" },
    });

    const customOperator = resolveVimOptions(undefined, undefined, {
      kind: "success",
      warnings: [],
      operations: [
        {
          kind: "map",
          mapping: {
            kind: "descriptor",
            actionId: "operator.delete",
            key: "Z",
            modes: ["normal"],
          },
        },
      ],
    }).options.keymap!;
    const pendingDelete = resolveNormalCommand("Z", undefined, customOperator, "normal");
    expect(pendingDelete.type).toBe("pending");
    if (pendingDelete.type !== "pending") throw new Error("expected custom operator pending state");
    expect(
      resolveNormalCommand("w", pendingDelete.pending, customOperator, "normal"),
    ).toMatchObject({
      type: "operatorMotion",
      operator: "delete",
      motion: "wordForward",
    });
  } finally {
    f.cleanup();
  }
});

test("insert descriptors reject multi-key lhs", async () => {
  const f = fixture();
  try {
    f.write(`
export default (vim) => {
  vim.keymap.set("i", "<A-x><A-y>", vim.action.insert.deleteWordBackward());
};
`);
    const result = await loadVimJsConfig(f.path);
    expect(result.warnings).toEqual([]);
    expect(operations(result)).toEqual([
      {
        kind: "map",
        mapping: {
          kind: "insert",
          action: "deleteWordBackward",
          key: encodeMappingTokens(["alt+x", "alt+y"]),
        },
      },
    ]);
    const resolved = resolveVimOptions(undefined, undefined, result);
    expect(resolved.warnings).toContainEqual(
      expect.stringContaining(
        "global JS config: piVim.keymap.insert.deleteWordBackward contains unsupported printable text sequence",
      ),
    );
    expect(resolved.plan.scopes.insert.exact).not.toHaveProperty("alt+xalt+y");
  } finally {
    f.cleanup();
  }
});

test("visual aliases reject commands not executable across every selected scope", async () => {
  const f = fixture();
  try {
    f.write(`
export default (vim) => {
  vim.keymap.set("v", "I", vim.action.command.insertLineStart());
  vim.keymap.set("visualBlock", "I", vim.action.command.insertLineStart());
};
`);
    const result = await loadVimJsConfig(f.path);
    expect(result.warnings).toEqual([
      "global JS config: command.insertLineStart does not support selected mode",
    ]);
    expect(operations(result)).toHaveLength(1);
  } finally {
    f.cleanup();
  }
});

test("operator-pending rejects mark descriptors", async () => {
  const f = fixture();
  try {
    f.write(`
export default (vim) => {
  vim.keymap.set("o", "M", vim.action.mark.jumpExact());
};
`);
    const result = await loadVimJsConfig(f.path);
    expect(result.warnings).toEqual([
      "global JS config: mark.jumpExact does not support selected mode",
    ]);
    expect(operations(result)).toEqual([]);
  } finally {
    f.cleanup();
  }
});

test("vim.g.mapleader uses final assignment for leader lhs without expanding rhs", async () => {
  const f = fixture();
  try {
    f.write(`
export default (vim) => {
  vim.g.mapleader = ",";
  vim.keymap.set("n", "<Leader>q", vim.action.operator.uppercase());
  vim.g.mapleader = " ";
  vim.keymap.set("n", "<leader>r", vim.action.operator.lowercase());
  vim.keymap.set("n", "<leader>x", "<leader>");
};
`);
    const loaded = await loadVimJsConfig(f.path);
    expect(loaded.warnings).toEqual([]);
    expect(operations(loaded)).toEqual([
      { kind: "leaf", path: "leader", value: "," },
      {
        kind: "map",
        mapping: {
          kind: "descriptor",
          actionId: "operator.uppercase",
          key: encodeMappingTokens(["<leader>", "q"]),
          modes: ["normal"],
        },
      },
      { kind: "leaf", path: "leader", value: " " },
      {
        kind: "map",
        mapping: {
          kind: "descriptor",
          actionId: "operator.lowercase",
          key: encodeMappingTokens(["<leader>", "r"]),
          modes: ["normal"],
        },
      },
      {
        kind: "map",
        mapping: {
          kind: "remap",
          key: encodeMappingTokens(["<leader>", "x"]),
          inputs: ["leader"],
          modes: ["normal"],
        },
      },
    ]);

    const resolved = resolveVimOptions(undefined, undefined, loaded);
    expect(resolved.options.leader).toBe(" ");
    expect(resolved.options.keymap?.scoped.map((binding) => binding.key)).toEqual([" q", " r"]);
    expect(resolved.options.keymap?.remaps.accepted).toEqual([
      { key: " x", inputs: ["leader"], modes: ["normal"] },
    ]);
  } finally {
    f.cleanup();
  }
});

test("invalid and null vim.g.mapleader assignments are field-local", async () => {
  const f = fixture();
  try {
    f.write(`
export default (vim) => {
  vim.g.mapleader = ",";
  vim.g.mapleader = "too-long";
  if (vim.g.mapleader !== ",") throw new Error("invalid write replaced staged leader");
  vim.keymap.set("n", "<leader>q", vim.action.operator.uppercase());
  vim.g.mapleader = null;
};
`);
    const loaded = await loadVimJsConfig(f.path);
    expect(operations(loaded).at(-1)).toEqual({ kind: "leaf", path: "leader", value: null });
    expect(loaded.warnings).toEqual([
      "global JS config: vim.g.mapleader must be one printable character or null",
    ]);
    const resolved = resolveVimOptions(undefined, undefined, loaded);
    expect(resolved.options.leader).toBeUndefined();
    expect(resolved.options.keymap?.leader).toBeUndefined();
    expect(resolved.options.keymap?.scoped).toEqual([]);
  } finally {
    f.cleanup();
  }
});

test("project JSON can override JS string remaps", () => {
  const result = resolveVimOptions(
    undefined,
    { piVim: { keymap: { commands: { insertBefore: ["z"] } } } },
    {
      appendKeymap: true,
      warnings: [],
      partial: {
        keymap: {
          remaps: { accepted: [{ key: "z", inputs: ["l"], modes: ["normal"] }] },
        },
      },
    },
  );

  expect(result.options.keymap?.remaps.accepted).toEqual([]);
  expect(result.options.keymap?.commands.insertBefore).toEqual(["z"]);
});

test("project exact action replaces inherited JS remap", () => {
  const result = resolveVimOptions(
    undefined,
    { piVim: { keymap: { commands: { redo: ["zq"] } } } },
    {
      kind: "success",
      warnings: [],
      operations: [
        {
          kind: "map",
          mapping: { kind: "remap", key: "zq", inputs: ["l"], modes: ["normal"] },
        },
      ],
    },
  );

  expect(result.options.keymap?.remaps.accepted).toEqual([]);
  expect(result.plan.scopes.normal.exact.zq?.id).toBe("command.redo");
});

test("project empty action removes JS descriptor across canonical scopes", () => {
  const result = resolveVimOptions(
    undefined,
    { piVim: { keymap: { motions: { wordForward: [] } } } },
    {
      kind: "success",
      warnings: [],
      operations: [
        {
          kind: "map",
          mapping: {
            kind: "descriptor",
            actionId: "motion.wordForward",
            key: "H",
            modes: ["normal", "operatorPending"],
          },
        },
      ],
    },
  );

  expect(result.plan.scopes.normal.exact.H).toBeUndefined();
  expect(result.plan.scopes.operatorPending.exact.H).toBeUndefined();
});

test("project empty insert action removes JS insert binding", () => {
  const result = resolveVimOptions(
    undefined,
    { piVim: { keymap: { insert: { deleteWordBackward: [] } } } },
    {
      kind: "success",
      warnings: [],
      operations: [
        { kind: "map", mapping: { kind: "insert", action: "deleteWordBackward", key: "alt+w" } },
      ],
    },
  );

  expect(result.warnings).toEqual([]);
  expect(result.options.keymap!.insert.deleteWordBackward).toEqual([]);
  expect(result.plan.scopes.insert.exact["alt+w"]).toBeUndefined();
});

test("insert action with only rejected keys keeps inherited bindings", () => {
  const result = resolveVimOptions(
    { piVim: { keymap: { insert: { deleteWordBackward: ["ctrl+w"] } } } },
    { piVim: { keymap: { insert: { deleteWordBackward: ["enter"] } } } },
  );

  expect(result.warnings.some((warning) => warning.includes("protected key enter"))).toBe(true);
  expect(result.options.keymap!.insert.deleteWordBackward).toEqual(["ctrl+w"]);
});

test("operator-pending unmaps suppress inherited motions and text objects", () => {
  const result = resolveVimOptions(undefined, undefined, {
    kind: "success",
    warnings: [],
    operations: [
      { kind: "unmap", key: "w", modes: ["operatorPending"] },
      { kind: "unmap", key: "i", modes: ["operatorPending"] },
      { kind: "unmap", key: "/", modes: ["operatorPending"] },
    ],
  });
  const keymap = result.options.keymap!;
  const pending = resolveNormalCommand("d", undefined, keymap, "normal");
  expect(pending.type).toBe("pending");
  if (pending.type !== "pending") throw new Error("expected operator pending state");
  expect(resolveNormalCommand("w", pending.pending, keymap, "normal").type).toBe("invalid");
  expect(resolveNormalCommand("i", pending.pending, keymap, "normal").type).toBe("invalid");
  expect(resolveNormalCommand("/", pending.pending, keymap, "normal").type).toBe("invalid");
});

test("project exact mappings restore lower JS unmaps", () => {
  const result = resolveVimOptions(
    undefined,
    { piVim: { keymap: { motions: { wordForward: ["w"] } } } },
    {
      kind: "success",
      warnings: [],
      operations: [{ kind: "unmap", key: "w", modes: ["normal"] }],
    },
  );

  expect(result.plan.scopes.normal.exact.w?.id).toBe("motion.wordForward");
});

test("project action replaces JS descriptor across canonical scopes", () => {
  const result = resolveVimOptions(
    undefined,
    { piVim: { keymap: { motions: { wordForward: ["L"] } } } },
    {
      kind: "success",
      warnings: [],
      operations: [
        {
          kind: "map",
          mapping: {
            kind: "descriptor",
            actionId: "motion.wordForward",
            key: "H",
            modes: ["normal", "operatorPending"],
          },
        },
      ],
    },
  );

  expect(result.plan.scopes.normal.exact.H).toBeUndefined();
  expect(result.plan.scopes.operatorPending.exact.H).toBeUndefined();
  expect(result.plan.scopes.normal.exact.L?.id).toBe("motion.wordForward");
  expect(result.plan.scopes.operatorPending.exact.L?.id).toBe("motion.wordForward");
});

test("later JS remap replaces lower action in only claimed scopes", () => {
  const result = resolveVimOptions(
    {
      piVim: { keymap: { operators: { uppercase: ["zq"] } } },
    },
    undefined,
    {
      kind: "success",
      warnings: [],
      operations: [
        {
          kind: "map",
          mapping: { kind: "remap", key: "zq", inputs: ["l"], modes: ["normal"] },
        },
      ],
    },
  );

  expect(result.plan.scopes.normal.exact.zq?.kind).toBe("remap");
  expect(result.plan.scopes.visual.exact.zq?.id).toBe("operator.uppercase");
  expect(result.options.keymap?.remaps.accepted).toEqual([
    { key: "zq", inputs: ["l"], modes: ["normal"] },
  ]);
});

test("action bindings on same key survive in disjoint modes", () => {
  const result = resolveVimOptions(undefined, undefined, {
    kind: "success",
    warnings: [],
    operations: [
      {
        kind: "map",
        mapping: {
          kind: "descriptor",
          actionId: "operator.uppercase",
          key: "zq",
          modes: ["normal"],
        },
      },
      {
        kind: "map",
        mapping: {
          kind: "descriptor",
          actionId: "operator.lowercase",
          key: "zq",
          modes: ["visual"],
        },
      },
    ],
  });

  expect(result.warnings).toEqual([]);
  expect(result.options.keymap?.scoped).toEqual([
    { actionId: "operator.uppercase", key: "zq", modes: ["normal"] },
    { actionId: "operator.lowercase", key: "zq", modes: ["visual"] },
  ]);
});

test("plan preflights remap strict-prefix conflicts in concrete scope", () => {
  const result = resolveVimOptions(
    { piVim: { keymap: { commands: { undo: ["za"] } } } },
    undefined,
    {
      kind: "success",
      warnings: [],
      operations: [
        {
          kind: "map",
          mapping: {
            kind: "remap",
            key: "zab",
            inputs: ["l"],
            modes: ["normal", "visual"],
          },
        },
      ],
    },
  );

  expect(result.plan.scopes.normal.exact.za?.id).toBe("command.undo");
  expect(result.plan.scopes.normal.exact.zab).toBeUndefined();
  expect(result.plan.scopes.visual.exact.zab?.kind).toBe("remap");
  expect(result.options.keymap?.remaps.accepted).toEqual([
    { key: "zab", inputs: ["l"], modes: ["visual"] },
  ]);
  expect(result.warnings).toEqual([
    expect.stringContaining("remap.zab in normal: strict-prefix conflict with command.undo.za"),
  ]);
});

test("printable plus sequences participate in strict-prefix preflight", () => {
  const result = resolveVimOptions(
    { piVim: { keymap: { commands: { undo: ["g+"] } } } },
    undefined,
    {
      kind: "success",
      warnings: [],
      operations: [
        {
          kind: "map",
          mapping: { kind: "remap", key: "g+x", inputs: ["l"], modes: ["normal"] },
        },
      ],
    },
  );

  expect(result.plan.scopes.normal.exact["g+"]?.id).toBe("command.undo");
  expect(result.plan.scopes.normal.exact["g+x"]).toBeUndefined();
  expect(result.plan.scopes.normal.prefixes["g+"]).toBeUndefined();
  expect(result.warnings).toEqual([
    expect.stringContaining("remap.g+x in normal: strict-prefix conflict with command.undo.g+"),
  ]);
});

test("preserves source order across descriptor and remap mapping kinds", () => {
  const result = resolveVimOptions(undefined, undefined, {
    kind: "success",
    warnings: [],
    operations: [
      {
        kind: "map",
        mapping: {
          kind: "descriptor",
          actionId: "command.undo",
          key: "zz",
          modes: ["normal"],
        },
      },
      {
        kind: "map",
        mapping: { kind: "remap", key: "z", inputs: ["u"], modes: ["normal"] },
      },
    ],
  });

  expect(result.plan.scopes.normal.exact.zz?.id).toBe("command.undo");
  expect(result.plan.scopes.normal.exact.z).toBeUndefined();
  expect(result.warnings).toContainEqual(
    expect.stringContaining("remap.z in normal: strict-prefix conflict with command.undo.zz"),
  );
});

test("treats modified key plus trailing keys as a sequence during prefix preflight", () => {
  const result = resolveVimOptions(undefined, undefined, {
    kind: "success",
    warnings: [],
    operations: [
      {
        kind: "map",
        mapping: {
          kind: "descriptor",
          actionId: "command.undo",
          key: "alt+x",
          modes: ["normal"],
        },
      },
      {
        kind: "map",
        mapping: {
          kind: "descriptor",
          actionId: "command.redo",
          key: "alt+xa",
          modes: ["normal"],
        },
      },
    ],
  });

  expect(result.plan.scopes.normal.exact["alt+x"]?.id).toBe("command.undo");
  expect(result.plan.scopes.normal.exact["alt+xa"]).toBeUndefined();
  expect(result.plan.scopes.normal.prefixes["alt+x"]).toBeUndefined();
  expect(result.warnings).toContainEqual(
    expect.stringContaining(
      "command.redo.alt+xa in normal: strict-prefix conflict with command.undo.alt+x",
    ),
  );
});

test("preserves terminal-key token boundaries during prefix preflight", () => {
  const escapeThenA = encodeMappingTokens(["escape", "a"]);
  const altZThenA = encodeMappingTokens(["alt+z", "a"]);
  const altZThenCtrlY = encodeMappingTokens(["alt+z", "ctrl+y"]);
  const result = resolveVimOptions(undefined, undefined, {
    kind: "success",
    warnings: [],
    operations: [
      {
        kind: "map",
        mapping: {
          kind: "descriptor",
          actionId: "command.undo",
          key: "e",
          modes: ["normal"],
        },
      },
      {
        kind: "map",
        mapping: {
          kind: "descriptor",
          actionId: "command.redo",
          key: escapeThenA,
          modes: ["normal"],
        },
      },
      {
        kind: "map",
        mapping: {
          kind: "descriptor",
          actionId: "command.pasteAfter",
          key: altZThenA,
          modes: ["normal"],
        },
      },
      {
        kind: "map",
        mapping: {
          kind: "descriptor",
          actionId: "command.pasteBefore",
          key: altZThenCtrlY,
          modes: ["normal"],
        },
      },
    ],
  });

  expect(result.warnings).toEqual([]);
  expect(result.plan.scopes.normal.exact.e?.id).toBe("command.undo");
  expect(result.plan.scopes.normal.exact[escapeThenA]?.id).toBe("command.redo");
  expect(result.plan.scopes.normal.exact[altZThenA]?.id).toBe("command.pasteAfter");
  expect(result.plan.scopes.normal.exact[altZThenCtrlY]?.id).toBe("command.pasteBefore");
  expect(result.plan.scopes.normal.prefixes.escape).toEqual([escapeThenA]);
  expect(result.plan.scopes.normal.prefixes["alt+z"]).toEqual([altZThenA, altZThenCtrlY]);
  const specialPrefix = resolveNormalCommand("escape", undefined, result.options.keymap!, "normal");
  expect(specialPrefix).toEqual({ type: "pending", pending: "escape" });
  if (specialPrefix.type !== "pending") throw new Error("expected named-key prefix");
  expect(
    resolveNormalCommand("a", specialPrefix.pending, result.options.keymap!, "normal"),
  ).toMatchObject({ type: "command", command: "redo" });

  const literalEscapeA = encodeMappingTokens(["e", "s", "c", "a", "p", "e", "a"]);
  const literal = resolveVimOptions(undefined, undefined, {
    kind: "success",
    warnings: [],
    operations: [
      {
        kind: "map",
        mapping: {
          kind: "descriptor",
          actionId: "command.undo",
          key: "e",
          modes: ["normal"],
        },
      },
      {
        kind: "map",
        mapping: {
          kind: "descriptor",
          actionId: "command.redo",
          key: literalEscapeA,
          modes: ["normal"],
        },
      },
    ],
  });
  expect(literal.plan.scopes.normal.exact[literalEscapeA]).toBeUndefined();
  expect(literal.warnings).toContainEqual(
    expect.stringContaining("strict-prefix conflict with command.undo.e"),
  );
});

test("canonicalizes modifier order and rejects duplicate modifiers", async () => {
  const f = fixture();
  try {
    f.write(`
export default (vim) => {
  vim.keymap.set("n", "<C-S-x>", vim.action.command.undo());
  vim.keymap.set("n", "<C-C-x>", vim.action.command.redo());
};`);
    const result = await loadVimJsConfig(f.path);
    expect(operations(result)).toEqual([
      {
        kind: "map",
        mapping: {
          kind: "descriptor",
          actionId: "command.undo",
          key: "shift+ctrl+x",
          modes: ["normal"],
        },
      },
    ]);
    expect(result.warnings).toContainEqual(
      expect.stringContaining("keymap keys must contain supported key syntax"),
    );
    const keymap = resolveVimOptions(undefined, undefined, result).options.keymap!;
    expect(resolveNormalCommand("shift+ctrl+x", undefined, keymap, "normal")).toMatchObject({
      type: "command",
      command: "undo",
    });
  } finally {
    f.cleanup();
  }
});

test("latest same-scope JS exact mapping wins", () => {
  const result = resolveVimOptions(undefined, undefined, {
    kind: "success",
    warnings: [],
    operations: [
      {
        kind: "map",
        mapping: {
          kind: "descriptor",
          actionId: "operator.uppercase",
          key: "zq",
          modes: ["normal"],
        },
      },
      {
        kind: "map",
        mapping: {
          kind: "descriptor",
          actionId: "operator.lowercase",
          key: "zq",
          modes: ["normal"],
        },
      },
    ],
  });

  expect(result.warnings).toEqual([]);
  expect(result.options.keymap?.scoped).toEqual([
    { actionId: "operator.lowercase", key: "zq", modes: ["normal"] },
  ]);
  expect(result.plan.scopes.normal.exact.zq?.id).toBe("operator.lowercase");
});

test("project leader actions override lower JS remaps after final expansion", () => {
  const result = resolveVimOptions(
    undefined,
    {
      piVim: {
        leader: ",",
        keymap: { commands: { redo: ["<leader>u"] } },
      },
    },
    {
      kind: "success",
      warnings: [],
      operations: [
        {
          kind: "map",
          mapping: { kind: "remap", key: ",u", inputs: ["l"], modes: ["normal"] },
        },
      ],
    },
  );

  expect(result.options.keymap?.remaps.accepted).toEqual([]);
  expect(result.plan.scopes.normal.exact[encodeMappingTokens([",", "u"])]?.id).toBe("command.redo");
});

test("JS escape descriptors stay in selected scopes", () => {
  const result = resolveVimOptions(undefined, undefined, {
    kind: "success",
    warnings: [],
    operations: [
      {
        kind: "map",
        mapping: {
          kind: "descriptor",
          actionId: "escape",
          key: "alt+z",
          modes: ["insert"],
        },
      },
    ],
  });

  expect(result.plan.scopes.insert.exact["alt+z"]?.kind).toBe("escape");
  for (const scope of ["visual", "visualLine", "visualBlock", "operatorPending"] as const) {
    expect(result.plan.scopes[scope].exact["alt+z"]).toBeUndefined();
  }
});

test("project command mappings replace JS descriptors in visual scopes", () => {
  const result = resolveVimOptions(
    undefined,
    { piVim: { keymap: { commands: { toggleCase: ["Q"] } } } },
    {
      kind: "success",
      warnings: [],
      operations: [
        {
          kind: "map",
          mapping: {
            kind: "descriptor",
            actionId: "command.toggleCase",
            key: "X",
            modes: ["visual", "visualLine", "visualBlock"],
          },
        },
      ],
    },
  );

  expect(result.plan.scopes.visual.exact.X).toBeUndefined();
  expect(result.plan.scopes.visual.exact.Q?.id).toBe("command.toggleCase");
});

test("project escape mappings override lower JS mappings in escape scopes", () => {
  const result = resolveVimOptions(
    undefined,
    { piVim: { keymap: { escape: ["<D-j>"] } } },
    {
      kind: "success",
      warnings: [],
      operations: [
        {
          kind: "map",
          mapping: {
            kind: "remap",
            key: "super+j",
            inputs: ["l"],
            modes: ["visual", "visualLine", "visualBlock"],
          },
        },
        {
          kind: "map",
          mapping: { kind: "insert", action: "openLineBelow", key: "super+j" },
        },
      ],
    },
  );

  expect(result.options.keymap?.remaps.accepted).toEqual([]);
  expect(result.options.keymap?.insert.openLineBelow).not.toContain("super+j");
  for (const scope of ["insert", "visual", "visualLine", "visualBlock"] as const) {
    expect(result.plan.scopes[scope].exact["super+j"]?.kind).toBe("escape");
  }
});

test("project escape array replaces lower JS escape descriptors", () => {
  const result = resolveVimOptions(
    undefined,
    { piVim: { keymap: { escape: ["<C-[>"] } } },
    {
      kind: "success",
      warnings: [],
      operations: [
        {
          kind: "map",
          mapping: {
            kind: "descriptor",
            actionId: "escape",
            key: "alt+z",
            modes: ["insert", "visual", "visualLine", "visualBlock", "operatorPending"],
          },
        },
      ],
    },
  );

  for (const scope of [
    "insert",
    "visual",
    "visualLine",
    "visualBlock",
    "operatorPending",
  ] as const) {
    expect(result.plan.scopes[scope].exact["alt+z"]).toBeUndefined();
    expect(result.plan.scopes[scope].exact["ctrl+["]?.kind).toBe("escape");
  }
});

test("rejected insert descriptors do not reappear in scoped plan", () => {
  const result = resolveVimOptions(undefined, undefined, {
    kind: "success",
    warnings: [],
    operations: [
      {
        kind: "map",
        mapping: {
          kind: "descriptor",
          actionId: "insert.deleteWordBackward",
          key: "a",
          modes: ["insert"],
        },
      },
    ],
  });

  expect(result.options.keymap?.scoped).toEqual([]);
  expect(result.plan.scopes.insert.exact.a).toBeUndefined();
});

test("invalid remap modes are dropped", () => {
  const result = resolveVimOptions(undefined, undefined, {
    appendKeymap: true,
    warnings: [],
    partial: {
      keymap: {
        remaps: {
          accepted: [{ key: "zz", inputs: ["l"], modes: ["insert" as never] }],
        },
      },
    },
  });

  expect(result.options.keymap?.remaps.accepted).toEqual([]);
});

test("string rhs maps to replayed key inputs", async () => {
  const f = fixture();
  try {
    f.write(`
export default (vim) => {
  vim.keymap.set("n", "zz", "llll");
  vim.keymap.set("n", "ZD", ":vimdoctor<CR>");
  vim.keymap.set("n", "ZE", "i<Esc><Tab>");
};
`);
    const result = await loadVimJsConfig(f.path);
    expect(operations(result)).toEqual([
      {
        kind: "map",
        mapping: { kind: "remap", key: "zz", inputs: ["l", "l", "l", "l"], modes: ["normal"] },
      },
      {
        kind: "map",
        mapping: {
          kind: "remap",
          key: "ZD",
          inputs: [":", "v", "i", "m", "d", "o", "c", "t", "o", "r", "\r"],
          modes: ["normal"],
        },
      },
      {
        kind: "map",
        mapping: { kind: "remap", key: "ZE", inputs: ["i", "\x1b", "\t"], modes: ["normal"] },
      },
    ]);
    expect(result.warnings).toEqual([]);
  } finally {
    f.cleanup();
  }
});

test("rejects null and empty arguments for no-argument descriptors", async () => {
  const f = fixture();
  try {
    f.write(`export default (vim) => {
  vim.keymap.set("n", "H", vim.action.motion.wordForward(null));
  vim.keymap.set("n", "L", vim.action.motion.wordForward({}));
};`);
    const result = await loadVimJsConfig(f.path);
    expect(operations(result)).toEqual([]);
    expect(result.warnings).toEqual([
      "global JS config: motion.wordForward does not accept these arguments",
      "global JS config: motion.wordForward does not accept these arguments",
    ]);
  } finally {
    f.cleanup();
  }
});

test("per-binding options survive descriptor and replay compilation", async () => {
  const f = fixture();
  try {
    f.write(`
export default (vim) => {
  vim.keymap.set("n", "<C-p>", vim.action.operator.uppercase(), { allowProtected: true, desc: "Upper" });
  vim.keymap.set("i", "<C-v>", vim.prompt.deleteWordBackward(), { allowProtected: true });
  vim.keymap.set("n", "<C-t>", "j", { allowProtected: true, desc: "Replay down" });
  vim.keymap.set("n", "<C-g>", vim.action.operator.lowercase());
};`);
    const loaded = await loadVimJsConfig(f.path);
    const resolved = resolveVimOptions(undefined, undefined, loaded);
    expect(resolved.options.keymap?.scoped).toContainEqual({
      actionId: "operator.uppercase",
      key: "ctrl+p",
      modes: ["normal"],
      allowProtected: true,
      desc: "Upper",
    });
    expect(resolved.options.keymap?.insert.deleteWordBackward).toContain("ctrl+v");
    expect(resolved.options.keymap?.remaps.accepted).toContainEqual({
      key: "ctrl+t",
      inputs: ["j"],
      modes: ["normal"],
      allowProtected: true,
      desc: "Replay down",
    });
    expect(resolved.plan.scopes.normal.exact["ctrl+t"]?.kind).toBe("remap");
    expect(resolved.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining("protected key ctrl+g")]),
    );
    expect(resolved.options.keymap?.scoped).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ key: "ctrl+g" })]),
    );
  } finally {
    f.cleanup();
  }
});

test("protected lhs warns without registering", async () => {
  const f = fixture();
  try {
    f.write(`
export default (vim) => {
  vim.g.mapleader = ",";
  vim.keymap.set("n", "<C-p>", "j");
  vim.keymap.set("n", "<leader><C-p>", vim.action.operator.uppercase());
};
`);
    const result = await loadVimJsConfig(f.path);
    expect(operations(result)).toEqual([{ kind: "leaf", path: "leader", value: "," }]);
    expect(result.warnings).toEqual([
      expect.stringContaining("keymap keys contain protected key ctrl+p"),
      expect.stringContaining("keymap keys contain protected key ctrl+p"),
    ]);
  } finally {
    f.cleanup();
  }
});

test("invalid default export and rhs warn without throwing", async () => {
  const f = fixture();
  try {
    f.write(`export default (vim) => vim.keymap.set("i", "aa", "bb");`);
    const result = await loadVimJsConfig(f.path);
    expect(operations(result)).toEqual([]);
    expect(result.warnings).toEqual([
      "global JS config: string targets only support normal and visual modes",
    ]);
  } finally {
    f.cleanup();
  }
});

test("unknown leaf writes warn without discarding valid staged siblings", async () => {
  const f = fixture();
  try {
    f.write(`
export default (vim) => {
  vim.g.mapleader = ",";
  vim.g.unknown = true;
  vim.keymap.set("n", "zq", vim.action.operator.uppercase());
};
`);
    const loaded = await loadVimJsConfig(f.path);
    expect(loaded.warnings).toEqual(["global JS config: unknown vim.g property unknown"]);
    expect(operations(loaded)).toEqual([
      { kind: "leaf", path: "leader", value: "," },
      {
        kind: "map",
        mapping: {
          kind: "descriptor",
          actionId: "operator.uppercase",
          key: "zq",
          modes: ["normal"],
        },
      },
    ]);
  } finally {
    f.cleanup();
  }
});

test("stages preset and scoped unmap operations in source order", async () => {
  const f = fixture();
  try {
    f.write(`
export default (vim) => {
  vim.preset = "minimal";
  vim.g.mapleader = ",";
  vim.keymap.set("n", "zq", vim.action.operator.uppercase());
  vim.keymap.set("v", "zq", vim.action.operator.lowercase());
  vim.keymap.set("n", "zq", null);
};
`);
    const loaded = await loadVimJsConfig(f.path);
    expect(operations(loaded)).toEqual([
      { kind: "preset", preset: "minimal" },
      { kind: "leaf", path: "leader", value: "," },
      {
        kind: "map",
        mapping: {
          kind: "descriptor",
          actionId: "operator.uppercase",
          key: "zq",
          modes: ["normal"],
        },
      },
      {
        kind: "map",
        mapping: {
          kind: "descriptor",
          actionId: "operator.lowercase",
          key: "zq",
          modes: ["visual", "visualLine", "visualBlock"],
        },
      },
      { kind: "unmap", key: "zq", modes: ["normal"] },
    ]);

    const resolved = resolveVimOptions(undefined, undefined, loaded);
    expect(resolved.options.macros?.enabled).toBe(false);
    expect(resolved.options.marks?.enabled).toBe(false);
    expect(resolved.options.keymap?.scoped).toEqual([
      {
        actionId: "operator.lowercase",
        key: "zq",
        modes: ["visual", "visualLine", "visualBlock"],
      },
    ]);
  } finally {
    f.cleanup();
  }
});

test("leader-form unmaps suppress inherited bindings after expansion", async () => {
  const f = fixture();
  try {
    f.write(`export default (vim) => {
  vim.g.mapleader = ",";
  vim.keymap.set("n", "<leader>x", null);
};`);
    const loaded = await loadVimJsConfig(f.path);
    const resolved = resolveVimOptions(
      {
        piVim: {
          leader: ",",
          keymap: { commands: { undo: ["<leader>x"] } },
        },
      },
      undefined,
      loaded,
    );
    expect(resolved.plan.scopes.normal.exact[",x"]).toBeUndefined();
    expect(resolved.options.keymap?.unmaps).toEqual([{ key: ",x", modes: ["normal"] }]);
  } finally {
    f.cleanup();
  }
});

test("leader-form scoped descriptors reserve the expanded leader prefix", async () => {
  const f = fixture();
  try {
    f.write(`export default (vim) => {
  vim.g.mapleader = ",";
  vim.keymap.set("n", "<leader>u", vim.action.command.undo());
};`);
    const resolved = resolveVimOptions(undefined, undefined, await loadVimJsConfig(f.path));
    expect(resolved.options.keymap?.leader).toBe(",");
    expect(resolved.options.keymap?.scoped).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          actionId: "command.undo",
          key: encodeMappingTokens([",", "u"]),
          modes: ["normal"],
        }),
      ]),
    );
  } finally {
    f.cleanup();
  }
});

test("project text-object bindings replace matching JS descriptors", () => {
  const resolved = resolveVimOptions(
    undefined,
    {
      piVim: {
        keymap: { textObjects: { kinds: { inner: ["z"] } } },
      },
    },
    {
      kind: "success",
      warnings: [],
      operations: [
        {
          kind: "map",
          mapping: {
            kind: "descriptor",
            actionId: "textObject.kind.inner",
            key: "i",
            modes: ["operatorPending"],
          },
        },
      ],
    },
  );
  expect(resolved.options.keymap?.scoped).not.toEqual(
    expect.arrayContaining([expect.objectContaining({ actionId: "textObject.kind.inner" })]),
  );
});

test("unmaps inherited grammar in only selected scopes", async () => {
  const f = fixture();
  try {
    f.write(`export default (vim) => vim.keymap.set("n", "w", null);`);
    const resolved = resolveVimOptions(undefined, undefined, await loadVimJsConfig(f.path));
    const keymap = resolved.options.keymap;
    expect(resolved.plan.scopes.normal.exact.w).toBeUndefined();
    expect(resolved.plan.scopes.visual.exact.w?.id).toBe("motion.wordForward");
    expect(resolveNormalCommand("w", undefined, keymap, "normal").type).toBe("none");
    expect(resolveNormalCommand("w", undefined, keymap, "visual")).toMatchObject({
      type: "motion",
      motion: "wordForward",
    });
  } finally {
    f.cleanup();
  }
});

test("keeps mappings declared after an unmap", async () => {
  const f = fixture();
  try {
    f.write(`export default (vim) => {
  vim.keymap.set("n", "zq", null);
  vim.keymap.set("n", "zq", vim.action.operator.uppercase());
};`);
    const resolved = resolveVimOptions(undefined, undefined, await loadVimJsConfig(f.path));
    expect(resolved.options.keymap?.scoped).toEqual([
      { actionId: "operator.uppercase", key: "zq", modes: ["normal"] },
    ]);
  } finally {
    f.cleanup();
  }
});

test("re-evaluates root config on every load", async () => {
  const f = fixture();
  const loadKey = "__piVimRootLoadCount";
  try {
    f.write(`
export default (vim) => {
  globalThis[${JSON.stringify(loadKey)}] = (globalThis[${JSON.stringify(loadKey)}] ?? 0) + 1;
  vim.g.mapleader = globalThis[${JSON.stringify(loadKey)}] === 1 ? "," : " ";
};
`);
    const first = await loadVimJsConfig(f.path);
    const second = await loadVimJsConfig(f.path);
    expect(operations(first)).toEqual([{ kind: "leaf", path: "leader", value: "," }]);
    expect(operations(second)).toEqual([{ kind: "leaf", path: "leader", value: " " }]);
  } finally {
    Reflect.deleteProperty(globalThis, loadKey);
    f.cleanup();
  }
});

test("returns fatal results without staged operations after import or export failure", async () => {
  const importFailure = fixture();
  const syntaxFailure = fixture();
  const exportFailure = fixture();
  try {
    importFailure.write(`import "./missing-helper.js"; export default () => {};`);
    const failedImport = await loadVimJsConfig(importFailure.path);
    expect(failedImport.kind).toBe("fatal");
    expect(failedImport.warnings[0]).toContain("failed to load");

    syntaxFailure.write(`export default (`);
    const failedSyntax = await loadVimJsConfig(syntaxFailure.path);
    expect(failedSyntax.kind).toBe("fatal");
    expect(failedSyntax.warnings[0]).toContain("failed to load");

    exportFailure.write(`
export default async (vim) => {
  vim.g.mapleader = ",";
  await Promise.resolve();
  throw new Error("export failure");
};
`);
    const failedExport = await loadVimJsConfig(exportFailure.path);
    expect(failedExport).toEqual({
      kind: "fatal",
      warnings: ["global JS config: failed to load (export failure)"],
    });

    const resolved = resolveVimOptions(
      { piVim: { startMode: "normal" } },
      { piVim: { leader: " " } },
      failedExport,
    );
    expect(resolved.options.startMode).toBe("normal");
    expect(resolved.options.leader).toBe(" ");
    expect(resolved.options.keymap?.scoped).toEqual([]);
  } finally {
    importFailure.cleanup();
    syntaxFailure.cleanup();
    exportFailure.cleanup();
  }
});

test("closes retained APIs after synchronous and asynchronous exports", async () => {
  for (const asyncExport of [false, true]) {
    const f = fixture();
    const retainedKey = `__piVimRetained${asyncExport}`;
    try {
      f.write(`
export default ${asyncExport ? "async " : ""}(vim) => {
  globalThis[${JSON.stringify(retainedKey)}] = vim;
  vim.g.mapleader = ",";
  ${asyncExport ? "return Promise.resolve();" : ""}
};
`);
      const loaded = await loadVimJsConfig(f.path);
      const retained = Reflect.get(globalThis, retainedKey) as {
        g: { mapleader: string | null };
        keymap: { set(mode: string, keys: string, target: string): void };
      };
      expect(() => {
        retained.g.mapleader = " ";
      }).toThrow("config session closed");
      expect(() => retained.keymap.set("n", "zq", "q")).toThrow("config session closed");
      expect(() => Object.defineProperty(retained.g, "mapleader", { value: " " })).toThrow(
        "config session closed",
      );
      expect(operations(loaded)).toEqual([{ kind: "leaf", path: "leader", value: "," }]);
    } finally {
      Reflect.deleteProperty(globalThis, retainedKey);
      f.cleanup();
    }
  }
});

test("closes synchronous exports before queued writes run", async () => {
  const f = fixture();
  const errorKey = "__piVimQueuedWriteError";
  try {
    f.write(`
export default (vim) => {
  vim.g.mapleader = ",";
  queueMicrotask(() => {
    try {
      vim.g.mapleader = " ";
    } catch (error) {
      globalThis[${JSON.stringify(errorKey)}] = error.message;
    }
  });
};
`);
    const loaded = await loadVimJsConfig(f.path);
    expect(Reflect.get(globalThis, errorKey)).toBe("config session closed");
    expect(operations(loaded)).toEqual([{ kind: "leaf", path: "leader", value: "," }]);
  } finally {
    Reflect.deleteProperty(globalThis, errorKey);
    f.cleanup();
  }
});

test("uses global JSON leader as staged read seed and freezes operation snapshots", async () => {
  const f = fixture();
  try {
    f.write(`
export default (vim) => {
  if (vim.g.mapleader !== ",") throw new Error("missing global seed");
  vim.keymap.set("n", "zq", vim.action.operator.uppercase());
};
`);
    const loaded = await loadVimJsConfig(f.path, { leader: "," });
    const stagedOperations = operations(loaded);
    expect(Object.isFrozen(stagedOperations)).toBe(true);
    expect(Object.isFrozen(stagedOperations[0])).toBe(true);
    expect(
      Object.isFrozen(stagedOperations[0]?.kind === "map" ? stagedOperations[0].mapping : {}),
    ).toBe(true);
  } finally {
    f.cleanup();
  }
});

test("applies presets to staged reads and replaces UI mode label records", async () => {
  const dir = mkdtempSync(join(tmpdir(), "pi-vim-js-ui-labels-"));
  try {
    const globalPath = join(dir, "settings.json");
    const jsConfigPath = join(dir, "pi-vim.config.js");
    writeFileSync(
      globalPath,
      JSON.stringify({
        piVim: {
          ui: {
            mode: {
              labels: { insert: "GLOBAL-INSERT" },
              narrowLabels: { insert: "GI" },
            },
          },
        },
      }),
    );
    writeFileSync(
      jsConfigPath,
      `export default (vim) => {
  vim.preset = "vim-heavy";
  if (vim.startMode !== "normal") throw new Error("preset did not update staged reads");
  vim.ui.mode.labels = { normal: "JS-NORMAL" };
  vim.ui.mode.narrowLabels = { normal: "JN" };
};`,
    );

    const result = await loadVimOptions({
      globalSettingsPath: globalPath,
      projectSettingsPath: join(dir, "missing-project-settings.json"),
      jsConfigPath,
    });
    expect(result.options.ui?.mode.labels).toMatchObject({ normal: "JS-NORMAL" });
    expect(Object.keys(result.options.ui?.mode.labels ?? {})).toEqual(["normal"]);
    expect(result.options.ui?.mode.narrowLabels).toMatchObject({ normal: "JN" });
    expect(Object.keys(result.options.ui?.mode.narrowLabels ?? {})).toEqual(["normal"]);
    expect(result.warnings).toEqual([]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("replays preset and leaf operations in source order", () => {
  const afterLeaf = resolveVimOptions(undefined, undefined, {
    kind: "success",
    warnings: [],
    operations: [
      { kind: "leaf", path: "startMode", value: "insert" },
      { kind: "preset", preset: "vim-heavy" },
    ],
  });
  const afterPreset = resolveVimOptions(undefined, undefined, {
    kind: "success",
    warnings: [],
    operations: [
      { kind: "preset", preset: "vim-heavy" },
      { kind: "leaf", path: "startMode", value: "insert" },
    ],
  });

  expect(afterLeaf.options.startMode).toBe("normal");
  expect(afterPreset.options.startMode).toBe("insert");
});

test("exposes validated domain options from global JSON without project settings", async () => {
  const dir = mkdtempSync(join(tmpdir(), "pi-vim-js-options-"));
  try {
    const globalPath = join(dir, "settings.json");
    const projectPath = join(dir, "project-settings.json");
    const jsConfigPath = join(dir, "pi-vim.config.js");
    writeFileSync(globalPath, JSON.stringify({ piVim: { startMode: "normal" } }));
    writeFileSync(projectPath, JSON.stringify({ piVim: { startMode: "insert" } }));
    writeFileSync(
      jsConfigPath,
      `export default (vim) => {
  if (vim.startMode !== "normal") throw new Error("missing global seed");
  vim.cursor.normal = "bar";
  vim.ui.status.items = ["mode"];
  vim.macros.enabled = false;
  vim.marks.enabled = false;
  vim.search.maxHighlights = 10;
  vim.exCommand.autocomplete = false;
  vim.feedback.noop = "status";
  vim.promptStructures.targets = { codeFence: false };
  vim.keymap.operatorMotions = { delete: ["wordForward"] };
};`,
    );

    const result = await loadVimOptions({
      globalSettingsPath: globalPath,
      projectSettingsPath: projectPath,
      jsConfigPath,
    });
    expect(result.options.startMode).toBe("insert");
    expect(result.options.cursor.normal).toBe("bar");
    expect(result.options.ui?.status.items).toEqual(["mode"]);
    expect(result.options.macros?.enabled).toBe(false);
    expect(result.options.marks?.enabled).toBe(false);
    expect(result.options.search?.maxHighlights).toBe(10);
    expect(result.options.exCommand?.autocomplete).toBe(false);
    expect(result.options.feedback?.noop).toBe("status");
    expect(result.options.promptStructures?.targets).toMatchObject({ codeFence: false });
    expect(Object.keys(result.options.promptStructures?.targets ?? [])).toEqual(["codeFence"]);
    expect(result.options.keymap?.operatorMotions).toMatchObject({ delete: ["wordForward"] });
    expect(Object.keys(result.options.keymap?.operatorMotions ?? [])).toEqual(["delete"]);
    expect(result.warnings).toEqual([]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("exposes every finite option path through trusted JavaScript", async () => {
  const f = fixture();
  try {
    f.write(`export default (vim) => {
  vim.leader = ",";
  vim.startMode = "normal";
  vim.cursor.insert = "underline";
  vim.cursor.normal = "bar";
  vim.cursor.visual = "block";
  vim.cursor.visualLine = "underline";
  vim.cursor.visualBlock = "bar";
  vim.keymap.operatorMotions = { delete: ["wordForward"] };
  vim.ui.status.enabled = false;
  vim.ui.status.position = "right";
  vim.ui.status.items = ["mode"];
  vim.ui.mode.enabled = false;
  vim.ui.mode.labels = { normal: "NORMAL" };
  vim.ui.mode.narrowLabels = { normal: "N" };
  vim.ui.selection.enabled = false;
  vim.ui.selection.previewMaxChars = 24;
  vim.ui.cursorPosition.enabled = false;
  vim.ui.cursorPosition.base = 1;
  vim.ui.cursorPosition.format = "{line}:{column}";
  vim.ui.workbench.reservedRows = 3;
  vim.macros.enabled = false;
  vim.macros.slots = ["a"];
  vim.macros.maxReplaySteps = 12;
  vim.marks.enabled = false;
  vim.marks.slots = ["a"];
  vim.search.highlight = false;
  vim.search.highlightCurrent = false;
  vim.search.clearOnCancel = false;
  vim.search.clearOnInsert = true;
  vim.search.maxHighlights = 12;
  vim.exCommand.autocomplete = false;
  vim.feedback.noop = "status";
  vim.promptStructures.enabled = false;
  vim.promptStructures.targets = { codeFence: false };
};`);
    const result = await loadVimOptions({
      globalSettingsPath: join(tmpdir(), "missing-settings.json"),
      projectSettingsPath: join(tmpdir(), "missing-project-settings.json"),
      jsConfigPath: f.path,
    });

    expect(result.options).toMatchObject({
      leader: ",",
      startMode: "normal",
      cursor: {
        insert: "underline",
        normal: "bar",
        visual: "block",
        visualLine: "underline",
        visualBlock: "bar",
      },
      keymap: { operatorMotions: { delete: ["wordForward"] } },
      ui: {
        status: { enabled: false, position: "right", items: ["mode"] },
        mode: { enabled: false, labels: { normal: "NORMAL" }, narrowLabels: { normal: "N" } },
        selection: { enabled: false, previewMaxChars: 24 },
        cursorPosition: { enabled: false, base: 1, format: "{line}:{column}" },
        workbench: { reservedRows: 3 },
      },
      macros: { enabled: false, slots: ["a"], maxReplaySteps: 12 },
      marks: { enabled: false, slots: ["a"] },
      search: {
        highlight: false,
        highlightCurrent: false,
        clearOnCancel: false,
        clearOnInsert: true,
        maxHighlights: 12,
      },
      exCommand: { autocomplete: false },
      feedback: { noop: "status" },
      promptStructures: { enabled: false, targets: { codeFence: false } },
    });
    expect(result.warnings).toEqual([]);
  } finally {
    f.cleanup();
  }
});

test("rejects invalid composite writes without changing frozen staged reads", async () => {
  const f = fixture();
  try {
    f.write(`export default (vim) => {
  const slots = vim.macros.slots;
  if (!Object.isFrozen(slots)) throw new Error("slots must be frozen");
  vim.macros.slots = ["a", "!"];
  if (vim.macros.slots.join(",") !== slots.join(",")) throw new Error("invalid slots replaced staged value");
  vim.macros.enabled = false;
  vim.search.unknown = true;
};`);
    const result = await loadVimOptions({
      globalSettingsPath: join(tmpdir(), "missing-settings.json"),
      projectSettingsPath: join(tmpdir(), "missing-project-settings.json"),
      jsConfigPath: f.path,
    });
    expect(result.options.macros?.enabled).toBe(false);
    expect(result.warnings).toEqual([
      "global JS config: piVim.macros.slots only supports lowercase a-z slots",
      "global JS config: unknown vim.search property unknown",
    ]);
  } finally {
    f.cleanup();
  }
});

test("rejects invalid prompt records and accepts empty replacements", async () => {
  const f = fixture();
  try {
    f.write(`export default (vim) => {
  vim.promptStructures.targets = { codeFence: false };
  vim.promptStructures.targets = { codeFence: true, unknown: true };
};`);
    const rejected = await loadVimOptions({
      globalSettingsPath: join(tmpdir(), "missing-settings.json"),
      projectSettingsPath: join(tmpdir(), "missing-project-settings.json"),
      jsConfigPath: f.path,
    });
    expect(rejected.options.promptStructures?.targets).toMatchObject({ codeFence: false });

    const empty = fixture();
    try {
      empty.write(`export default (vim) => {
  vim.promptStructures.targets = {};
};`);
      const cleared = await loadVimOptions({
        globalSettingsPath: join(tmpdir(), "missing-settings.json"),
        projectSettingsPath: join(tmpdir(), "missing-project-settings.json"),
        jsConfigPath: empty.path,
      });
      expect(Object.keys(cleared.options.promptStructures?.targets ?? {})).toEqual([]);
    } finally {
      empty.cleanup();
    }
  } finally {
    f.cleanup();
  }
});

test("keeps valid prompt records from JSON when siblings are invalid", () => {
  const result = resolveVimOptions({
    piVim: {
      promptStructures: { targets: { codeFence: false, unknown: true } },
    },
  });

  expect(result.options.promptStructures?.targets).toMatchObject({ codeFence: false });
});

test("loadVimOptions includes JS string remaps", async () => {
  const dir = mkdtempSync(join(tmpdir(), "pi-vim-js-remap-load-"));
  try {
    const jsConfigPath = join(dir, "pi-vim.config.js");
    writeFileSync(jsConfigPath, `export default (vim) => vim.keymap.set("n", "zz", "llll");`);
    const result = await loadVimOptions({
      globalSettingsPath: join(dir, "missing-settings.json"),
      projectSettingsPath: join(dir, "project-settings.json"),
      jsConfigPath,
    });
    expect(result.options.keymap?.remaps.accepted).toEqual([
      { key: "zz", inputs: ["l", "l", "l", "l"], modes: ["normal"] },
    ]);
    expect(result.warnings).toEqual([]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("loadVimOptions includes the trusted global JS config layer", async () => {
  const dir = mkdtempSync(join(tmpdir(), "pi-vim-js-config-load-"));
  try {
    const globalPath = join(dir, "settings.json");
    const jsConfigPath = join(dir, "pi-vim.config.js");
    writeFileSync(globalPath, JSON.stringify({ piVim: { startMode: "normal" } }));
    writeFileSync(
      jsConfigPath,
      `export default (vim) => vim.keymap.set("n", "zq", vim.action.operator.uppercase());`,
    );
    const result = await loadVimOptions({
      globalSettingsPath: globalPath,
      projectSettingsPath: join(dir, "project-settings.json"),
      jsConfigPath,
    });
    expect(result.options.startMode).toBe("normal");
    expect(result.options.keymap?.scoped.map((binding) => binding.key)).toEqual(["zq"]);
    expect(result.warnings).toEqual([]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("pre-rename settings key and JS config file are ignored with warnings", async () => {
  const dir = mkdtempSync(join(tmpdir(), "pi-vim-renamed-"));
  try {
    const globalPath = join(dir, "settings.json");
    const projectPath = join(dir, "project-settings.json");
    writeFileSync(globalPath, JSON.stringify({ piVimMode: { startMode: "normal" } }));
    writeFileSync(projectPath, JSON.stringify({ piVimMode: { startMode: "normal" } }));
    writeFileSync(join(dir, "pi-vimmode.config.js"), `export default (vim) => {};`);

    const result = await loadVimOptions({
      globalSettingsPath: globalPath,
      projectSettingsPath: projectPath,
      jsConfigPath: join(dir, "pi-vim.config.js"),
    });

    expect(result.options.startMode).toBe("insert");
    expect(result.warnings).toEqual([
      `${join(dir, "pi-vimmode.config.js")} was renamed to pi-vim.config.js in 1.0.0 and is ignored`,
      "global settings: piVimMode was renamed to piVim in 1.0.0 and is ignored",
      "project settings: piVimMode was renamed to piVim in 1.0.0 and is ignored",
    ]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
