# Care Calendar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build v1.1.0 care event and caregiver leave foundations with family/caregiver joint event management, caregiver-created leave requests, inert reminder fields, and no LINE reminder runtime.

**Architecture:** Add focused data helpers under `src/lib/`, API routes under `src/app/api/care-events/*` and `src/app/api/caregiver-leave/*`, then attach minimal UI. Route handlers keep the current application-level ownership model: family users are checked through `elder_pairings.owner_line_user_id`, caregivers through `elder_pairings.paired_line_user_id`. Formal production migrations wait until the production database strategy is decided; this plan only drafts schema and keeps runtime implementation test-driven.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase service-role client, Auth.js LINE sessions, Vitest, Tailwind CSS 4.

---

## File Structure

- Create `docs/engineering/CARE_CALENDAR_SCHEMA.md`: schema draft for `care_events` and `caregiver_leave_requests`, including rollback notes and retention policy.
- Create `src/lib/care-calendar.ts`: event types, validation helpers, pairing ownership helpers, and Supabase data functions.
- Create `src/lib/care-calendar.test.ts`: unit tests for validation helpers and pure copy helpers.
- Create `src/app/api/care-events/create/route.ts` and `.test.ts`: create care events for family owners and paired caregivers.
- Create `src/app/api/care-events/list/route.ts` and `.test.ts`: list upcoming care events for paired family/caregiver users.
- Create `src/app/api/care-events/update/route.ts` and `.test.ts`: update/cancel events for paired family/caregiver users.
- Create `src/lib/caregiver-leave.ts`: leave reason/status types, validation helpers, ownership helpers, and Supabase data functions.
- Create `src/lib/caregiver-leave.test.ts`: unit tests for leave validation.
- Create `src/app/api/caregiver-leave/create/route.ts` and `.test.ts`: caregiver-created leave requests only.
- Create `src/app/api/caregiver-leave/list/route.ts` and `.test.ts`: family/caregiver listing scoped to paired elders.
- Create `src/app/api/caregiver-leave/acknowledge/route.ts` and `.test.ts`: family acknowledgement only.
- Modify `src/app/page.tsx`, `src/app/family/page.tsx`, and `src/lib/i18n/dict.ts` after API tests are green, keeping UI minimal.
- Modify `docs/product/USER_REQUIREMENTS.md`, `docs/engineering/TESTING.md`, `docs/security/SECURITY.md`, `docs/governance/KNOWN_LIMITATIONS.md`, and `docs/releases/CHANGELOG.md` after behavior exists.

## Copy Draft

Use these first-pass Traditional Chinese strings. They are intentionally plain and direct.

- Medical reminder label: `此為一般日程提醒，非醫療指示。`
- Medical helper text: `這筆行程可能和回診、檢查、拿藥或復健有關。系統只提醒時間，不判斷病情。`
- Reminder inactive text: `LINE 提醒尚未啟用。這裡先保留提醒時間，實際推播會在後續版本處理。`
- Leave request title: `請假紀錄`
- Leave request submit copy: `送出請假紀錄`
- Leave acknowledgement copy: `已確認`
- Leave neutral helper text: `這裡只記錄請假時間與原因，不處理薪資、扣款或排班。`
- Free-text note label: `補充說明`
- Fixed leave reasons:
  - `personal`: `私人事務`
  - `health`: `身體不適`
  - `family`: `家庭因素`
  - `documents`: `證件或行政事項`
  - `other`: `其他`

### Task 1: Schema Draft

**Files:**
- Create: `docs/engineering/CARE_CALENDAR_SCHEMA.md`
- Modify: `docs/README.md`

- [ ] **Step 1: Write the schema draft**

Add `docs/engineering/CARE_CALENDAR_SCHEMA.md` with this content:

