/** Per-device unread state (localStorage) so public multi-user doesn't share "seen". */

const KEY = "dmf:seen-uris";

function read(): Set<string> {
  if (typeof window === "undefined") return new Set();
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
  localStorage.setItem(KEY, JSON.stringify([...set]));
}

export function isSeenLocally(uri: string): boolean {
  return read().has(uri);
}

export function markSeenLocally(uri: string): void {
  const set = read();
  set.add(uri);
  write(set);
  window.dispatchEvent(
    new CustomEvent("dmf:seen", { detail: { uri, all: false } }),
  );
}

export function markAllSeenLocally(uris: string[]): void {
  const set = read();
  for (const uri of uris) set.add(uri);
  write(set);
  window.dispatchEvent(
    new CustomEvent("dmf:seen", { detail: { all: true } }),
  );
}

export function countUnseenLocally(uris: string[]): number {
  const set = read();
  return uris.reduce((n, uri) => n + (set.has(uri) ? 0 : 1), 0);
}

export function applyLocalSeen<T extends { uri: string; seen: boolean }>(
  releases: T[],
): T[] {
  const set = read();
  // If the user has never marked anything, treat server `seen` as a seed once,
  // then prefer localStorage going forward.
  if (set.size === 0) {
    const seeded = releases.filter((r) => r.seen).map((r) => r.uri);
    if (seeded.length) {
      for (const uri of seeded) set.add(uri);
      write(set);
    }
  }
  return releases.map((r) => ({ ...r, seen: set.has(r.uri) }));
}
