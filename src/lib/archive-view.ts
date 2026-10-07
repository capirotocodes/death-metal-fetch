import { BASE_PATH } from "./base-path";
import {
  DEFAULT_BSKY_HANDLE,
  POLL_INTERVAL_MS,
  WATCHED_GENRES,
  alertsEnabled,
} from "./config";
import type { ReleaseDTO } from "./releases";
import { parseArchive, type Archive } from "./store";

/** What the screens render: the archive plus static app settings. */
export type ArchiveView = {
  handle: string;
  pollIntervalMs: number;
  genres: string[];
  alertsEnabled: boolean;
  count: number;
  updatedAt: string | null;
  releases: ReleaseDTO[];
};

export function toArchiveView(archive: Archive): ArchiveView {
  return {
    handle: archive.handle,
    pollIntervalMs: POLL_INTERVAL_MS,
    genres: [...WATCHED_GENRES],
    alertsEnabled: alertsEnabled(),
    count: archive.releases.length,
    updatedAt: archive.updatedAt,
    releases: archive.releases,
  };
}

/** Client refresh from the deployed copy of data/releases.json. */
export async function fetchArchiveView(): Promise<ArchiveView> {
  const res = await fetch(`${BASE_PATH}/data/releases.json`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Archive refused to open (${res.status})`);
  return toArchiveView(parseArchive(await res.text(), DEFAULT_BSKY_HANDLE));
}
