# CareTaiwan Roadmap

日期：2026-07-01

這份 Roadmap 是產品方向，不是工程待辦。Bug、資安修補與技術債請看 [../engineering/BUGFIX_PLAN.md](../engineering/BUGFIX_PLAN.md)。

版本號從中揚資訊接手後重新整理。正式 release 前仍可調整。

## v1.0.0：Fork 接手與治理基礎

目標：讓 repository 能被公開閱讀、維護與審查。

- 保留原作者署名、研究脈絡與停止維護原因。
- 補 `AGENTS.md`、接手聲明、部署文件、架構文件與使用者需求整理。
- 補 governance 文件：Project Vision、Contributing、Roadmap、Decisions、Maintainers、Known Limitations、Changelog。
- 建立 GitHub issue / PR template。
- 清楚標示正式 VM / Docker 部署方向，以及 Vercel legacy prototype 的定位。

完成標準：

- README 清楚區分目前維護分支與原作者已停止的上游服務。
- `docs/` 完成治理、產品、工程、維運、資安、版本分類。
- 根目錄保留 GitHub 慣例入口。
- 主要文件沒有本機絕對路徑或私人 MCP 指令。
- Markdown 內部連結檢查通過。

## v1.0.1：接手後第一批 Bug Fix

狀態：已實作第一批工程修補，待正式 release。後續 rate limiter、photo、audit、API route 與 E2E 測試另外排入下一輪。

目標：先修會影響部署、隱私與資料安全的問題。

- 資料保留 cron response 不回傳完整 LINE user ID。
- 管理端點 token 比對改為更穩定的方式。
- 資料刪除流程重新檢查順序與失敗處理。
- Origin allowlist 改為正式部署可設定。
- 維持 lint 無 warning，避免 warning 變成背景噪音。

完成標準：

- `npm run lint` 無 warning。
- 會輸出 PII 的 response 已遮蔽或移除。
- env 範例與部署文件一致。
- pairing code TTL、self-pairing prevention、origin checks、cron security 的 helper tests 已建立，且可由本機或 CI 執行。

## v1.1.0：照護行事曆

目標：讓看護提前知道後續安排。

- 家屬端新增、修改、取消照護行程。
- 看護端查看未來 7 天 / 30 天行程。
- `care_events` 資料模型。
- `is_medical_related` 欄位與提醒免責文字。
- LINE 提醒規則與失敗處理。

完成標準：

- `care_events` migration 完成並有回滾策略。
- 權限測試涵蓋家屬建立、看護查看、未配對不可讀。
- `is_medical_related` 提醒文案通過產品邊界檢查。
- LINE reminder 失敗不會被表達成保證送達。

不納入：

- 醫院掛號串接。
- 醫療急迫性判斷。
- Google Calendar / Apple Calendar 雙向同步。

## v1.2.0：照護提醒

目標：把日程與日常照護提醒整理成可理解、可取消、可追蹤的流程。

- 回診、復健、拿藥、檢查等提醒。
- 提醒送達狀態。
- 多語文案。
- 提醒失敗時的清楚提示。

完成標準：

- 提醒狀態可追蹤。
- 多語文案同步。
- 沒有劑量、病情、分流或急迫性判斷。

不納入：

- 用藥劑量建議。
- 病情判斷。
- 醫療分流。

## v1.3.0：家屬協作

目標：讓多位家屬在不擴大隱私風險的前提下協作。

- 多家屬角色評估。
- 家屬端行程與核帳流程整理。
- 群組推播風險提示。
- 權限模型重整。

完成標準：

- 多家屬權限有 ADR。
- 群組推播風險提示完成。
- 不把家屬端做成看護監控工具。

## v2.0.0：企業維運與導入準備

目標：讓系統可以進入試辦或正式導入前的審查。

- 完整 production migration series。
- CI/CD 測試閘門。
- 正式 VM runbook。
- 隱私權政策與服務條款切換為中揚資訊版本。
- 資料落地、資料保留、備份刪除請求處理。
- 事件應變流程。
- 第三方滲透測試與法務審查待辦。

完成標準：

- `docs/operations/RUNBOOK.md` 可操作。
- Security reporting 流程與 contact 已建立。
- `/privacy`、`/terms` 切換為中揚資訊版本。
- production migration series 建立。
- CI/CD 測試閘門啟用。

## 不排入 Roadmap 的方向

以下不是短中期方向。若要重新評估，先新增 ADR。

- EMR / HIS。
- 長照 ERP。
- 排班與薪資。
- 醫療器材認證。
- AI 醫療建議。
- HL7 / FHIR / 醫院正式串接。
