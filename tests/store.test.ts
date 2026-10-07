import { test } from "node:test";
import assert from "node:assert/strict";
import {
  emptyArchive,
  insertIfNew,
  parseArchive,
  serializeArchive,
  setCoverUrl,
  setNotified,
  type NewRelease,
} from "../src/lib/store";

function row(uri: string, postedAt: string): NewRelease {
  return {
    uri,
    text: "Death Metal demo",
    artist: null,
    title: null,
    genres: ["Death Metal"],
    hasReleaseCue: true,
    bskyUrl: `https://bsky.app/x/${uri}`,
    authorHandle: "a.bsky.social",
    postedAt,
    notified: false,
    coverUrl: null,
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

test("insertIfNew adds rows newest-first with incrementing ids", () => {
  let releases = emptyArchive("h").releases;
  releases = insertIfNew(releases, row("at://1", "2026-01-01T00:00:00.000Z")).releases;
  const r = insertIfNew(releases, row("at://2", "2026-02-01T00:00:00.000Z"));
  assert.equal(r.inserted, true);
  assert.deepEqual(
    r.releases.map((x) => [x.uri, x.id, x.seen]),
    [
      ["at://2", 2, false],
      ["at://1", 1, false],
    ],
  );
});

test("insertIfNew skips a uri that is already stored", () => {
  const first = insertIfNew([], row("at://1", "2026-01-01T00:00:00.000Z")).releases;
  const r = insertIfNew(first, row("at://1", "2026-03-01T00:00:00.000Z"));
  assert.equal(r.inserted, false);
  assert.equal(r.releases, first);
});

test("setNotified and setCoverUrl only touch the matching row", () => {
  let releases = insertIfNew([], row("at://1", "2026-01-01T00:00:00.000Z")).releases;
  releases = insertIfNew(releases, row("at://2", "2026-02-01T00:00:00.000Z")).releases;
  releases = setNotified(releases, "at://1");
  const c = setCoverUrl(releases, "at://2", "https://cdn/x.jpg");
  assert.equal(c.updated, true);
  assert.deepEqual(
    c.releases.map((x) => [x.uri, x.notified, x.coverUrl]),
    [
      ["at://2", false, "https://cdn/x.jpg"],
      ["at://1", true, null],
    ],
  );
  assert.equal(setCoverUrl(c.releases, "at://2", "https://cdn/x.jpg").updated, false);
});

test("serializeArchive round-trips through parseArchive", () => {
  const a = {
    ...emptyArchive("h"),
    lastSeenUri: "at://1",
    updatedAt: "2026-01-01T00:00:00.000Z",
    releases: insertIfNew([], row("at://1", "2026-01-01T00:00:00.000Z")).releases,
  };
  const text = serializeArchive(a);
  assert.ok(text.endsWith("}\n"));
  assert.deepEqual(parseArchive(text, "other"), a);
});

test("parseArchive rejects an unknown version", () => {
  assert.throws(
    () => parseArchive('{"version":2,"releases":[]}', "h"),
    /Unsupported archive version/,
  );
});
