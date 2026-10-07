// Copies the committed archive into public/ so the static site can refresh from it.
// Runs before `next dev` and `next build` (npm predev/prebuild).
import fs from "node:fs";

const src = "data/releases.json";
const dest = "public/data/releases.json";

fs.mkdirSync("public/data", { recursive: true });
if (fs.existsSync(src)) {
  fs.copyFileSync(src, dest);
} else {
  const empty = {
    version: 1,
    handle: "kmanriffs.bsky.social",
    lastSeenUri: null,
    updatedAt: null,
    releases: [],
  };
  fs.writeFileSync(dest, JSON.stringify(empty, null, 2) + "\n");
}
