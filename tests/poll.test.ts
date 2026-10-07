import { test } from "node:test";
import assert from "node:assert/strict";
import { pollOnce, type FeedPost, type PollDeps } from "../src/lib/poll";
import { emptyArchive } from "../src/lib/store";

const H = "kmanriffs.bsky.social";
const NOW = "2026-10-05T12:00:00.000Z";
const uri = (n: number) => `at://did:plc:x/app.bsky.feed.post/${n}`;

function post(
  n: number,
  text = `Band ${n} – Record ${n}\nNew death metal album`,
  coverUrl: string | null = null,
): FeedPost {
  return {
    uri: uri(n),
    text,
    createdAt: `2026-01-0${n}T00:00:00.000Z`,
    indexedAt: `2026-01-0${n}T00:00:01.000Z`,
    authorHandle: H,
    coverUrl,
  };
}

function stub(posts: FeedPost[], send: "ok" | "fail" | "throw" = "ok") {
  const sent: string[] = [];
  const deps: PollDeps = {
    fetchPosts: async () => posts,
    sendWhatsApp: async (text) => {
      sent.push(text);
      if (send === "throw") throw new Error("network down");
      return { dryRun: false, ok: send === "ok" };
    },
    now: () => NOW,
  };
  return { sent, deps };
}

// Feed is newest first; post 2 is not a watched genre.
const seedFeed = () => [post(3), post(2, "doom metal out now"), post(1)];
const firstRun = async () => (await pollOnce(emptyArchive(H), stub(seedFeed()).deps)).archive;

test("first run backfills matches, seeds the cursor and sends nothing", async () => {
  const { sent, deps } = stub(seedFeed());
  const { archive, summary } = await pollOnce(emptyArchive(H), deps);
  assert.equal(summary.firstRun, true);
  assert.equal(summary.stored, 2);
  assert.deepEqual(sent, []);
  assert.equal(archive.lastSeenUri, uri(3));
  assert.equal(archive.updatedAt, NOW);
  assert.deepEqual(
    archive.releases.map((r) => r.uri),
    [uri(3), uri(1)],
  );
});

test("a run with nothing new returns the same archive and no change", async () => {
  const before = await firstRun();
  const { sent, deps } = stub(seedFeed());
  const { archive, summary } = await pollOnce(before, deps);
  assert.equal(summary.changed, false);
  assert.equal(archive, before);
  assert.deepEqual(sent, []);
});

test("new matches are stored and alerted oldest first", async () => {
  const { sent, deps } = stub([post(5), post(4), ...seedFeed()]);
  const { archive, summary } = await pollOnce(await firstRun(), deps);
  assert.equal(summary.stored, 2);
  assert.equal(summary.notified, 2);
  assert.match(sent[0], /Band 4/);
  assert.match(sent[1], /Band 5/);
  assert.equal(archive.lastSeenUri, uri(5));
  const fresh = archive.releases.filter((r) => r.uri === uri(4) || r.uri === uri(5));
  assert.equal(fresh.length, 2);
  assert.ok(fresh.every((r) => r.notified));
});

for (const mode of ["fail", "throw"] as const) {
  test(`a WhatsApp ${mode} keeps the release unnotified and counts the failure`, async () => {
    const { deps } = stub([post(4), ...seedFeed()], mode);
    const { archive, summary } = await pollOnce(await firstRun(), deps);
    assert.equal(summary.stored, 1);
    assert.equal(summary.alertFailures, 1);
    assert.equal(summary.changed, true);
    assert.equal(archive.releases.find((r) => r.uri === uri(4))?.notified, false);
  });
}

test("a lost cursor does not duplicate rows or alerts", async () => {
  const before = { ...(await firstRun()), lastSeenUri: "at://deleted" };
  const { sent, deps } = stub(seedFeed());
  const { archive, summary } = await pollOnce(before, deps);
  assert.equal(summary.stored, 0);
  assert.deepEqual(sent, []);
  assert.equal(archive.releases.length, 2);
  assert.equal(archive.lastSeenUri, uri(3));
});

test("covers are refreshed on already-stored rows", async () => {
  const { deps } = stub([post(3, undefined, "https://cdn/c.jpg"), post(2, "doom"), post(1)]);
  const { archive, summary } = await pollOnce(await firstRun(), deps);
  assert.equal(summary.coversUpdated, 1);
  assert.equal(summary.changed, true);
  assert.equal(archive.releases.find((r) => r.uri === uri(3))?.coverUrl, "https://cdn/c.jpg");
});
