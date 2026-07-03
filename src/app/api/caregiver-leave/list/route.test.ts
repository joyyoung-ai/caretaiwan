import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { auth } from "@/auth";
import { listLeaveRequestsForElder } from "@/lib/caregiver-leave";
import { checkSameOriginGet } from "@/lib/origin-check";
import { isCloudEnabled } from "@/lib/supabase-server";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/caregiver-leave", () => ({ listLeaveRequestsForElder: vi.fn() }));
vi.mock("@/lib/origin-check", () => ({ checkSameOriginGet: vi.fn() }));
vi.mock("@/lib/supabase-server", () => ({ isCloudEnabled: vi.fn() }));

const authMock = vi.mocked(auth);
const listLeaveRequestsForElderMock = vi.mocked(listLeaveRequestsForElder);
const checkSameOriginGetMock = vi.mocked(checkSameOriginGet);
const isCloudEnabledMock = vi.mocked(isCloudEnabled);

function request(): Request {
  return new Request("https://care.example.test/api/caregiver-leave/list?elderId=elder-1", {
    headers: { Origin: "https://care.example.test" },
  });
}

describe("GET /api/caregiver-leave/list", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkSameOriginGetMock.mockReturnValue(null);
    isCloudEnabledMock.mockReturnValue(true);
    authMock.mockResolvedValue({ user: { lineUserId: "family-1" } } as never);
    listLeaveRequestsForElderMock.mockResolvedValue({
      ok: true,
      leaves: [{ id: 1, elder_id: "elder-1", reason: "documents" }],
    } as never);
  });

  it("lists leave requests for a family owner without unrelated elder data", async () => {
    const res = await GET(request());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.leaves).toEqual([{ id: 1, elder_id: "elder-1", reason: "documents" }]);
    expect(listLeaveRequestsForElderMock).toHaveBeenCalledWith("elder-1", "family-1");
  });

  it("rejects unpaired viewers", async () => {
    listLeaveRequestsForElderMock.mockResolvedValue({ ok: false, error: "NOT_PAIRED" } as never);

    const res = await GET(request());

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({ error: "未配對此卡" });
  });
});
