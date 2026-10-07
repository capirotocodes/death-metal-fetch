import { parseArtistTitle } from "./match";
import { insertIfNew, type Archive } from "./store";

/**
 * deathgrind.club releases via its public RSS feed (the HTML pages sit behind a
 * Cloudflare challenge; /rss.xml does not). All items are kept, no genre filter,
 * and they never trigger WhatsApp alerts.
 */
export const DEATHGRIND_RSS = "https://deathgrind.club/rss.xml";

export type DeathgrindItem = {
  link: string;
  title: string;
  pubDate: string | null;
  coverUrl: string | null;
  genres: string[];
  info: string;
};

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

function tag(xml: string, name: string): string | null {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
  if (!m) return null;
  return decodeEntities(m[1].replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "").trim());
}

export function parseDeathgrindRss(xml: string): DeathgrindItem[] {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].flatMap(([, item]) => {
    const link = tag(item, "link");
    const title = tag(item, "title");
    if (!link || !title) return [];

    // Description: <p><img src="cover"></p><p>Bands: X | Genres: A, B | Countries: Y</p>
    const desc = tag(item, "description") ?? "";
    const cover = desc.match(/<img[^>]*src="([^"]+)"/)?.[1] ?? null;
    const info = desc.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const genres =
      info
        .match(/Genres:\s*([^|]+)/)?.[1]
        .split(",")
        .map((g) => g.trim())
        .filter(Boolean) ?? [];
    const time = Date.parse(tag(item, "pubDate") ?? "");

    return [
      {
        link,
        title,
        pubDate: Number.isNaN(time) ? null : new Date(time).toISOString(),
        coverUrl: cover?.startsWith("http") ? cover : null,
        genres,
        info,
      },
    ];
  });
}

export async function fetchDeathgrindItems(): Promise<DeathgrindItem[]> {
  const res = await fetch(DEATHGRIND_RSS, {
    headers: {
      "user-agent":
        "death-metal-fetch (+https://github.com/capirotocodes/death-metal-fetch)",
    },
  });
  if (!res.ok) throw new Error(`deathgrind.club RSS HTTP ${res.status}`);
  return parseDeathgrindRss(await res.text());
}

/** Add unseen feed items (deduped by post link). Never mutates `archive`. */
export function mergeDeathgrind(
  archive: Archive,
  items: DeathgrindItem[],
  now: string,
): { archive: Archive; stored: number } {
  let releases = archive.releases;
  let stored = 0;
  // Feed is newest first; insert oldest first so ids follow publish order.
  for (const item of [...items].reverse()) {
    const { artist, title } = parseArtistTitle(item.title);
    const r = insertIfNew(releases, {
      uri: item.link,
      text: item.info ? `${item.title}\n${item.info}` : item.title,
      artist,
      title,
      genres: item.genres,
      hasReleaseCue: true,
      bskyUrl: item.link,
      authorHandle: "deathgrind.club",
      postedAt: item.pubDate,
      notified: false,
      coverUrl: item.coverUrl,
      createdAt: now,
      source: "deathgrind",
    });
    releases = r.releases;
    if (r.inserted) stored += 1;
  }
  if (stored === 0) return { archive, stored };
  return { archive: { ...archive, releases, updatedAt: now }, stored };
}
