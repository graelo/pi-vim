/** @type {import("../../npm/node_modules/@graelo/pi-vim/config").VimConfig} */
export default async (vim) => {
  const maxHighlights = await Promise.resolve(50);
  vim.search.maxHighlights = maxHighlights;
  vim.keymap.set("n", "gl", vim.action.motion.lineEnd());
};
