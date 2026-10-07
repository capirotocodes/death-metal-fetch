import { coverUrlFromEmbed } from "./covers";
import type { FeedPost } from "./poll";

/** Latest posts (no replies) from the public Bluesky AppView; no login needed. */
export async function fetchAuthorPosts(
  handle: string,
  limit = 40,
): Promise<FeedPost[]> {
  // Dynamic import keeps the ESM resolution path: @atproto/api's dependency
  // `multiformats` exports only an "import" condition, so a CJS require() of
  // @atproto/api (how tsx runs scripts/poll.ts) fails with ERR_PACKAGE_PATH_NOT_EXPORTED.
  const { AtpAgent } = await import("@atproto/api");
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
        text: record.text ?? "",
        createdAt: record.createdAt ?? post.indexedAt,
        indexedAt: post.indexedAt,
        authorHandle: post.author.handle,
        coverUrl: coverUrlFromEmbed(post.embed),
      };
    })
    .filter((p) => p.text.length > 0);
}
