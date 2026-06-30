import { NextResponse } from "next/server";
import { readLocalSignedPhoto } from "@/lib/local-photo-storage";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const result = await readLocalSignedPhoto(token);
  if (!result.ok) {
    return NextResponse.json({ error: "Not found" }, { status: result.status });
  }
  return new NextResponse(new Uint8Array(result.bytes), {
    headers: {
      "Content-Type": result.contentType,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
