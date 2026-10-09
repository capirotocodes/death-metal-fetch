import { test } from "node:test";
import assert from "node:assert/strict";
import { callMeBotQueued } from "../src/lib/whatsapp";

// Real reply from run 37912694514: the echoed post text contains "TERROR".
const QUEUED_WITH_TERROR =
  "<p>Message to: ***<p>Text to send: 🤘 Metal release alert%0A2⃣0⃣2⃣6⃣: THE UPCOMING TERROR ⚔️ GRAVE HEX - Domain of Foul Rebirths EP<p><b>Message queued.</b> You will receive it in a few seconds.";

test("a queued reply counts as sent even if the echoed post text says 'error'", () => {
  assert.equal(callMeBotQueued(QUEUED_WITH_TERROR), true);
});

test("a real failure is not hidden by 'Message queued' inside the echoed text", () => {
  assert.equal(
    callMeBotQueued("<p>Message to: ***<p>Text to send: Message queued<p><b>APIKey is invalid.</b>"),
    false,
  );
  assert.equal(callMeBotQueued("<p><b>Message not sent!</b> 0 messages left"), false);
});
