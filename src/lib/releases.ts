import type { ReleaseRow } from "./db";

export type ReleaseDTO = {
  id: number;
  uri: string;
  text: string;
  artist: string | null;
  title: string | null;
  genres: string[];
  hasReleaseCue: boolean;
  bskyUrl: string;
  authorHandle: string | null;
  postedAt: string | null;
  notified: boolean;
  seen: boolean;
  createdAt: string;
};

export function toReleaseDTO(r: ReleaseRow): ReleaseDTO {
  return {
    id: r.id,
    uri: r.uri,
    text: r.text,
    artist: r.artist,
    title: r.title,
    genres: JSON.parse(r.genres) as string[],
    hasReleaseCue: Boolean(r.has_release_cue),
    bskyUrl: r.bsky_url,
    authorHandle: r.author_handle,
    postedAt: r.posted_at,
    notified: Boolean(r.notified),
    seen: Boolean(r.seen),
    createdAt: r.created_at,
  };
}
