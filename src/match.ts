const GENRE_RE =
  /\b(death\s*metal|grindcore|black\s*metal)\b/i;

const RELEASE_CUE_RE =
  /\b(release|released|releasing|out\s+now|out\s+today|new\s+album|new\s+ep|full[-\s]?length|album|ep\b|lp\b|demo|split)\b/i;

export type MatchResult = {
  matched: boolean;
  hasGenre: boolean;
  hasReleaseCue: boolean;
};

/**
 * Notify when the post mentions Death Metal, Grindcore, or Black Metal.
 * Release-like wording is preferred but not required — err toward notifying
 * on genre keyword hits from the watched account.
 */
export function matchPost(text: string): MatchResult {
  const hasGenre = GENRE_RE.test(text);
  const hasReleaseCue = RELEASE_CUE_RE.test(text);
  return {
    matched: hasGenre,
    hasGenre,
    hasReleaseCue,
  };
}

export function isReleaseCandidate(text: string): boolean {
  return matchPost(text).matched;
}

/** Best-effort parse of "Artist - Title" / "Artist — Title" style lines. */
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
