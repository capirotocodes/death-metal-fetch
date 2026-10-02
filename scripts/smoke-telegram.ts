import assert from "node:assert/strict";
import { sendTelegram, telegramConfigured } from "../src/telegram.js";

// Ensure dry-run path without mutating real credentials if somehow set.
const prevToken = process.env.TELEGRAM_BOT_TOKEN;
const prevChat = process.env.TELEGRAM_CHAT_ID;
delete process.env.TELEGRAM_BOT_TOKEN;
delete process.env.TELEGRAM_CHAT_ID;

assert.equal(telegramConfigured(), false);

const result = await sendTelegram("smoke test metal alert");
assert.equal(result.dryRun, true);
assert.equal(result.ok, true);

if (prevToken !== undefined) process.env.TELEGRAM_BOT_TOKEN = prevToken;
if (prevChat !== undefined) process.env.TELEGRAM_CHAT_ID = prevChat;

console.log("telegram dry-run tests ok");
