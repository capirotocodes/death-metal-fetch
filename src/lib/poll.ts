import "server-only";
import { AtpAgent } from "@atproto/api";
import {
  getMeta,
  insertReleaseIfNew,
  markNotified,
  setMeta,
} from "./db";
import {
  matchPost,
  parseArtistTitle,
  postUrl,
  snippet,
} from "./match";
import { sendWhatsApp } from "./whatsapp";

const DEFAULT_HANDLE = "kmanriffs.bsky.social";
const LAST_SEEN_KEY = "lastSeenUri";

export type PollSummary = {
  handle: string;
  firstRun: boolean;
  fetched: number;
  newPosts: number;
  stored: number;
  notified: number;
  lastSeenUri: string | null;
};

type FeedPost = {
  uri: string;
  cid: string;
  text: string;
  createdAt: string;
  indexedAt: string;
  authorHandle: string;
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
      return {
        uri: post.uri,
        cid: post.cid,
        text: record.text ?? "",
        createdAt: record.createdAt ?? post.indexedAt,
        indexedAt: post.indexedAt,
        authorHandle: post.author.handle,
        raw: {
          uri: post.uri,
          cid: post.cid,
          author: post.author.handle,
          indexedAt: post.indexedAt,
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
    notified: notifyFlag,
  });
}

export async function pollOnce(): Promise<PollSummary> {
  const handle =
    process.env.BSKY_HANDLE?.trim() || DEFAULT_HANDLE;
  const posts = await fetchAuthorPosts(handle);
  const lastSeenUri = getMeta(LAST_SEEN_KEY);

  let stored = 0;
  let notified = 0;
  let newPosts = 0;

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
    lastSeenUri: cursor,
  };
}
