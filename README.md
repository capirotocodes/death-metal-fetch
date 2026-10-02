# Death Metal Fetch

Small Node/TypeScript service that watches [kmanriffs.bsky.social](https://bsky.app/profile/kmanriffs.bsky.social) on Bluesky and sends a **Telegram** message whenever that account posts something that looks like a **Death Metal**, **Grindcore**, or **Black Metal** release.

> **Telegram is the primary notifier.** CallMeBot / WhatsApp was tried first but proved unreliable here (API returned `Message queued` / HTTP 200 with no delivery even after `Resume`). CallMeBot remains an optional secondary if you still set those env vars.

## What it does

- Polls the author’s Bluesky feed (`getAuthorFeed`) about every 2 minutes
- Matches posts whose text mentions Death Metal, Grindcore, or Black Metal (case-insensitive)
- Prefers release-like wording when present, but notifies on genre keyword hits from this account so you don’t miss drops
- Persists the last-seen post URI under `data/state.json` so restarts don’t re-spam
- On first run, seeds that cursor without backfilling old posts
- If Telegram credentials are missing, runs in **dry-run** mode and logs the message it would send

## Requirements

- Node.js 18+
- A Telegram account

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
| `TELEGRAM_BOT_TOKEN` | for real sends | — | From [@BotFather](https://t.me/BotFather) |
| `TELEGRAM_CHAT_ID` | for real sends | — | Your chat (or group) id |
| `CALLMEBOT_PHONE` | optional | — | Secondary WhatsApp only |
| `CALLMEBOT_APIKEY` | optional | — | Secondary WhatsApp only |
| `STATE_FILE` | no | `./data/state.json` | Where last-seen URI is stored |

### Telegram bot setup (primary) — BotFather

1. Open Telegram and chat with [@BotFather](https://t.me/BotFather).
2. Send `/newbot`, follow the prompts (display name + username ending in `bot`).
3. BotFather replies with an **HTTP API token**. Put it in `.env` as `TELEGRAM_BOT_TOKEN`.
4. **Message your new bot once** (open the bot, tap Start / send `/start`). Bots cannot message you until you start a chat.
5. Get your `chat_id`:
   ```bash
   npm run telegram:chat-id
   ```
   Or open `https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getUpdates` and find `"chat":{"id": ...}`.
6. Put that value in `.env` as `TELEGRAM_CHAT_ID`.
7. Send a live delivery check:
   ```bash
   npm run notify:test
   ```

Without `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` the service still runs and prints dry-run Telegram payloads.

### Troubleshooting (Telegram)

- **`chat not found` / bot silent** — Message the bot at least once, then re-run `npm run telegram:chat-id`.
- **Wrong chat_id** — Groups use a different (often negative) id; add the bot to the group and message it there first.
- **Invalid token** — Use BotFather `/token` or `/revoke`, update `.env`.

### Optional: CallMeBot WhatsApp (secondary)

Only used if both `CALLMEBOT_PHONE` and `CALLMEBOT_APIKEY` are set. Not required. CallMeBot may report `Message queued` without ever delivering — prefer Telegram. Brief setup notes remain in CallMeBot’s [docs](https://www.callmebot.com/blog/free-api-whatsapp-messages/) if you still want a best-effort WhatsApp mirror.

## Run

```bash
npm run telegram:chat-id   # after BotFather + /start
npm run notify:test        # live Telegram test (needs TELEGRAM_* env)
npm run dev                # continuous poller
npm run once               # single poll then exit
npm run build && npm start
```

## Message shape

Short Telegram text including:

- Artist / title when the first line parses as `Artist - Title`
- A short snippet of the Bluesky post
- A link to the post on bsky.app
