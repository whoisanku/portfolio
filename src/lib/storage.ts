/**
 * Web Storage that never throws.
 *
 * localStorage/sessionStorage can be missing or throw on access (Safari
 * private mode, storage disabled, quota exceeded), and nothing on the site
 * should break because a preference or cache couldn't be saved. Every read
 * falls back to null and every write is best-effort.
 */
type Area = "local" | "session";

function area(which: Area): Storage | null {
  try {
    return which === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

export function readString(key: string, which: Area = "local"): string | null {
  try {
    return area(which)?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function writeString(key: string, value: string, which: Area = "local"): void {
  try {
    area(which)?.setItem(key, value);
  } catch {
    // quota exceeded / storage disabled — the caller carries on without it
  }
}

export function removeKey(key: string, which: Area = "local"): void {
  try {
    area(which)?.removeItem(key);
  } catch {
    // storage disabled
  }
}

export function readJson<T>(key: string, which: Area = "local"): T | null {
  const raw = readString(key, which);
  if (raw == null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    removeKey(key, which);
    return null;
  }
}

export function writeJson(key: string, value: unknown, which: Area = "local"): void {
  try {
    writeString(key, JSON.stringify(value), which);
  } catch {
    // unserializable — skip
  }
}
