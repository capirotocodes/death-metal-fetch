/** Per-device unread state (localStorage) so public multi-user doesn't share "seen". */

const KEY = "dmf:seen-uris";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function read(): Set<string> {
  if (!canUseStorage()) return new Set();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

function write(set: Set<string>): void {
  if (!canUseStorage()) return;
  localStorage.setItem(KEY, JSON.stringify([...set]));
}

export function isSeenLocally(uri: string): boolean {
  return read().has(uri);
}

export function markSeenLocally(uri: string): void {
  const set = read();
  set.add(uri);
  write(set);
  if (canUseStorage()) {
    window.dispatchEvent(
      new CustomEvent("dmf:seen", { detail: { uri, all: false } }),
    );
  }
}

export function markAllSeenLocally(uris: string[]): void {
  const set = read();
  for (const uri of uris) set.add(uri);
  write(set);
  if (canUseStorage()) {
    window.dispatchEvent(
      new CustomEvent("dmf:seen", { detail: { all: true } }),
    );
  }
}

export function countUnseenLocally(uris: string[]): number {
  if (!canUseStorage()) return 0;
  const set = read();
  return uris.reduce((n, uri) => n + (set.has(uri) ? 0 : 1), 0);
}

export function applyLocalSeen<T extends { uri: string; seen: boolean }>(
  releases: T[],
): T[] {
  if (!canUseStorage()) {
    // SSR / first paint: keep server flags; client effect will reconcile.
    return releases;
  }
  const set = read();
  // Seed localStorage once from server-seen rows so existing installs don't flash all-NEW.
  if (set.size === 0) {
    const seeded = releases.filter((r) => r.seen).map((r) => r.uri);
    if (seeded.length) {
      for (const uri of seeded) set.add(uri);
      write(set);
    }
  }
  return releases.map((r) => ({ ...r, seen: set.has(r.uri) }));
}
