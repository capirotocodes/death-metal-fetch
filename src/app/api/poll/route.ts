import { NextResponse } from "next/server";
import { pollOnce } from "@/lib/poll";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: Request): boolean {
  const secret = process.env.POLL_SECRET?.trim();
  // Local/dev: open. Public deploy: set POLL_SECRET so strangers can't spam polls.
  if (!secret) return true;
  const header =
    request.headers.get("x-poll-secret") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return header === secret;
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await pollOnce();
    return NextResponse.json(summary);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Poll failed" },
      { status: 500 },
    );
  }
}
