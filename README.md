# Death Metal Fetch

Small Node/TypeScript service that watches [kmanriffs.bsky.social](https://bsky.app/profile/kmanriffs.bsky.social) on Bluesky and sends a **WhatsApp** message via [CallMeBot](https://www.callmebot.com/blog/free-api-whatsapp-messages/) whenever that account posts something that looks like a **Death Metal**, **Grindcore**, or **Black Metal** release.

Telegram Bot API remains an **optional** secondary channel if you also set those env vars; CallMeBot is the primary path.

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
| `CALLMEBOT_PHONE` | for real sends | — | Your WhatsApp number, digits only |
| `CALLMEBOT_APIKEY` | for real sends | — | Key from CallMeBot one-time setup |
| `TELEGRAM_BOT_TOKEN` | optional | — | Secondary channel only |
| `TELEGRAM_CHAT_ID` | optional | — | Secondary channel only |
| `STATE_FILE` | no | `./data/state.json` | Where last-seen URI is stored |

### CallMeBot one-time WhatsApp setup (primary)

1. Open WhatsApp and message the current CallMeBot number (per [CallMeBot docs](https://www.callmebot.com/blog/free-api-whatsapp-messages/), Jan 2026: **+34 623 78 64 49**) with:
   ```text
   I allow callmebot to send me messages
   ```
2. If the bot replies that it is **full**, use the redirect they give you. This project has seen **+34 694 242 562**:
   - **Save the contact** first
   - Send the exact phrase: `I allow callmebot to call me` (not “send me messages”)
3. Older / fallback numbers (history): **+34 621 08 34 84** (`send me messages`), **+34 644 66 45 70** (often no reply).
4. CallMeBot replies with your **API key**. Put **your** phone (country code + number, no `+` or spaces) and that key into `.env` as `CALLMEBOT_PHONE` and `CALLMEBOT_APIKEY`.

Without those vars the notifier still runs and prints dry-run WhatsApp payloads.

Send a one-shot delivery check:

```bash
npm run notify:test
```

### Troubleshooting (CallMeBot)

- **API says queued but no WhatsApp arrives** — CallMeBot often returns HTTP 200 + `Message queued` even when WhatsApp never delivers. Try, in order:
  1. WhatsApp the **same bot you activated** with the word `Resume` (paused / rate-limited bots are a known issue).
  2. If the bot is silent or “dead”, follow [Setup WhatsApp for dead Bot](https://www.callmebot.com/?ae_global_templates=setup-whatsapp-for-dead-bot): save **+34 623 78 64 49**, send `I allow callmebot to send me messages` (API key usually stays the same).
  3. Current docs also list **+34 694 242 562** — save contact first, then the allow phrase from that page.
  4. Check the API body for `0 messages left` / `Message not sent` (quota). Our client treats those as failure; `Message queued` alone is not a delivery guarantee.
  5. Phone format: digits-only (`5519996360666`) and `+5519996360666` both normalize to the same destination on CallMeBot’s side.
  6. **Fallback:** enable optional Telegram (`TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID`) — already wired in `src/notify.ts`.
- **No reply from the bot during setup** — Prefer **+34 623 78 64 49**. On “full” / redirect, use the number they give (e.g. **+34 694 242 562**). Older **+34 644 66 45 70** often no reply.
- **Lost API key** — WhatsApp the bot: `Recover APIKey` ([FAQ](https://www.callmebot.com/faq/)).
- **Setup failed / rate limited** — Wait **24 hours** if asked, then retry once.

### Optional: Telegram (secondary)

If you also set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`, each alert is also sent via Telegram. Create a bot with [@BotFather](https://t.me/BotFather) (`/newbot`), message it once, then run `npm run telegram:chat-id` to print your `chat_id`. CallMeBot remains required for non–dry-run operation.

## Run

```bash
npm run dev          # continuous poller
npm run once         # single poll then exit
npm run notify:test  # real WhatsApp test (needs CallMeBot env)
npm run build && npm start
```

## Message shape

Short WhatsApp text including:

- Artist / title when the first line parses as `Artist - Title`
- A short snippet of the Bluesky post
- A link to the post on bsky.app
