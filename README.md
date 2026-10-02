# Death Metal Fetch

Small Node/TypeScript service that watches [kmanriffs.bsky.social](https://bsky.app/profile/kmanriffs.bsky.social) on Bluesky and sends a WhatsApp message via [CallMeBot](https://www.callmebot.com/blog/free-api-whatsapp-messages/) whenever that account posts something that looks like a **Death Metal**, **Grindcore**, or **Black Metal** release.

## What it does

- Polls the author’s Bluesky feed (`getAuthorFeed`) about every 2 minutes
- Matches posts whose text mentions Death Metal, Grindcore, or Black Metal (case-insensitive)
- Prefers release-like wording when present, but notifies on genre keyword hits from this account so you don’t miss drops
- Persists the last-seen post URI under `data/state.json` so restarts don’t re-spam
- On first run, seeds that cursor without backfilling old posts
- If CallMeBot credentials are missing, runs in **dry-run** mode and logs the message it would send

## Requirements

- Node.js 18+

## Setup

```bash
npm install
cp .env.example .env
```

Edit `.env`:

| Variable | Required | Default | Notes |
|---|---|---|---|
| `BSKY_HANDLE` | no | `kmanriffs.bsky.social` | Bluesky handle to watch |
| `POLL_INTERVAL_MS` | no | `120000` | Poll interval (2 minutes) |
| `CALLMEBOT_PHONE` | for real sends | — | International number, digits only (e.g. `34644664570`) |
| `CALLMEBOT_APIKEY` | for real sends | — | Key from CallMeBot one-time setup |
| `STATE_FILE` | no | `./data/state.json` | Where last-seen URI is stored |

### CallMeBot one-time WhatsApp setup

1. Open WhatsApp and message **+34 644 66 45 70** with:
   ```text
   I allow callmebot to send me messages
   ```
2. CallMeBot replies with your **API key**.
3. Put your phone (country code + number, no `+` or spaces) and that key into `.env` as `CALLMEBOT_PHONE` and `CALLMEBOT_APIKEY`.

Without those vars the notifier still runs and prints dry-run WhatsApp payloads.

## Run

Development (TypeScript via `tsx`):

```bash
npm run dev
```

Single poll then exit (useful for testing):

```bash
npm run once
```

Production build:

```bash
npm run build
npm start
```

## Message shape

Short WhatsApp text including:

- Artist / title when the first line parses as `Artist - Title`
- A short snippet of the Bluesky post
- A link to the post on bsky.app
