import "server-only";
import { AtpAgent } from "@atproto/api";
import { coverUrlFromEmbed } from "./covers";
import {
  getMeta,
  insertReleaseIfNew,
  markNotified,
  setMeta,
  updateCoverUrl,
} from "./db";
import { DEFAULT_BSKY_HANDLE } from "./config";
import {
  matchPost,
  parseArtistTitle,
  postUrl,
  snippet,
} from "./match";
import { sendWhatsApp } from "./whatsapp";

const LAST_SEEN_KEY = "lastSeenUri";
const LAST_POLL_KEY = "lastPollAt";

export type PollSummary = {
  handle: string;
  firstRun: boolean;
  fetched: number;
  newPosts: number;
  stored: number;
  notified: number;
  coversUpdated: number;
  lastSeenUri: string | null;
};

type FeedPost = {
  uri: string;
  cid: string;
  text: string;
  createdAt: string;
  indexedAt: string;
  authorHandle: string;
  coverUrl: string | null;
  raw: unknown;
};

function buildMessage(opts: {
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

async function fetchAuthorPosts(handle: string, limit = 40): Promise<FeedPost[]> {
  const agent = new AtpAgent({ service: "https://public.api.bsky.app" });
  const feed = await agent.getAuthorFeed({
    actor: handle,
    limit,
    filter: "posts_no_replies",
  });

  return feed.data.feed
    .map((item) => {
      const post = item.post;
      const record = post.record as { text?: string; createdAt?: string };
      const coverUrl = coverUrlFromEmbed(post.embed);
      return {
        uri: post.uri,
        cid: post.cid,
        text: record.text ?? "",
        createdAt: record.createdAt ?? post.indexedAt,
        indexedAt: post.indexedAt,
        authorHandle: post.author.handle,
        coverUrl,
        raw: {
          uri: post.uri,
          cid: post.cid,
          author: post.author.handle,
          indexedAt: post.indexedAt,
          coverUrl,
          record,
        },
      };
    })
    .filter((p) => p.text.length > 0);
}

function storeMatch(post: FeedPost, notifyFlag: boolean): boolean {
  const match = matchPost(post.text);
  if (!match.matched) return false;
  const { artist, title } = parseArtistTitle(post.text);
  return insertReleaseIfNew({
    uri: post.uri,
    cid: post.cid,
    text: post.text,
    artist,
    title,
    genres: match.genres,
    hasReleaseCue: match.hasReleaseCue,
    bskyUrl: postUrl(post.authorHandle, post.uri),
    authorHandle: post.authorHandle,
    postedAt: post.createdAt,
    indexedAt: post.indexedAt,
    rawJson: JSON.stringify(post.raw),
    coverUrl: post.coverUrl,
    notified: notifyFlag,
  });
}

/** Backfill covers for rows already in SQLite when they appear in the latest feed page. */
function syncCovers(posts: FeedPost[]): number {
  let updated = 0;
  for (const post of posts) {
    if (!post.coverUrl) continue;
    if (updateCoverUrl(post.uri, post.coverUrl)) updated += 1;
  }
  if (updated > 0) {
    console.log(`[covers] Updated ${updated} cover URL(s) from feed`);
  }
  return updated;
}

export async function pollOnce(): Promise<PollSummary> {
  const handle =
    process.env.BSKY_HANDLE?.trim() || DEFAULT_BSKY_HANDLE;
  const posts = await fetchAuthorPosts(handle);
  const lastSeenUri = getMeta(LAST_SEEN_KEY);
  setMeta(LAST_POLL_KEY, new Date().toISOString());

  let stored = 0;
  let notified = 0;
  let newPosts = 0;
  const coversUpdated = syncCovers(posts);

  if (!lastSeenUri) {
    // First run: seed cursor + backfill matches into DB without WhatsApp.
    for (const post of posts) {
      if (storeMatch(post, false)) stored += 1;
    }
    const newest = posts[0];
    if (newest) {
      setMeta(LAST_SEEN_KEY, newest.uri);
      console.log(`[poll:init] Seeded last-seen (no notify): ${newest.uri}`);
      console.log(`[poll:init] Backfilled ${stored} matching release(s) into SQLite`);
    } else {
      console.log(`[poll:init] No posts found for ${handle}`);
    }
    return {
      handle,
      firstRun: true,
      fetched: posts.length,
      newPosts: 0,
      stored,
      notified: 0,
      coversUpdated,
      lastSeenUri: newest?.uri ?? null,
    };
  }

  const fresh: FeedPost[] = [];
  for (const post of posts) {
    if (post.uri === lastSeenUri) break;
    fresh.push(post);
  }
  fresh.reverse();
  newPosts = fresh.length;

  if (newPosts === 0) {
    console.log(`[poll] No new posts from ${handle}`);
    return {
      handle,
      firstRun: false,
      fetched: posts.length,
      newPosts: 0,
      stored: 0,
      notified: 0,
      coversUpdated,
      lastSeenUri,
    };
  }

  console.log(`[poll] ${newPosts} new post(s) from ${handle}`);
  let cursor = lastSeenUri;

  for (const post of fresh) {
    const match = matchPost(post.text);
    if (match.matched) {
      const inserted = storeMatch(post, false);
      if (inserted) {
        stored += 1;
        const message = buildMessage({
          handle: post.authorHandle || handle,
          text: post.text,
          uri: post.uri,
        });
        console.log(`[match] ${match.genres.join(", ")}: ${post.uri}`);
        const result = await sendWhatsApp(message);
        if (result.ok) {
          markNotified(post.uri);
          notified += 1;
        }
      } else {
        console.log(`[dup] Already stored: ${post.uri}`);
      }
    } else {
      console.log(`[skip] No genre keyword: ${post.uri}`);
    }
    cursor = post.uri;
    setMeta(LAST_SEEN_KEY, cursor);
  }

  return {
    handle,
    firstRun: false,
    fetched: posts.length,
    newPosts,
    stored,
    notified,
    coversUpdated,
    lastSeenUri: cursor,
  };
}
