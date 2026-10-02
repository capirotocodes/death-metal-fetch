/**
 * Helper: list recent chats that messaged your bot (getUpdates).
 * Usage: set TELEGRAM_BOT_TOKEN in .env, message the bot once, then:
 *   npm run telegram:chat-id
 */
import "dotenv/config";

type Update = {
  update_id: number;
  message?: {
    chat?: {
      id: number;
      type: string;
      username?: string;
      first_name?: string;
      title?: string;
    };
    text?: string;
  };
};

async function main(): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) {
    console.error(
      "Missing TELEGRAM_BOT_TOKEN. Add it to .env, then message your bot once on Telegram.",
    );
    process.exit(1);
  }

  const url = `https://api.telegram.org/bot${token}/getUpdates`;
  const res = await fetch(url);
  const data = (await res.json()) as {
    ok: boolean;
    description?: string;
    result?: Update[];
  };

  if (!data.ok) {
    console.error("getUpdates failed:", data.description ?? data);
    process.exit(1);
  }

  const updates = data.result ?? [];
  if (updates.length === 0) {
    console.log(
      "No updates yet. Open Telegram, find your bot, send it any message (e.g. /start), then re-run this script.",
    );
    return;
  }

  const seen = new Map<string, { id: number; label: string }>();
  for (const u of updates) {
    const chat = u.message?.chat;
    if (!chat) continue;
    const label =
      chat.title ||
      [chat.first_name, chat.username ? `@${chat.username}` : ""]
        .filter(Boolean)
        .join(" ") ||
      chat.type;
    seen.set(String(chat.id), { id: chat.id, label: `${label} (${chat.type})` });
  }

  console.log("Chats that have messaged your bot:\n");
  for (const { id, label } of seen.values()) {
    console.log(`  chat_id: ${id}  —  ${label}`);
  }
  console.log(
    "\nPut the chat_id you want into .env as TELEGRAM_CHAT_ID=",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
