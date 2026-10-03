# Death Metal Fetch

A **mobile-first** phone app that watches [kmanriffs.bsky.social](https://bsky.app/profile/kmanriffs.bsky.social) for **Death Metal**, **Grindcore**, and **Black Metal** posts, stores every match in local **SQLite**, and can ping WhatsApp via [CallMeBot](https://www.callmebot.com/blog/free-api-whatsapp-messages/) when something **new** lands.

Pastel unicorn UI on purpose. Home / Releases / Settings + PWA, plus an optional **Capacitor Android** shell so it installs like a real app.

## Stack

- Next.js (App Router) + TypeScript + Tailwind + shadcn/ui
- SQLite via `better-sqlite3` (`data/releases.db` by default)
- Bluesky via `@atproto/api` (`getAuthorFeed`)
- Background poller from Next `instrumentation.ts` (~every 2 minutes)
- PWA: web manifest + icons + `theme-color`
- Capacitor Android (`android/`) — native shell pointed at your hosted URL

## Setup

```bash
npm install
cp .env.example .env
```

| Variable | Required | Notes |
|---|---|---|
| `CALLMEBOT_PHONE` | for WhatsApp | Digits only (operator’s phone) |
| `CALLMEBOT_APIKEY` | for WhatsApp | From CallMeBot |
| `BSKY_HANDLE` | no | Default `kmanriffs.bsky.social` |
| `POLL_INTERVAL_MS` | no | Default `120000` |
| `DATABASE_PATH` | no | Default `./data/releases.db` |
| `POLL_SECRET` | **yes for public hosts** | Locks manual `POST /api/poll` |

Without CallMeBot credentials the app still runs; WhatsApp goes to dry-run logs.

## Run locally

```bash
npm run dev
```

Open [http://127.0.0.1:3847](http://127.0.0.1:3847).

### Add to Home Screen

- **iOS Safari:** Share → **Add to Home Screen**
- **Android Chrome:** Menu → **Install app** / **Add to Home screen**

## Free always-on hosting (for other people)

This is **not** a static site. It needs a **always-running Node process** + a **disk volume** for SQLite. Free serverless (Vercel hobby, etc.) will not keep the poller alive.

### Best free options (skip Oracle card-verification drama)

1. **Fly.io** (recommended) — Docker + HTTPS. Repo includes `Dockerfile` + `fly.toml`. Free allowance changes; keep machines set not to auto-stop.

2. **Your always-on home PC / Raspberry Pi** + free Cloudflare Tunnel  
   Same Docker compose; tunnel gives a public HTTPS URL.

Avoid hosts that **sleep** when idle (classic Render free web services) — the Bluesky poller will stop.

### Real Android app (APK)

After the backend URL exists:

```bash
export CAPACITOR_SERVER_URL=https://YOUR-APP.fly.dev
npm run cap:sync
npm run cap:open
```

Build an APK in Android Studio and sideload it on your phone. The WebView loads your hosted Next app (covers, poller, WhatsApp stay on the server).

### Docker (any VPS / Oracle / Pi)

```bash
cp .env.example .env
# fill CALLMEBOT_* if you want operator WhatsApp alerts
# set POLL_SECRET to a long random string for public use
docker compose up -d --build
```

App: `http://YOUR_HOST:3847` (put HTTPS in front via Caddy/nginx/Cloudflare).

### Fly.io sketch

```bash
fly auth login
fly apps create death-metal-fetch   # pick a free name if taken
fly volumes create dmf_data --size 1 --region iad
fly secrets set POLL_SECRET="$(openssl rand -hex 24)"
# optional:
# fly secrets set CALLMEBOT_PHONE=... CALLMEBOT_APIKEY=...
fly deploy
```

Then share `https://<app>.fly.dev` — people Add to Home Screen from that URL.

### Multi-user notes

- Everyone shares the **same release archive** (good).
- **Unread / mark seen** is per phone (localStorage), not shared.
- **WhatsApp** still goes only to the CallMeBot number you configured (operator alerts), not to every visitor.
- Set `POLL_SECRET` on public hosts so strangers can’t spam `/api/poll`.

## Screens

- **Home** — status + latest 3 (with cover art)
- **Releases** — full archive cards
- **Settings** — masked CallMeBot, poll interval, genres

## Behavior

- First poll: seed + backfill, no WhatsApp
- Later polls: new matches → WhatsApp (if configured)
- Covers: Bluesky image embed thumbs stored as `cover_url`
