# CareTaiwan 部署指南

日期：2026-06-30

這份文件是中揚資訊接手後的部署整理。正式環境以 VM / Docker 容器化部署為方向，不綁定特定供應商。公有雲 VM、私有雲、主機代管或地端伺服器都可以，前提是符合 `../engineering/SYSTEM_ARCHITECTURE_PLAN.md` 裡的 VM 安全基準。

原作者的 Vercel 流程保留在本文後段，定位為「舊版原型參考」。新維護者不要把 Vercel 指令或原作者本機路徑當成正式部署流程。

正式 production 前，必須先完成 [RUNBOOK.md](./RUNBOOK.md) 裡標示的 Required Before Production。這份部署指南只能說明方向，不能取代實際維運手冊。

## 正式 VM 部署：Docker 容器化參考

目前 repo 內已有 `docker/` 目錄，可作為第一版 VM 部署參考。這還不是完整 production runbook，但比直接沿用 Vercel 筆記更接近後續正式環境。

### 1. VM 前置條件

- Linux VM 或等效伺服器環境。
- Docker Engine 與 Docker Compose。
- 反向代理，例如 Nginx、Caddy、Traefik 或既有企業閘道。
- TLS 憑證與正式網域。
- 防火牆採 deny-by-default，只開 HTTP / HTTPS 與必要管理入口。
- SSH 不對全網開放，管理入口應走 VPN、bastion host、固定來源 IP allowlist 或等效控管。
- 資料庫、Redis、檔案儲存與管理介面不得直接暴露到 public internet。

### 2. 建立 production env

在 VM 的部署目錄內複製範例檔：

```bash
cp docker/.env.production.example docker/.env.production
```

填入正式值。至少要確認：

- `PUBLIC_APP_URL`：正式對外網址，例如 `https://example.com`。
- `PRODUCTION_ALLOWED_HOSTS`：正式環境額外允許的 host，逗號分隔；沒有額外網域時可留空。
- Production origin allowlist 只接受上述正式 host 設定；localhost、preview host、Vercel host 或舊 `caretaiwan.app` 網域都不會自動放行，除非明確列入正式設定。
- `AUTH_SECRET`：正式環境專用，不可沿用開發值。
- `LINE_CHANNEL_ID` / `LINE_CHANNEL_SECRET`：LINE Login。
- `LINE_BOT_CHANNEL_SECRET` / `LINE_BOT_CHANNEL_ACCESS_TOKEN`：LINE Messaging API。
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`：若沿用 Supabase managed service。
- `CRON_SECRET`：cron endpoint 驗證。
- `LOCAL_PHOTO_SIGNING_SECRET`：若使用 VM 本機照片儲存。

新增或改名環境變數時，要同步更新：

- `.env.example`
- `docker/.env.production.example`
- `AGENTS.md`
- 本文件

### 3. 建置 image

在 repo 根目錄執行：

```bash
docker build -t caretaiwan:latest .
```

正式環境建議改用有版本號的 tag，例如 `caretaiwan:2026-06-30-1`，不要只靠 `latest` 追部署歷史。

### 4. 啟動服務

```bash
cd docker
docker compose up -d
docker compose ps
```

`docker/docker-compose.yml` 預設把容器內 `3000` 映射到 VM 的 `${APP_PORT:-3033}`。正式環境應由反向代理接到這個 port，不建議直接把 Node app port 當成對外入口。

### 5. 反向代理與 LINE 設定

反向代理至少要處理：

- HTTPS termination。
- `Host` header 保留原始網域。
- `X-Forwarded-Proto` / `X-Forwarded-For`。
- request body size limit，照片上傳路徑要另行評估。
- access / error log 輪替與保存。

LINE Developers 後台要設定：

- LINE Login callback URL。
- LINE Messaging API webhook URL。
- channel secret / access token 與 VM `.env.production` 對齊。

### 6. 資料庫與檔案儲存

正式資料庫路線尚未最終決定。短期只接受兩種清楚路線：

- VM app 連 managed Supabase Postgres / Storage。
- VM app 連自管 Postgres 與明確的 object storage / filesystem storage。

不要在 production 同時維護多套資料庫假設。若改成自管 Postgres，需要先補：

- migration 執行順序。
- backup / restore 流程。
- 權限與帳號分層。
- 監控與告警。
- 刪除請求與備份保存原則。

### 7. 備份、刪除請求與稽核

正式 VM 需要先有可操作的 runbook，再處理真實使用者資料。

最低要求：

- 資料庫與檔案備份要加密保存。
- 至少有一份備份離開原 VM。
- 定期做 restore drill。
- app audit log、reverse proxy log、系統登入紀錄要有保存期限與查閱權限。
- 使用者要求刪除資料時，live database / storage 要執行刪除；已打包的歷史備份原則上不直接拆包修改，但要在刪除日誌記錄請求，並在備份到期時自然覆蓋。若法律、合約或主管機關要求不同做法，以正式法務文件與 runbook 為準。

## 本機或測試環境

本機開發仍使用一般 Next.js 流程：

```bash
npm ci
cp .env.example .env.local
npm run dev
```

測試環境可以使用 Docker，但環境變數、LINE channel、資料庫與 webhook 不應共用 production 設定。

開發者在本機複製 `.env.example` 成 `.env.local` 後，只能填入開發或測試用設定。不要把 production 的真實個資備份檔、正式 `SUPABASE_SERVICE_ROLE_KEY`、LINE Bot access token、webhook secret 或正式 Channel ID 倒回本機測試。本機資料應使用假資料、去識別化資料，或專用測試 channel。

## 舊版原型參考：Vercel

以下流程只保留原作者原型部署的歷史脈絡。它可以用來理解早期專案如何跑起來，但不是中揚資訊正式環境的部署標準。

### Vercel CLI

```bash
npm install -g vercel
vercel
vercel --prod
```

### GitHub + Vercel

1. 在 GitHub 建立 repo。
2. 將程式推上 GitHub。
3. 到 Vercel 匯入 repo。
4. 在 Vercel project Settings 設定環境變數。

若未來仍要保留 Vercel preview，只能作為測試或 demo。正式環境的安全基準、資料保留、日誌保存、備份、刪除請求與事件處理，仍以 VM runbook 為準。

## 手機測試

部署後使用正式 HTTPS 網址測試 PWA：

### Android Chrome

1. 開網址。
2. 右上選單選「加到主畫面」。
3. 從桌面圖示開啟，確認全螢幕與離線行為。

### iOS Safari

1. 開網址。
2. 下方分享選「加入主畫面」。
3. 從桌面圖示開啟，確認基本頁面、登入、配對與離線畫面。

PWA 測試不能取代正式功能驗收。login、pairing、photo upload、family expense review、LINE webhook、資料刪除與 cron 都要另列檢查清單。
