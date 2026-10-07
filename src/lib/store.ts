import type { ReleaseDTO } from "./releases";

/**
 * JSON archive (data/releases.json) — replaces the SQLite store.
 * All helpers are immutable: they return new arrays and never edit rows in place.
 */

export const ARCHIVE_VERSION = 1;

export type Archive = {
  version: typeof ARCHIVE_VERSION;
  handle: string;
  lastSeenUri: string | null;
  updatedAt: string | null;
  releases: ReleaseDTO[];
};

export type NewRelease = Omit<ReleaseDTO, "id" | "seen">;

export function emptyArchive(handle: string): Archive {
  return {
    version: ARCHIVE_VERSION,
    handle,
    lastSeenUri: null,
    updatedAt: null,
    releases: [],
  };
}

export function parseArchive(json: string, fallbackHandle: string): Archive {
  const data = JSON.parse(json) as Partial<Archive>;
  if (data.version !== ARCHIVE_VERSION) {
    throw new Error(`Unsupported archive version: ${String(data.version)}`);
  }
  if (!Array.isArray(data.releases)) {
    throw new Error("Archive is missing a releases array");
  }
  return {
    version: ARCHIVE_VERSION,
    handle: data.handle ?? fallbackHandle,
    lastSeenUri: data.lastSeenUri ?? null,
    updatedAt: data.updatedAt ?? null,
    releases: data.releases,
  };
}

export function serializeArchive(archive: Archive): string {
  return JSON.stringify(archive, null, 2) + "\n";
}

function sortTime(r: ReleaseDTO): number {
  return Date.parse(r.postedAt ?? r.createdAt) || 0;
}

/** Same order the SQLite query used: COALESCE(posted_at, created_at) DESC. */
export function sortNewestFirst(releases: ReleaseDTO[]): ReleaseDTO[] {
  return [...releases].sort((a, b) => sortTime(b) - sortTime(a));
}

/** Insert if uri is new (uri is the unique Bluesky post id). */
export function insertIfNew(
  releases: ReleaseDTO[],
  row: NewRelease,
): { releases: ReleaseDTO[]; inserted: boolean } {
  if (releases.some((r) => r.uri === row.uri)) {
    return { releases, inserted: false };
  }
  const id = releases.reduce((max, r) => Math.max(max, r.id), 0) + 1;
  return {
    releases: sortNewestFirst([...releases, { ...row, id, seen: false }]),
    inserted: true,
  };
}

export function setNotified(releases: ReleaseDTO[], uri: string): ReleaseDTO[] {
  return releases.map((r) => (r.uri === uri ? { ...r, notified: true } : r));
}

/** Fill or refresh cover art for an already-stored release. */
export function setCoverUrl(
  releases: ReleaseDTO[],
  uri: string,
  coverUrl: string,
): { releases: ReleaseDTO[]; updated: boolean } {
  const target = releases.find((r) => r.uri === uri);
  if (!target || target.coverUrl === coverUrl) {
    return { releases, updated: false };
  }
  return {
    releases: releases.map((r) => (r === target ? { ...r, coverUrl } : r)),
    updated: true,
  };
}
