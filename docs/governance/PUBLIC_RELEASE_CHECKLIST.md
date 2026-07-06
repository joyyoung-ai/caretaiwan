# Public Release Checklist

日期：2026-07-06

這份清單只處理 repository 公開前的檢查。它不代表正式 production 可以上線，也不會把 GitHub repository visibility 改成 public。公開動作仍需要 maintainer 明確核准。

## Owner Decisions

已決定：

- License：MIT。保留原作者 copyright，並把中揚資訊股份有限公司後續維護修改列入同一份 MIT license。
- Security reporting：GitHub private vulnerability reporting 尚未啟用前，使用 `services@joyyoung.com.tw`。
- Screenshots：第一版公開 release 不放 screenshots。之後若要補，只能使用匿名或合成資料。
- Maintainer mode：目前採 single-maintainer mode，由廖俊雄（軟體部經理，GitHub login email：`cosmos@joyyoung.com.tw`）負責 Technical Lead、Product Owner、Release Manager 與 GitHub / 技術初步處理。資安長鄧榮駐與法務窗口蔡雅雯透過公司內部流程作為 escalation / review，不需要 GitHub 帳號。

公開前仍需確認：

- GitHub private vulnerability reporting 是否已在 repository 後台啟用。
- 是否維持 single-maintainer mode，或改成 GitHub team mode。
- 若維持 single-maintainer mode，確認 branch protection 至少阻擋 force push，並要求 CI 通過後再 merge / deploy。
- 若改成 team mode，公開前需更新 GitHub organization、team、CODEOWNERS、branch protection 與 review 規則。
- 若要啟用 CODEOWNERS，先確認可被 GitHub tag 的 username 或 team slug；GitHub login email 不一定能直接放進 `.github/CODEOWNERS`。

GitHub private vulnerability reporting 啟用步驟：

1. 由 repository owner、organization owner、security manager 或 admin role 登入 GitHub。
2. 進入 `joyyoung-ai/caretaiwan` repository。
3. 開啟 `Settings`。
4. 在 sidebar 的 `Security` 區塊點 `Advanced Security`。
5. 在 `Private vulnerability reporting` 旁點 `Enable`。
6. 啟用後，確認 security contact 或 maintainer 有訂閱 repository 的 `Security alerts` 通知。

Maintainer / release manager 確認方式：

1. Technical Lead / Product Owner / Release Manager：目前由廖俊雄兼任，負責 code owner、architecture、schema / migration、roadmap、產品邊界、release checklist、tag、production image 與 rollback 紀錄。
2. Security Contact：`services@joyyoung.com.tw` 是公開入口，廖俊雄負責 GitHub / 技術初步處理，必要時升級給資安長鄧榮駐。
3. Legal / Privacy Contact：涉及條款、隱私、資料保留、刪除請求或個資事件時，升級給蔡雅雯。
4. 在 GitHub organization 建立對應 team 後，更新 `.github/CODEOWNERS`，再啟用 branch protection 要求 PR review 與 CI 通過。
5. 若上述名單有異動，先同步回 [MAINTAINERS.md](./MAINTAINERS.md)，再進行公開。

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

2026-07-06 嚴格複查結果：

- current tree 檔名掃描命中範例 env、schema / migration SQL 與 PWA icon，未命中 `.pem`、`.key`、`.p12`、`.crt`、`.log`、`.dump`、`.backup`、壓縮備份或使用者照片檔。
- current tree high-risk pattern 命中集中在 `.env.example`、README / README.zh-TW local Postgres 範例、`docker/.env.production.example`、release checklist、測試用 signed photo URL、測試用 LINE user ID 與 DB error redaction 測試。
- git history high-risk pattern 命中為上述範例 / 測試內容在不同 commit 的歷史版本；另有舊 Supabase service-role 文件與舊診斷 route 讀取 env 狀態的程式碼，未確認到實際 secret 值。
- 嚴格 token 格式掃描未命中 private key、GitHub token、OpenAI key、AWS / GCP token 或 Slack token。
- PII 粗掃命中多數為產品文案、法務文字、測試 LINE ID 與 `demo/index.html` 的合成示範長者資料。公開前若保留 demo，maintainer 需再人工確認 demo 內容確定是合成資料。
- 本機未安裝 `gitleaks` 或 `trufflehog`；若公開前環境允許，建議再用其中一套工具跑一次 history scan 作為第二來源。

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
