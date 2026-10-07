import { test } from "node:test";
import assert from "node:assert/strict";
import { matchPost, parseArtistTitle, postUrl } from "../src/lib/match";

test("matchPost detects each watched genre", () => {
  assert.deepEqual(matchPost("New Death Metal album out now").genres, ["Death Metal"]);
  assert.deepEqual(matchPost("grindcore and BLACK METAL split").genres, [
    "Grindcore",
    "Black Metal",
  ]);
});

test("matchPost ignores posts without a watched genre", () => {
  const r = matchPost("New doom metal record out now");
  assert.equal(r.matched, false);
  assert.equal(r.hasReleaseCue, true);
});

test("parseArtistTitle splits the first line on a dash", () => {
  assert.deepEqual(parseArtistTitle("Gorguts – Obscura\nDeath metal classic"), {
    artist: "Gorguts",
    title: "Obscura",
  });
  assert.deepEqual(parseArtistTitle("no dash here"), { artist: null, title: null });
});

test("postUrl builds a bsky.app link from an at:// uri", () => {
  assert.equal(
    postUrl("kmanriffs.bsky.social", "at://did:plc:abc/app.bsky.feed.post/3kxyz"),
    "https://bsky.app/profile/kmanriffs.bsky.social/post/3kxyz",
  );
});
