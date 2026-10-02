# Death Metal Fetch

A **mobile-first** phone app that watches [kmanriffs.bsky.social](https://bsky.app/profile/kmanriffs.bsky.social) for **Death Metal**, **Grindcore**, and **Black Metal** posts, stores every match in local **SQLite**, and pings WhatsApp via [CallMeBot](https://www.callmebot.com/blog/free-api-whatsapp-messages/) when something **new** lands.

The UI is deliberately ridiculous: pastel unicorns, rainbows, and goofy copy wrapping very real underground releases. Home / Releases / Settings app shell. Thumb-friendly bottom nav.

## Stack

- Next.js (App Router) + TypeScript + Tailwind + shadcn/ui
- SQLite via `better-sqlite3` (`data/releases.db` by default)
- Bluesky via `@atproto/api` (`getAuthorFeed`)
- Background poller from Next `instrumentation.ts` (~every 2 minutes)
- PWA basics: web manifest + icons + `theme-color` for Add to Home Screen

## Setup

```bash
npm install
cp .env.example .env
```

| Variable | Required | Notes |
|---|---|---|
| `CALLMEBOT_PHONE` | for real WhatsApp | Digits only |
| `CALLMEBOT_APIKEY` | for real WhatsApp | From CallMeBot activation |
| `BSKY_HANDLE` | no | Default `kmanriffs.bsky.social` |
| `POLL_INTERVAL_MS` | no | Default `120000` |
| `DATABASE_PATH` | no | Default `./data/releases.db` |

Without CallMeBot credentials the app still runs; WhatsApp goes to **dry-run** logs.

## Run

```bash
npm run dev
```

Open [http://127.0.0.1:3847](http://127.0.0.1:3847).

Manual poll: **Poll** in the UI, or `POST /api/poll`.

### Add to Home Screen (PWA)

- **iOS Safari:** Share → **Add to Home Screen**. Uses `apple-touch-icon` + standalone display.
- **Android Chrome:** Menu → **Install app** / **Add to Home screen**. Manifest + icons ship at `/manifest.webmanifest` and `/icons/*`.

Theme color is hot pink (`#ff4d9a`) so the status bar matches the chaos.

## Screens

- **Home** — watched handle, last poll, WhatsApp status, stored count, latest 3
- **Releases** — full archive cards (artist/title, genres, relative time, Bluesky link, NEW badge, mark seen)
- **Settings** — masked CallMeBot phone, poll interval, genres watched (from env/status API)

## Behavior

- **First poll:** seeds last-seen, backfills recent matches, **no WhatsApp** spam
- **Later polls:** newer posts only; matching inserts trigger WhatsApp; duplicate URIs ignored
- **Seen state:** persisted in SQLite (`seen` column); unread badge on Releases tab

## 24/7

```bash
npm run build
npx pm2 start npm --name death-metal-fetch -- start
```
