import { useEffect, useSyncExternalStore } from "react";
import {
  clearBackground,
  loadBackground,
  loadDim,
  saveBackground,
  saveDim,
  type StoredBackground,
} from "@/lib/login-background";

// One shared, in-memory copy of the device's chosen background so the login screen
// and every signed-in screen show the same picture without reloading it per page.

export type CustomBackground = { bg: StoredBackground; url: string };
type State = { custom: CustomBackground | null; dim: number };

const SERVER_STATE: State = { custom: null, dim: 0.25 };
let state: State = SERVER_STATE;
let started = false;
const listeners = new Set<() => void>();

function set(next: Partial<State>) {
  if (next.custom !== undefined && state.custom && next.custom?.url !== state.custom.url) {
    URL.revokeObjectURL(state.custom.url);
  }
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  set({ dim: loadDim() });
  loadBackground().then((bg) => {
    if (bg) set({ custom: { bg, url: URL.createObjectURL(bg.blob) } });
  });
}

export async function pickBackground(bg: StoredBackground) {
  await saveBackground(bg);
  set({ custom: { bg, url: URL.createObjectURL(bg.blob) } });
}

export async function resetBackground() {
  await clearBackground().catch(() => {});
  set({ custom: null });
}

export function setBackgroundDim(n: number) {
  saveDim(n);
  set({ dim: n });
}

export function useCustomBackground(): State {
  useEffect(start, []);
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => SERVER_STATE,
  );
}
