// One poll cycle against data/releases.json. Run by the GitHub Actions workflow
// (and locally with `npm run poll`). Without CallMeBot env vars, alerts are dry-run.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { fetchAuthorPosts } from "../src/lib/bluesky";
import { cacheRemoteCovers } from "../src/lib/cover-cache";
import { fetchDeathgrindItems, mergeDeathgrind } from "../src/lib/deathgrind";
import { DEFAULT_BSKY_HANDLE } from "../src/lib/config";
import { pollOnce } from "../src/lib/poll";
import { emptyArchive, parseArchive, serializeArchive } from "../src/lib/store";
import { sendWhatsApp } from "../src/lib/whatsapp";

const USER_AGENT = "death-metal-fetch (+https://github.com/capirotocodes/death-metal-fetch)";

async function main(): Promise<void> {
  const file = path.resolve(process.env.ARCHIVE_PATH?.trim() || "data/releases.json");
  const handle = process.env.BSKY_HANDLE?.trim() || DEFAULT_BSKY_HANDLE;
  const archive = fs.existsSync(file)
    ? parseArchive(fs.readFileSync(file, "utf8"), handle)
    : emptyArchive(handle);

  const { archive: next, summary } = await pollOnce(archive, {
    fetchPosts: fetchAuthorPosts,
    sendWhatsApp,
    now: () => new Date().toISOString(),
  });
  console.log("[poll] summary", JSON.stringify(summary));

  // deathgrind.club: app-only (no alerts). A failure here must not lose Bluesky results.
  let out = next;
  let changed = summary.changed;
  try {
    const items = await fetchDeathgrindItems();
    const dg = mergeDeathgrind(out, items, new Date().toISOString());
    console.log(`[deathgrind] ${items.length} in feed, ${dg.stored} new`);
    out = dg.archive;
    changed ||= dg.stored > 0;
  } catch (err) {
    console.error("[deathgrind] failed:", err);
    process.exitCode = 1;
  }

  // Local thumbnails for covers whose host blocks cross-site loading.
  const coversDir = path.join(path.dirname(file), "covers");
  const covers = await cacheRemoteCovers(out, {
    exists: (name) => fs.existsSync(path.join(coversDir, name)),
    download: async (url) => {
      const res = await fetch(url, { headers: { "user-agent": USER_AGENT } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    },
    // Cards draw covers at 72px; 160px stays sharp on 2x screens and keeps files small.
    thumbnail: (image) =>
      sharp(image).resize(160, 160, { fit: "cover" }).webp({ quality: 70 }).toBuffer(),
    save: (name, data) => {
      fs.mkdirSync(coversDir, { recursive: true });
      fs.writeFileSync(path.join(coversDir, name), data);
    },
  });
  if (covers.cached || covers.failed) {
    console.log(`[covers] ${covers.cached} local, ${covers.failed} failed`);
  }
  out = covers.archive;
  changed ||= covers.cached > 0;

  if (changed) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, serializeArchive(out));
    console.log(`[poll] wrote ${file}`);
  }
  if (summary.alertFailures > 0) process.exitCode = 1;
}

main().catch((err) => {
  // Nothing is written when the poll itself fails (e.g. Bluesky unreachable).
  console.error("[poll] failed:", err);
  process.exitCode = 1;
});
