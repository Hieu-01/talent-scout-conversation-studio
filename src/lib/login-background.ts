// Login background personalization. Lives on the visitor's own device (IndexedDB),
// because the login screen is shown before anyone is signed in.

export type BackgroundKind = "image" | "video";

export const MAX_IMAGE_MB = 15;
export const MAX_VIDEO_MB = 50;
export const MAX_VIDEO_SECONDS = 30;

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
export const ACCEPT_ATTR = [...IMAGE_TYPES, ...VIDEO_TYPES].join(",");

type Check = { ok: true; kind: BackgroundKind } | { ok: false; error: string };

export function validateBackgroundFile(file: { type: string; size: number }): Check {
  const mb = file.size / (1024 * 1024);
  if (IMAGE_TYPES.includes(file.type)) {
    if (mb > MAX_IMAGE_MB) return { ok: false, error: `Pictures and GIFs can be up to ${MAX_IMAGE_MB} MB.` };
    return { ok: true, kind: "image" };
  }
  if (VIDEO_TYPES.includes(file.type)) {
    if (mb > MAX_VIDEO_MB) return { ok: false, error: `Videos can be up to ${MAX_VIDEO_MB} MB.` };
    return { ok: true, kind: "video" };
  }
  return { ok: false, error: "Please choose a picture (JPG, PNG, WebP, GIF) or a short video (MP4, WebM, MOV)." };
}

export function validateVideoDuration(seconds: number): string | null {
  if (!Number.isFinite(seconds) || seconds <= 0) return "This video couldn't be read on your device.";
  if (seconds > MAX_VIDEO_SECONDS) return `Videos can be up to ${MAX_VIDEO_SECONDS} seconds long.`;
  return null;
}

/** Loads the video in the browser to confirm this device can actually play it, and checks its length. */
export function checkVideoPlayable(file: Blob): Promise<string | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.muted = true;
    const done = (r: string | null) => {
      URL.revokeObjectURL(url);
      resolve(r);
    };
    v.onloadedmetadata = () => done(validateVideoDuration(v.duration));
    v.onerror = () => done("Your device can't play this video format. Try an MP4 instead.");
    v.src = url;
  });
}

export type StoredBackground = { blob: Blob; kind: BackgroundKind; name: string };

const DB = "lens-login";
const STORE = "background";
const KEY = "current";
const DIM_KEY = "lens-login-dim";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => reject(req.error);
  }).finally(() => db.close());
}

export async function loadBackground(): Promise<StoredBackground | null> {
  if (typeof indexedDB === "undefined") return null;
  try {
    return (await tx<StoredBackground | undefined>("readonly", (s) => s.get(KEY))) ?? null;
  } catch {
    return null;
  }
}

export function saveBackground(bg: StoredBackground) {
  return tx<IDBValidKey>("readwrite", (s) => s.put(bg, KEY));
}

export function clearBackground() {
  return tx<undefined>("readwrite", (s) => s.delete(KEY));
}

export function loadDim(): number {
  const n = Number(localStorage.getItem(DIM_KEY));
  return Number.isFinite(n) && n >= 0 && n <= 0.8 ? n : 0.25;
}

export function saveDim(n: number) {
  localStorage.setItem(DIM_KEY, String(n));
}
