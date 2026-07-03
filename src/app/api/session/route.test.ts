import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { auth } from "@/auth";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

const authMock = vi.mocked(auth);

describe("GET /api/session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reports logged out when there is no session user", async () => {
    authMock.mockResolvedValue(null as never);

    const res = await GET();

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ loggedIn: false });
  });

  it("returns only display fields for signed-in users", async () => {
    authMock.mockResolvedValue({
      user: {
        name: "家屬",
        image: "https://example.test/avatar.png",
        lineUserId: "U1234567890abcdef",
      },
    } as never);

    const res = await GET();

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      loggedIn: true,
      name: "家屬",
      picture: "https://example.test/avatar.png",
    });
  });
});
