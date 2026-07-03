# CareTaiwan 接手維護改善規劃

日期：2026-07-02

這是中揚資訊接手後的第一版維護待辦。先把眼前看得到的問題列下來，之後可以拆成 issue 或 milestone。這份清單來自專案結構檢查、`npm run lint`、`npm run build`、本機索引工具，以及 auth、pairing、Supabase、LINE Bot、照片上傳、cron、README、schema 幾個高風險區塊的快速審視。

維護單位：中揚資訊股份有限公司。

原作者停止線上服務後把專案開源。後續維護不能只接程式碼，也要接住他留下的判斷：看護端要低摩擦，分享要由看護主動控制，隱私與資安不能事後才補，醫療建議不能在沒有專業審查時上線。原作者卡住的地方，也就是我們接手後要補上的地方：合規、資安修補、使用者支援、營運成本、醫療內容責任，以及在權力不對等環境中接觸看護做研究的困難。詳見 `../governance/FORK_NOTICE.md`。

系統架構另整理在 `SYSTEM_ARCHITECTURE_PLAN.md`。後續修 bug 或加功能前，先對照那份文件，不要邊修邊改語言、資料庫、部署模式或 UI 規則。

## 目前狀態

- Build：`npm run build` 可在 Next.js 16.2.6 通過。
- Lint：`npm run lint` 可通過，已無 warning。
- 測試：已建立第一批 Vitest helper tests，也已開始補 API route 邊界測試；E2E 測試尚未建立。
- Memory index：`Users-mark-Documents-caretaiwan-repo`。大量搬移文件或新增主要功能後，要重新索引。
- 工作樹：除本次文件修改外，已經有其他未提交變更。後續改功能時要先看清楚，不要混在一起。

## 架構評估結論

目前不建議馬上更換開發語言、前端框架或整套資料庫。現在的混亂主要來自邊界不清、正式 VM 部署路線還沒寫清楚、文件沒有跟上接手狀態、缺測試。先補架構文件和規則，比直接重寫更實際。

短期決策：

- 開發語言保留 TypeScript。
- 框架保留 Next.js 16 / React 19。
- 資料庫方向保留 Postgres，但要決定正式 VM 要自管 Postgres，還是 VM app 搭配 managed Supabase。
- LINE Login、Auth.js、LINE Messaging API 先保留。
- Tailwind CSS 4 先保留，不導入大型設計系統；先補輕量 UI / 文案規範。
- 正式部署方向改為 VM，但不綁定特定供應商。公有雲 VM、私有雲、主機代管或地端伺服器都可以，前提是符合網路隔離、備份加密、稽核日誌保存與防竄改等安全基準。

接手後的第一個架構工作是切清楚責任：頁面、API route、server action、LINE webhook、資料 helper、部署設定，各自該做什麼要寫下來。技術要不要換，等邊界清楚後再談。

## P0：接手前置工作

1. 補齊系統架構規劃。
   - 現況：已有 `SYSTEM_ARCHITECTURE_PLAN.md` 作為第一版地圖，但還不是完整架構文件。
   - 風險：沒有架構邊界時，bug fix 很容易順手改成架構改造，最後資料庫、部署、UI 規則混在一起。
   - 修法：把 production 路線、資料庫策略、API 邊界、設計規範、測試策略整理成可追蹤 issue。

2. 補正式 VM 安全基準與 runbook 框架。
   - 現況：`SYSTEM_ARCHITECTURE_PLAN.md` 已加入第一版 VM 安全基準，但還沒有拆成可操作的 runbook。
   - 風險：若只把服務搬到 VM，沒有網路隔離、備份、日誌、防火牆和事件處理規則，正式營運風險會比原型階段高很多。
   - 修法：先補供應商中立的部署 runbook、備份還原流程、token rotation、稽核日誌保存、資安事件處理流程，以及使用者刪除請求碰到歷史備份時的處理原則；若之後選定特定環境，再補環境差異附錄，不改動核心架構。

3. 先把授權與分支狀態說清楚。
   - 證據：原始文件曾出現維護狀態與授權描述不一致。
   - 風險：授權或維護狀態模糊，後面要開 issue、收 PR、部署服務都會卡住。
   - 修法：README、package metadata、GitHub repository 設定與 `../governance/FORK_NOTICE.md` 要對齊同一套說法。

