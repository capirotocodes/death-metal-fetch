/**
 * Send one real Telegram message using .env credentials.
 *   npm run notify:test
 *
 * Prerequisites: TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID
 * (get chat_id via: npm run telegram:chat-id after messaging the bot once)
 */
import "dotenv/config";
import { telegramConfigured, sendTelegram } from "../src/telegram.js";
import { callmebotConfigured, sendWhatsApp } from "../src/whatsapp.js";

async function main(): Promise<void> {
  if (!telegramConfigured()) {
    console.error(
      "Missing TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID in .env — cannot send Telegram test.\n" +
        "1) Create a bot with @BotFather (/newbot)\n" +
        "2) Message the bot once (/start)\n" +
        "3) npm run telegram:chat-id\n" +
        "4) Put chat_id into TELEGRAM_CHAT_ID and re-run",
    );
    process.exit(1);
  }

  const stamp = new Date().toISOString();
  const text = [
    "🤘 Death Metal Fetch — Telegram test",
    `OK at ${stamp}`,
    "If you see this, Telegram delivery works.",
  ].join("\n");

  const result = await sendTelegram(text);
  if (!result.ok || result.dryRun) {
    console.error("Telegram test send failed:", {
      ok: result.ok,
      dryRun: result.dryRun,
      status: result.status,
      body: result.body?.slice(0, 300),
    });
    process.exit(1);
  }

  console.log("Test Telegram send succeeded.");

  if (callmebotConfigured()) {
    console.log(
      "CallMeBot also configured — sending optional WhatsApp copy (may not deliver)...",
    );
    const wa = await sendWhatsApp(
      `Death Metal Fetch — optional WA mirror\n${stamp}`,
    );
    console.log(
      wa.ok
        ? "Optional CallMeBot request accepted (delivery not guaranteed)."
        : "Optional CallMeBot send failed (ignored for primary Telegram path).",
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
