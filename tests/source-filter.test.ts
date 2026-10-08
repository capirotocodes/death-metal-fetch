import { test } from "node:test";
import assert from "node:assert/strict";
import { filterBySource } from "../src/lib/source-filter";

const releases = [
  { uri: "a", source: "deathgrind" as const },
  { uri: "b" }, // older Bluesky rows have no source field
  { uri: "c", source: "bluesky" as const },
];

test("filterBySource keeps everything for 'all'", () => {
  assert.deepEqual(filterBySource(releases, "all").map((r) => r.uri), ["a", "b", "c"]);
});

test("filterBySource treats a missing source as Bluesky", () => {
  assert.deepEqual(filterBySource(releases, "bluesky").map((r) => r.uri), ["b", "c"]);
  assert.deepEqual(filterBySource(releases, "deathgrind").map((r) => r.uri), ["a"]);
});
