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
| `CALLMEBOT_PHONE` | for real sends | — | Your WhatsApp number, digits only (e.g. `34612345678`) |
| `CALLMEBOT_APIKEY` | for real sends | — | Key from CallMeBot one-time setup |
| `STATE_FILE` | no | `./data/state.json` | Where last-seen URI is stored |

### CallMeBot one-time WhatsApp setup

Per [CallMeBot](https://www.callmebot.com/blog/free-api-whatsapp-messages/) (updated Jan 2026), use the current WhatsApp bot:

1. Open WhatsApp and message **+34 623 78 64 49** with:
   ```text
   I allow callmebot to send me messages
   ```
2. CallMeBot replies with your **API key** (may take a minute).
3. Put **your** phone (country code + number, no `+` or spaces) and that key into `.env` as `CALLMEBOT_PHONE` and `CALLMEBOT_APIKEY`.

If the bot replies that it is **full**, try the alternate number **+34 621 08 34 84** with the same allow message (reported in community issues when the primary bot is at capacity).

Without those vars the notifier still runs and prints dry-run WhatsApp payloads.

### Troubleshooting (CallMeBot)

- **No reply from the bot** — Confirm you messaged **+34 623 78 64 49** (not older numbers such as +34 644 66 45 70). If you see a “full” message, use **+34 621 08 34 84**.
- **Lost API key** — Use CallMeBot’s [Recover APIKey](https://www.callmebot.com/blog/free-api-whatsapp-messages/) flow on their site (same allow message to the bot).
- **Setup failed / rate limited** — CallMeBot may ask you to wait **24 hours** before trying the allow message again; then retry once.

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
