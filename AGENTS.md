<!-- BEGIN:nextjs-agent-rules -->
# Next.js 16 注意事項

這個專案使用 Next.js 16。這個版本和較舊的 Next.js 在 API、檔案結構與慣例上有差異；如果要改 App Router、設定檔、快取、headers、middleware/proxy 或 build 行為，先看 `node_modules/next/dist/docs/` 裡對應的文件，不要只靠舊版經驗。
<!-- END:nextjs-agent-rules -->

# AGENTS.md

## 專案概覽

CareTaiwan 是給台灣外籍家庭看護與家屬使用的 Next.js 16 / React 19 PWA。重點是讓看護可以快速記錄、自己決定要不要分享，再透過 LINE 把必要資訊送到家屬端。

這個分支由中揚資訊股份有限公司接手維護。改文件或改程式時，不要抹掉原作者署名，也不要改掉專案原本的取向：看護端優先、低摩擦、本機優先、分享要明確同意、不做追蹤器，並且不加入未經專業審查的醫療建議。接手脈絡寫在 `docs/governance/FORK_NOTICE.md`。

## 技術棧

- 框架：Next.js 16 App Router，使用 Turbopack。
- UI：React 19、Tailwind CSS 4、Lucide React。
- 認證：Auth.js v5 beta，LINE provider。
- 資料：Supabase Postgres，伺服器端使用 service-role client。
- 推播：LINE Messaging API webhook 與 push API。
- PWA：手寫 service worker，位於 `public/sw.js`。
- 執行環境：需要 crypto、Auth.js、Supabase 或本機照片儲存的 API route 使用 Node.js。

## 常用命令

請從 `repo/` 執行命令。

```bash
npm run docs:check
npm run lint
npm run build
npm run dev
```

驗證原則：

- 文件-only PR 至少執行 `npm run docs:check`。
- 會碰到程式碼、schema、tests 或 package dependency 的 PR，再依風險執行 `npm run lint` 與 `npm run build`；若該 branch 已導入 test script，也要執行對應測試。
- 如果工作樹已有未提交工程修補，不要把那些修補的測試或 lint 狀態寫進文件-only PR。
- API route、LINE webhook、photo ownership 與 E2E 測試狀態以 `docs/engineering/TESTING.md` 和實際 PR 範圍為準。

## 環境變數

常用環境變數如下。新增設定時也要補到 `.env.example`：

- `AUTH_SECRET`
- `LINE_CHANNEL_ID`
- `LINE_CHANNEL_SECRET`
- `LINE_BOT_CHANNEL_SECRET`
- `LINE_BOT_CHANNEL_ACCESS_TOKEN`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `PREVIEW_ALLOWED_HOSTS`
- `LOCAL_PHOTO_STORAGE_DIR`
- `LOCAL_PHOTO_SIGNING_SECRET`
- `PUBLIC_APP_URL`
- `PRODUCTION_ALLOWED_HOSTS`

service-role、Bot access token、cron secret、signing secret 都只能留在伺服器端。不要放進 client component，也不要加上 `NEXT_PUBLIC_*`。

## 安全邊界

- 照護紀錄、長者卡、記帳紀錄、照片、LINE ID、顯示名稱與稽核 metadata 都當成敏感資料處理。
- 伺服器端 Supabase 目前使用 `SUPABASE_SERVICE_ROLE_KEY`；每個 API route 在讀寫資料前都要自行檢查 ownership / role。
- 會改變狀態的 API route 應使用 `checkSameOrigin`。
- 讀取個資的 GET route 若預期由瀏覽器發起，應使用 `checkSameOriginGet`。
- 重要濫用風險面應使用 `rateLimitAsync`，不要只靠同步 fallback helper。
- LINE webhook 必須先驗簽，再處理事件。
- 照片上傳與 signed URL 流程必須保留 `record_photos` ownership metadata 檢查。
- 產出任何涉及資料庫寫入、API response、LINE push、cron response 或 audit log 的程式碼時，要主動檢查是否意外輸出 PII。完整 LINE user ID、姓名、電話、照片 URL、醫療備註與自由文字 note 不應直接出現在公開 response、client log 或推播紀錄裡。
- 新增資料表或敏感欄位時，要在對應文件或 PR 說明資料保留期限、刪除流程、right-to-erasure 處理方式、可讀寫角色，以及是否需要遮蔽或 redaction。
- 未經明確產品與法律確認，不得加入醫療建議、分流建議或治療建議。

