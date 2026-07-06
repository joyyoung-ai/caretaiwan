# Public Release Checklist

日期：2026-07-06

這份清單只處理 repository 公開前的檢查。它不代表正式 production 可以上線，也不會把 GitHub repository visibility 改成 public。公開動作仍需要 maintainer 明確核准。

## Owner Decisions

公開前必須先決定：

- Open-source license。決定後新增 `LICENSE`，並確認 README 與 package metadata 對齊。
- GitHub private vulnerability reporting 是否啟用。未啟用前，`services@joyyoung.com.tw` 是資安通報窗口。
- 第一版公開 release 是否放 screenshots。若要放，只能使用匿名或合成資料。
- GitHub organization、team、CODEOWNERS、branch protection 與 release manager。

## Hygiene Scan

公開前要掃 current tree 與 git history。若命中真 secret、真個資、真照片、正式 DB URL、LINE token、signed URL 或未遮蔽 log，先 rotate / revoke，再決定是否需要 redaction 或 history rewrite。不要只刪目前檔案。

Current tree 檢查：

```bash
find . -path ./.git -prune -o -path ./node_modules -prune -o -path ./.next -prune -o -type f \( -name '.env*' -o -iname '*secret*' -o -iname '*token*' -o -iname '*.log' -o -iname '*.pem' -o -iname '*.key' -o -iname '*.p12' -o -iname '*.crt' -o -iname '*.png' -o -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.webp' \) -print

git grep -I -n -E "(BEGIN (RSA|OPENSSH|EC|DSA|PRIVATE) KEY|DATABASE_URL=[^[:space:]]+|postgres://[^[:space:]]+|postgresql://[^[:space:]]+|LINE_(CHANNEL|BOT)_[A-Z_]+=.+|CHANNEL_ACCESS_TOKEN=.+|CHANNEL_SECRET=.+|sk-[A-Za-z0-9]{20,}|xox[baprs]-[A-Za-z0-9-]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}|U[0-9a-f]{32}|C[0-9a-f]{32}|https?://[^[:space:]]*(token|signature|signed|X-Amz|access_token)[^[:space:]]*)" -- ':!package-lock.json'
```

Git history 檢查：

```bash
git grep -I -n -E "(BEGIN (RSA|OPENSSH|EC|DSA|PRIVATE) KEY|DATABASE_URL=[^[:space:]]+|postgres://[^[:space:]]+|postgresql://[^[:space:]]+|LINE_(CHANNEL|BOT)_[A-Z_]+=.+|CHANNEL_ACCESS_TOKEN=.+|CHANNEL_SECRET=.+|sk-[A-Za-z0-9]{20,}|xox[baprs]-[A-Za-z0-9-]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}|U[0-9a-f]{32}|C[0-9a-f]{32}|https?://[^[:space:]]*(token|signature|signed|X-Amz|access_token)[^[:space:]]*)" $(git rev-list --all) -- ':!package-lock.json'
```

2026-07-06 本機初掃結果：

- tracked image 類檔案只有 PWA icon：`public/apple-icon.png`、`public/icon-192.png`、`public/icon-512.png`。
- env 類檔案只有 `.env.example` 與 `docker/.env.production.example`。
- high-risk pattern 命中集中在範例 Postgres URL、測試 fake LINE user ID、測試 signed URL 與 direct Postgres 歷史實作計畫。
- 這次掃描未確認到需要立即 rotate 的真 secret；公開前仍要由 maintainer 複核完整輸出。

## Public Docs

公開前確認：

- README 與 `README.zh-TW.md` 說明 local Postgres、LINE 可先停用或 mock、VM local photo storage 只能用測試目錄。
- README 不要求外部 contributor 使用 production LINE、正式 DB、真照片或真照護紀錄。
- `docs/governance/KNOWN_LIMITATIONS.md` 明列 VM local photo storage、single-node storage、LINE delivery、reminder runtime 與 production runbook 限制。
- `docs/security/SECURITY.md` 要求不要在公開 issue 貼 token、LINE ID、照片、signed URL、DB URL、raw provider error 或照護個資。
- `.github/ISSUE_TEMPLATE/*` 要提醒使用去識別化資料。

## Verification Gate

公開前至少跑：

```bash
npm run audit
npm run lint
npm run docs:check
npm run migrations:check
npm run test
npm run build
npm run test:smoke
npm run test:e2e
git diff --check
```

若有 migration，另在 disposable 或 staging Postgres 演練 forward / rollback。若沒有實際 staging DB，不得把 checklist 標成完成。

## Accidental Public Response

若 repository 在 readiness 完成前誤設為 public：

1. 立即改回 private。
2. 停止使用可能外洩的 token、DB password、LINE secret、photo signing secret 與 deploy key。
3. 執行 current tree 與 git history scan。
4. 先 rotate / revoke，再處理 history rewrite 或 redaction。
5. 留內部 incident note，記錄時間、操作者、外洩範圍、處理動作與後續 owner。
