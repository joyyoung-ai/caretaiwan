import { beforeEach, describe, expect, it, vi } from "vitest";
import { createExpense, listExpensesForCard, verifyExpense } from "./expense";
import { isDatabaseEnabled } from "./db/client";
import { query } from "./db/postgres";

vi.mock("./db/client", () => ({ isDatabaseEnabled: vi.fn() }));
vi.mock("./db/postgres", () => ({ query: vi.fn() }));

const isDatabaseEnabledMock = vi.mocked(isDatabaseEnabled);
const queryMock = vi.mocked(query);

const expenseRow = {
  id: 1,
  elder_id: "elder-1",
  actor_line_user_id: "caregiver-1",
  owner_line_user_id: "family-1",
  item_name: "藥品",
  amount: 120,
  category: "medical" as const,
  note: "收據已拍照",
  photo_path: "receipt.jpg",
  verify_status: "pending" as const,
  verify_note: null,
  verified_at: null,
  created_at: "2026-07-06T01:00:00.000Z",
};

describe("expense helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isDatabaseEnabledMock.mockReturnValue(true);
  });

  it("creates an expense through the Postgres adapter", async () => {
    queryMock.mockResolvedValueOnce([expenseRow]);

    await expect(
      createExpense({
        elderId: "elder-1",
        actorLineUserId: "caregiver-1",
        ownerLineUserId: "family-1",
        itemName: "藥品".repeat(80),
        amount: 120,
        category: "medical",
        note: "收據已拍照".repeat(80),
        photoPath: "receipt.jpg",
      })
    ).resolves.toEqual({ ok: true, expense: expenseRow });
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("insert into expense_logs"),
      expect.arrayContaining(["elder-1", "caregiver-1", "family-1", "藥品".repeat(50)])
    );
  });

  it("lists expenses only for current owner or paired caregiver", async () => {
    queryMock
      .mockResolvedValueOnce([
        {
          owner_line_user_id: "family-1",
          paired_line_user_id: "caregiver-1",
        },
      ])
      .mockResolvedValueOnce([expenseRow]);

    await expect(listExpensesForCard("elder-1", "caregiver-1", 25)).resolves.toEqual({
      ok: true,
      expenses: [expenseRow],
    });
    expect(queryMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("from elder_pairings"),
      ["elder-1"]
    );
    expect(queryMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("from expense_logs"),
      ["elder-1", 25]
    );
  });

  it("hides expenses when caller is not the current owner or paired caregiver", async () => {
    queryMock.mockResolvedValueOnce([
      {
        owner_line_user_id: "family-1",
        paired_line_user_id: "caregiver-1",
      },
    ]);

    await expect(listExpensesForCard("elder-1", "viewer-1")).resolves.toEqual({
      ok: true,
      expenses: [],
    });
    expect(queryMock).toHaveBeenCalledTimes(1);
  });

  it("verifies an expense with an owner-scoped Postgres update", async () => {
    const longNote = "金額需要確認".repeat(80);
    queryMock.mockResolvedValueOnce([
      {
        ...expenseRow,
        verify_status: "disputed",
        verify_note: "金額需要確認",
        verified_at: "2026-07-06T02:00:00.000Z",
      },
    ]);

    const result = await verifyExpense(1, "family-1", "disputed", longNote);

    expect(result.ok).toBe(true);
    expect(result.expense?.verify_status).toBe("disputed");
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("where id = $5"),
      ["disputed", longNote.slice(0, 500), expect.any(String), "family-1", 1]
    );
  });

  it("returns service disabled without querying when database config is missing", async () => {
    isDatabaseEnabledMock.mockReturnValue(false);

    await expect(
      createExpense({
        elderId: "elder-1",
        actorLineUserId: "caregiver-1",
        ownerLineUserId: "family-1",
        itemName: "藥品",
        amount: 120,
        category: "medical",
      })
    ).resolves.toEqual({ ok: false, error: "SERVICE_DISABLED" });
    await expect(listExpensesForCard("elder-1", "family-1")).resolves.toEqual({
      ok: false,
      error: "SERVICE_DISABLED",
    });
    await expect(verifyExpense(1, "family-1", "confirmed")).resolves.toEqual({
      ok: false,
      error: "SERVICE_DISABLED",
    });
    expect(queryMock).not.toHaveBeenCalled();
  });
});