```markdown
# Care Calendar Schema Draft

日期：2026-07-03

這份文件是 v1.1.0 照護行程與看護請假資料模型草案。正式資料庫已決定採 VM 自管 Postgres；production 前不得只靠手動 SQL。

## care_events

用途：家屬與看護共同管理已配對長者的照護行程。

欄位草案：

- `id bigserial primary key`
- `elder_id text not null`
- `owner_line_user_id text not null`
- `created_by_line_user_id text not null`
- `updated_by_line_user_id text`
- `type text not null check (type in ('medical_appointment', 'rehab', 'medication_pickup', 'exam', 'care_visit', 'other'))`
- `is_medical_related boolean not null default false`
- `title text not null`
- `starts_at timestamptz not null`
- `ends_at timestamptz`
- `location text`
- `note text`
- `remind_at timestamptz`
- `status text not null default 'scheduled' check (status in ('scheduled', 'done', 'cancelled'))`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

Index 草案：

- `idx_care_events_elder_starts` on `(elder_id, starts_at)`
- `idx_care_events_owner` on `(owner_line_user_id)`
- `idx_care_events_status` on `(status)`

資料保留：跟照護紀錄一致。使用者刪除請求要涵蓋 live database、備份與 audit metadata。

## caregiver_leave_requests

用途：看護提出請假紀錄，家屬查看並確認。

欄位草案：

- `id bigserial primary key`
- `elder_id text not null`
- `caregiver_line_user_id text not null`
- `owner_line_user_id text not null`
- `reason text not null check (reason in ('personal', 'health', 'family', 'documents', 'other'))`
- `note text`
- `starts_at timestamptz not null`
- `ends_at timestamptz not null`
- `status text not null default 'pending' check (status in ('pending', 'acknowledged', 'cancelled'))`
- `acknowledged_at timestamptz`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

Index 草案：

- `idx_caregiver_leave_elder_starts` on `(elder_id, starts_at)`
- `idx_caregiver_leave_caregiver` on `(caregiver_line_user_id)`
- `idx_caregiver_leave_owner` on `(owner_line_user_id)`
- `idx_caregiver_leave_status` on `(status)`

資料保留：跟照護紀錄一致。請假資料不得用於薪資、扣款、排班或勞資爭議判定。

## Rollback Notes

正式 migration 建立後，rollback 應先停用相關 API route / UI 入口，再 drop 新表。Rollback 不得影響 `elder_pairings`、`cloud_backups`、`expense_logs`、`record_photos` 或既有照護紀錄資料。
```

- [ ] **Step 2: Link the schema draft from docs index**

Add this line under the Engineering section in `docs/README.md` after creating the schema draft:

```markdown
- engineering/CARE_CALENDAR_SCHEMA.md：v1.1.0 照護行程與看護請假資料模型草案。
```

- [ ] **Step 3: Verify docs**

Run: `npm run docs:check`

Expected: `Markdown link check passed`.

- [ ] **Step 4: Commit**

```bash
git add docs/engineering/CARE_CALENDAR_SCHEMA.md docs/README.md
git commit -m "docs: draft care calendar schema"
```

### Task 2: Care Event Helper Tests and Implementation

**Files:**
- Create: `src/lib/care-calendar.test.ts`
- Create: `src/lib/care-calendar.ts`

- [ ] **Step 1: Write failing validation tests**