4. 讓環境變數範例維持可用。
   - 現況：根目錄已有 `.env.example`，Docker / VM 可參考 `docker/.env.production.example`。
   - 風險：新增環境變數時如果只改程式，不改範例檔，新維護者很難在乾淨環境把服務跑起來。
   - 修法：新增或改名環境變數時，同步更新 `.env.example`、`docker/.env.production.example` 和 VM 部署文件。

## Resolved in v1.0.0 docs pass

以下項目已在接手文件整理中修正，不再列為待修 bug。若後續又出現回歸，請開新 issue，不要沿用舊描述。

- README 維護狀態已拆分為 current fork、original upstream、original author note，避免把原服務停止與目前 fork 維護狀態混在一起。
- README 醫療內容殘留已改為 Historical Research Sources，並明確說明目前維護分支不提供診斷、分流、治療、劑量或急迫性判斷。
- `LINE_BOT_CHANNEL_ID` 已從 production 必填 env 移除；`docs/operations/FAMILY_SIDE_SETUP.md` 改為說明目前程式不讀取此值。
- 本機絕對路徑、MCP 索引名稱與私人指令已移到 `AGENTS.local.md`，公開 `AGENTS.md` 只保留可提交的通用規則。
- `docs/product/USER_REQUIREMENTS.md` 已改用「內部 LINE 對話截圖，2026-06-30 提供」，不再引用本機圖片路徑。
- Security Contact 已指定為 `services@joyyoung.com.tw`。GitHub private vulnerability reporting 尚未確認啟用前，資安通報以此信箱為對外窗口。

## Resolved in v1.0.1 engineering pass

以下項目已完成第一輪工程修補，後續若要補強，請開新的追蹤項目。

- 資料保留 cron response 不再回傳完整 LINE user ID，改回傳 `lineUserRef` 短 hash。
- 資料保留 cron bearer token 比對改為固定 hash 後使用 `crypto.timingSafeEqual`。
- 資料保留 cron delete stage 改為先刪 `cloud_backups`，成功後才刪 `elder_pairings`；若 pairing 刪除失敗，response 與 audit metadata 會記錄 partial failure，不輸出 DB error 原文。
- Origin allowlist 改為由 `PUBLIC_APP_URL` 與 `PRODUCTION_ALLOWED_HOSTS` 驅動；production 不再自動放行 legacy host、localhost、preview host 或未設定的 Vercel host。
- 已導入 Vitest，並建立 pairing TTL、self-pairing、origin checks、cron security helper tests。
- 既有 lint warning 已清除，`npm run lint` 目前無 warning。

## P1：可能 Bug / 執行期風險

目前 P1 runtime / code 風險已完成第一輪修補。下一批 P1 應從實際測試或 code review 發現新增，不要沿用已修項目。

## P2：品質與可維護性

1. 釐清行事曆 / 回診提醒 / 看護請假需求。
   - 來源：內部 LINE 對話截圖，2026-06-30 提供。
   - 現況：已整理到 `../product/USER_REQUIREMENTS.md`，目前還沒有對應資料表、API 或 UI。
   - 風險：如果直接做頁面，後續會在照護紀錄、家屬配對、LINE 推播和請假流程之間互相牽扯。
   - 修法：先確認第一版範圍，只做照護行程與請假紀錄；不做排班、薪資、醫院掛號串接。

2. 擴充自動化測試。
   - 優先測試：
     - 其他 API route ownership / role checks。
     - data-retention cron response redaction。
     - photo signed URL ownership。
   - 已完成：pairing code TTL、禁止 self-pairing、origin checks、cron security helper、rate limiter fallback、Upstash error fallback、photo magic-byte detection、audit metadata redaction、photo ownership metadata checks、expense create route ownership checks 與 LINE webhook security-path tests。
   - 現況：第一批純 helper tests 已補到可保護主要安全 helper，也開始補 route handler 邊界。下一步補其他 route ownership / role checks、data-retention cron response redaction 與 photo signed URL ownership。測試策略整理在 `TESTING.md`。

3. 整理正式 VM 部署設定。
   - 需要正式 VM、測試環境、本機開發三種設定輪廓。
   - 舊 `caretaiwan.app`、原作者 Vercel 假設與本機絕對路徑應標為 legacy prototype，不要默默沿用。

4. 建立資料庫 migration 規則。
   - `supabase-schema.sql` 是 idempotent，但不是 migration series。
   - production 前應新增 `supabase/migrations/`，或至少把 migration 順序寫清楚。

