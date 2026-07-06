# 已知限制

日期：2026-07-03

這份文件整理目前已知限制。列在這裡的項目不一定是 bug。有些是刻意不做，有些是還沒到實作階段，有些需要法律、資安或醫療專業先補齊。

## 產品邊界

CareTaiwan 目前不提供：

- 醫療判斷。
- 醫療分流。
- 診斷或治療建議。
- 用藥劑量建議。
- 醫療器材功能。
- EMR / HIS。
- HL7 / FHIR。
- 醫院正式串接。
- 長照 ERP。
- 排班系統。
- 薪資、扣款或勞資爭議判定。

這些不是短期 bug。若要改變範圍，先新增 ADR。

## 法規與認證限制

目前沒有：

- 醫療器材認證。
- ISO 27001 認證。
- HIPAA 合規宣告。
- 第三方滲透測試報告。
- 正式 DPA 簽署清單。
- 法律專業審閱完成的隱私權政策與服務條款。

文件可以引用 ISO 27001 的管控精神，但不得宣稱已取得認證。

## 技術限制

目前狀態：

- 已建立第一批 helper tests、API route 邊界測試、production HTTP smoke test 與 Playwright E2E smoke。LINE webhook security paths、photo ownership metadata、cloud upload / download / delete ownership and failure paths、representative cloud disabled / unauthenticated gates、photo upload pairing guard / invalid bytes / metadata rollback、photo signed token route、family paired ownership and DB failure、pairing bind / ensure / unbind、group-code / group-photo / group-unbind、pairing status owner query、session response shape、expense create / list / verify ownership、expense list photo signed URL gate 與 data-retention cron auth / config / redaction 都已有 Vitest coverage。瀏覽器級 E2E 目前只覆蓋公開頁、首頁 shell 與 session API redaction，核心登入後流程仍要逐步補上。
- `npm run lint` 可通過，已無 warning。
- `supabase-schema.sql` 是 idempotent schema，不取代正式 migration series。
- v1.1.0 照護行程與看護請假目前已有 production migration、API foundation 與首頁內的最小可用流程；正式資料庫已決定採 VM 自管 Postgres，下一步要在 disposable 或 staging Postgres 演練 forward / rollback。
- App data layer 已改為 server-side 直接連 VM 自管 Postgres；照片儲存採 VM local storage。production 前仍需完成實際 VM volume、backup、restore drill、容量監控與告警設定。
- 照護行程與請假紀錄先採列表與表單，不提供完整日曆格、拖拉、週期性事件、批次編輯或跨日曆同步。
- DB-level RLS / policy 尚未導入，現階段仰賴 server-side application checks 與 Postgres app role。
- 正式 VM runbook 尚未完整落地。
- 正式資料庫已選 VM 自管 Postgres；backup、restore drill、migration 執行、監控與告警 runbook 尚未完成。

## 推播與提醒限制

- LINE 推播不是保證送達。
- 使用者關閉通知、封鎖 Bot、網路不穩或 LINE 服務異常，都可能造成提醒失敗。
- 回診、吃藥、拿藥、復健等提醒只能作為一般日程提醒，不代表醫療指示。
- v1.1.0 的照護行程只保留 `remind_at` 欄位與 UI 說明，LINE reminder runtime 尚未啟用。
- v1.2.0 reminder runtime 已建立 OpenSpec change，但尚未實作。提醒收件者已決定支援看護、家屬與已綁定 LINE 群組；實作前仍需設計排程方式、claim / retry、失敗狀態、文案 helper 與 redaction。

## 資料刪除限制

使用者要求刪除資料時，live database / storage 應執行刪除。已打包的歷史備份原則上不直接拆包修改，而是記錄刪除請求，並在備份到期時自然覆蓋。正式環境需要在隱私權政策與 runbook 寫清楚。

## 開發流程限制

- GitHub team 尚未正式建立；CODEOWNERS 目前是草案，正式公開前仍要確認實際 owner。
- Security contact 已指定為 `services@joyyoung.com.tw`，但 GitHub private vulnerability reporting 尚未確認啟用。
- Release 流程尚未自動化。
- CI/CD 測試閘門已建立於 `.github/workflows/ci.yml`，會執行 dependency audit、lint、docs check、Vitest、build、production smoke 與 Playwright E2E。Branch protection 尚未設定前，仍要靠維護者確認 PR 必須通過 CI 才能合併。
- Branch protection 尚未設定。

這些是治理待辦，不是產品功能。
