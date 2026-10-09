/** @type {import("../../npm/node_modules/@graelo/pi-vim/config").VimConfig} */
export default (vim) => {
  vim.g.mapleader = " ";
  vim.keymap.set("i", "<A-w>", vim.prompt.deleteWordBackward());
  vim.keymap.set("n", "<leader>u", vim.action.operator.uppercase(), {
    desc: "Uppercase motion",
  });
  vim.keymap.set("v", "<leader>u", vim.action.operator.uppercase());
  vim.keymap.set("n", "zz", "llll");
  vim.keymap.set("n", "zq", null);
};
