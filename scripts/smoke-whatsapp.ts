import assert from "node:assert/strict";
import { callmebotConfigured, sendWhatsApp } from "../src/whatsapp.js";

const prevPhone = process.env.CALLMEBOT_PHONE;
const prevKey = process.env.CALLMEBOT_APIKEY;
delete process.env.CALLMEBOT_PHONE;
delete process.env.CALLMEBOT_APIKEY;

assert.equal(callmebotConfigured(), false);

const result = await sendWhatsApp("smoke test metal alert");
assert.equal(result.dryRun, true);
assert.equal(result.ok, true);

if (prevPhone !== undefined) process.env.CALLMEBOT_PHONE = prevPhone;
if (prevKey !== undefined) process.env.CALLMEBOT_APIKEY = prevKey;

console.log("whatsapp dry-run tests ok");
