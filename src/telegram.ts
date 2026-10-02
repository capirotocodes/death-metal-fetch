/**
 * Telegram Bot API notifier (sendMessage).
 * Docs: https://core.telegram.org/bots/api#sendmessage
 *
 * Without TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID, runs in dry-run mode and only logs.
 */

export type SendResult = {
  dryRun: boolean;
  ok: boolean;
  status?: number;
  body?: string;
};

function apiBase(token: string): string {
  return `https://api.telegram.org/bot${token}`;
}

export function telegramConfigured(): boolean {
  return Boolean(
    process.env.TELEGRAM_BOT_TOKEN?.trim() &&
      process.env.TELEGRAM_CHAT_ID?.trim(),
  );
}

export async function sendTelegram(text: string): Promise<SendResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();

  if (!token || !chatId) {
    console.log("[telegram:dry-run] Would send:\n" + text);
    return { dryRun: true, ok: true };
  }

  const res = await fetch(`${apiBase(token)}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: false,
    }),
  });

  const body = await res.text();

  if (!res.ok) {
    console.error(`[telegram] HTTP ${res.status}: ${body}`);
    return { dryRun: false, ok: false, status: res.status, body };
  }

  try {
    const json = JSON.parse(body) as { ok?: boolean; description?: string };
    if (json.ok === false) {
      console.error(`[telegram] API error: ${json.description ?? body}`);
      return { dryRun: false, ok: false, status: res.status, body };
    }
  } catch {
    // Non-JSON body with 2xx — still treat as sent.
  }

  console.log(`[telegram] Sent OK (${res.status}): ${body.slice(0, 160)}`);
  return { dryRun: false, ok: true, status: res.status, body };
}
