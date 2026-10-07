# Death Metal Fetch

A **mobile-first** phone app that watches [kmanriffs.bsky.social](https://bsky.app/profile/kmanriffs.bsky.social) for **Death Metal**, **Grindcore**, and **Black Metal** posts, keeps every match in an archive, and can ping WhatsApp via [CallMeBot](https://www.callmebot.com/blog/free-api-whatsapp-messages/) when something **new** lands.

Pastel unicorn UI on purpose. Home / Releases / Settings + PWA, plus an optional **Capacitor Android** shell.

**Live:** https://capirotocodes.github.io/death-metal-fetch/

## How it runs (free, no server)

- **GitHub Actions** (`.github/workflows/poll-and-deploy.yml`) runs about every 15 minutes (GitHub may delay scheduled runs) and on demand via **Actions → Poll Bluesky and deploy → Run workflow**.
- Each run fetches the latest 40 posts, adds new matches to **`data/releases.json`**, sends WhatsApp alerts for them, commits the file, and redeploys the site.
- The site is a **Next.js static export** served by **GitHub Pages**. Screens read the archive baked in at build time and refresh from `/death-metal-fetch/data/releases.json`.
- If a month passes without new releases, the workflow makes an empty "keep-alive" commit: GitHub disables scheduled workflows in public repos after 60 days without activity.

## Stack

- Next.js (App Router, `output: "export"`) + TypeScript + Tailwind + shadcn/ui
- Bluesky via `@atproto/api` (`getAuthorFeed`, public AppView, no login)
- Archive: JSON in git (`data/releases.json`)
- PWA: web manifest + icons + `theme-color`
- Capacitor Android (`android/`) — native shell pointed at the hosted URL

## Setup (once)

1. Repository secrets (Settings → Secrets and variables → Actions), optional:
   - `CALLMEBOT_PHONE` — digits only, no `+`
   - `CALLMEBOT_APIKEY` — from CallMeBot

   Without them alerts are dry-run (logged only).
2. Settings → Pages → **Source: GitHub Actions**.
3. Actions → **Run workflow** once. The first run backfills without sending alerts.

## Local development

```bash
npm install
npm run dev        # http://127.0.0.1:3847/death-metal-fetch/
npm test           # unit tests (node:test)
npm run poll       # one poll into data/releases.json (dry-run without CallMeBot env vars)
npm run build && npm run check:basepath   # static export into out/
```

See `.env.example` for the variables `npm run poll` reads.

### Add to Home Screen

- **iOS Safari:** Share → **Add to Home Screen**
- **Android Chrome:** Menu → **Install app** / **Add to Home screen**

### Android app (APK)

```bash
export CAPACITOR_SERVER_URL=https://capirotocodes.github.io/death-metal-fetch/
npm run cap:sync
npm run cap:open
```

## Notes

- Everyone shares the same release archive.
- **Unread / mark seen** is per phone (localStorage), not shared.
- **WhatsApp** goes only to the configured CallMeBot number, not to every visitor.

## Screens

- **Home** — status + latest 3 (with cover art)
- **Releases** — full archive cards
- **Settings** — alert status, poll cadence, genres

## Behavior

- First poll: seed + backfill, no WhatsApp
- Later polls: new matches → WhatsApp (if configured); a failed alert is logged, not retried
- Covers: Bluesky image embed thumbs stored as `coverUrl`
