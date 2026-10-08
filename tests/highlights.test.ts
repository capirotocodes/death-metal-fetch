import { test } from "node:test";
import assert from "node:assert/strict";
import { weeklyHighlights, withStar } from "../src/lib/highlights-client";

const NOW = Date.parse("2026-10-08T12:00:00.000Z");
const r = (uri: string) => ({ uri });

test("weeklyHighlights keeps stars from the last 7 days, newest star first", () => {
  const stars = {
    a: "2026-10-07T12:00:00.000Z", // 1 day ago
    b: "2026-10-08T11:00:00.000Z", // 1 hour ago
    c: "2026-09-30T12:00:00.000Z", // 8 days ago -> out
  };
  const out = weeklyHighlights([r("a"), r("b"), r("c"), r("d")], stars, NOW);
  assert.deepEqual(out.map((x) => x.uri), ["b", "a"]);
});

test("withStar toggles a star without mutating the original", () => {
  const before = { a: "2026-10-07T12:00:00.000Z" };
  const added = withStar(before, "b", NOW);
  assert.deepEqual(Object.keys(added).sort(), ["a", "b"]);
  assert.equal(added.b, "2026-10-08T12:00:00.000Z");
  const removed = withStar(added, "a", NOW);
  assert.deepEqual(Object.keys(removed), ["b"]);
  assert.deepEqual(Object.keys(before), ["a"]);
});
