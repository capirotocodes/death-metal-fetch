/**
 * CallMeBot WhatsApp HTTP API client (primary notifier).
 * Docs: https://www.callmebot.com/blog/free-api-whatsapp-messages/
 *
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

  // CallMeBot often returns 200 with an error string in the body.
  const lower = body.toLowerCase();
  const looksFailed =
    lower.includes("error") ||
    lower.includes("invalid") ||
    (lower.includes("apikey") && lower.includes("wrong"));
  if (looksFailed) {
    console.error(`[whatsapp] API reported failure: ${body.slice(0, 240)}`);
    return { dryRun: false, ok: false, status: res.status, body };
  }

  console.log(`[whatsapp] Sent OK (${res.status}): ${body.slice(0, 160)}`);
  return { dryRun: false, ok: true, status: res.status, body };
}
