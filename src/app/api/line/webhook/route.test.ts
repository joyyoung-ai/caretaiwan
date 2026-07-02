import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { isLineBotEnabled, verifyLineSignature } from "@/lib/line-bot";

vi.mock("@/lib/line-bot", () => ({
  isLineBotEnabled: vi.fn(),
  verifyLineSignature: vi.fn(),
  replyMessage: vi.fn(),
}));

vi.mock("@/lib/pairing", () => ({
  bindFamily: vi.fn(),
  bindNotifyGroup: vi.fn(),
  findPairingByCode: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimitAsync: vi.fn(),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
}));

const isLineBotEnabledMock = vi.mocked(isLineBotEnabled);
const verifyLineSignatureMock = vi.mocked(verifyLineSignature);

function webhookRequest(body: string): Request {
  return new Request("https://care.example.test/api/line/webhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-line-signature": "sig",
    },
    body,
  });
}

describe("POST /api/line/webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isLineBotEnabledMock.mockReturnValue(true);
    verifyLineSignatureMock.mockReturnValue(true);
  });

  it("returns 503 when LINE Bot is not configured", async () => {
    isLineBotEnabledMock.mockReturnValue(false);

    const res = await POST(webhookRequest("{}"));

    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toEqual({ error: "LINE Bot 尚未啟用（環境變數未設定）" });
    expect(verifyLineSignatureMock).not.toHaveBeenCalled();
  });

  it("rejects invalid LINE signatures", async () => {
    verifyLineSignatureMock.mockReturnValue(false);

    const res = await POST(webhookRequest("{}"));

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: "Invalid signature" });
  });

  it("returns 400 for malformed signed JSON bodies", async () => {
    const res = await POST(webhookRequest("{not-json"));

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "Invalid JSON" });
  });
});
