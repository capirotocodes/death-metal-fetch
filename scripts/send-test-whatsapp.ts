/**
 * Send one real WhatsApp via CallMeBot using .env credentials.
 *   npm run notify:test
 */
import "dotenv/config";
import { callmebotConfigured, sendWhatsApp } from "../src/whatsapp.js";

async function main(): Promise<void> {
  if (!callmebotConfigured()) {
    console.error(
      "Missing CALLMEBOT_PHONE / CALLMEBOT_APIKEY in .env — cannot send test.",
    );
    process.exit(1);
  }

  const stamp = new Date().toISOString();
  const text = [
    "🤘 Death Metal Fetch — CallMeBot test",
    `OK at ${stamp}`,
    "If you see this, WhatsApp delivery works.",
  ].join("\n");

  const result = await sendWhatsApp(text);
  if (!result.ok || result.dryRun) {
    console.error("Test send failed:", {
      ok: result.ok,
      dryRun: result.dryRun,
      status: result.status,
    });
    process.exit(1);
  }

  console.log("Test WhatsApp send succeeded.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
