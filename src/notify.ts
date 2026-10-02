import { callmebotConfigured, sendWhatsApp } from "./whatsapp.js";
import { sendTelegram, telegramConfigured } from "./telegram.js";

/**
 * Primary: Telegram Bot API (required for non–dry-run).
 * Optional: CallMeBot WhatsApp if both CALLMEBOT_* env vars are set.
 */
export function notifierConfigured(): boolean {
  return telegramConfigured();
}

export async function notify(text: string): Promise<void> {
  const tg = await sendTelegram(text);
  if (!tg.ok) {
    console.error("[notify] Telegram send failed");
  }

  if (callmebotConfigured()) {
    const wa = await sendWhatsApp(text);
    if (!wa.ok) {
      console.error("[notify] Optional CallMeBot send failed");
    }
  }
}
