export const WATCHED_GENRES = [
  "Death Metal",
  "Grindcore",
  "Black Metal",
] as const;

export const DEFAULT_BSKY_HANDLE = "kmanriffs.bsky.social";

/** Matches the workflow cron (every 15 minutes). */
export const POLL_INTERVAL_MS = 15 * 60_000;

export function getBskyHandle(): string {
  return process.env.BSKY_HANDLE?.trim() || DEFAULT_BSKY_HANDLE;
}

/** Set to "1" by the workflow at build time when the CallMeBot secrets exist. */
export function alertsEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ALERTS_ENABLED === "1";
}
