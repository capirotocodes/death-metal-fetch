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
  coverUrl: string | null;
  createdAt: string;
  /** Where the release came from; absent on older Bluesky rows. */
  source?: "bluesky" | "deathgrind";
};
