# Death Metal Fetch

Small Node/TypeScript service that watches [kmanriffs.bsky.social](https://bsky.app/profile/kmanriffs.bsky.social) on Bluesky and sends a **WhatsApp** message via [CallMeBot](https://www.callmebot.com/blog/free-api-whatsapp-messages/) whenever that account posts something that looks like a **Death Metal**, **Grindcore**, or **Black Metal** release.

**CallMeBot WhatsApp is the primary notifier.** Delivery can be slow (queued for minutes) but works. Telegram Bot API remains an **optional** secondary channel if you also set those env vars.

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

Edit `.env` with at least CallMeBot credentials:

| Variable | Required | Default | Notes |
|---|---|---|---|
| `BSKY_HANDLE` | no | `kmanriffs.bsky.social` | Bluesky handle to watch |
| `POLL_INTERVAL_MS` | no | `120000` | Poll interval (2 minutes) |
| `CALLMEBOT_PHONE` | for real sends | — | Your WhatsApp number, digits only |
| `CALLMEBOT_APIKEY` | for real sends | — | Key from CallMeBot one-time setup |
| `TELEGRAM_BOT_TOKEN` | optional | — | Secondary channel only |
| `TELEGRAM_CHAT_ID` | optional | — | Secondary channel only |
| `STATE_FILE` | no | `./data/state.json` | Where last-seen URI is stored |

### CallMeBot one-time WhatsApp setup (primary)

1. Open WhatsApp and message the current CallMeBot number (per [CallMeBot docs](https://www.callmebot.com/blog/free-api-whatsapp-messages/): often **+34 694 242 562** or **+34 623 78 64 49**) with the allow phrase from that page (commonly `I allow callmebot to send me messages`; some redirects use `I allow callmebot to call me` after saving the contact).
2. CallMeBot replies with your **API key**. Put **your** phone (country code + number, no `+` or spaces) and that key into `.env` as `CALLMEBOT_PHONE` and `CALLMEBOT_APIKEY`.
3. Messages may arrive **delayed** (queued) even when the API returns HTTP 200 + `Message queued`.

Without those vars the notifier still runs and prints dry-run WhatsApp payloads.

Optional one-shot delivery check (avoid spamming):

```bash
npm run notify:test
```

### Troubleshooting (CallMeBot)

- **Queued but slow** — Normal for this service; wait a few minutes before assuming failure.
- **Still nothing** — WhatsApp the activation bot `Resume`; if silent, try [dead bot setup](https://www.callmebot.com/?ae_global_templates=setup-whatsapp-for-dead-bot).
- **Lost API key** — Send `Recover APIKey` to the bot ([FAQ](https://www.callmebot.com/faq/)).
- **Optional Telegram** — Set `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` (BotFather `/newbot`, message bot once, `npm run telegram:chat-id`) for a secondary mirror.

## Run

With CallMeBot vars in `.env`:

```bash
npm install
npm run build
npm start                 # production: node dist/index.js (polls continuously)
```

Development (no build step):

```bash
npm run dev               # tsx continuous poller
npm run once              # single poll then exit
```

## Message shape

Short WhatsApp text including:

- Artist / title when the first line parses as `Artist - Title`
- A short snippet of the Bluesky post
- A link to the post on bsky.app
