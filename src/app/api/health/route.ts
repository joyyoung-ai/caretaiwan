import { NextResponse } from "next/server";
import { isDatabaseEnabled } from "@/lib/db/client";
import { query } from "@/lib/db/postgres";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!isDatabaseEnabled()) {
    return NextResponse.json(
      { ok: false, reason: "database_disabled" },
      { status: 503 }
    );
  }

  try {
    await query<{ ok: number }>("select 1 as ok");

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { ok: false, reason: "database_error" },
      { status: 500 }
    );
  }
}
