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

- 建立 `care_events` 與 `caregiver_leave_requests` 的第一版資料模型；正式 migration 等資料庫策略決策後再落。
- 家屬與看護能共同管理已配對長者的照護行程。
- 看護能查看自己配對長者的未來 7 天 / 30 天行程。
- 看護能提出請假紀錄，家屬能查看並標記已確認。
- 請假原因同時支援固定選項與自由文字備註。
- 醫療相關行程要明確標示為一般日程提醒，不提供醫療指示。
- 權限測試要涵蓋家屬 / 看護管理配對長者行程、未配對不可讀、家屬不得代替看護建立請假。
- LINE reminder runtime 不納入 v1.1.0；本輪只保留資料欄位與 UI 說明。
- 行程與請假資料保留期限跟照護紀錄一致。

**Non-Goals:**

- 不串接醫院掛號、Google Calendar 或 Apple Calendar。
- 不做複雜排班、代理人安排、薪資、扣款或勞資爭議判定。
- 不做醫療急迫性、診斷、治療、劑量或分流判斷。
- 不重整多家屬角色模型。
- 不導入大型 design system 或重排整個 app。
- 不把 OpenSpec、Superpowers 或 planning 工具加入 runtime dependency。

## Decisions

### 1. Split care events and leave requests into separate tables

照護行程與請假紀錄有不同建立者、狀態、查詢與風險。`care_events` 由家屬與看護共同管理；`caregiver_leave_requests` 由看護建立，家屬只能確認或備註。分成兩張表可以避免把請假流程塞進行程表，後續也比較容易補 audit 行為與權限檢查。

替代方案：用單一 `calendar_items` 表加 type 區分。這會讓家屬建立行程與看護提出請假的權限檢查混在同一組 route 裡，未來擴充時更容易變成排班系統。

### 2. Keep v1.1.0 ownership model aligned with current pairing model

第一版不重整角色模型。行程與請假都綁 `elder_id`，並保存 `owner_line_user_id`、建立者欄位與最後更新者欄位。家屬 route 使用登入家屬 LINE user ID 檢查 `elder_pairings.owner_line_user_id`；看護 route 使用登入看護 LINE user ID 檢查 `elder_pairings.paired_line_user_id`。

替代方案：先建立新的 role / membership table。這比較完整，但會把 v1.1.0 擴大成多家屬權限重構，應另開 change。

### 3. Medical-related events are data flags plus constrained copy, not medical logic

行程類型為回診、復健、拿藥、檢查時，系統必須保存 `is_medical_related = true` 或等效結果。UI 與 LINE reminder 使用固定免責文案：「此為一般日程提醒，非醫療指示。」系統不得依類型、備註或時間判斷急迫性。

替代方案：只靠 UI 文案，不設資料欄位。這會讓後續 LINE reminder、audit 或資料匯出難以一致處理醫療相關提醒。

### 4. Build API and tests before broad UI work

先建立資料 helper、API route 與 regression tests，再接看護端 / 家屬端頁面。核心 route 應先覆蓋 ownership、date range、status transition、same-origin、PII redaction 和 DB failure path。UI 第一版只做必要入口與清楚狀態，不做完整日曆視覺系統。

替代方案：先做 UI mock，再補 API。這會讓權限與資料保留問題太晚被看見。

### 5. Defer LINE reminder runtime

LINE reminder 牽涉排程、重試、失敗記錄、推播內容與 PII redaction。v1.1.0 先不納入 reminder runtime，只保留 `remind_at` 或等效欄位與 UI 說明。等排程、重試與失敗處理確認後，再另開 change 或 follow-up PR。

替代方案：建立行程時立即推播。這不是 reminder，而且會造成使用者誤解送達保證。

### 6. Keep formal migration after database strategy decision

正式 migration 等 VM 自管 Postgres / managed Supabase 決策後再落。v1.1.0 規格先定義資料模型、欄位、index、rollback 要求與測試邊界。實作若需要 schema 草案，只能作為後續 migration 的輸入，不得把手動 SQL 當成 production migration series。

替代方案：現在立刻建立 `supabase/migrations/`。這能加速實作，但正式資料庫路線尚未決定，容易產生日後要搬移或重寫的 migration。

### 7. Leave reason uses fixed options plus free text

請假原因同時支援固定選項與自由文字備註。固定選項用於統計、翻譯與降低輸入成本；自由文字用於補充實際情境。固定選項不得涵蓋薪資、扣款或勞資爭議判定。

替代方案：只用自由文字。這比較簡單，但多語 UI、篩選與後續統計會比較困難。

### 8. Retention follows care records

行程與請假資料保留期限先跟照護紀錄一致。這讓第一版刪除請求與備份策略比較一致；若未來法律或營運需要縮短保留期限，再另開資料治理變更。

## Risks / Trade-offs

- 回診時間、地點與備註是敏感資料 → API response、audit metadata、LINE push log 不輸出未遮蔽 PII；資料保留與刪除權要寫入文件。
- 請假可能被家屬當成監控或施壓工具 → 家屬只能確認看護提出的請假，不得代建；文案避免命令語氣。
- Reminder 漏發可能造成照護風險 → 所有提醒都標示為輔助，不保證送達；失敗狀態不得被隱藏。
- `supabase-schema.sql` 不是 production migration series → 正式 migration 等資料庫策略決策後再落；production 前不得只靠手動 SQL。
- 現有 RLS 尚未完成 → route 必須維持 application-level ownership checks，並以 tests 保護。
- 多語文案可能不同步 → 涉及使用者可見文案時，同步 `src/lib/i18n/dict.ts` 或明確記錄暫不多語的理由。

## Migration Plan

1. 先把 `care_events` 與 `caregiver_leave_requests` 的欄位、index、狀態 check、created / updated timestamps、rollback 要求與資料保留註解寫成 migration 設計。
2. 等 VM 自管 Postgres / managed Supabase 決策後，再建立正式 migration series；production 前必須有可回滾策略。
3. 先做 helper 與 API route tests，確認家屬、看護、未登入、未配對、跨 elder 存取都被正確處理。
4. 實作最小 API 與 helper。
5. 接看護端未來 7 / 30 天查看頁面與家屬 / 看護共同管理行程頁面。
6. 接看護端請假建立與家屬端確認流程。
7. 保留 reminder 欄位與 UI 說明，但不啟用 reminder runtime。

Rollback 原則：

- Schema change 必須可回滾新表或停用 route，不得破壞既有 records、expenses、pairing 與 photo flows。
- UI 可用 feature route 隔離；若出問題，先移除入口並保留資料表。
- Reminder runtime 不在 v1.1.0 範圍內；若後續實作出問題，先停用排程，不刪除既有行程。

## Confirmed Decisions

- v1.1.0 採家屬與看護共同管理行程。
- LINE reminder runtime 先不納入。
- migration 等正式資料庫策略決策後再落。
- 請假原因採固定選項與自由文字並存。
- 行程與請假資料保留期限跟照護紀錄一致。
