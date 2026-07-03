import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { auth } from "@/auth";
import { acknowledgeLeaveRequest } from "@/lib/caregiver-leave";
import { checkSameOrigin } from "@/lib/origin-check";
import { isCloudEnabled } from "@/lib/supabase-server";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/caregiver-leave", () => ({ acknowledgeLeaveRequest: vi.fn() }));
vi.mock("@/lib/origin-check", () => ({ checkSameOrigin: vi.fn() }));
vi.mock("@/lib/supabase-server", () => ({ isCloudEnabled: vi.fn() }));

const authMock = vi.mocked(auth);
const acknowledgeLeaveRequestMock = vi.mocked(acknowledgeLeaveRequest);
const checkSameOriginMock = vi.mocked(checkSameOrigin);
const isCloudEnabledMock = vi.mocked(isCloudEnabled);

function request(body: unknown): Request {
  return new Request("https://care.example.test/api/caregiver-leave/acknowledge", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://care.example.test" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/caregiver-leave/acknowledge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkSameOriginMock.mockReturnValue(null);
    isCloudEnabledMock.mockReturnValue(true);
    authMock.mockResolvedValue({ user: { lineUserId: "family-1" } } as never);
    acknowledgeLeaveRequestMock.mockResolvedValue({ ok: true, leave: { id: 1, status: "acknowledged" } } as never);
  });

  it("allows a family owner to acknowledge a pending leave request", async () => {
    const res = await POST(request({ leaveId: 1 }));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true, leave: { id: 1, status: "acknowledged" } });
    expect(acknowledgeLeaveRequestMock).toHaveBeenCalledWith(1, "family-1");
  });

  it("rejects acknowledgement by a non-owner", async () => {
    acknowledgeLeaveRequestMock.mockResolvedValue({ ok: false, error: "NOT_FOUND_OR_NOT_OWNER" } as never);

    const res = await POST(request({ leaveId: 1 }));

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({ error: "無法確認此請假紀錄" });
  });
});
