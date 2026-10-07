import { test } from "node:test";
import assert from "node:assert/strict";
import { cacheRemoteCovers, type CoverCacheDeps } from "../src/lib/cover-cache";
import { emptyArchive, insertIfNew, type NewRelease } from "../src/lib/store";

function row(uri: string, coverUrl: string | null): NewRelease {
  return {
    uri, text: "x", artist: null, title: null, genres: [], hasReleaseCue: true,
    bskyUrl: uri, authorHandle: null, postedAt: "2026-01-01T00:00:00.000Z",
    notified: false, coverUrl, createdAt: "2026-01-01T00:00:00.000Z",
  };
}

function archiveWith(...rows: NewRelease[]) {
  let releases = emptyArchive("h").releases;
  for (const r of rows) releases = insertIfNew(releases, r).releases;
  return { ...emptyArchive("h"), releases };
}

function stub(existing: string[] = [], failDownload = false) {
  const saved: string[] = [];
  const downloads: string[] = [];
  const deps: CoverCacheDeps = {
    exists: (name) => existing.includes(name),
    download: async (url) => {
      downloads.push(url);
      if (failDownload) throw new Error("403");
      return Buffer.from("img");
    },
    thumbnail: async (b) => b,
    save: (name) => saved.push(name),
  };
  return { deps, saved, downloads };
}

test("remote deathgrind covers are downloaded once and pointed at local copies", async () => {
  const a = archiveWith(
    row("dg1", "https://cdn.deathgrind.club/s/O9l6mnJWG_G.webp"),
    row("bsky", "https://cdn.bsky.app/img/feed_thumbnail/plain/x"),
  );
  const { deps, saved } = stub();
  const r = await cacheRemoteCovers(a, deps);
  assert.equal(r.cached, 1);
  assert.deepEqual(saved, ["O9l6mnJWG_G.webp"]);
  const cover = (uri: string) => r.archive.releases.find((x) => x.uri === uri)?.coverUrl;
  assert.equal(cover("dg1"), "covers/O9l6mnJWG_G.webp");
  assert.equal(cover("bsky"), "https://cdn.bsky.app/img/feed_thumbnail/plain/x");
});

test("an existing local copy is reused without downloading", async () => {
  const { deps, downloads } = stub(["abc.webp"]);
  const r = await cacheRemoteCovers(archiveWith(row("dg", "https://cdn.deathgrind.club/s/abc.webp")), deps);
  assert.equal(r.cached, 1);
  assert.deepEqual(downloads, []);
});

test("a failed download keeps the remote URL for a later retry", async () => {
  const a = archiveWith(row("dg", "https://cdn.deathgrind.club/s/abc.webp"));
  const r = await cacheRemoteCovers(a, stub([], true).deps);
  assert.equal(r.failed, 1);
  assert.equal(r.archive, a);
});
