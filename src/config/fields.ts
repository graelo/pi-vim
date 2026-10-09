import { protectedShortcutForKey } from "../customization.ts";
import { isAtomicMappingSequence, MAPPING_TOKEN_SEPARATOR } from "../mapping-scopes.ts";

import { normalizeVimKeySequence } from "./key-normalization.ts";

/** Settings dropped in 1.0.0 (prompt transforms and their action keybindings). */
export function warnRemovedSettings(
  value: Record<string, unknown>,
  keys: readonly string[],
  label: string,
  warnings: string[],
): void {
  for (const key of keys) {
    if (value[key] !== undefined)
      warnings.push(`${label}${key} was removed in 1.0.0 and is ignored`);
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function booleanField(
  value: unknown,
  warning: string,
  warnings: string[],
): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "boolean") return value;
  warnings.push(warning);
  return undefined;
}

export function enumField<T extends string>(
  value: unknown,
  warning: string,
  warnings: string[],
  allowed: ReadonlySet<string>,
): T | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "string" && allowed.has(value)) return value as T;
  warnings.push(warning);
  return undefined;
}

export function intField(
  value: unknown,
  warning: string,
  warnings: string[],
  min: number,
  max = Number.POSITIVE_INFINITY,
): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "number" && Number.isInteger(value) && value >= min && value <= max)
    return value;
  warnings.push(warning);
  return undefined;
}

export function parseStringArray(
  value: unknown,
  label: string,
  warnings: string[],
  options: { singleKeyOnly?: boolean; allowProtectedKey?: (key: string) => boolean } = {},
): string[] | undefined {
  if (!Array.isArray(value)) {
    warnings.push(`${label} must be an array of key strings`);
    return undefined;
  }

  const parsed: string[] = [];
  for (const item of value) {
    const sequence = normalizeVimKeySequence(item);
    if (!sequence) {
      warnings.push(`${label} contains unsupported key`);
      continue;
    }
    const protectedShortcut = protectedShortcutForKey(sequence);
    if (protectedShortcut && !options.allowProtectedKey?.(sequence)) {
      warnings.push(`${label} contains protected key ${sequence} (${protectedShortcut.reason})`);
      continue;
    }
    if (options.singleKeyOnly && sequence.length !== 1) {
      warnings.push(`${label} contains unsupported multi-key text object binding ${sequence}`);
      continue;
    }
    parsed.push(sequence);
  }

  return parsed.length > 0 || value.length === 0 ? parsed : undefined;
}

export function isPrintableTextSequence(sequence: string): boolean {
  if (sequence.includes(MAPPING_TOKEN_SEPARATOR)) return true;
  if (isAtomicMappingSequence(sequence)) return false;
  return [...sequence].every((char) => char.charCodeAt(0) >= 32);
}

export function parseActionStringArray<T extends string>(
  value: unknown,
  allowed: Set<string>,
  label: string,
  warnings: string[],
): T[] | undefined {
  if (!Array.isArray(value)) {
    warnings.push(`${label} must be an array`);
    return undefined;
  }

  const parsed: T[] = [];
  for (const item of value) {
    if (typeof item === "string" && allowed.has(item)) parsed.push(item as T);
    else warnings.push(`${label} contains unsupported action`);
  }

  return parsed.length > 0 ? parsed : undefined;
}

export function parseLowercaseSlots(
  value: unknown,
  label: string,
  warnings: string[],
): string[] | undefined {
  if (!Array.isArray(value)) {
    warnings.push(`${label} must be an array`);
    return undefined;
  }
  const slots = value.filter(
    (slot): slot is string => typeof slot === "string" && /^[a-z]$/.test(slot),
  );
  if (slots.length !== value.length) warnings.push(`${label} only supports lowercase a-z slots`);
  return slots.length > 0 ? [...new Set(slots)] : undefined;
}

export function parseBooleanMap<T extends string>(
  value: unknown,
  allowed: Set<string>,
  label: string,
  warnings: string[],
): Partial<Record<T, boolean>> | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) {
    warnings.push(`${label} must be an object`);
    return undefined;
  }
  const parsed: Partial<Record<T, boolean>> = {};
  for (const [key, enabled] of Object.entries(value)) {
    if (!allowed.has(key)) {
      warnings.push(`${label}.${key} is unsupported`);
    } else if (typeof enabled === "boolean") {
      parsed[key as T] = enabled;
    } else {
      warnings.push(`${label}.${key} must be a boolean`);
    }
  }
  return parsed;
}
