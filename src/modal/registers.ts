import type { VimClipboard, VimRegister } from "../types.ts";
import type {
  ActiveRegisterTarget,
  ClipboardRegisterSlot,
  ModalEffect,
  ModalState,
  ModalUpdate,
  PendingRegisterTarget,
} from "./types.ts";

export function isRegisterPrefixKey(key: string): boolean {
  return key === '"';
}

export function registerTargetForKey(key: string): ActiveRegisterTarget | undefined {
  if (/^[A-Za-z]$/.test(key)) {
    return { kind: "named", slot: key.toLowerCase(), append: key >= "A" && key <= "Z" };
  }
  if (key === '"') return { kind: "unnamed" };
  if (key === "_") return { kind: "blackHole" };
  if (key === "+" || key === "*") return { kind: "clipboard", slot: key };
  return undefined;
}

function activeTarget(target: PendingRegisterTarget | undefined): ActiveRegisterTarget | undefined {
  return typeof target === "object" ? target : undefined;
}

export function appendRegister(previous: VimRegister | undefined, next: VimRegister): VimRegister {
  if (!previous || previous.text.length === 0) return next;
  if (next.text.length === 0) return previous;
  if (previous.type === "char" && next.type === "char") {
    return { type: "char", text: previous.text + next.text };
  }
  return { type: "line", text: [previous.text, next.text].filter(Boolean).join("\n") };
}

export function clearRegisterTarget(state: ModalState): ModalState {
  const { pendingRegister: _pendingRegister, ...rest } = state;
  return rest;
}

function writeNamedRegister(
  state: ModalState,
  target: Extract<ActiveRegisterTarget, { kind: "named" }>,
  register: VimRegister,
): ModalState {
  const current = state.namedRegisters?.[target.slot];
  return {
    ...state,
    namedRegisters: {
      ...state.namedRegisters,
      [target.slot]: target.append ? appendRegister(current, register) : register,
    },
  };
}

export function applyRegisterWrite(
  state: ModalState,
  register: VimRegister | undefined,
): { state: ModalState; effects: ModalEffect[] } {
  const target = activeTarget(state.pendingRegister);
  const base = clearRegisterTarget(state);
  if (!register) return { state: base, effects: [] };
  if (target?.kind === "blackHole") return { state: base, effects: [] };

  let nextState: ModalState = { ...base, register };
  if (!target || target.kind === "unnamed") return { state: nextState, effects: [] };
  if (target.kind === "named") {
    return { state: writeNamedRegister(nextState, target, register), effects: [] };
  }

  nextState = {
    ...nextState,
    clipboardRegisters: {
      ...state.clipboardRegisters,
      [target.slot]: register,
    },
  };
  return {
    state: nextState,
    effects: [{ type: "copyClipboard", register: target.slot, text: register.text }],
  };
}

export function writeRegisters(state: ModalState, register: VimRegister | undefined): ModalState {
  return applyRegisterWrite(state, register).state;
}

/** The clipboard register Vim's `'clipboard'` setting routes unnamed-register traffic to. */
export function defaultClipboardSlot(
  clipboard: VimClipboard | undefined,
): ClipboardRegisterSlot | undefined {
  if (clipboard === "unnamed") return "*";
  if (clipboard === "unnamedplus") return "+";
  return undefined;
}

/** No prefix, or an explicit `""`: the target `'clipboard'` redirects. */
function targetsUnnamed(target: PendingRegisterTarget | undefined): boolean {
  return target === undefined || (typeof target === "object" && target.kind === "unnamed");
}

/**
 * With `'clipboard'` set, an update that wrote only the unnamed register also
 * writes the clipboard register mirror and requests a host clipboard copy.
 * Named, black-hole, and explicit clipboard targets are left alone: they
 * change named or clipboard registers, leave the unnamed register as it was,
 * or already copy.
 */
export function mirrorUnnamedWrite(
  before: ModalState,
  update: ModalUpdate,
  slot: ClipboardRegisterSlot | undefined,
): ModalUpdate {
  const { state } = update;
  const register = state.register;
  if (!slot || !register || register === before.register) return update;
  if (!targetsUnnamed(before.pendingRegister)) return update;
  if (state.namedRegisters !== before.namedRegisters) return update;
  if (state.clipboardRegisters !== before.clipboardRegisters) return update;
  return {
    state: { ...state, clipboardRegisters: { ...state.clipboardRegisters, [slot]: register } },
    effects: [...update.effects, { type: "copyClipboard", register: slot, text: register.text }],
  };
}

export function clipboardTargetToRead(
  state: ModalState,
  clipboard?: VimClipboard,
): Extract<ActiveRegisterTarget, { kind: "clipboard" }> | undefined {
  const target = activeTarget(state.pendingRegister);
  if (target?.kind === "clipboard") return target;
  const slot = defaultClipboardSlot(clipboard);
  return slot && targetsUnnamed(state.pendingRegister) ? { kind: "clipboard", slot } : undefined;
}

export function registerToRead(state: ModalState): VimRegister | undefined {
  const target = activeTarget(state.pendingRegister);
  if (!target || target.kind === "unnamed") return state.register;
  if (target.kind === "named") return state.namedRegisters?.[target.slot];
  if (target.kind === "clipboard") return state.clipboardRegisters?.[target.slot];
  return undefined;
}