Create `src/lib/care-calendar.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import {
  CARE_EVENT_TYPES,
  CARE_EVENT_STATUSES,
  isMedicalCareEventType,
  parseCareEventInput,
} from "./care-calendar";

describe("care calendar helpers", () => {
  it("marks medical appointment, rehab, medication pickup, and exam as medical-related", () => {
    expect(isMedicalCareEventType("medical_appointment")).toBe(true);
    expect(isMedicalCareEventType("rehab")).toBe(true);
    expect(isMedicalCareEventType("medication_pickup")).toBe(true);
    expect(isMedicalCareEventType("exam")).toBe(true);
    expect(isMedicalCareEventType("care_visit")).toBe(false);
    expect(isMedicalCareEventType("other")).toBe(false);
  });

  it("parses valid care event input and trims long text fields", () => {
    const result = parseCareEventInput({
      elderId: "elder-1",
      type: "medical_appointment",
      title: "  回診  ",
      startsAt: "2026-08-01T01:00:00.000Z",
      endsAt: "2026-08-01T02:00:00.000Z",
      location: "  台大醫院  ",
      note: "請帶健保卡",
      remindAt: "2026-07-31T01:00:00.000Z",
    });

    expect(result).toEqual({
      ok: true,
      value: {
        elderId: "elder-1",
        type: "medical_appointment",
        isMedicalRelated: true,
        title: "回診",
        startsAt: "2026-08-01T01:00:00.000Z",
        endsAt: "2026-08-01T02:00:00.000Z",
        location: "台大醫院",
        note: "請帶健保卡",
        remindAt: "2026-07-31T01:00:00.000Z",
      },
    });
  });

  it("rejects unsupported event type and invalid time range", () => {
    expect(CARE_EVENT_TYPES).toContain("care_visit");
    expect(CARE_EVENT_STATUSES).toContain("cancelled");

    expect(
      parseCareEventInput({
        elderId: "elder-1",
        type: "payroll",
        title: "排班",
        startsAt: "2026-08-01T02:00:00.000Z",
      })
    ).toEqual({ ok: false, error: "TYPE_INVALID" });

    expect(
      parseCareEventInput({
        elderId: "elder-1",
        type: "care_visit",
        title: "家訪",
        startsAt: "2026-08-01T02:00:00.000Z",
        endsAt: "2026-08-01T01:00:00.000Z",
      })
    ).toEqual({ ok: false, error: "TIME_RANGE_INVALID" });
  });
});
```

- [ ] **Step 2: Run test to verify RED**

Run: `npm run test -- src/lib/care-calendar.test.ts`

Expected: FAIL because `src/lib/care-calendar.ts` does not exist.

- [ ] **Step 3: Implement helper module**

Create `src/lib/care-calendar.ts`:

```typescript
import { getSupabaseAdmin } from "./supabase-server";

export const CARE_EVENT_TYPES = [
  "medical_appointment",
  "rehab",
  "medication_pickup",
  "exam",
  "care_visit",
  "other",
] as const;

export const CARE_EVENT_STATUSES = ["scheduled", "done", "cancelled"] as const;

export type CareEventType = (typeof CARE_EVENT_TYPES)[number];
export type CareEventStatus = (typeof CARE_EVENT_STATUSES)[number];

export type ParsedCareEventInput = {
  elderId: string;
  type: CareEventType;
  isMedicalRelated: boolean;
  title: string;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
  note: string | null;
  remindAt: string | null;
};

export type CareEvent = {
  id: number;
  elder_id: string;
  owner_line_user_id: string;
  created_by_line_user_id: string;
  updated_by_line_user_id: string | null;
  type: CareEventType;
  is_medical_related: boolean;
  title: string;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  note: string | null;
  remind_at: string | null;
  status: CareEventStatus;
  created_at: string;
  updated_at: string;
};

function cleanText(raw: unknown, max: number): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function cleanIso(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function isCareEventType(raw: unknown): raw is CareEventType {
  return CARE_EVENT_TYPES.includes(raw as CareEventType);
}

export function isCareEventStatus(raw: unknown): raw is CareEventStatus {
  return CARE_EVENT_STATUSES.includes(raw as CareEventStatus);
}

export function isMedicalCareEventType(type: CareEventType): boolean {
  return type === "medical_appointment" || type === "rehab" || type === "medication_pickup" || type === "exam";
}

export function parseCareEventInput(raw: Record<string, unknown>): { ok: true; value: ParsedCareEventInput } | { ok: false; error: string } {
  const elderId = cleanText(raw.elderId, 100);
  if (!elderId) return { ok: false, error: "ELDER_REQUIRED" };
  if (!isCareEventType(raw.type)) return { ok: false, error: "TYPE_INVALID" };
  const title = cleanText(raw.title, 100);
  if (!title) return { ok: false, error: "TITLE_REQUIRED" };
  const startsAt = cleanIso(raw.startsAt);
  if (!startsAt) return { ok: false, error: "STARTS_AT_INVALID" };
  const endsAt = cleanIso(raw.endsAt) ?? null;
  if (endsAt && new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
    return { ok: false, error: "TIME_RANGE_INVALID" };
  }

  return {
    ok: true,
    value: {
      elderId,
      type: raw.type,
      isMedicalRelated: isMedicalCareEventType(raw.type),
      title,
      startsAt,
      endsAt,
      location: cleanText(raw.location, 200),
      note: cleanText(raw.note, 500),
      remindAt: cleanIso(raw.remindAt) ?? null,
    },
  };
}

export async function findCareEventPairing(elderId: string, actorLineUserId: string): Promise<{ ok: true; ownerLineUserId: string; role: "owner" | "caregiver" } | { ok: false; error: string }> {
  const sb = getSupabaseAdmin();
  if (!sb) return { ok: false, error: "SERVICE_DISABLED" };

  const { data, error } = await sb
    .from("elder_pairings")
    .select("owner_line_user_id, paired_line_user_id")
    .eq("elder_id", elderId)
    .maybeSingle();

  if (error) return { ok: false, error: "DB_ERROR" };
  if (!data) return { ok: false, error: "NOT_PAIRED" };
  if (data.owner_line_user_id === actorLineUserId) {
    return { ok: true, ownerLineUserId: data.owner_line_user_id, role: "owner" };
  }
  if (data.paired_line_user_id === actorLineUserId) {
    return { ok: true, ownerLineUserId: data.owner_line_user_id, role: "caregiver" };
  }
  return { ok: false, error: "NOT_PAIRED" };
}
```

