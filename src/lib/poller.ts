import "server-only";
import { pollOnce } from "./poll";

const DEFAULT_POLL_MS = 120_000;

const globalForPoller = globalThis as unknown as {
  __dmfPollerStarted?: boolean;
  __dmfPollerTimer?: ReturnType<typeof setInterval>;
};

export function startPoller(): void {
  if (globalForPoller.__dmfPollerStarted) return;
  globalForPoller.__dmfPollerStarted = true;

  const pollMs = Number(
    process.env.POLL_INTERVAL_MS?.trim() || DEFAULT_POLL_MS,
  );
  const interval =
    Number.isFinite(pollMs) && pollMs > 0 ? pollMs : DEFAULT_POLL_MS;

  console.log(
    `[poller] Starting Bluesky poller (every ${interval}ms); CallMeBot ${
      process.env.CALLMEBOT_PHONE && process.env.CALLMEBOT_APIKEY
        ? "enabled"
        : "dry-run"
    }`,
  );

  const run = async () => {
    try {
      await pollOnce();
    } catch (err) {
      console.error("[poller] Poll failed:", err);
    }
  };

  // Kick off shortly after boot so the UI can load first.
  setTimeout(run, 1500);
  globalForPoller.__dmfPollerTimer = setInterval(run, interval);
}
