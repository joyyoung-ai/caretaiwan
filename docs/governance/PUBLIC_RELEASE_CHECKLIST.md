# Public Release Checklist

日期：2026-10-20

這份清單只處理 repository 公開前的檢查。它不代表正式 production 可以上線，也不會把 GitHub repository visibility 改成 public。公開動作仍需要 maintainer 明確核准。

## Owner Decisions

已決定：

- License：MIT。保留原作者 copyright，並把中揚資訊股份有限公司後續維護修改列入同一份 MIT license。
- Security reporting：GitHub private vulnerability reporting 尚未啟用前，使用 `services@joyyoung.com.tw`。
- Screenshots：第一版公開 release 不放 screenshots。之後若要補，只能使用匿名或合成資料。
- Maintainer mode：目前採 single-maintainer mode，由廖俊雄（軟體部經理，GitHub login email：`cosmos@joyyoung.com.tw`）負責 Technical Lead、Product Owner、Release Manager 與 GitHub / 技術初步處理。資安長鄧榮駐與法務窗口蔡雅雯透過公司內部流程作為 escalation / review，不需要 GitHub 帳號。

公開前確認與公開切換安排：

- 保留目前 single-maintainer mode，不以尚未建立的 team 或 CODEOWNERS 作為公開條件。
- 私人通報入口已有 `services@joyyoung.com.tw`。GitHub private vulnerability reporting 是公開儲存庫功能，列為公開切換後立即啟用的項目，不能要求先在私人儲存庫完成。[官方說明](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/configure-vulnerability-reporting/configure-for-a-repository)
- 2026-10-20 實際查核：repository 仍為 private；分支保護與規則集的讀取回應指出，目前方案需升級或改為公開才可使用。公開儲存庫可使用免費方案的分支保護，不必為這次開源先升級付費方案。[官方說明](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- 主分支保護設定已準備在 [public-branch-protection.json](./public-branch-protection.json)，公開後立即套用並讀回確認。規則要求 GitHub Actions 的 `Test Gate` 通過、禁止強制推送與刪除，並套用到管理員。
- 若改成 team mode，公開前需更新 GitHub organization、team、CODEOWNERS、branch protection 與 review 規則。
- 若要啟用 CODEOWNERS，先確認可被 GitHub tag 的 username 或 team slug；GitHub login email 不一定能直接放進 `.github/CODEOWNERS`。

GitHub private vulnerability reporting 啟用步驟（公開切換後）：

1. 由 repository owner、organization owner、security manager 或 admin role 登入 GitHub。
2. 進入 `joyyoung-ai/caretaiwan` repository。
3. 開啟 `Settings`。
4. 在 sidebar 的 `Security and quality` 區塊點 `Advanced Security`。
5. 在 `Private vulnerability reporting` 旁點 `Enable`。
6. 啟用後，確認 security contact 或 maintainer 有訂閱 repository 的 `Security alerts` 通知。

Maintainer / release manager 確認方式：

1. Technical Lead / Product Owner / Release Manager：目前由廖俊雄兼任，負責 code owner、architecture、schema / migration、roadmap、產品邊界、release checklist、tag、production image 與 rollback 紀錄。
2. Security Contact：`services@joyyoung.com.tw` 是公開入口，廖俊雄負責 GitHub / 技術初步處理，必要時升級給資安長鄧榮駐。
3. Legal / Privacy Contact：涉及條款、隱私、資料保留、刪除請求或個資事件時，升級給蔡雅雯。
4. 單一維護者模式先使用已準備的主分支保護設定。之後若建立正式 team，再更新 `.github/CODEOWNERS` 與必要批准數量。
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

## 2026-10-20 Hygiene Review

- 使用 Gitleaks 8.30.1 官方二進位檔，先核對下載檔的 SHA-256（安全雜湊演算法 256 位元）校驗碼。
- 目前檔案掃描以 Git 追蹤中的檔案為範圍，另包含本次新增的公開文件與測試，不把本機環境檔、工具快取或資料目錄打包成公開產物。
- 歷史掃描涵蓋所有本機可見分支與完整歷史，包含合併差異；原始基準為 `5af8d348f05f8e080e39910d73d0c33f8066fed4`。掃描無密鑰發現，不需要輪替憑證或重寫歷史。
- 另複核 Postgres 連線字串、LINE 識別碼與環境變數範例；命中為本機範例、明確假的測試識別碼或空白設定。
- 人工讀取 `demo/index.html`：資料直接寫在示意常數中，檔案的描述與畫面均標明示意資料、無真實個資。示範姓名與電話是樣本聯絡資訊；未發現外部照護資料匯入。保留原作者的歷史示意內容，不新增真實資料或照片。
- 實際檢視三個追蹤中的 PNG（可攜式網路圖形）圖片，均為應用程式圖示，沒有使用者照片或照護截圖。
- `.dockerignore` 已排除環境檔、私鑰、本機代理筆記、測試輸出與工具快取，避免把這些內容送進容器建置。
- GitHub Actions 已加入固定版本並核對校驗碼的歷史密鑰掃描，掃描失敗會阻擋同一個 `Test Gate`。

可重複執行的歷史掃描：

```bash
gitleaks git --redact --log-opts="--all --full-history -m" --no-banner .
```

Gitleaks 不會證明所有個資都不存在，因此仍需保留示範內容與圖片的人工複核。不要把可能包含敏感資料的原始報告提交到 repository。

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
npm ci
npm run lockfile:check
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

若有 migration，另在一次性或 staging Postgres 實際演練 forward / rollback。只通過檔案檢查不能標成完成；不要求為了開源另外建立正式 staging 服務。

本輪套件更新與局部相依替換的原因、測試邊界見 [DEPENDENCY_POLICY.md](../security/DEPENDENCY_POLICY.md)。

2026-10-20 本機驗證結果（Node.js 24.12.0 / npm 11.21.1）：

| 項目 | 結果 |
| --- | --- |
| 乾淨安裝與鎖定檔一致性 | 通過 |
| 完整套件安全稽核 | 0 個漏洞項目 |
| 程式碼與文件連結檢查 | 通過 |
| 遷移檔案檢查 | 通過 |
| 單元與介面測試 | 44 個測試檔，199 個測試全數通過 |
| 正式建置與基本頁面測試 | 通過 |
| 桌機與手機瀏覽器測試 | 8 個測試全數通過 |
| Docker 建置與執行 | Node.js 22 映像建置成功；非管理員執行、公開頁、工作階段去識別化與安全標頭檢查通過 |
| Postgres 16 實際演練 | 初始化、正向遷移、資料列安全性、回滾隔離與重新套用均通過；測試容器已移除 |
| 目前檔案與完整歷史密鑰掃描 | Gitleaks 無發現 |

上述結果代表本輪技術準備完成。維護者公開前仍要確認相同提交的 GitHub Actions 結果，並核准下方公開切換；不把來源碼可公開視為正式服務已可上線。

## Public Cutover

以下操作由維護者在審閱修補、將修補合併到 `main`、確認 `main` 最新提交已通過完整檢查並核准公開後執行。公開準備不會自動執行這些寫入，不得公開尚未包含本次修補的舊主分支。

先準備好主分支設定檔，核對目標提交與 GitHub Actions 結果，並確認資安信箱有人收件。公開後依序套用分支保護、啟用私人漏洞通報，再讀回確認，避免留下未設定的公開儲存庫。

從 repository 根目錄執行：

```bash
set -euo pipefail
gh repo edit joyyoung-ai/caretaiwan --visibility public --accept-visibility-change-consequences
gh api --method PUT repos/joyyoung-ai/caretaiwan/branches/main/protection --input docs/governance/public-branch-protection.json
gh api --method PUT repos/joyyoung-ai/caretaiwan/private-vulnerability-reporting
gh api repos/joyyoung-ai/caretaiwan/branches/main/protection
gh api repos/joyyoung-ai/caretaiwan/private-vulnerability-reporting
```

確認狀態檢查來源為 GitHub Actions、必要檢查是 `Test Gate`、強制推送與刪除均禁止，且私人漏洞通報回傳 `enabled: true`。若任一步失敗，停止後續發布，依下方回應流程處理，不把這次切換標成完成。

## Accidental Public Response

若 repository 在 readiness 完成前誤設為 public：

1. 立即改回 private。
2. 停止使用可能外洩的 token、DB password、LINE secret、photo signing secret 與 deploy key。
3. 執行 current tree 與 git history scan。
4. 先 rotate / revoke，再處理 history rewrite 或 redaction。
5. 留內部 incident note，記錄時間、操作者、外洩範圍、處理動作與後續 owner。
