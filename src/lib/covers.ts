/**
 * Pull a usable cover/thumbnail URL from a Bluesky post embed view.
 * Prefers the first attached image; falls back to external-link thumbs.
 */

type BskyImage = {
  thumb?: string;
  fullsize?: string;
  alt?: string;
};

type EmbedView = {
  $type?: string;
  images?: BskyImage[];
  external?: { thumb?: string; uri?: string; title?: string };
  media?: EmbedView;
};

function firstImageUrl(images: BskyImage[] | undefined): string | null {
  if (!images?.length) return null;
  const img = images[0];
  const url = img?.thumb || img?.fullsize;
  return typeof url === "string" && url.startsWith("http") ? url : null;
}

export function coverUrlFromEmbed(embed: unknown): string | null {
  if (!embed || typeof embed !== "object") return null;
  const e = embed as EmbedView;
  const type = e.$type ?? "";

  if (type.includes("app.bsky.embed.images")) {
    return firstImageUrl(e.images);
  }

  if (type.includes("app.bsky.embed.external")) {
    const thumb = e.external?.thumb;
    return typeof thumb === "string" && thumb.startsWith("http") ? thumb : null;
  }

  if (type.includes("app.bsky.embed.recordWithMedia") && e.media) {
    return coverUrlFromEmbed(e.media);
  }

  // Defensive: some payloads omit $type but still carry images.
  return firstImageUrl(e.images);
}