- [ ] **Step 4: Run test to verify GREEN**

Run: `npm run test -- src/lib/care-calendar.test.ts`

Expected: 1 file passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/care-calendar.ts src/lib/care-calendar.test.ts
git commit -m "feat: add care event helpers"
```

### Task 3: Care Event API Routes

**Files:**
- Create: `src/app/api/care-events/create/route.test.ts`
- Create: `src/app/api/care-events/create/route.ts`
- Create: `src/app/api/care-events/list/route.test.ts`
- Create: `src/app/api/care-events/list/route.ts`
- Create: `src/app/api/care-events/update/route.test.ts`
- Create: `src/app/api/care-events/update/route.ts`
- Modify: `src/lib/care-calendar.ts`

- [ ] **Step 1: Write failing create route tests**

Create `src/app/api/care-events/create/route.test.ts`:

```typescript
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { auth } from "@/auth";
import { checkSameOrigin } from "@/lib/origin-check";
import { isCloudEnabled } from "@/lib/supabase-server";
import { createCareEvent, findCareEventPairing } from "@/lib/care-calendar";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/origin-check", () => ({ checkSameOrigin: vi.fn() }));
vi.mock("@/lib/supabase-server", () => ({ isCloudEnabled: vi.fn() }));
vi.mock("@/lib/care-calendar", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/care-calendar")>();
  return { ...actual, createCareEvent: vi.fn(), findCareEventPairing: vi.fn() };
});
vi.mock("@/lib/audit", () => ({ getActorIp: vi.fn(() => "203.0.113.10"), logAudit: vi.fn() }));

const authMock = vi.mocked(auth);
const checkSameOriginMock = vi.mocked(checkSameOrigin);
const isCloudEnabledMock = vi.mocked(isCloudEnabled);
const createCareEventMock = vi.mocked(createCareEvent);
const findCareEventPairingMock = vi.mocked(findCareEventPairing);

