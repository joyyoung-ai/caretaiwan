## Context

CareTaiwan 目前已有照護紀錄、長者卡、家屬 LINE 推播、記帳與核帳。使用者需求指出家屬希望新增行事曆，讓外籍看護知道後續回診日程，也能處理看護請假。這會碰到 schema、權限、LINE reminder、醫療相關文案、資料保留與刪除權，不適合直接從 UI 頁籤開始做。

相關邊界：

- `PROJECT_VISION.md` 允許日程提醒、回診提醒與請假通知，但排除醫療判斷、排班、薪資與長照 ERP。
- `USER_REQUIREMENTS.md` 建議第一版只做照護行程與請假紀錄。
- `DECISIONS.md` 的 ADR-0007 已提出 `is_medical_related` 或等效欄位。
- `SECURITY.md` 要求新增資料表說明保留期限、刪除流程、可讀寫角色與 right-to-erasure。
- 現有 `supabase-schema.sql` 是 idempotent schema，不是正式 production migration series。

## Goals / Non-Goals

**Goals:**

- 建立 `care_events` 與 `caregiver_leave_requests` 的第一版資料模型與 migration 策略。
- 家屬能建立、修改、取消已配對長者的照護行程。
- 看護能查看自己配對長者的未來 7 天 / 30 天行程。
- 看護能提出請假紀錄，家屬能查看並標記已確認。
- 醫療相關行程要明確標示為一般日程提醒，不提供醫療指示。
- 權限測試要涵蓋家屬建立、看護查看、未配對不可讀、家屬不得代替看護建立請假。
- LINE reminder 若納入本 change，必須先有明確排程與失敗處理；否則只完成資料模型與 UI，不上 reminder runtime。

**Non-Goals:**

- 不串接醫院掛號、Google Calendar 或 Apple Calendar。
- 不做複雜排班、代理人安排、薪資、扣款或勞資爭議判定。
- 不做醫療急迫性、診斷、治療、劑量或分流判斷。
- 不重整多家屬角色模型。
- 不導入大型 design system 或重排整個 app。
- 不把 OpenSpec、Superpowers 或 planning 工具加入 runtime dependency。

## Decisions

### 1. Split care events and leave requests into separate tables

照護行程與請假紀錄有不同建立者、狀態、查詢與風險。`care_events` 由家屬建立並讓看護查看；`caregiver_leave_requests` 由看護建立，家屬只能確認或備註。分成兩張表可以避免把請假流程塞進行程表，後續也比較容易補不同保留期限與 audit 行為。

替代方案：用單一 `calendar_items` 表加 type 區分。這會讓家屬建立行程與看護提出請假的權限檢查混在同一組 route 裡，未來擴充時更容易變成排班系統。

### 2. Keep v1.1.0 ownership model aligned with current pairing model

第一版不重整角色模型。行程與請假都綁 `elder_id`，並保存 `owner_line_user_id` 與建立者欄位。家屬 route 使用登入家屬 LINE user ID 檢查 `elder_pairings.owner_line_user_id`；看護 route 使用登入看護 LINE user ID 檢查 `elder_pairings.paired_line_user_id`。

替代方案：先建立新的 role / membership table。這比較完整，但會把 v1.1.0 擴大成多家屬權限重構，應另開 change。

### 3. Medical-related events are data flags plus constrained copy, not medical logic

行程類型為回診、復健、拿藥、檢查時，系統必須保存 `is_medical_related = true` 或等效結果。UI 與 LINE reminder 使用固定免責文案：「此為一般日程提醒，非醫療指示。」系統不得依類型、備註或時間判斷急迫性。

替代方案：只靠 UI 文案，不設資料欄位。這會讓後續 LINE reminder、audit 或資料匯出難以一致處理醫療相關提醒。

### 4. Build API and tests before broad UI work

先建立資料 helper、API route 與 regression tests，再接看護端 / 家屬端頁面。核心 route 應先覆蓋 ownership、date range、status transition、same-origin、PII redaction 和 DB failure path。UI 第一版只做必要入口與清楚狀態，不做完整日曆視覺系統。

替代方案：先做 UI mock，再補 API。這會讓權限與資料保留問題太晚被看見。

### 5. Treat LINE reminder as a separately gated slice inside v1.1.0

LINE reminder 牽涉排程、重試、失敗記錄、推播內容與 PII redaction。若第一版尚未決定 cron / scheduler 與通知對象，應先完成資料模型和頁面，將 reminder runtime 留在後續 PR。若要納入 v1.1.0，必須新增 reminder-specific tasks 和 tests。

替代方案：建立行程時立即推播。這不是 reminder，而且會造成使用者誤解送達保證。

## Risks / Trade-offs

- 回診時間、地點與備註是敏感資料 → API response、audit metadata、LINE push log 不輸出未遮蔽 PII；資料保留與刪除權要寫入文件。
- 請假可能被家屬當成監控或施壓工具 → 家屬只能確認看護提出的請假，不得代建；文案避免命令語氣。
- Reminder 漏發可能造成照護風險 → 所有提醒都標示為輔助，不保證送達；失敗狀態不得被隱藏。
- `supabase-schema.sql` 不是 production migration series → 實作前要決定使用 `supabase/migrations/` 還是先維持 idempotent schema 草案；production 前不得只靠手動 SQL。
- 現有 RLS 尚未完成 → route 必須維持 application-level ownership checks，並以 tests 保護。
- 多語文案可能不同步 → 涉及使用者可見文案時，同步 `src/lib/i18n/dict.ts` 或明確記錄暫不多語的理由。

## Migration Plan

1. 在 proposal review 後，先決定 migration 路線：正式 `supabase/migrations/` 或短期 idempotent schema 草案。production 前必須有可回滾策略。
2. 新增 `care_events` 與 `caregiver_leave_requests` schema，包含必要 index、狀態 check、created / updated timestamps，以及資料保留註解。
3. 先做 helper 與 API route tests，確認家屬、看護、未登入、未配對、跨 elder 存取都被正確處理。
4. 實作最小 API 與 helper。
5. 接看護端未來 7 / 30 天查看頁面與家屬端行程管理頁面。
6. 接看護端請假建立與家屬端確認流程。
7. 若 reminder scope 已被核准，再新增 reminder scheduler、LINE push 文案、失敗記錄與 tests。

Rollback 原則：

- Schema change 必須可回滾新表或停用 route，不得破壞既有 records、expenses、pairing 與 photo flows。
- UI 可用 feature route 隔離；若出問題，先移除入口並保留資料表。
- Reminder 若出問題，先停用排程，不刪除既有行程。

## Open Questions

- 第一版要做到「共同管理行程」還是只做「家屬建立、看護查看」的單向提醒？
- v1.1.0 是否一定包含 LINE reminder runtime，或先只完成資料模型、頁面與 API？
- 正式資料庫路線要採 VM 自管 Postgres、VM app 搭配 managed Supabase，還是先只建立 migration series 不選供應商？
- 請假原因是否使用固定選項、自由文字，或兩者並存？
- 行程與請假資料的預設保留期限要和照護紀錄一致，還是另設期限？
