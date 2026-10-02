import { NextResponse } from "next/server";
import { countReleases, listReleases } from "@/lib/db";
import { callmebotConfigured } from "@/lib/whatsapp";
import { getMeta } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const rows = listReleases(200);
  const releases = rows.map((r) => ({
    id: r.id,
    uri: r.uri,
    text: r.text,
    artist: r.artist,
    title: r.title,
    genres: JSON.parse(r.genres) as string[],
    hasReleaseCue: Boolean(r.has_release_cue),
    bskyUrl: r.bsky_url,
    authorHandle: r.author_handle,
    postedAt: r.posted_at,
    notified: Boolean(r.notified),
    createdAt: r.created_at,
  }));

  return NextResponse.json({
    count: countReleases(),
    lastSeenUri: getMeta("lastSeenUri"),
    callmebotConfigured: callmebotConfigured(),
    releases,
  });
}
