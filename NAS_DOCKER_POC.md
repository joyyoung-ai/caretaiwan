# NAS Docker POC 維護說明

這份文件用來區分原作者原始碼與本地 NAS Docker POC 版本，避免後續維護時把兩者混在一起。

## 分支分工

- `upstream-main`
  - 對應原作者 GitHub repo 的 `origin/main`。
  - 用來查看原始狀態、比對 upstream 更新。
  - 不在這個分支放 NAS、Docker、POC 或公司接手修改。

- `nas-docker-poc`
  - 本地 NAS 部署與 POC 驗證分支。
  - 包含 Docker build、Synology NAS 部署、PostgreSQL/PostgREST 相容 Supabase REST、照片本機儲存、LINE callback host 修正、POC 自我配對與首頁身份切換等改動。
  - 部署到 `https://demo3.cosmosdesign.tw` 時，以這個分支為準。

## 目錄邊界

- `docker/`
  - Dockerfile、docker compose 範例、production env 範例。
  - `docker/*.tar` 是本機產物，已由 `.gitignore` 排除，不應提交。

- `src/lib/local-photo-storage.ts`
  - POC 用的本機照片儲存與簽名 URL，相容原本 Supabase Storage 使用情境。

- `src/app/api/photo/signed/[token]/route.ts`
  - POC 本機照片簽名 URL 讀取端點。

- `src/lib/pairing.ts`
  - `POC_ALLOW_SELF_PAIRING=true` 時允許單一 LINE 帳號同時扮演家屬與看護。
  - 這只適合 demo，正式環境應關閉。

## NAS 目前部署

- NAS 路徑：`/volume2/web/caretaiwan`
- 網域：`https://demo3.cosmosdesign.tw`
- App container：`caretaiwan`
- DB container：`caretaiwan-postgres`
- PostgREST container：`caretaiwan-postgrest`
- REST gateway container：`caretaiwan-supabase`
- App 對外 port：NAS `3033` proxy 到 container `3000`

## 維護流程

查看原作者原始碼：

```bash
git switch upstream-main
```

開發或部署 NAS POC：

```bash
git switch nas-docker-poc
npm run build
docker buildx build --platform linux/amd64 -f docker/Dockerfile -t caretaiwan:latest --load .
docker save caretaiwan:latest -o docker/caretaiwan.tar
```

如果原作者 repo 有更新，先在 `upstream-main` 更新，再 merge 或 cherry-pick 到 `nas-docker-poc`：

```bash
git switch upstream-main
git fetch origin
git merge --ff-only origin/main
git switch nas-docker-poc
git merge upstream-main
```

## 注意事項

- 不要把 `.env.production`、LINE secret、NAS 密碼、Docker image tar、npm cache 提交到 Git。
- 正式環境不要開 `POC_ALLOW_SELF_PAIRING=true`。
- PWA 裡做 LINE OAuth 可能因 callback 回到一般瀏覽器而失敗；POC 驗證請用同一個瀏覽器完成家屬端與看護端流程。