5. 補設計規範。
   - 現況：畫面靠 Tailwind class 和少量 component 撐住，沒有明確 UI 規則。
   - 風險：新增功能時，每個頁面會長出不同的按鈕、表單、錯誤訊息和危險操作樣式。
   - 修法：先整理輕量規範，不急著導入大型 design system。至少定義按鈕、表單、狀態提示、底部導覽、刪除確認、多語文案和無障礙底線。

## P3：產品與合規待辦

1. 重新評估 Supabase RLS。
   - 目前架構仰賴 service-role 加 application checks。
   - 若公開營運，應逐步改成 RLS、scoped JWT 或 RPC。

2. 重寫分支營運方自己的隱私權政策與服務條款。
   - 目前文字仍參照原服務營運與原接觸窗口。
   - 風險：正式展示、試辦或承接公部門專案時，法律主體不清會讓資料責任、刪除請求、事件通報和第三方處理者責任都變模糊。
   - 修法：將 `/privacy`、`/terms`、ConsentModal 內容切換為中揚資訊股份有限公司版本。文件要明確定義資料擁有者 / 控制者（Data Controller）、資料處理者（Data Processor）、第三方服務、資料保留、刪除權、備份處理原則、資料落地（Data Residency）與聯絡窗口。原作者個人服務的語氣只能保留在歷史說明，不應留在正式條款裡。
   - 資料落地：若要對接公部門、醫療院所或大型企業，正式隱私權政策要明確宣告資料庫、檔案儲存與備份所在區域。預設規劃應以台灣境內實體伺服器或公有雲台灣機房為優先；若不得不使用境外服務，要先完成風險評估、契約揭露與使用者告知。

3. 公開部署時，rate limiting 不應只是 fallback。
   - 公開 production 若缺 Upstash，濫用風險高的 endpoint 應 fail closed 或明確警示。

4. 新增營運 runbook。
   - 需要文件：LINE webhook 設定、資料庫 restore/export、照片 storage policy、cron 驗證、資安事件應變、使用者刪除請求處理。
   - 刪除請求要同時涵蓋 live database / storage、audit log、LINE push 記錄與已打包的歷史備份。歷史備份若不拆包修改，必須有刪除日誌、保留期限與到期覆蓋規則。
   - 第一版骨架已放在 `../operations/RUNBOOK.md`。

## Technical Debt

- 自動化測試已有第一批 helper tests，包含 pairing、origin check、cron security、rate limiter、photo magic-byte、audit metadata redaction 與 photo ownership。也已開始補 expense create route 與 LINE webhook 邊界測試。接下來補其他 route handler、photo signed URL ownership 與 E2E。測試目標見 `TESTING.md`。
- migration series 尚未建立。`supabase-schema.sql` 仍是 idempotent schema。
- Supabase RLS 尚未完成，目前仰賴 service-role + application checks。
- CI/CD 測試閘門尚未建立，Docker image 建置前仍缺強制測試。
- `/privacy`、`/terms`、ConsentModal 尚未切成中揚資訊正式法律主體版本。

## Deferred

- 拆分 `../security/SECURITY_AUDIT.md`。本輪先新增 `../security/SECURITY.md` 作為接手後的資安基準；原審計報告暫時保留原貌。
- 建立完整 design system。短期先整理輕量 UI / 文案規範。
- 建立完整 release automation。先從 `../releases/CHANGELOG.md` 與 PR template 開始。

## Won't Fix

- 不恢復 AI 醫療建議、診斷、治療建議或醫療分流。
- 不把 CareTaiwan 改成 EMR、HIS、醫療系統、長照 ERP、排班系統或薪資系統。
- 不保留 NAS POC 文件作為正式部署方向。正式部署以 VM / Docker 為主。
- 不把家屬端需求做成看護監控工具。

## Blocked

- 正式 GitHub organization 與 team 尚未建立；CODEOWNERS 草案已存在，但公開前仍要確認實際 owner。
- GitHub private vulnerability reporting 尚未確認啟用。
- VM 實際環境尚未選定，runbook 目前只能先寫供應商中立版本。
- 法律文件尚未由專業人士審閱。
- 第三方滲透測試尚未安排。

## 後續修正驗證清單

- `npm run docs:check`
- `npm run test`
- `npm run lint`
- `npm run build`
- 手動檢查 login、pairing、photo upload、expense creation、family expense review、LINE webhook mock events。
- Supabase SQL 先套用到 disposable project，再進 production。
- 大量變更後重新整理本機索引；本機指令放在 `AGENTS.local.md`，不要提交公開 repo。