function request(body: unknown): Request {
  return new Request("https://care.example.test/api/care-events/create", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://care.example.test" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/care-events/create", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkSameOriginMock.mockReturnValue(null);
    isCloudEnabledMock.mockReturnValue(true);
    authMock.mockResolvedValue({ user: { lineUserId: "caregiver-1" } } as never);
    findCareEventPairingMock.mockResolvedValue({ ok: true, ownerLineUserId: "family-1", role: "caregiver" } as never);
    createCareEventMock.mockResolvedValue({ ok: true, event: { id: 1 } } as never);
  });

  it("allows a paired caregiver to create a care event without activating reminder runtime", async () => {
    const res = await POST(request({
      elderId: "elder-1",
      type: "medical_appointment",
      title: "回診",
      startsAt: "2026-08-01T01:00:00.000Z",
      remindAt: "2026-07-31T01:00:00.000Z",
    }));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true, event: { id: 1 }, reminderActive: false });
    expect(createCareEventMock).toHaveBeenCalledWith(expect.objectContaining({
      elderId: "elder-1",
      actorLineUserId: "caregiver-1",
      ownerLineUserId: "family-1",
      remindAt: "2026-07-31T01:00:00.000Z",
    }));
  });

  it("rejects unpaired users before creating an event", async () => {
    findCareEventPairingMock.mockResolvedValue({ ok: false, error: "NOT_PAIRED" } as never);

    const res = await POST(request({ elderId: "elder-1", type: "care_visit", title: "家訪", startsAt: "2026-08-01T01:00:00.000Z" }));

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({ error: "未配對此卡" });
    expect(createCareEventMock).not.toHaveBeenCalled();
  });

  it("returns validation errors for unsupported types", async () => {
    const res = await POST(request({ elderId: "elder-1", type: "payroll", title: "排班", startsAt: "2026-08-01T01:00:00.000Z" }));

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "行程類型不支援" });
    expect(findCareEventPairingMock).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run create route test to verify RED**

Run: `npm run test -- src/app/api/care-events/create/route.test.ts`

Expected: FAIL because route and `createCareEvent` are missing.

- [ ] **Step 3: Implement create data function and route**

Add this function to `src/lib/care-calendar.ts`:

```typescript
export async function createCareEvent(input: ParsedCareEventInput & {
  actorLineUserId: string;
  ownerLineUserId: string;
}): Promise<{ ok: boolean; event?: CareEvent; error?: string }> {
  const sb = getSupabaseAdmin();
  if (!sb) return { ok: false, error: "SERVICE_DISABLED" };

  const { data, error } = await sb
    .from("care_events")
    .insert({
      elder_id: input.elderId,
      owner_line_user_id: input.ownerLineUserId,
      created_by_line_user_id: input.actorLineUserId,
      updated_by_line_user_id: input.actorLineUserId,
      type: input.type,
      is_medical_related: input.isMedicalRelated,
      title: input.title,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      location: input.location,
      note: input.note,
      remind_at: input.remindAt,
      status: "scheduled",
    })
    .select()
    .maybeSingle();

  if (error) return { ok: false, error: "DB_ERROR" };
  if (!data) return { ok: false, error: "INSERT_FAILED" };
  return { ok: true, event: data };
}
```

Create `src/app/api/care-events/create/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { checkSameOrigin } from "@/lib/origin-check";
import { getActorIp, logAudit } from "@/lib/audit";
import { isCloudEnabled } from "@/lib/supabase-server";
import { createCareEvent, findCareEventPairing, parseCareEventInput } from "@/lib/care-calendar";

export const runtime = "nodejs";

const ERROR_TEXT: Record<string, string> = {
  ELDER_REQUIRED: "缺少長者資料",
  TYPE_INVALID: "行程類型不支援",
  TITLE_REQUIRED: "缺少行程標題",
  STARTS_AT_INVALID: "開始時間格式錯誤",
  TIME_RANGE_INVALID: "結束時間必須晚於開始時間",
};

export async function POST(req: Request) {
  const ip = getActorIp(req);
  const csrf = checkSameOrigin(req);
  if (csrf) {
    logAudit({ action: "FORBIDDEN_ORIGIN", actorIp: ip, resourceType: "care_event", status: "forbidden" });
    return csrf;
  }
  if (!isCloudEnabled()) return NextResponse.json({ error: "雲端服務未啟用" }, { status: 503 });

  const session = await auth();
  const actorLineUserId = (session?.user as { lineUserId?: string } | undefined)?.lineUserId;
  if (!actorLineUserId) return NextResponse.json({ error: "未登入" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const parsed = parseCareEventInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: ERROR_TEXT[parsed.error] ?? "欄位格式錯誤" }, { status: 400 });
  }

  const pairing = await findCareEventPairing(parsed.value.elderId, actorLineUserId);
  if (!pairing.ok) return NextResponse.json({ error: "未配對此卡" }, { status: 403 });

  const result = await createCareEvent({
    ...parsed.value,
    actorLineUserId,
    ownerLineUserId: pairing.ownerLineUserId,
  });
  if (!result.ok || !result.event) {
    logAudit({
      action: "CARE_EVENT_CREATE",
      actorLineUserId,
      actorIp: ip,
      resourceType: "care_event",
      resourceId: parsed.value.elderId,
      status: "fail",
      metadata: { reason: result.error },
    });
    return NextResponse.json({ error: "建立失敗" }, { status: 500 });
  }

  logAudit({
    action: "CARE_EVENT_CREATE",
    actorLineUserId,
    actorIp: ip,
    resourceType: "care_event",
    resourceId: String(result.event.id),
    status: "ok",
    metadata: { eventType: parsed.value.type, isMedicalRelated: parsed.value.isMedicalRelated },
  });

  return NextResponse.json({ ok: true, event: result.event, reminderActive: false });
}
```

