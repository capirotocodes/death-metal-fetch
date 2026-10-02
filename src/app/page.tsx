import { ReleaseList, type Release } from "@/components/release-list";
import { countReleases, getMeta, listReleases } from "@/lib/db";
import { callmebotConfigured } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

function loadInitial() {
  const rows = listReleases(200);
  const releases: Release[] = rows.map((r) => ({
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

  return {
    count: countReleases(),
    callmebotConfigured: callmebotConfigured(),
    releases,
    lastSeenUri: getMeta("lastSeenUri"),
  };
}

export default function Home() {
  const initial = loadInitial();

  return (
    <main className="shell">
      <header className="hero">
        <p className="brand">Death Metal Fetch</p>
        <h1>Release archive from the underground feed.</h1>
        <p className="lede">
          Watching kmanriffs.bsky.social for Death Metal, Grindcore, and Black
          Metal — stored locally, WhatsApp when something new drops.
        </p>
      </header>
      <ReleaseList initialData={initial} />
    </main>
  );
}
