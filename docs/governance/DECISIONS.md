# CareTaiwan 決策紀錄

日期：2026-07-01

這份文件用 ADR（Architecture Decision Record）的方式記錄重要產品與架構決策。新維護者不要只靠口頭記憶或聊天紀錄理解方向。

## ADR-0001：保留 Postgres / Supabase 思路，不改成 Firebase

狀態：Accepted
Owner：Technical Lead（待指定）
Review date：2026-09-30

目前資料模型需要關聯、查詢、刪除權處理、稽核與 future migration。Postgres 比 document store 更適合長期整理權限與資料保留策略。

Supabase 是原作者版本的實作選擇。中揚資訊接手後不一定永久綁定 Supabase managed service，但資料模型先維持 Postgres 思路。正式 VM 可以選 managed Supabase、自管 Postgres 或其他相容方案。

## ADR-0002：不提供 AI 醫療建議

狀態：Accepted
Owner：Product Owner（待指定）
Review date：2026-09-30

CareTaiwan 可以記錄照護狀態、提醒行程、協助家屬理解日常變化，但不提供診斷、治療、劑量、醫療分流或急迫性判斷。

原因很直接：使用者資料涉及健康與長照情境，錯誤建議可能造成實際傷害。若未來要加入醫療內容，必須有專業審查、責任歸屬、法務文件與保險安排，不能只靠 disclaimer。

## ADR-0003：家屬端使用 LINE

狀態：Accepted
Owner：Product Owner（待指定）
Review date：2026-09-30

台灣家庭照護溝通高度依賴 LINE。家屬端若要求另外安裝 app，採用成本會變高。LINE Messaging API 能讓家屬在既有溝通工具裡收到看護主動分享的資訊。

代價是資料會進入 LINE 的服務邊界。隱私權政策、群組推播警示與資料最小化要清楚揭露。

## ADR-0004：資料先讓看護掌握

狀態：Accepted
Owner：Product Owner（待指定）
Review date：2026-09-30

原作者把資料共有權視為產品功能。這個方向保留。

看護端不能變成家屬監控工具。照護紀錄應先讓看護能快速記錄，再由看護主動分享。新增功能時要避免把「照護協作」做成「單向監督」。

## ADR-0005：正式部署採 VM / Docker，但不綁供應商

狀態：Accepted
Owner：Technical Lead（待指定）
Review date：2026-09-30

正式環境以 VM / Docker 容器化部署為方向。公有雲 VM、私有雲、主機代管或地端伺服器都可以，前提是符合網路隔離、備份加密、日誌保存、防竄改、密鑰管理與事件處理要求。

部署文件不把產品架構寫死在單一供應商上。若使用特定雲端服務，要在 runbook 裡寫清楚替代方案或退出方式。

## ADR-0006：CareTaiwan 不轉型為 EMR / HIS / 長照 ERP

狀態：Accepted
Owner：Product Owner（待指定）
Review date：2026-09-30

CareTaiwan 的定位是外籍家庭看護與家屬之間的照護協作工具。它不是醫療院所系統，也不是機構營運 ERP。

未來可以輸出資料或與其他系統串接，但不能讓核心產品開始承擔醫療病歷、醫療院所流程、薪資、排班或法定機構管理責任。

## ADR-0007：新增行事曆要保留醫療提醒免責欄位

狀態：Proposed
Owner：Product Owner / Technical Lead（待指定）
Review date：2026-09-30

`care_events` 應包含 `is_medical_related` 或等效欄位。回診、拿藥、檢查、復健等提醒要在 UI 與 LINE 推播加上「此為一般日程提醒，非醫療指示」。

這不是為了多一個欄位，而是讓程式層面能區分一般日程與醫療相關日程，避免未來提醒文案越寫越像醫療指示。

## ADR 模板

```text
## ADR-000X：標題

狀態：Proposed / Accepted / Superseded
Owner：
Review date：

背景：

決策：

理由：

影響：

替代方案：
```
