import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { auth } from "@/auth";
import { listLeaveRequestsForElder } from "@/lib/caregiver-leave";
import { checkSameOriginGet } from "@/lib/origin-check";
import { isDatabaseEnabled } from "@/lib/db/client";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/caregiver-leave", () => ({
  listLeaveRequestsForElder: vi.fn(),
  toLeaveRequestResponse: vi.fn((leave: Record<string, unknown>) => {
    const {
      caregiver_line_user_id: _caregiverLineUserId,
      owner_line_user_id: _ownerLineUserId,
      ...safe
    } = leave;
    void _caregiverLineUserId;
    void _ownerLineUserId;
    return safe;
  }),
}));
vi.mock("@/lib/origin-check", () => ({ checkSameOriginGet: vi.fn() }));
vi.mock("@/lib/db/client", () => ({ isDatabaseEnabled: vi.fn() }));

const authMock = vi.mocked(auth);
const listLeaveRequestsForElderMock = vi.mocked(listLeaveRequestsForElder);
const checkSameOriginGetMock = vi.mocked(checkSameOriginGet);
const isDatabaseEnabledMock = vi.mocked(isDatabaseEnabled);

function request(): Request {
  return new Request("https://care.example.test/api/caregiver-leave/list?elderId=elder-1", {
    headers: { Origin: "https://care.example.test" },
  });
}

describe("GET /api/caregiver-leave/list", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkSameOriginGetMock.mockReturnValue(null);
    isDatabaseEnabledMock.mockReturnValue(true);
    authMock.mockResolvedValue({ user: { lineUserId: "family-1" } } as never);
    listLeaveRequestsForElderMock.mockResolvedValue({
      ok: true,
      leaves: [
        {
          id: 1,
          elder_id: "elder-1",
          caregiver_line_user_id: "caregiver-1",
          owner_line_user_id: "family-1",
          reason: "documents",
          note: "要去辦證件",
          starts_at: "2026-08-01T01:00:00.000Z",
          ends_at: "2026-08-01T05:00:00.000Z",
          status: "pending",
          acknowledged_at: null,
          created_at: "2026-07-03T01:00:00.000Z",
          updated_at: "2026-07-03T01:00:00.000Z",
        },
      ],
    } as never);
  });

  it("lists leave requests for a family owner without unrelated elder data", async () => {
    const res = await GET(request());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.leaves[0]).toEqual({
      id: 1,
      elder_id: "elder-1",
      reason: "documents",
      note: "要去辦證件",
      starts_at: "2026-08-01T01:00:00.000Z",
      ends_at: "2026-08-01T05:00:00.000Z",
      status: "pending",
      acknowledged_at: null,
      created_at: "2026-07-03T01:00:00.000Z",
      updated_at: "2026-07-03T01:00:00.000Z",
    });
    expect(JSON.stringify(body)).not.toContain("line_user_id");
    expect(listLeaveRequestsForElderMock).toHaveBeenCalledWith("elder-1", "family-1");
  });

  it("rejects unpaired viewers", async () => {
    listLeaveRequestsForElderMock.mockResolvedValue({ ok: false, error: "NOT_PAIRED" } as never);

    const res = await GET(request());

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({ error: "未配對此卡" });
  });
});
