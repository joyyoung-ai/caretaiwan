<!-- BEGIN:nextjs-agent-rules -->
# 這不是你以為熟悉的 Next.js

此版本包含破壞性變更；API、慣例與檔案結構都可能和既有經驗不同。撰寫程式碼前，先閱讀 `node_modules/next/dist/docs/` 中相關指南，並留意 deprecation notice。
<!-- END:nextjs-agent-rules -->

# AGENTS.md

## 專案概覽

CareTaiwan 是給台灣外籍家庭看護與家屬使用的 Next.js 16 / React 19 PWA。核心功能包含本機優先的照護紀錄、選擇性的 LINE 登入雲端備份、Supabase 儲存，以及家屬端 LINE Bot 推播。

這個分支由中揚資訊股份有限公司接手維護。後續修改必須保留原作者署名與原始專案精神：以看護使用情境為中心、低摩擦本機優先、分享必須明確同意、不做追蹤器、重視資安與隱私，且不加入未經專業審查的醫療建議。`FORK_NOTICE.md` 是接手維護脈絡的主要文件。

實際專案根目錄是目前這個 `repo/` 目錄，不是上一層 `/Users/mark/Documents/caretaiwan`。

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
npm run lint
npm run build
npm run dev
```

目前驗證基準：

- `npm run lint` 可通過，但仍有 warning。
- `npm run build` 可通過。
- 目前尚未建立專用自動化測試。

## 環境變數

常用環境變數：

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

不得把 service-role、Bot access token、cron secret 或 signing secret 暴露給 client component，也不得加上 `NEXT_PUBLIC_*`。

## 安全邊界

- 所有照護紀錄、長者卡、記帳紀錄、照片、LINE ID、顯示名稱與稽核 metadata 都視為敏感資料。
- 伺服器端 Supabase 目前使用 `SUPABASE_SERVICE_ROLE_KEY`；每個 API route 在讀寫資料前都必須自行檢查 ownership / role。
- 會改變狀態的 API route 應使用 `checkSameOrigin`。
- 讀取個資的 GET route 若預期由瀏覽器發起，應使用 `checkSameOriginGet`。
- 重要濫用風險面應使用 `rateLimitAsync`，不要只靠同步 fallback helper。
- LINE webhook 必須先驗簽，再處理事件。
- 照片上傳與 signed URL 流程必須保留 `record_photos` ownership metadata 檢查。
- 未經明確產品與法律確認，不得加入醫療建議、分流建議或治療建議。

## 程式碼規範

- 新增工具前，優先使用 `src/lib/*` 既有 helper。
- 明確維持 client/server 邊界。不得從 client component import `src/lib/supabase-server.ts`。
- API 回傳錯誤需保持淨化；詳細 DB 錯誤只應留在 server log 或已遮蔽的 audit metadata。
- 對匯入資料或使用者可控 JSON，使用結構化驗證或明確欄位 allowlist。
- 使用者可見文案以繁體中文為主；若涉及多語字典，再同步更新越南文、印尼文與英文。
- 工作樹存在無關未提交變更時，避免大型重構。

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
- `SECURITY_AUDIT.md`：既有資安稽核與延後項目。
- `FORK_NOTICE.md`：分支接手聲明、原作者脈絡與維護承諾。
- `BUGFIX_PLAN.md`：目前分支維護待辦。

## Codebase Memory MCP 索引

此 repo 在 codebase-memory-mcp 中的索引名稱：

```text
Users-mark-Documents-caretaiwan-repo
```

常用命令：

```bash
/Users/mark/.local/bin/codebase-memory-mcp cli list_projects
/Users/mark/.local/bin/codebase-memory-mcp cli index_status '{"project":"Users-mark-Documents-caretaiwan-repo"}'
/Users/mark/.local/bin/codebase-memory-mcp cli search_code '{"project":"Users-mark-Documents-caretaiwan-repo","pattern":"pairing"}'
/Users/mark/.local/bin/codebase-memory-mcp cli --progress index_repository '{"repo_path":"/Users/mark/Documents/caretaiwan/repo"}'
```

大量搬移檔案、加入主要功能或進行大型重構後，請重新索引。
