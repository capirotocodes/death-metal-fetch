import { callmebotConfigured, sendWhatsApp } from "./whatsapp.js";
import { sendTelegram, telegramConfigured } from "./telegram.js";

/**
 * Primary: CallMeBot WhatsApp. Optional: Telegram if also configured.
 * Dry-run only when CallMeBot is missing (Telegram alone does not count as configured).
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
