import { NextResponse } from "next/server";
import { countUnseen, markAllSeen, markSeen } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      uri?: string;
      all?: boolean;
    };

    if (body.all) {
      const updated = markAllSeen();
      return NextResponse.json({ ok: true, updated, unseenCount: countUnseen() });
    }

    if (!body.uri || typeof body.uri !== "string") {
      return NextResponse.json(
        { error: "Provide uri or all: true" },
        { status: 400 },
      );
    }

    markSeen(body.uri);
    return NextResponse.json({ ok: true, uri: body.uri, unseenCount: countUnseen() });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to mark seen" },
      { status: 500 },
    );
  }
}
