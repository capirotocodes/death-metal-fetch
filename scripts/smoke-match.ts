import assert from "node:assert/strict";
import { matchPost, parseArtistTitle, snippet } from "../src/match.js";

assert.equal(matchPost("New death metal album out now").matched, true);
assert.equal(matchPost("New death metal album out now").hasReleaseCue, true);
assert.equal(matchPost("Loving this BLACK METAL set").matched, true);
assert.equal(matchPost("grindcore chaos tonight").matched, true);
assert.equal(matchPost("indie folk release party").matched, false);

const parsed = parseArtistTitle("Tomb Mold - Planetary Clairvoyance\nDeath metal classic");
assert.equal(parsed.artist, "Tomb Mold");
assert.equal(parsed.title, "Planetary Clairvoyance");

assert.ok(snippet("a".repeat(300), 50).endsWith("…"));
assert.equal(snippet("short", 50), "short");

console.log("match tests ok");