- [ ] **Step 4: Verify create route GREEN**

Run: `npm run test -- src/app/api/care-events/create/route.test.ts`

Expected: 1 file passed.

- [ ] **Step 5: Repeat TDD for list and update routes**

Use the same pattern:

- `GET /api/care-events/list?elderId=elder-1&rangeDays=7` calls `listCareEventsForElder(elderId, actorLineUserId, rangeDays)`.
- `POST /api/care-events/update` validates `eventId`, checks the event belongs to an elder connected to actor, and updates `title`, `startsAt`, `endsAt`, `location`, `note`, `status`.
- Both routes return generic errors: `查詢失敗`, `更新失敗`, `未登入`, `未配對此卡`.

Expected route tests:

```typescript
it("lists only paired elder events in chronological order", async () => {});
it("rejects unpaired users before listing event details", async () => {});
it("allows a paired caregiver to cancel an event", async () => {});
it("rejects unsupported status values before updating", async () => {});
```

- [ ] **Step 6: Run care event route tests**

Run: `npm run test -- src/lib/care-calendar.test.ts src/app/api/care-events/create/route.test.ts src/app/api/care-events/list/route.test.ts src/app/api/care-events/update/route.test.ts`

Expected: all listed files passed.

- [ ] **Step 7: Commit**

```bash
git add src/lib/care-calendar.ts src/lib/care-calendar.test.ts src/app/api/care-events
git commit -m "feat: add care event api"
```

### Task 4: Caregiver Leave Helpers and API Routes

**Files:**
- Create: `src/lib/caregiver-leave.test.ts`
- Create: `src/lib/caregiver-leave.ts`
- Create: `src/app/api/caregiver-leave/create/route.test.ts`
- Create: `src/app/api/caregiver-leave/create/route.ts`
- Create: `src/app/api/caregiver-leave/list/route.test.ts`
- Create: `src/app/api/caregiver-leave/list/route.ts`
- Create: `src/app/api/caregiver-leave/acknowledge/route.test.ts`
- Create: `src/app/api/caregiver-leave/acknowledge/route.ts`

- [ ] **Step 1: Write failing leave helper tests**

Create `src/lib/caregiver-leave.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { LEAVE_REASONS, parseLeaveRequestInput } from "./caregiver-leave";

describe("caregiver leave helpers", () => {
  it("accepts a fixed reason option plus free-text note", () => {
    expect(LEAVE_REASONS).toContain("documents");
    expect(parseLeaveRequestInput({
      elderId: "elder-1",
      reason: "documents",
      note: "要去辦證件",
      startsAt: "2026-08-01T01:00:00.000Z",
      endsAt: "2026-08-01T05:00:00.000Z",
    })).toEqual({
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
    expect(parseLeaveRequestInput({
      elderId: "elder-1",
      reason: "payroll",
      startsAt: "2026-08-01T01:00:00.000Z",
      endsAt: "2026-08-01T05:00:00.000Z",
    })).toEqual({ ok: false, error: "REASON_INVALID" });

    expect(parseLeaveRequestInput({
      elderId: "elder-1",
      reason: "personal",
      startsAt: "2026-08-01T05:00:00.000Z",
      endsAt: "2026-08-01T01:00:00.000Z",
    })).toEqual({ ok: false, error: "TIME_RANGE_INVALID" });
  });
});
```

