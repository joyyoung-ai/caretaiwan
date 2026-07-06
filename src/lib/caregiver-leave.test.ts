import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  acknowledgeLeaveRequest,
  createLeaveRequest,
  findLeavePairingForCaregiver,
  LEAVE_REASONS,
  listLeaveRequestsForElder,
  parseLeaveRequestInput,
  toLeaveRequestResponse,
} from "./caregiver-leave";
import { isDatabaseEnabled } from "./db/client";
import { query } from "./db/postgres";

vi.mock("./db/client", () => ({ isDatabaseEnabled: vi.fn() }));
vi.mock("./db/postgres", () => ({ query: vi.fn() }));

const isDatabaseEnabledMock = vi.mocked(isDatabaseEnabled);
const queryMock = vi.mocked(query);

const leaveRow = {
  id: 1,
  elder_id: "elder-1",
  caregiver_line_user_id: "caregiver-1",
  owner_line_user_id: "family-1",
  reason: "documents" as const,
  note: "要去辦證件",
  starts_at: "2026-08-01T01:00:00.000Z",
  ends_at: "2026-08-01T05:00:00.000Z",
  status: "pending" as const,
  acknowledged_at: null,
  created_at: "2026-07-03T01:00:00.000Z",
  updated_at: "2026-07-03T01:00:00.000Z",
};

describe("caregiver leave helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isDatabaseEnabledMock.mockReturnValue(true);
  });

  it("accepts a fixed reason option plus free-text note", () => {
    expect(LEAVE_REASONS).toContain("documents");
    expect(
      parseLeaveRequestInput({
        elderId: "elder-1",
        reason: "documents",
        note: "要去辦證件",
        startsAt: "2026-08-01T01:00:00.000Z",
        endsAt: "2026-08-01T05:00:00.000Z",
      })
    ).toEqual({
      ok: true,
      value: {
        elderId: "elder-1",
        reason: "documents",
        note: "要去辦證件",
        startsAt: "2026-08-01T01:00:00.000Z",
        endsAt: "2026-08-01T05:00:00.000Z",
      },
    });
  });

  it("rejects unsupported reason and invalid time range", () => {
    expect(
      parseLeaveRequestInput({
        elderId: "elder-1",
        reason: "payroll",
        startsAt: "2026-08-01T01:00:00.000Z",
        endsAt: "2026-08-01T05:00:00.000Z",
      })
    ).toEqual({ ok: false, error: "REASON_INVALID" });

    expect(
      parseLeaveRequestInput({
        elderId: "elder-1",
        reason: "personal",
        startsAt: "2026-08-01T05:00:00.000Z",
        endsAt: "2026-08-01T01:00:00.000Z",
      })
    ).toEqual({ ok: false, error: "TIME_RANGE_INVALID" });
  });

  it("removes LINE user identifiers from leave request responses", () => {
    expect(
      toLeaveRequestResponse({
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
      })
    ).toEqual({
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
  });

  it("finds only the paired caregiver through the Postgres adapter", async () => {
    queryMock.mockResolvedValueOnce([
      {
        owner_line_user_id: "family-1",
        paired_line_user_id: "caregiver-1",
      },
    ]);

    await expect(findLeavePairingForCaregiver("elder-1", "caregiver-1")).resolves.toEqual({
      ok: true,
      ownerLineUserId: "family-1",
    });
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("from elder_pairings"),
      ["elder-1"]
    );
  });

  it("creates a leave request through the Postgres adapter", async () => {
    queryMock.mockResolvedValueOnce([leaveRow]);

    await expect(
      createLeaveRequest({
        elderId: "elder-1",
        caregiverLineUserId: "caregiver-1",
        ownerLineUserId: "family-1",
        reason: "documents",
        note: "要去辦證件",
        startsAt: "2026-08-01T01:00:00.000Z",
        endsAt: "2026-08-01T05:00:00.000Z",
      })
    ).resolves.toEqual({ ok: true, leave: leaveRow });
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("insert into caregiver_leave_requests"),
      expect.arrayContaining(["elder-1", "caregiver-1", "family-1", "documents"])
    );
  });

  it("lists leave requests only after owner or caregiver pairing is verified", async () => {
    queryMock
      .mockResolvedValueOnce([
        {
          owner_line_user_id: "family-1",
          paired_line_user_id: "caregiver-1",
        },
      ])
      .mockResolvedValueOnce([leaveRow]);

    await expect(listLeaveRequestsForElder("elder-1", "family-1")).resolves.toEqual({
      ok: true,
      leaves: [leaveRow],
    });
    expect(queryMock).toHaveBeenLastCalledWith(
      expect.stringContaining("from caregiver_leave_requests"),
      ["elder-1"]
    );
  });

  it("acknowledges a leave request through the Postgres adapter", async () => {
    queryMock.mockResolvedValueOnce([{ ...leaveRow, status: "acknowledged" }]);

    const result = await acknowledgeLeaveRequest(1, "family-1");

    expect(result.ok).toBe(true);
    expect(result.leave?.status).toBe("acknowledged");
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("update caregiver_leave_requests"),
      expect.arrayContaining([1, "family-1"])
    );
  });

  it("returns service disabled when the Postgres adapter is not configured", async () => {
    isDatabaseEnabledMock.mockReturnValue(false);

    await expect(findLeavePairingForCaregiver("elder-1", "caregiver-1")).resolves.toEqual({
      ok: false,
      error: "SERVICE_DISABLED",
    });
    expect(queryMock).not.toHaveBeenCalled();
  });
});
