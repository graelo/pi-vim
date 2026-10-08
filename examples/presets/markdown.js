/**
 * @param {import("@graelo/pi-vimmode/config").VimConfigApi} vim
 */
export default function applyMarkdownPreset(vim) {
  vim.g.mapleader = " ";
  vim.promptStructures.targets = { codeFence: true, headingSection: true, listItem: true };
  vim.keymap.set("o", "<leader>c", vim.action.textObject.target.codeFence());
}