- [ ] **Step 2: Run test to verify RED**

Run: `npm run test -- src/lib/caregiver-leave.test.ts`

Expected: FAIL because `src/lib/caregiver-leave.ts` does not exist.

- [ ] **Step 3: Implement leave helper module**

Create `src/lib/caregiver-leave.ts` with reason/status constants, `parseLeaveRequestInput`, pairing lookup for caregiver/family, `createLeaveRequest`, `listLeaveRequestsForElder`, and `acknowledgeLeaveRequest`. Use the same Supabase patterns as `src/lib/expense.ts`.

Required exported constants:

```typescript
export const LEAVE_REASONS = ["personal", "health", "family", "documents", "other"] as const;
export const LEAVE_STATUSES = ["pending", "acknowledged", "cancelled"] as const;
```

Required insert shape:

```typescript
{
  elder_id: input.elderId,
  caregiver_line_user_id: input.caregiverLineUserId,
  owner_line_user_id: input.ownerLineUserId,
  reason: input.reason,
  note: input.note,
  starts_at: input.startsAt,
  ends_at: input.endsAt,
  status: "pending",
}
```

- [ ] **Step 4: Verify leave helper GREEN**

Run: `npm run test -- src/lib/caregiver-leave.test.ts`

Expected: 1 file passed.

- [ ] **Step 5: Add failing leave route tests**

Add route tests matching these behaviors:

```typescript
it("allows a paired caregiver to create a leave request", async () => {});
it("rejects a family user creating leave on behalf of a caregiver", async () => {});
it("lists leave requests for a family owner without unrelated elder data", async () => {});
it("allows a family owner to acknowledge a pending leave request", async () => {});
it("rejects acknowledgement by a non-owner", async () => {});
```

Run each route test before implementation and confirm it fails because route functions are missing.

- [ ] **Step 6: Implement leave routes**

Create:

- `src/app/api/caregiver-leave/create/route.ts`
- `src/app/api/caregiver-leave/list/route.ts`
- `src/app/api/caregiver-leave/acknowledge/route.ts`

Use the existing route sequence:

1. `checkSameOrigin` or `checkSameOriginGet`.
2. `isCloudEnabled`.
3. `auth`.
4. Validate request body or query params.
5. Ownership check through leave helper.
6. Supabase helper operation.
7. Generic error response without raw DB details.

- [ ] **Step 7: Run leave tests**

Run: `npm run test -- src/lib/caregiver-leave.test.ts src/app/api/caregiver-leave/create/route.test.ts src/app/api/caregiver-leave/list/route.test.ts src/app/api/caregiver-leave/acknowledge/route.test.ts`

Expected: all listed files passed.

- [ ] **Step 8: Commit**

```bash
git add src/lib/caregiver-leave.ts src/lib/caregiver-leave.test.ts src/app/api/caregiver-leave
git commit -m "feat: add caregiver leave api"
```

