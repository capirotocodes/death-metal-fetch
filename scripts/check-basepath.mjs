// Fails if any absolute URL in the static export misses (or doubles) the
// GitHub Pages prefix — a missing prefix breaks icons/manifest on the phone.
import fs from "node:fs";
import path from "node:path";

const BASE = "/death-metal-fetch";
const OUT = "out";
const bad = [];
const okUrl = (u) => u.startsWith(`${BASE}/`) && !u.startsWith(`${BASE}${BASE}`);

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      walk(p);
    } else if (p.endsWith(".html")) {
      const html = fs.readFileSync(p, "utf8");
      for (const m of html.matchAll(/(?:href|src)="(\/[^"]*)"/g)) {
        if (!okUrl(m[1])) bad.push(`${p}: ${m[1]}`);
      }
    }
  }
}

walk(OUT);

const manifestPath = path.join(OUT, "manifest.webmanifest");
if (!fs.existsSync(manifestPath)) {
  bad.push("missing out/manifest.webmanifest");
} else {
  const m = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  for (const u of [m.start_url, ...m.icons.map((i) => i.src)]) {
    if (!okUrl(u)) bad.push(`manifest: ${u}`);
  }
}
if (!fs.existsSync(path.join(OUT, "data", "releases.json"))) {
  bad.push("missing out/data/releases.json");
}

if (bad.length) {
  console.error("basePath check failed:\n" + bad.join("\n"));
  process.exit(1);
}
console.log("basePath check OK");
