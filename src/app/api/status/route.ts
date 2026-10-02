import { NextResponse } from "next/server";
import { getPublicStatus } from "@/lib/config";
import { countReleases, countUnseen, getMeta } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const publicStatus = getPublicStatus();
  return NextResponse.json({
    ...publicStatus,
    count: countReleases(),
    unseenCount: countUnseen(),
    lastPollAt: getMeta("lastPollAt"),
    lastSeenUri: getMeta("lastSeenUri"),
  });
}
