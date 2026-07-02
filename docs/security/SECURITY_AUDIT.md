# 資安審計報告

> 中揚資訊接手後的資安基準、威脅模型與事件處理草案請看 [SECURITY.md](./SECURITY.md)。本檔保留原作者階段的審計紀錄與修補脈絡。

**日期**：2026-04-27
**範圍**：儲存資料 + API + 認證 + 環境變數 + HTTP headers
**框架**：OWASP Top 10 + 個資法第 11 條對照

## 範圍盤點

| 儲存點 | 內容 |
|---|---|
| 看護端 localStorage | `elderStore`（醫護卡 PII）、`records`（每日記錄）、`theme` |
| Supabase `cloud_backups` | line_user_id, display_name, **data jsonb（全 PII）** |
| Supabase `elder_pairings` | elder_id, pairing_code, paired_line_user_id, owner_line_user_id |
| Supabase `push_logs` | elder_id, line_user_id, record_type, status |
| Cookies | Auth.js session token（HttpOnly, SameSite=Lax）|
| Env vars | AUTH_SECRET, LINE secrets, SUPABASE_SERVICE_ROLE_KEY |

## 發現與處置

### 🔴 Critical（已修）

| # | 問題 | 修法 |
|---|---|---|
| 1 | `bindFamily` 用 UPDATE 沒檢查狀態，配對碼可被綁架 | Postgres-level conditional update：only `paired_line_user_id IS NULL AND expires_at > now()` |
| 2 | `push_logs.message` 存完整推播原文（PII） | 拿掉 `message` 欄位，只留 `record_type` + `status` |
| 3 | 配對碼永不過期 | 加 `expires_at`，TTL 24 小時 |
| 4 | LINE webhook 沒 rate limit | per LINE userId 5 次／5 分鐘 in-memory limit |
| 5 | `/api/line/push` 是死路由（被 server action 取代） | 刪除 |
| 6 | API 錯誤訊息直接回前端 | 內部 `console.error`，前端只回「伺服器錯誤」 |

### 🟠 High（已修）

| # | 問題 | 修法 |
|---|---|---|
| 7 | Supabase 全部用 service_role，RLS 沒 enforce | **Phase B TODO**（標註於 supabase-schema.sql）— 作品集／朋友測試階段先保留 |
| 8 | POST API 沒 Origin/CSRF 檢查 | 新增 `src/lib/origin-check.ts`，cloud/upload, pairing/ensure, cloud/delete 都套 |
| 9 | `/api/session` 暴露 `lineUserId` 給前端 JS | 拿掉 |
| 10 | 沒有安全 HTTP headers | next.config.ts 加 X-Frame-Options, HSTS, Permissions-Policy 等 |

### 🟡 Medium（已修 / 已說明）

| # | 問題 | 處置 |
|---|---|---|
| 11 | localStorage PII 明文 | 作品集範圍**不加密**（瀏覽器靜態金鑰問題複雜，弊大於利）。改加 export/delete + 文件警告 |
| 12 | importAllData 沒 schema 驗證 | 新增 `sanitizeElder()` 嚴格欄位過濾 + 字串長度上限 |
| 13 | viewport 鎖定縮放（a11y 違反 WCAG 1.4.4）| 移除 `userScalable: false, maximumScale: 1` |
| 14 | 沒有「刪除全部資料」按鈕（個資法 §11）| 新增 `/api/cloud/delete` + backup 頁 UI |
| 15 | webhook console.error 可能 log 訊息原文 | 改成只 log error message string |

### 🟢 OK（不需動）

- `.gitignore` 排除 `.env*`，repo 沒洩漏密鑰
- LINE webhook 用 HMAC-SHA256 + `crypto.timingSafeEqual` 比對
- Auth.js v5 預設 HttpOnly + SameSite=Lax cookie
- Service Worker 不快取 `/api/*`（不會留下敏感回應）
- `SUPABASE_SERVICE_ROLE_KEY` 沒掛 `NEXT_PUBLIC_` 前綴
- Auth check 在所有受保護的 API route 都有

## ⚠️ 必要動作：Supabase migration

下次部署前**到 Supabase SQL Editor 重跑**：

```sql
alter table elder_pairings add column if not exists expires_at timestamptz;
alter table push_logs drop column if exists message;
alter table push_logs add column if not exists record_type text;
```

或直接重跑整份 `supabase-schema.sql`（migration 已內建在裡面，多次執行安全）。

> 以下 Phase B 內容為原作者於 2026-04 的評估，金額、供應商與優先順序不代表中揚資訊正式導入計畫。

## Phase B 進度（2026-04-27 更新）

- [x] **稽核日誌**：`audit_logs` 表 + `lib/audit.ts`，6 個 API + push action 已寫入 ✅
- [x] **隱私權政策**：`/privacy`（草稿，未經律師審）✅
- [x] **服務條款**：`/terms`（草稿，未經律師審）✅
- [x] **加密備份檔**：PBKDF2 + AES-GCM 200k 迭代（`lib/secure-backup.ts`）✅
- [ ] **Supabase RLS**：架構重構，作品集級別 ROI 低，標記跳過
- [ ] **localStorage 即時加密**：經評估屬「資安劇場」（攻擊者拿到設備就能拿 IndexedDB 金鑰），不做。改以加密備份檔解決最現實威脅（檔案被誤傳）
- [ ] **Rate limit 升級**：In-memory → Upstash Redis — 需要 Upstash 帳號設置
- [ ] **政策／條款律師審**：必須外包專業 — 預算約 5 萬
- [ ] **DPA**（資料處理協議）：簽 Supabase, Vercel, LINE — 真的上線前再簽
- [ ] **第三方滲透測試報告**：政府採購／醫院白標必備 — 預算 12-30 萬

## 不會做（必須找人）

- 滲透測試（同 LLM 自己測有結構性盲點）
- ISO 27001 認證
- 法律文件最終定稿
- 24/7 資安事件應變

## 變更檔案清單

### 新增
- `src/lib/rate-limit.ts` — In-memory rate limiter
- `src/lib/origin-check.ts` — Same-origin guard for state-changing endpoints
- `src/app/api/cloud/delete/route.ts` — 個資法刪除權 API
- `SECURITY_AUDIT.md` — 本檔

### 修改
- `src/lib/pairing.ts` — 防綁架 + TTL
- `src/lib/elder.ts` — schema 驗證 import + deleteAllLocalData()
- `src/app/actions/push-actions.ts` — 改寫 push_logs 不存原文
- `src/app/api/line/webhook/route.ts` — rate limit + 錯誤訊息防漏 + 配對失敗回應
- `src/app/api/cloud/upload/route.ts` — Origin 檢查 + 錯誤遮蔽
- `src/app/api/cloud/download/route.ts` — 錯誤遮蔽
- `src/app/api/pairing/ensure/route.ts` — Origin 檢查 + 錯誤遮蔽
- `src/app/api/session/route.ts` — 不回 lineUserId
- `src/app/backup/page.tsx` — 加刪除按鈕
- `src/app/layout.tsx` — 移除 viewport 縮放鎖
- `next.config.ts` — 加安全 HTTP headers
- `supabase-schema.sql` — 加欄位 migration

### 刪除
- `src/app/api/line/push/route.ts` — 死路由
