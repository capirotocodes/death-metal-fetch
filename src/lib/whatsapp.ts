/**
 * CallMeBot WhatsApp HTTP API (primary notifier for new DB inserts).
 * Dry-run when CALLMEBOT_PHONE / CALLMEBOT_APIKEY are missing.
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

/**
 * True when CallMeBot confirms the message was queued. The reply echoes the
 * message ("Text to send: …<p>"), so that part is dropped first: post text such
 * as "TERROR" must not look like a failure ("error").
 */
export function callMeBotQueued(body: string): boolean {
  const status = body.replace(/Text to send:[\s\S]*?(?=<p>|$)/i, "").toLowerCase();
  const failed =
    status.includes("message not sent") ||
    status.includes("0 messages left") ||
    status.includes("error") ||
    status.includes("invalid") ||
    (status.includes("apikey") && status.includes("wrong"));
  return status.includes("message queued") && !failed;
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

  if (!callMeBotQueued(body)) {
    console.error(
      `[whatsapp] API did not confirm queue (HTTP ${res.status}): ${body}`,
    );
    return { dryRun: false, ok: false, status: res.status, body };
  }

  console.log(`[whatsapp] Queued OK (${res.status}): ${body}`);
  return { dryRun: false, ok: true, status: res.status, body };
}