### Task 5: Minimal UI and Copy

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/family/page.tsx`
- Modify: `src/lib/i18n/dict.ts`
- Create focused component files if existing pages become hard to read.

- [ ] **Step 1: Review current page structure**

Run:

```bash
sed -n '1,260p' src/app/page.tsx
sed -n '1,260p' src/app/family/page.tsx
sed -n '1,120p' src/lib/i18n/dict.ts
```

Expected: identify where current home / family flows expose cards and actions.

- [ ] **Step 2: Add copy to i18n dictionary**

Add Traditional Chinese copy first. Keep other languages as direct, non-medical placeholders only if the existing dictionary requires all locales.

Required zh-TW strings:

```typescript
careCalendar: {
  title: "照護行程",
  next7Days: "未來 7 天",
  next30Days: "未來 30 天",
  medicalNotice: "此為一般日程提醒，非醫療指示。",
  medicalHelper: "這筆行程可能和回診、檢查、拿藥或復健有關。系統只提醒時間，不判斷病情。",
  reminderInactive: "LINE 提醒尚未啟用。這裡先保留提醒時間，實際推播會在後續版本處理。",
},
caregiverLeave: {
  title: "請假紀錄",
  submit: "送出請假紀錄",
  acknowledged: "已確認",
  helper: "這裡只記錄請假時間與原因，不處理薪資、扣款或排班。",
  note: "補充說明",
}
```

- [ ] **Step 3: Add UI after API tests are green**

Add minimal UI:

- caregiver home: upcoming care events panel and leave request form entry.
- family page: event management entry and leave acknowledgement list entry.
- reminder fields shown as inactive copy, not active delivery.

Do not add calendar grid, drag/drop, advanced recurrence, payroll, staffing, hospital integration, or LINE reminder runtime.

- [ ] **Step 4: Add E2E smoke only for shell rendering**

Update `tests/e2e/app-smoke.spec.ts` to confirm public shell still renders and new labels fit on desktop/mobile. Do not depend on real LINE OAuth or production Supabase.

- [ ] **Step 5: Run UI checks**

Run:

```bash
npm run lint
npm run build
npm run test:e2e
```

Expected: commands pass. `test:e2e` may require approved local server permissions.

- [ ] **Step 6: Commit**

```bash
git add src/app/page.tsx src/app/family/page.tsx src/lib/i18n/dict.ts tests/e2e/app-smoke.spec.ts
git commit -m "feat: add care calendar ui shell"
```

### Task 6: Documentation and Final Verification

**Files:**
- Modify: `docs/product/USER_REQUIREMENTS.md`
- Modify: `docs/product/ROADMAP.md`
- Modify: `docs/engineering/TESTING.md`
- Modify: `docs/security/SECURITY.md`
- Modify: `docs/governance/KNOWN_LIMITATIONS.md`
- Modify: `docs/releases/CHANGELOG.md`
- Modify: `openspec/changes/v1-1-0-care-calendar/tasks.md`

- [ ] **Step 1: Update docs to match implemented behavior**

Record:

- family and caregiver jointly manage care events.
- leave reason uses fixed options plus free-text note.
- LINE reminder runtime is deferred.
- migration is schema draft only until production DB strategy is decided.
- event and leave retention follows care records.

- [ ] **Step 2: Mark completed OpenSpec tasks**

Only mark checkboxes complete for tasks actually implemented. Leave reminder runtime tasks as deferred/inert unless a follow-up change exists.

- [ ] **Step 3: Run full verification**

Run:

```bash
npm run docs:check
npm run test
npm run lint
npm run build
npm run test:smoke
npm run test:e2e
openspec validate --changes v1-1-0-care-calendar
git diff --check
```

Expected:

- Markdown link check passed.
- Vitest all test files passed.
- ESLint exits 0.
- Next build exits 0.
- Smoke test passed.
- Playwright tests passed.
- OpenSpec validation reports 0 failed.
- `git diff --check` has no output.

- [ ] **Step 4: Commit docs**

```bash
git add docs openspec/changes/v1-1-0-care-calendar
git commit -m "docs: update care calendar implementation status"
```

## Self-Review

Spec coverage:

- `care-calendar` family/caregiver management: Tasks 2, 3, 5, 6.
- caregiver 7/30 day views: Tasks 3 and 5.
- constrained event type/status and medical copy: Tasks 2, 3, 5.
- reminder runtime deferred: Tasks 1, 3, 5, 6.
- `caregiver-leave` caregiver creation and family acknowledgement: Task 4.
- fixed leave reason plus free-text note: Tasks 1, 4, 5.
- retention follows care records: Tasks 1 and 6.

No placeholders remain. Implementation-specific code snippets define concrete APIs, field names, route names, expected commands, and expected failures. Any production code step is preceded by a failing test step.
