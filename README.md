# Death Metal Fetch

Web app that watches [kmanriffs.bsky.social](https://bsky.app/profile/kmanriffs.bsky.social) for **Death Metal**, **Grindcore**, and **Black Metal** posts, stores every match in a local **SQLite** database, and sends a WhatsApp alert via [CallMeBot](https://www.callmebot.com/blog/free-api-whatsapp-messages/) when a **new** match is inserted after startup.

## Stack

- Next.js (App Router) + TypeScript + Tailwind + shadcn/ui
- SQLite via `better-sqlite3` (`data/releases.db` by default)
- Bluesky via `@atproto/api` (`getAuthorFeed`)
- Background poller started from Next `instrumentation.ts` (~every 2 minutes)

## Setup

```bash
npm install
cp .env.example .env
```

| Variable | Required | Notes |
|---|---|---|
| `CALLMEBOT_PHONE` | for real WhatsApp | Your number, digits only |
| `CALLMEBOT_APIKEY` | for real WhatsApp | From CallMeBot activation |
| `BSKY_HANDLE` | no | Default `kmanriffs.bsky.social` |
| `POLL_INTERVAL_MS` | no | Default `120000` |
| `DATABASE_PATH` | no | Default `./data/releases.db` |

Without CallMeBot credentials the app still runs; WhatsApp sends go to **dry-run** logs.

### CallMeBot (brief)

Activate via the current number on [CallMeBot’s WhatsApp API page](https://www.callmebot.com/blog/free-api-whatsapp-messages/) (save contact if required). Delivery can be delayed even when the API returns `Message queued`.

## Run

```bash
npm run dev -- --port 3847
```

Or production:

```bash
npm run build
npm run start -- --port 3847
```

Open the printed local URL (default [http://127.0.0.1:3847](http://127.0.0.1:3847)).

Manual poll: **Poll now** in the UI, or `POST /api/poll`.

## Behavior

- **First poll:** seeds last-seen to the newest Bluesky post, **backfills** recent genre matches into SQLite, **no WhatsApp** for that history.
- **Later polls:** only posts newer than last-seen are considered; matching inserts trigger WhatsApp; duplicate URIs are ignored (`INSERT OR IGNORE`).
- Data lives on disk in SQLite under `data/` (gitignored). Restarting the app does not wipe the archive.

## 24/7

```bash
npm run build
npx pm2 start npm --name death-metal-fetch -- start -- --port 3847
```

Or a systemd unit with `WorkingDirectory` set to this repo, `EnvironmentFile=.env`, and `ExecStart=/usr/bin/npm run start -- --port 3847`.
