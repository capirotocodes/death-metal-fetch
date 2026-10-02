/**
 * CallMeBot WhatsApp HTTP API client (primary notifier).
 * Docs: https://www.callmebot.com/blog/free-api-whatsapp-messages/
 *
 * Delivery can be delayed even after HTTP 200 + "Message queued".
 * Without CALLMEBOT_PHONE + CALLMEBOT_APIKEY, runs in dry-run mode and only logs.
 */

const API_URL = "https://api.callmebot.com/whatsapp.php";

export type SendResult = {
  dryRun: boolean;
  ok: boolean;
  status?: number;
  body?: string;
};

export function callmebotConfigured(): boolean {
  return Boolean(
    process.env.CALLMEBOT_PHONE?.trim() &&
      process.env.CALLMEBOT_APIKEY?.trim(),
  );
}

export async function sendWhatsApp(text: string): Promise<SendResult> {
  const phone = process.env.CALLMEBOT_PHONE?.trim();
  const apikey = process.env.CALLMEBOT_APIKEY?.trim();

  if (!phone || !apikey) {
    console.log("[whatsapp:dry-run] Would send:\n" + text);
    return { dryRun: true, ok: true };
  }

  const url = new URL(API_URL);
  url.searchParams.set("phone", phone);
  url.searchParams.set("text", text);
  url.searchParams.set("apikey", apikey);

  const res = await fetch(url.toString(), { method: "GET" });
  const body = await res.text();

  if (!res.ok) {
    console.error(`[whatsapp] HTTP ${res.status}: ${body}`);
    return { dryRun: false, ok: false, status: res.status, body };
  }

  // CallMeBot often returns HTTP 200 even for quota/failure; inspect body.
  const lower = body.toLowerCase();
  const looksFailed =
    lower.includes("message not sent") ||
    lower.includes("0 messages left") ||
    lower.includes("error") ||
    lower.includes("invalid") ||
    (lower.includes("apikey") && lower.includes("wrong"));
  const queued = lower.includes("message queued");

  if (looksFailed || !queued) {
    console.error(
      `[whatsapp] API did not confirm queue (HTTP ${res.status}): ${body}`,
    );
    return { dryRun: false, ok: false, status: res.status, body };
  }

  // HTTP 200 + "Message queued" still does not guarantee WhatsApp delivery
  // (paused bot / WhatsApp blocks). See README troubleshooting.
  console.log(`[whatsapp] Queued OK (${res.status}): ${body}`);
  return { dryRun: false, ok: true, status: res.status, body };
}
