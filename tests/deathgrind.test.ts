import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeDeathgrind, parseDeathgrindRss } from "../src/lib/deathgrind";
import { emptyArchive } from "../src/lib/store";

// Two items copied from https://deathgrind.club/rss.xml (description is entity-encoded HTML).
const XML = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>DeathGrindClub latest releases</title>
<item><title>Mindflair - Stagnation (2005)</title><link>https://deathgrind.club/posts/95252</link><guid isPermaLink="true">https://deathgrind.club/posts/95252</guid><pubDate>Wed, 07 Oct 2026 13:07:53 GMT</pubDate><description>&lt;p&gt;&lt;img src=&quot;https://cdn.deathgrind.club/s/O9l6mnJWG_G.webp&quot; alt=&quot;Mindflair - Stagnation (2005)&quot; /&gt;&lt;/p&gt;&lt;p&gt;Bands: Mindflair | Genres: Grindcore | Countries: DE&lt;/p&gt;</description><category>Grindcore</category><category>Album</category></item>
<item><title>First Days Of Humanity - Lithic [EP] (2022)</title><link>https://deathgrind.club/posts/95250</link><guid isPermaLink="true">https://deathgrind.club/posts/95250</guid><pubDate>Wed, 07 Oct 2026 13:06:17 GMT</pubDate><description>&lt;p&gt;&lt;img src=&quot;https://cdn.deathgrind.club/s/BJVEjwxvkbk.webp&quot; alt=&quot;x&quot; /&gt;&lt;/p&gt;&lt;p&gt;Bands: First Days Of Humanity | Genres: Goregrind, Death Metal | Countries: US&lt;/p&gt;</description><category>Goregrind</category><category>EP</category></item>
</channel></rss>`;

const NOW = "2026-10-07T14:00:00.000Z";

test("parseDeathgrindRss extracts link, title, date, cover, genres and info", () => {
  const items = parseDeathgrindRss(XML);
  assert.equal(items.length, 2);
  assert.deepEqual(items[0], {
    link: "https://deathgrind.club/posts/95252",
    title: "Mindflair - Stagnation (2005)",
    pubDate: "2026-10-07T13:07:53.000Z",
    coverUrl: "https://cdn.deathgrind.club/s/O9l6mnJWG_G.webp",
    genres: ["Grindcore"],
    info: "Bands: Mindflair | Genres: Grindcore | Countries: DE",
  });
  assert.deepEqual(items[1].genres, ["Goregrind", "Death Metal"]);
});

test("mergeDeathgrind stores every item once, marked as deathgrind, without alerts", () => {
  const first = mergeDeathgrind(emptyArchive("h"), parseDeathgrindRss(XML), NOW);
  assert.equal(first.stored, 2);
  assert.equal(first.archive.updatedAt, NOW);
  const r = first.archive.releases[0];
  assert.equal(r.uri, "https://deathgrind.club/posts/95252");
  assert.equal(r.source, "deathgrind");
  assert.equal(r.artist, "Mindflair");
  assert.equal(r.title, "Stagnation (2005)");
  assert.equal(r.bskyUrl, "https://deathgrind.club/posts/95252");
  assert.equal(r.notified, false);

  const again = mergeDeathgrind(first.archive, parseDeathgrindRss(XML), "2026-10-08T00:00:00.000Z");
  assert.equal(again.stored, 0);
  assert.equal(again.archive, first.archive);
});
