# Death Metal Fetch

Small Node/TypeScript service that watches [kmanriffs.bsky.social](https://bsky.app/profile/kmanriffs.bsky.social) on Bluesky and sends a **Telegram** message whenever that account posts something that looks like a **Death Metal**, **Grindcore**, or **Black Metal** release.

> CallMeBot / WhatsApp was dropped after unreliable bot-full redirects and setup friction; Telegram Bot API is the notification channel now.

## What it does

- Polls the author’s Bluesky feed (`getAuthorFeed`) about every 2 minutes
- Matches posts whose text mentions Death Metal, Grindcore, or Black Metal (case-insensitive)
- Prefers release-like wording when present, but notifies on genre keyword hits from this account so you don’t miss drops
- Persists the last-seen post URI under `data/state.json` so restarts don’t re-spam
- On first run, seeds that cursor without backfilling old posts
- If Telegram credentials are missing, runs in **dry-run** mode and logs the message it would send

## Requirements

- Node.js 18+
- A Telegram account (for receiving alerts)

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
| `STATE_FILE` | no | `./data/state.json` | Where last-seen URI is stored |

### Telegram bot setup (BotFather)

1. Open Telegram and chat with [@BotFather](https://t.me/BotFather).
2. Send `/newbot`, follow the prompts (display name + username ending in `bot`).
3. BotFather replies with an **HTTP API token**. Put it in `.env` as `TELEGRAM_BOT_TOKEN`.
4. **Message your new bot once** (open the bot link, tap Start / send `/start`). Bots cannot message you until you have started a chat.
5. Get your `chat_id` either way:
   - Helper (recommended):
     ```bash
     npm run telegram:chat-id
     ```
     It calls `getUpdates` and prints recent chat ids. Copy the one for your user into `TELEGRAM_CHAT_ID`.
   - Or open in a browser (with your token):
     `https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getUpdates`
     and find `"chat":{"id": ...}` under a message you sent.
6. Save `.env` and run the notifier.

Without `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` the service still runs and prints dry-run Telegram payloads.

### Troubleshooting (Telegram)

- **`chat not found` / bot silent** — You must message the bot at least once after creating it, then re-run `npm run telegram:chat-id`.
- **Wrong chat_id** — Groups have a different (often negative) id; use the helper after sending a message in that chat (add the bot to the group first).
- **Invalid token** — Recreate or revoke via BotFather (`/token` / `/revoke`) and update `.env`.

## Run

Development (TypeScript via `tsx`):

```bash
npm run dev
```

Single poll then exit (useful for testing):

```bash
npm run once
```

List chats for `TELEGRAM_CHAT_ID`:

```bash
npm run telegram:chat-id
```

Production build:

```bash
npm run build
npm start
```

## Message shape

Short Telegram text including:

- Artist / title when the first line parses as `Artist - Title`
- A short snippet of the Bluesky post
- A link to the post on bsky.app
