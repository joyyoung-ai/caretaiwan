# CareTaiwan 接手維護改善規劃

日期：2026-06-30

本文件是 GitHub 分支接手後的第一版維護待辦。內容來自專案結構檢查、`npm run lint`、`npm run build`、codebase-memory-mcp 索引，以及對 auth、pairing、Supabase、LINE Bot、照片上傳、cron、README 與 schema 邊界的重點審視。

維護單位：中揚資訊股份有限公司。

接手脈絡：原作者在停止線上服務後將專案開源。後續維護必須保留原作者記錄下來的精神：照顧台灣外籍家庭看護的真實使用情境、低摩擦紀錄、由看護主動控制分享、重視隱私與資安，以及不發布未經專業審查醫療建議的決定。原作者遇到的困難也應被視為維護風險的一部分：個人維護能量有限、個資法與合規負擔、資安修補、使用者支援、營運成本、醫療內容法律責任，以及在權力不對等工作環境中直接接觸看護做研究的困難。詳見 `FORK_NOTICE.md`。

## 目前基準

- Build：`npm run build` 可在 Next.js 16.2.6 通過。
- Lint：`npm run lint` 可通過，但仍有 9 個 warning。
- 測試：目前沒有自動化測試套件。
- Memory index：`Users-mark-Documents-caretaiwan-repo`，776 nodes / 1560 edges，狀態 ready。
- 工作樹：除本次文件修改外，已有其他未提交變更。

## P0：接手前置工作

1. 保持授權與分支狀態一致。
   - 證據：原始文件曾出現維護狀態與授權描述不一致。
   - 風險：授權或維護狀態模糊會阻礙後續重用與貢獻。
   - 修法：讓 README、package metadata、GitHub repository 設定與 `FORK_NOTICE.md` 對齊同一套授權與分支維護狀態。

2. 新增 `.env.example`。
   - 證據：安裝文件提到 `.env.example`，但 repo 內沒有此檔。
   - 風險：新維護者無法可靠 self-host 或測試整合。
   - 修法：新增不含秘密值的 `.env.example`，按 Auth、LINE、Supabase、cron、Redis、preview hosts、本機照片儲存分組。

3. 保持分支服務狀態文字清楚。
   - 證據：README 說原服務已封存且停止維護，但此分支現在要接續維護。
   - 風險：貢獻者與使用者會收到互相矛盾的訊號。
   - 修法：明確區分「原線上服務已停止」與「此分支由中揚資訊股份有限公司接手維護」，並保留原作者署名、原型限制與合規警示。

## P1：可能 Bug / 執行期風險

1. 資料保留 cron 在 JSON response 中回傳原始 LINE user ID。
   - 證據：`src/app/api/cron/data-retention/route.ts` 的 `results` 會回傳 `lineUserId`。
   - 風險：cron log 或 dashboard 可能保留穩定識別碼。
   - 修法：response 只回傳統計與遮蔽後 sample；完整 ID 只在必要時留於 server-side audit log。

2. 資料保留 cron 使用一般字串比較 bearer token。
   - 證據：目前使用 `bearer !== secret`。
   - 風險：低風險但可避免的管理端點 timing side channel。
   - 修法：比較固定長度 hash，或使用 `crypto.timingSafeEqual`。

3. 資料保留 cron 在確認雲端備份刪除成功前先刪配對資料。
   - 證據：流程先刪 `elder_pairings`，再刪 `cloud_backups`。
   - 風險：部分失敗時可能刪掉配對狀態，但備份資料仍留下。
   - 修法：先刪 backup 再刪 pairing，或改用 database RPC / transaction 做原子清理。

4. README 仍有移除醫療情境內容後的殘留描述。
   - 證據：英文 README 後段仍提到 medical content scenarios cite sources，但前段已說明醫療建議已移除。
   - 風險：產品範圍與法律定位會被誤解。
   - 修法：改寫 acknowledgments，說明歷史研究影響產品決策，但目前不發布醫療情境或醫療建議。

5. Origin allowlist 寫死舊 production domain。
   - 證據：`src/lib/origin-check.ts` production hosts 包含 `caretaiwan.app`、`www.caretaiwan.app`、`caretaiwan.vercel.app`。
   - 風險：分支部署後，POST / PII GET 可能因 host 不在 allowlist 而失敗。
   - 修法：production hosts 改為環境變數驅動，並在 `.env.example` 提供範例。

## P2：品質與可維護性

1. 清理目前 lint warnings。
   - 目前 warning：
     - backup、card、family expense、home、tutorial、consent modal 有未使用變數或 import。
     - `src/app/card/page.tsx` 有 `useEffect` dependency warning。
     - 部分 `<img>` 警告需判斷是否改用 Next Image，或保留並明確註解。
   - 修法：移除未使用 symbols、穩定 callback / dependency array，並記錄刻意保留 `<img>` 的理由。

2. 建立最小自動化測試。
   - 優先測試：
     - pairing code TTL 與禁止 self-pairing。
     - `checkSameOrigin` / `checkSameOriginGet` host 行為。
     - rate limiter fallback 與 Upstash error fallback。
     - photo magic-byte detection。
     - audit metadata redaction。
   - 建議工具：純 helper 先用 Vitest；route handler 測試等 env mocking 穩定後再加。

3. 拆分部署 profile。
   - 需要本機 demo、Vercel preview、分支正式環境、本機 Docker 等設定輪廓。
   - 舊 `caretaiwan.app` 假設應明確標為 legacy default。

4. 建立資料庫 migration 紀律。
   - `supabase-schema.sql` 是 idempotent，但不是 migration series。
   - production 前應新增 `supabase/migrations/` 或記錄清楚 migration 順序。

## P3：產品與合規待辦

1. 重新評估 Supabase RLS。
   - 目前架構仰賴 service-role 加 application checks。
   - 若公開營運，應逐步改成 RLS、scoped JWT 或 RPC。

2. 將 rate limiting 從「可 fallback」提升為公開部署必要條件。
   - 公開 production 若缺 Upstash，濫用風險高的 endpoint 應 fail closed 或明確警示。

3. 重新整理分支營運方的隱私權政策與服務條款。
   - 目前文字仍參照原服務營運與原接觸窗口。
   - 中揚資訊股份有限公司需要自己的法律主體、聯絡方式、資料處理者、保留政策與事件處理流程。

4. 新增營運 runbook。
   - 需要文件：LINE webhook 設定、Supabase restore/export、照片 storage bucket policy、cron 驗證、資安事件應變、使用者刪除請求處理。

## 後續修正驗證清單

- `npm run lint`
- `npm run build`
- 手動檢查 login、pairing、photo upload、expense creation、family expense review、LINE webhook mock events。
- Supabase SQL 先套用到 disposable project，再進 production。
- 大量變更後重新索引 codebase-memory-mcp：

```bash
/Users/mark/.local/bin/codebase-memory-mcp cli --progress index_repository '{"repo_path":"/Users/mark/Documents/caretaiwan/repo"}'
```
