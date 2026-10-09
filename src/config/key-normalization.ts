export const LEADER_TOKEN = "<leader>";

export const LEADER_TOKEN_PATTERN = /<leader>/gi;

const MODIFIER_ALIASES: Readonly<Record<string, string>> = {
  a: "alt",
  alt: "alt",
  c: "ctrl",
  cmd: "super",
  control: "ctrl",
  ctrl: "ctrl",
  d: "super",
  m: "alt",
  meta: "alt",
  s: "shift",
  shift: "shift",
  super: "super",
};

function normalizeLeaderKeySequence(value: string): string | undefined {
  const normalized = value.replace(LEADER_TOKEN_PATTERN, LEADER_TOKEN);
  if (!normalized.startsWith(LEADER_TOKEN)) return undefined;
  const prefix = normalized.match(/^(?:<leader>)+/)?.[0] ?? "";
  const suffix = normalized.slice(prefix.length);
  if (!suffix.startsWith("<")) return normalized;
  if (!/^<[^>]+>$/.test(suffix)) return undefined;
  const normalizedSuffix = normalizeVimKeySequence(suffix);
  return normalizedSuffix ? `${prefix}${normalizedSuffix}` : undefined;
}

function normalizeModifiedKeySequence(value: string): string | undefined {
  const angleMatch = value.match(/^<(.+)>$/);
  if (!angleMatch) return value;
  const parts = angleMatch[1]?.split("-").filter(Boolean) ?? [];
  const key = parts.at(-1)?.toLowerCase();
  if (!key) return undefined;
  const modifiers = parts.slice(0, -1).map((part) => MODIFIER_ALIASES[part.toLowerCase()]);
  return modifiers.every((modifier) => modifier) ? [...modifiers, key].join("+") : undefined;
}

export function normalizeVimKeySequence(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length === 0) return undefined;
  return /<leader>/i.test(value)
    ? normalizeLeaderKeySequence(value)
    : normalizeModifiedKeySequence(value);
}
