import fs from "node:fs";
import path from "node:path";
import { getBskyHandle } from "./config";
import { emptyArchive, parseArchive, type Archive } from "./store";

/** Build-time read of the committed archive (server components only). */
export function readArchive(): Archive {
  const file = path.join(process.cwd(), "data", "releases.json");
  if (!fs.existsSync(file)) return emptyArchive(getBskyHandle());
  return parseArchive(fs.readFileSync(file, "utf8"), getBskyHandle());
}
