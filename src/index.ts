import "dotenv/config";
import { AtpAgent } from "@atproto/api";
import { loadState, saveState } from "./state.js";
import { matchPost, parseArtistTitle, snippet } from "./match.js";
import { sendWhatsApp } from "./whatsapp.js";

const DEFAULT_HANDLE = "kmanriffs.bsky.social";
const DEFAULT_POLL_MS = 120_000;

function env(name: string, fallback?: string): string | undefined {
  const v = process.env[name]?.trim();
  return v || fallback;
}

function postUrl(handle: string, uri: string): string {
  // at://did:plc:.../app.bsky.feed.post/{rkey}
  const rkey = uri.split("/").pop();
  if (!rkey) return `https://bsky.app/profile/${handle}`;
  return `https://bsky.app/profile/${handle}/post/${rkey}`;
}

function buildMessage(opts: {
  handle: string;
  text: string;
  uri: string;
}): string {
  const { artist, title } = parseArtistTitle(opts.text);
  const lines: string[] = ["🤘 Metal release alert"];

  if (artist || title) {
    const head = [artist, title].filter(Boolean).join(" — ");
    lines.push(head);
  }

  lines.push(snippet(opts.text, 220));
  lines.push(postUrl(opts.handle, opts.uri));
  return lines.join("\n");
}

async function pollOnce(agent: AtpAgent, handle: string): Promise<void> {
  const state = await loadState();

  const feed = await agent.getAuthorFeed({
    actor: handle,
    limit: 30,
    filter: "posts_no_replies",
  });

  const posts = feed.data.feed
    .map((item) => {
      const post = item.post;
      const record = post.record as { text?: string; createdAt?: string };
      return {
        uri: post.uri,
        cid: post.cid,
        text: record.text ?? "",
        createdAt: record.createdAt ?? post.indexedAt,
        authorHandle: post.author.handle,
      };
    })
    .filter((p) => p.text.length > 0);

  // Feed is newest-first. Process oldest-first among new posts so notifications
  // arrive in chronological order and lastSeenUri advances correctly.
  const newPosts = [];
  for (const post of posts) {
    if (state.lastSeenUri && post.uri === state.lastSeenUri) break;
    newPosts.push(post);
  }
  newPosts.reverse();

  if (!state.lastSeenUri) {
    // First run: remember the newest post, do not notify history.
    const newest = posts[0];
    if (newest) {
      await saveState({
        lastSeenUri: newest.uri,
        lastSeenAt: newest.createdAt,
        updatedAt: new Date().toISOString(),
      });
      console.log(
        `[init] Seeded last-seen URI (no backfill): ${newest.uri}`,
      );
    } else {
      console.log(`[init] No posts found for ${handle}`);
    }
    return;
  }

  if (newPosts.length === 0) {
    console.log(`[poll] No new posts from ${handle}`);
    return;
  }

  console.log(`[poll] ${newPosts.length} new post(s) from ${handle}`);

  let lastProcessed = state;
  for (const post of newPosts) {
    const match = matchPost(post.text);
    if (match.matched) {
      const message = buildMessage({
        handle: post.authorHandle || handle,
        text: post.text,
        uri: post.uri,
      });
      const cue = match.hasReleaseCue ? "genre+release-cue" : "genre";
      console.log(`[match] ${cue}: ${post.uri}`);
      await sendWhatsApp(message);
    } else {
      console.log(`[skip] No genre keyword: ${post.uri}`);
    }

    lastProcessed = {
      lastSeenUri: post.uri,
      lastSeenAt: post.createdAt,
      updatedAt: new Date().toISOString(),
    };
    await saveState(lastProcessed);
  }
}

async function main(): Promise<void> {
  const handle = env("BSKY_HANDLE", DEFAULT_HANDLE)!;
  const pollMs = Number(env("POLL_INTERVAL_MS", String(DEFAULT_POLL_MS)));
  const once = process.argv.includes("--once");

  const phone = env("CALLMEBOT_PHONE");
  const apikey = env("CALLMEBOT_APIKEY");
  if (!phone || !apikey) {
    console.log(
      "[config] CALLMEBOT_PHONE / CALLMEBOT_APIKEY missing → dry-run mode (log only)",
    );
  } else {
    console.log(`[config] WhatsApp notifications enabled for ${phone}`);
  }

  console.log(
    `[config] Watching ${handle}; poll every ${pollMs}ms${once ? " (once)" : ""}`,
  );

  const agent = new AtpAgent({ service: "https://public.api.bsky.app" });

  const run = async () => {
    try {
      await pollOnce(agent, handle);
    } catch (err) {
      console.error("[error] Poll failed:", err);
    }
  };

  await run();
  if (once) return;

  setInterval(run, Number.isFinite(pollMs) && pollMs > 0 ? pollMs : DEFAULT_POLL_MS);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
