// One poll cycle against data/releases.json. Run by the GitHub Actions workflow
// (and locally with `npm run poll`). Without CallMeBot env vars, alerts are dry-run.
import fs from "node:fs";
import path from "node:path";
import { fetchAuthorPosts } from "../src/lib/bluesky";
import { DEFAULT_BSKY_HANDLE } from "../src/lib/config";
import { pollOnce } from "../src/lib/poll";
import { emptyArchive, parseArchive, serializeArchive } from "../src/lib/store";
import { sendWhatsApp } from "../src/lib/whatsapp";

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

  if (summary.changed) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, serializeArchive(next));
    console.log(`[poll] wrote ${file}`);
  }
  if (summary.alertFailures > 0) process.exitCode = 1;
}

main().catch((err) => {
  // Nothing is written when the poll itself fails (e.g. Bluesky unreachable).
  console.error("[poll] failed:", err);
  process.exitCode = 1;
});