## 程式碼規範

- 新增工具前，優先使用 `src/lib/*` 既有 helper。
- 明確維持 client/server 邊界。不得從 client component import `src/lib/supabase-server.ts`。
- API 回傳錯誤要保持乾淨；詳細 DB 錯誤只留在 server log 或已遮蔽的 audit metadata。
- 對匯入資料或使用者可控 JSON，使用結構化驗證或明確欄位 allowlist。
- 使用者可見文案以繁體中文為主；若涉及多語字典，再同步更新越南文、印尼文與英文。
- 工作樹如果已有無關未提交變更，先把範圍切小，不要順手做大型重構。

## Repository Governance

- 產品定位以 `docs/governance/PROJECT_VISION.md` 為準。CareTaiwan 是外籍家庭看護與家屬之間的照護協作工具，不是 EMR、HIS、醫療系統、看護管理系統或長照 ERP。
- 改功能前先看 `docs/governance/KNOWN_LIMITATIONS.md`。列為限制或不做的項目，不要當成普通 bug 直接修。
- 大量重構、設計系統導入、資料庫策略改動、部署策略改動，都要先寫 issue 或 ADR，不要在修 bug 時順手做。
- 一次改動盡量只碰一個 module 或一條使用者流程。若必須跨多處，PR 說明要列清楚影響範圍。
- 不要順手改 coding style、formatting 或檔案結構。這類整理要獨立 PR。

## OpenSpec + Superpowers Workflow

- 本 repo 可使用 OpenSpec 管理規格、變更提案、design 與 tasks；可使用 Superpowers 作為 AI agent 的需求釐清、計畫、TDD、實作與檢查方法。
- OpenSpec 與 Superpowers 是協作工具，不是 CareTaiwan runtime dependency。不得加入 `package.json` 或 `package-lock.json`；未經維護者要求，不要執行 install 或 `openspec init`。
- 工具流程必須服從本 `AGENTS.md`、`docs/governance/PROJECT_VISION.md`、`docs/governance/KNOWN_LIMITATIONS.md`、`docs/governance/DECISIONS.md`、`docs/security/SECURITY.md` 與 `docs/governance/CONTRIBUTING.md`。
- 以下改動應先建立 OpenSpec change，經人類維護者確認後再實作：新功能、schema / migration、API ownership / role / auth、LINE webhook / push / reminder、PII、照片、備份、audit log、刪除請求、醫療相關文案或提醒、大型 refactor、部署策略。
- OpenSpec / Superpowers 不得被用來繞過產品邊界、資安邊界、醫療內容限制或 PR 規則。詳細流程見 `docs/engineering/AI_AGENT_WORKFLOW.md`。

## Pull Request Rules

- 一個 PR 只做一件事。
- Bug fix 不混 feature。
- Feature 不混 refactor。
- Documentation 不混 DB migration。
- Schema 變更不混 UI 大改。
- 資安修補要縮小 diff，並說明是否涉及 PII、LINE、照片、推播、audit log 或刪除請求。
- PR 應更新相關文件：`docs/releases/CHANGELOG.md`、`docs/governance/DECISIONS.md`、`docs/governance/KNOWN_LIMITATIONS.md`、`.env.example`、`docker/.env.production.example`。

## Definition of Done

- 變更範圍符合 `docs/governance/PROJECT_VISION.md`。
- 沒有把 feature、bug fix、refactor、migration、documentation 混成同一件事。
- 沒有輸出未遮蔽 PII 到 API response、client log、push log 或 audit metadata。
- 新增 env 時已同步 `.env.example`、`docker/.env.production.example` 與部署文件。
- 新增資料表或敏感欄位時，已說明保留期限、刪除流程、可讀寫角色與 right-to-erasure。
- 涉及醫療相關提醒時，文案沒有提供診斷、分流、治療、劑量或急迫性判斷。
- 文件連結已檢查，沒有指向不存在的路徑。
- 若變更會影響公開使用者，已更新 `docs/releases/CHANGELOG.md`。

## Migration Policy

