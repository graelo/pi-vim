import { describe, expect, test } from "vitest";

import { resolveVimOptions } from "../src/config.ts";
import { keybindingsPopup } from "../src/keybinding-discovery-popup.ts";

describe("keybinding discovery popups", () => {
  test("builds dedicated keybindings catalog popup", () => {
    const { options } = resolveVimOptions({
      piVim: {
        keymap: {
          commands: { redo: ["U"] },
        },
      },
    });
    const popup = keybindingsPopup(options);
    const text = popup.lines.join("\n");

    expect(popup).toMatchObject({
      title: ":keybindings",
      source: "keybindings",
      scrollOffset: 0,
    });
    expect(text).not.toContain("Effective pi-vim keybindings");
    expect(text).toContain("▸ Commands");
    expect(text).toContain("Key            Mode        Action");
    expect(text).toContain("U              normal      command.redo");
    expect(text).toContain("ctrl+p");
    expect(text).toContain("protected for Pi command/model palette");
    expect(text).toContain("no runtime :map");
  });

  test("builds dedicated keybindings detail popup", () => {
    const { options } = resolveVimOptions(undefined);
    const popup = keybindingsPopup(options, { warnings: [] }, "ctrl+p");

    expect(popup).toMatchObject({
      title: ":keybindings ctrl+p",
      source: "keybindings",
      query: "ctrl+p",
    });
    expect(popup.lines.join("\n")).toContain("protected for Pi command/model palette");
  });
});
