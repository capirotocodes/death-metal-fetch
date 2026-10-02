import { maskPhone } from "./format";
import { callmebotConfigured } from "./whatsapp";

export const WATCHED_GENRES = [
  "Death Metal",
  "Grindcore",
  "Black Metal",
] as const;

export const DEFAULT_BSKY_HANDLE = "kmanriffs.bsky.social";
export const DEFAULT_POLL_MS = 120_000;

export function getBskyHandle(): string {
  return process.env.BSKY_HANDLE?.trim() || DEFAULT_BSKY_HANDLE;
}

export function getPollIntervalMs(): number {
  const n = Number(process.env.POLL_INTERVAL_MS?.trim() || DEFAULT_POLL_MS);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_POLL_MS;
}

export function getCallMeBotStatus(): {
  configured: boolean;
  phoneMasked: string | null;
} {
  const configured = callmebotConfigured();
  const phone = process.env.CALLMEBOT_PHONE?.trim() || "";
  return {
    configured,
    phoneMasked: configured && phone ? maskPhone(phone) : null,
  };
}

export function manualPollEnabled(): boolean {
  // When POLL_SECRET is set (public host), UI hides manual poll — background poller still runs.
  return !process.env.POLL_SECRET?.trim();
}

export function getPublicStatus() {
  const callmebot = getCallMeBotStatus();
  return {
    handle: getBskyHandle(),
    pollIntervalMs: getPollIntervalMs(),
    genres: [...WATCHED_GENRES],
    callmebotConfigured: callmebot.configured,
    callmebotPhoneMasked: callmebot.phoneMasked,
    manualPollEnabled: manualPollEnabled(),
  };
}