- 正式 migration series 建立後，不得修改已套用到 production 的 migration，只能新增 migration。
- 會刪資料、改欄位型別、搬移 PII 或新增敏感表的 migration，要先寫風險說明與回滾策略。
- 新增資料表或敏感欄位時，必須說明資料保留期限、刪除流程、可讀寫角色、right-to-erasure 與是否需要 redaction。
- 目前 `supabase-schema.sql` 是 idempotent schema，不是正式 migration series。新增功能 schema 先寫草案，等 production 資料庫策略定下來再落 migration。

## 文件撰寫規範

中文文件、README、規劃文件、接手說明、release note 以及對外說明，撰寫或修改時都要套用 `Humanizer-zh-TW` 的原則。目標不是把文字寫得漂亮，而是讓它像真正的維護者寫的：直接、具體、讀起來順。

- 優先使用繁體中文。技術名詞、檔名、指令、API 名稱與環境變數可以保留原文。
- 少用模板句，例如「核心精神」「至關重要」「彰顯」「此外」「承諾」「不僅……而是……」。
- 避免宣傳稿語氣。不要把維護工作寫成口號，直接說目前狀態、原因、風險和下一步。
- 句子長短要有變化。能一句講完就不要拆成三段式排比。
- 保留具體細節，例如檔案路徑、環境變數、已知限制、原作者遇到的實際困難。
- 若是接手脈絡或產品邊界，語氣要像工程與營運交接文件，不要像品牌宣言。
- 修改完中文文件後，快速掃一次 AI 味詞與生硬句型；必要時再重寫，不要只做同義詞替換。

## 重要檔案

- `src/auth.ts`：Auth.js LINE provider 設定。
- `src/lib/supabase-server.ts`：僅限伺服器使用的 Supabase service-role client。
- `src/lib/origin-check.ts`：CSRF / same-origin 檢查。
- `src/lib/rate-limit.ts`：以 Upstash 支援的 rate limiter，含 in-memory fallback。
- `src/lib/pairing.ts`：長者、家屬、看護與 LINE 群組配對邏輯。
- `src/lib/record-photos.ts`：照片 ownership metadata。
- `src/lib/local-photo-storage.ts`：本機檔案系統照片儲存與 signed access。
- `src/app/api/line/webhook/route.ts`：LINE Bot webhook。
- `src/app/api/photo/upload/route.ts`：登入後照片上傳。
- `src/app/api/cron/data-retention/route.ts`：資料保留期限警告與刪除 cron。
- `supabase-schema.sql`：資料庫 schema 與 idempotent migration。
- `docs/security/SECURITY_AUDIT.md`：既有資安稽核與延後項目。
- `docs/governance/FORK_NOTICE.md`：分支接手聲明、原作者脈絡與維護原則。
- `docs/engineering/BUGFIX_PLAN.md`：目前分支維護待辦。
- `docs/engineering/SYSTEM_ARCHITECTURE_PLAN.md`：接手後的第一版系統架構整理。改資料庫、部署、API 邊界或設計規範前先看這份。
- `docs/product/USER_REQUIREMENTS.md`：接手後收到的使用者需求。新功能先寫到這裡，確認範圍後再動 schema 或 UI。
- `docs/operations/DEPLOY.md`：部署參考。正式環境以 VM 為方向，Vercel 段落只作原作者部署方式參考。
- `docs/operations/FAMILY_SIDE_SETUP.md`：LINE Bot 與家屬端配對設定參考。
- `docs/governance/PROJECT_VISION.md`：產品定位、優先順序與不做的事。
- `docs/governance/CONTRIBUTING.md`：開源貢獻、branch、PR、migration 規則。
- `docs/product/ROADMAP.md`：產品 Roadmap。
- `docs/governance/DECISIONS.md`：ADR 與重要決策。
- `docs/governance/KNOWN_LIMITATIONS.md`：已知限制，哪些不是 bug。
- `docs/security/SECURITY.md`：接手後的資安基準、威脅模型與事件處理。
- `.github/`：Issue template、PR template、CODEOWNERS 草案。
- `docker/`：正式 VM 可參考的 Docker 部署範例。`docker/*.tar` 是本機產物，不應提交。

## 本機工具資訊

個人工作站路徑、MCP 索引名稱、私有指令與本機自動化設定，不應寫進公開文件。需要保留時，放在 `AGENTS.local.md`；該檔案已列入 `.gitignore`。
