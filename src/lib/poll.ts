import { matchPost, parseArtistTitle, postUrl, snippet } from "./match";
import {
  insertIfNew,
  setCoverUrl,
  setNotified,
  type Archive,
  type NewRelease,
} from "./store";
import type { SendResult } from "./whatsapp";

export type FeedPost = {
  uri: string;
  text: string;
  createdAt: string;
  indexedAt: string;
  authorHandle: string;
  coverUrl: string | null;
};

export type PollDeps = {
  fetchPosts: (handle: string) => Promise<FeedPost[]>;
  sendWhatsApp: (text: string) => Promise<SendResult>;
  now: () => string;
};

export type PollSummary = {
  handle: string;
  firstRun: boolean;
  fetched: number;
  newPosts: number;
  stored: number;
  notified: number;
  alertFailures: number;
  coversUpdated: number;
  changed: boolean;
};

export function buildMessage(opts: {
  handle: string;
  text: string;
  uri: string;
}): string {
  const { artist, title } = parseArtistTitle(opts.text);
  const lines: string[] = ["🤘 Metal release alert"];
  if (artist || title) {
    lines.push([artist, title].filter(Boolean).join(" — "));
  }
  lines.push(snippet(opts.text, 220));
  lines.push(postUrl(opts.handle, opts.uri));
  return lines.join("\n");
}

function toNewRelease(
  post: FeedPost,
  genres: string[],
  hasReleaseCue: boolean,
  now: string,
): NewRelease {
  const { artist, title } = parseArtistTitle(post.text);
  return {
    uri: post.uri,
    text: post.text,
    artist,
    title,
    genres,
    hasReleaseCue,
    bskyUrl: postUrl(post.authorHandle, post.uri),
    authorHandle: post.authorHandle,
    postedAt: post.createdAt,
    notified: false,
    coverUrl: post.coverUrl,
    createdAt: now,
  };
}

async function trySend(deps: PollDeps, text: string): Promise<boolean> {
  try {
    return (await deps.sendWhatsApp(text)).ok;
  } catch (err) {
    console.error("[whatsapp] send threw:", err);
    return false;
  }
}

/** One poll cycle. Pure apart from the injected deps; never mutates `archive`. */
export async function pollOnce(
  archive: Archive,
  deps: PollDeps,
): Promise<{ archive: Archive; summary: PollSummary }> {
  const handle = archive.handle;
  const posts = await deps.fetchPosts(handle);
  const now = deps.now();
  let releases = archive.releases;
  let lastSeenUri = archive.lastSeenUri;
  let stored = 0;
  let notified = 0;
  let alertFailures = 0;
  let coversUpdated = 0;
  let newPosts = 0;

  // Backfill covers for rows already stored when they appear in the latest feed page.
  for (const post of posts) {
    if (!post.coverUrl) continue;
    const r = setCoverUrl(releases, post.uri, post.coverUrl);
    releases = r.releases;
    if (r.updated) coversUpdated += 1;
  }

  const firstRun = !lastSeenUri;
  if (firstRun) {
    // First run: seed cursor + backfill matches without WhatsApp.
    for (const post of posts) {
      const m = matchPost(post.text);
      if (!m.matched) continue;
      const r = insertIfNew(releases, toNewRelease(post, m.genres, m.hasReleaseCue, now));
      releases = r.releases;
      if (r.inserted) stored += 1;
    }
    lastSeenUri = posts[0]?.uri ?? null;
    console.log(`[poll:init] Backfilled ${stored} matching release(s) from ${handle}`);
  } else {
    const fresh: FeedPost[] = [];
    for (const post of posts) {
      if (post.uri === lastSeenUri) break;
      fresh.push(post);
    }
    fresh.reverse();
    newPosts = fresh.length;

    for (const post of fresh) {
      const m = matchPost(post.text);
      if (m.matched) {
        const r = insertIfNew(releases, toNewRelease(post, m.genres, m.hasReleaseCue, now));
        releases = r.releases;
        if (r.inserted) {
          stored += 1;
          console.log(`[match] ${m.genres.join(", ")}: ${post.uri}`);
          const text = buildMessage({
            handle: post.authorHandle || handle,
            text: post.text,
            uri: post.uri,
          });
          if (await trySend(deps, text)) {
            releases = setNotified(releases, post.uri);
            notified += 1;
          } else {
            alertFailures += 1;
          }
        } else {
          console.log(`[dup] Already stored: ${post.uri}`);
        }
      }
      lastSeenUri = post.uri;
    }
    console.log(`[poll] ${newPosts} new post(s), ${stored} stored from ${handle}`);
  }

  const changed =
    stored > 0 || coversUpdated > 0 || lastSeenUri !== archive.lastSeenUri;
  return {
    archive: changed ? { ...archive, releases, lastSeenUri, updatedAt: now } : archive,
    summary: {
      handle,
      firstRun,
      fetched: posts.length,
      newPosts,
      stored,
      notified,
      alertFailures,
      coversUpdated,
      changed,
    },
  };
}
