# CareTaiwan 決策紀錄

日期：2026-07-01

這份文件用 ADR（Architecture Decision Record）的方式記錄重要產品與架構決策。新維護者不要只靠口頭記憶或聊天紀錄理解方向。

## ADR-0001：保留 Postgres / Supabase 思路，不改成 Firebase

狀態：Accepted
Owner：Technical Lead（待指定）
Review date：2026-09-30

目前資料模型需要關聯、查詢、刪除權處理、稽核與 future migration。Postgres 比 document store 更適合長期整理權限與資料保留策略。

Supabase 是原作者版本的實作選擇。中揚資訊接手後不永久綁定 Supabase managed service，但資料模型先維持 Postgres 思路。正式資料庫路線已在 ADR-0009 決定採 VM 自管 Postgres。

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

## ADR-0008：暫時保留 CareTaiwan 作為開源專案名稱

狀態：Proposed
Owner：Product Owner（待指定）
Review date：2026-09-30

中揚資訊接手原 CareTaiwan 開源專案後，正式服務品牌與 GitHub repository 名稱尚未定案。現有 README、Project Vision、Roadmap 與接手說明已使用 CareTaiwan 作為開源專案名稱。

短期保留 CareTaiwan 作為開源 repository / project name。正式服務品牌可在 production 上線前另行決定，不必和開源 repo 名稱完全相同。

理由：

- 保留原作者脈絡與搜尋辨識度。
- 避免在治理文件尚未穩定前大量改名。
- GitHub repository name 後續仍可修改。
- 正式服務名稱可以依營運、法務、LINE channel、domain 與客戶溝通需求另行決定。

影響：

- README、AGENTS、PROJECT_VISION、FORK_NOTICE 與 Roadmap 暫時維持 CareTaiwan。
- 若未來 rebrand，需另開 ADR，並同步更新 package metadata、Docker image、LINE channel 命名、deployment docs、privacy / terms 與 domain。

替代方案：

- 立即改成中揚資訊自有品牌名稱。
- 使用中性 repo 名稱，例如 `caregiver-collab-tw`。

## ADR-0009：正式資料庫採 VM 自管 Postgres

狀態：Accepted
Owner：Technical Lead（待指定）
Review date：2026-09-30

背景：

CareTaiwan 正式環境已決定走 VM / Docker。資料庫原本保留兩條路：VM app 連 managed Supabase，或 VM app 連自管 Postgres。v1.1.0 照護行程與請假功能已完成 schema draft、API foundation 與最小 UI；下一步必須建立 production migration series，不能再只靠 `supabase-schema.sql` 或手動 SQL。

決策：

正式 production 資料庫採 VM 自管 Postgres。Next.js app、Postgres、備份、restore、migration、帳號權限與網路隔離都納入 VM runbook 管理。Supabase managed service 暫時只作為原作者架構與相容 Postgres 的參考，不作為正式 production 依賴。

理由：

- 資料落地、備份保存、刪除請求與稽核流程可以由維運團隊直接控制。
- 避免照護資料、LINE ID、醫療相關備註與請假資料放進尚未完成法務審查的境外 managed service。
- VM / Docker 已是正式部署方向，資料庫一併納入同一套 runbook，責任邊界比較清楚。
- Postgres 相容性仍保留，未來若要搬到 managed Postgres 或客戶指定環境，不需要改資料模型方向。

影響：

- 需要新增正式 migration series，不再把 `supabase-schema.sql` 當 production migration。
- 需要補 Postgres backup、restore drill、WAL / PITR 評估、帳號權限、監控、告警與版本升級流程。
- API 仍先維持 application-level ownership checks。RLS、scoped JWT 或 database RPC 另開 ADR 評估。
- 若照片或備份不使用 Supabase Storage，需要在 storage 策略中明確選 filesystem、object storage 或其他方案。

替代方案：

- VM app 搭配 managed Supabase Postgres。優點是維運負擔低；缺點是資料處理者、資料所在區域與平台限制需要另外審查。
- 其他 managed Postgres。可減少 DBA 負擔，但仍需確認資料區域、備份、刪除請求與合約。
- 繼續延後決策。這會卡住 v1.1.0 production migration，不採用。

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
