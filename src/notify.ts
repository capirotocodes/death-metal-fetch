import { callmebotConfigured, sendWhatsApp } from "./whatsapp.js";
import { sendTelegram, telegramConfigured } from "./telegram.js";

/**
 * Primary: CallMeBot WhatsApp (required for non–dry-run).
 * Optional: Telegram if both TELEGRAM_* env vars are set.
 */
export function notifierConfigured(): boolean {
  return callmebotConfigured();
}

export async function notify(text: string): Promise<void> {
  const wa = await sendWhatsApp(text);
  if (!wa.ok) {
    console.error("[notify] CallMeBot send failed");
  }

  if (telegramConfigured()) {
    const tg = await sendTelegram(text);
    if (!tg.ok) {
      console.error("[notify] Optional Telegram send failed");
    }
  }
}
