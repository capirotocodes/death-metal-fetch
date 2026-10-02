const RELEASE_CUE_RE =
  /\b(release|released|releasing|out\s+now|out\s+today|new\s+album|new\s+ep|full[-\s]?length|album|ep\b|lp\b|demo|split)\b/i;

const GENRE_CHECKS: { label: string; re: RegExp }[] = [
  { label: "Death Metal", re: /\bdeath\s*metal\b/i },
  { label: "Grindcore", re: /\bgrindcore\b/i },
  { label: "Black Metal", re: /\bblack\s*metal\b/i },
];

export type MatchResult = {
  matched: boolean;
  hasGenre: boolean;
  hasReleaseCue: boolean;
  genres: string[];
};

export function genresMatched(text: string): string[] {
  return GENRE_CHECKS.filter((g) => g.re.test(text)).map((g) => g.label);
}

export function matchPost(text: string): MatchResult {
  const genres = genresMatched(text);
  const hasGenre = genres.length > 0;
  const hasReleaseCue = RELEASE_CUE_RE.test(text);
  return {
    matched: hasGenre,
    hasGenre,
    hasReleaseCue,
    genres,
  };
}

export function parseArtistTitle(text: string): {
  artist: string | null;
  title: string | null;
} {
  const firstLine = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l.length > 0);

  if (!firstLine) return { artist: null, title: null };

  const parts = firstLine.split(/\s+[–—-]\s+/);
  if (parts.length >= 2) {
    const artist = parts[0]?.trim() || null;
    const title = parts.slice(1).join(" - ").trim() || null;
    if (artist && title) return { artist, title };
  }

  return { artist: null, title: null };
}

export function snippet(text: string, max = 200): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) return cleaned;
  return cleaned.slice(0, max - 1).trimEnd() + "…";
}

export function postUrl(handle: string, uri: string): string {
  const rkey = uri.split("/").pop();
  if (!rkey) return `https://bsky.app/profile/${handle}`;
  return `https://bsky.app/profile/${handle}/post/${rkey}`;
}
