/** Per-device "Highlights of the Week" stars (localStorage), like seen-client. */

import { useEffect, useState } from "react";

const KEY = "dmf:highlights";
export const HIGHLIGHT_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

/** uri -> ISO time the star was added */
export type Stars = Record<string, string>;

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function readStars(): Stars {
  if (!canUseStorage()) return {};
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : {};
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(([, v]) => typeof v === "string"),
    ) as Stars;
  } catch {
    return {};
  }
}

/** Adds the star if absent, removes it if present. Never mutates `stars`. */
export function withStar(stars: Stars, uri: string, now = Date.now()): Stars {
  if (stars[uri]) {
    return Object.fromEntries(Object.entries(stars).filter(([k]) => k !== uri));
  }
  return { ...stars, [uri]: new Date(now).toISOString() };
}

export function toggleStar(uri: string): Stars {
  const next = withStar(readStars(), uri);
  if (canUseStorage()) {
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* storage full or blocked: keep in-memory state only */
    }
    window.dispatchEvent(new CustomEvent("dmf:highlights"));
  }
  return next;
}

/** Stars for this device, kept in sync across views via the "dmf:highlights" event. */
export function useStars(): [Stars, (uri: string) => void] {
  const [stars, setStars] = useState<Stars>({});
  useEffect(() => {
    const sync = () => setStars(readStars());
    sync();
    window.addEventListener("dmf:highlights", sync);
    return () => window.removeEventListener("dmf:highlights", sync);
  }, []);
  return [stars, (uri) => setStars(toggleStar(uri))];
}

/** Releases starred in the last HIGHLIGHT_DAYS days, most recently starred first. */
export function weeklyHighlights<T extends { uri: string }>(
  releases: T[],
  stars: Stars,
  now = Date.now(),
): T[] {
  const cutoff = now - HIGHLIGHT_DAYS * DAY_MS;
  const starredAt = (uri: string) => Date.parse(stars[uri] ?? "") || 0;
  return releases
    .filter((r) => starredAt(r.uri) >= cutoff)
    .sort((a, b) => starredAt(b.uri) - starredAt(a.uri));
}
