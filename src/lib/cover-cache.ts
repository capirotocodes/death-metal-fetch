import type { Archive } from "./store";

/**
 * cdn.deathgrind.club refuses cross-site image loads (CORP same-site + Cloudflare 403),
 * so their covers can't be shown directly. Each cover is downloaded once, shrunk to a
 * small thumbnail, and served from this site as `covers/<id>.webp`.
 */
export const REMOTE_COVER_HOST = "cdn.deathgrind.club";

export type CoverCacheDeps = {
  exists: (name: string) => boolean;
  download: (url: string) => Promise<Buffer>;
  thumbnail: (image: Buffer) => Promise<Buffer>;
  save: (name: string, data: Buffer) => void;
};

function localName(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.host !== REMOTE_COVER_HOST) return null;
    const id = u.pathname.split("/").pop()?.replace(/\.[a-z0-9]+$/i, "");
    return id && /^[\w-]+$/.test(id) ? `${id}.webp` : null;
  } catch {
    return null;
  }
}

/** Points remote deathgrind covers at local copies. Never mutates `archive`. */
export async function cacheRemoteCovers(
  archive: Archive,
  deps: CoverCacheDeps,
): Promise<{ archive: Archive; cached: number; failed: number }> {
  let cached = 0;
  let failed = 0;
  const releases = [];
  for (const r of archive.releases) {
    const name = r.coverUrl ? localName(r.coverUrl) : null;
    if (!r.coverUrl || !name) {
      releases.push(r);
      continue;
    }
    try {
      if (!deps.exists(name)) {
        deps.save(name, await deps.thumbnail(await deps.download(r.coverUrl)));
      }
      releases.push({ ...r, coverUrl: `covers/${name}` });
      cached += 1;
    } catch (err) {
      // Keep the remote URL so the next run retries.
      console.error(`[covers] ${r.coverUrl}:`, err);
      releases.push(r);
      failed += 1;
    }
  }
  if (cached === 0) return { archive, cached, failed };
  return { archive: { ...archive, releases }, cached, failed };
}
