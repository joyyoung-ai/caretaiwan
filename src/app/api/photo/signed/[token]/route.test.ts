import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { readLocalSignedPhoto } from "@/lib/local-photo-storage";

vi.mock("@/lib/local-photo-storage", () => ({
  readLocalSignedPhoto: vi.fn(),
}));

const readLocalSignedPhotoMock = vi.mocked(readLocalSignedPhoto);

function request(): Request {
  return new Request("https://care.example.test/api/photo/signed/token");
}

function context(token: string) {
  return { params: Promise.resolve({ token }) };
}

describe("GET /api/photo/signed/[token]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes the token to local signed-photo verification and returns image bytes", async () => {
    readLocalSignedPhotoMock.mockResolvedValue({
      ok: true,
      bytes: Buffer.from([1, 2, 3]),
      contentType: "image/png",
    });

    const res = await GET(request(), context("signed-token"));
    const bytes = new Uint8Array(await res.arrayBuffer());

    expect(res.status).toBe(200);
    expect(readLocalSignedPhotoMock).toHaveBeenCalledWith("signed-token");
    expect(res.headers.get("Content-Type")).toBe("image/png");
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(Array.from(bytes)).toEqual([1, 2, 3]);
  });

  it("maps invalid or expired signed-photo tokens to a generic not found response", async () => {
    readLocalSignedPhotoMock.mockResolvedValue({ ok: false, status: 403 });

    const res = await GET(request(), context("expired-token"));

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({ error: "Not found" });
  });
});
