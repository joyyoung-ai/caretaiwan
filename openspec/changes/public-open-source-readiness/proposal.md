## Why

CareTaiwan 準備朝公開開源前進，但這個專案處理照護、照片、LINE identifiers、audit log、部署密鑰與可能被誤解為醫療建議的文字。若只把 GitHub repository visibility 改成 public，容易留下三類風險：洩漏 secret 或個資、讓外部使用者用錯未完成的 production 能力、以及公開 issue / logs 中出現照護個資。

這個 change 先建立公開開源前的 readiness scope。它不直接切換 repository visibility，也不承諾目前版本已可正式 production 上線。

## What Changes

- 新增 public open-source readiness gate：
  - 公開前必須完成 current tree 與 git history secret / PII scan。
  - 若發現任何已提交 secret，必須先 rotate / revoke，再處理清除與文件紀錄。
  - 公開前必須確認 `.env*`、logs、fixtures、screenshots、demo data、migration comments 與文件沒有真實照護個資。
- 補齊 public-facing 文件範圍：
  - README / quick start 要能讓外部開發者不用真實 LINE、production Postgres 或真實照片資料就能理解與啟動專案。
  - 文件要明確說明 CareTaiwan 不是醫療建議、診斷、治療、分流或保證送達系統。
  - production limitations 要明列 VM local photo storage、single-node 限制、Postgres migration / backup、LINE delivery 與提醒失敗顯示限制。
- 新增或更新 governance / security 文件：
  - `SECURITY.md` 要提供 vulnerability reporting channel，並要求不要公開貼上個資、LINE IDs、照片 URL、token 或照護紀錄。
  - issue templates 要提示使用者移除個資，bug report 要用 redacted logs。
  - contribution / code of conduct / license 決策要在公開前完成。
- 建立 release / visibility checklist：
  - CI、docs check、migration check、lint、test、build 與 smoke gate 要有明確執行方式。
  - 公開 repository 前需要 maintainer review checklist，不由單一技術變更順手完成。

明確排除：

- 這個 change 不把 repository 改成 public。
- 不新增 production VM、DNS、TLS、backup storage 或 monitoring。
- 不實作提醒 runtime、LINE Bot production credentials 或醫療文案生成。
- 不重新設計 data layer、storage layer、auth 或配對模型。
- 不承諾公開後接受外部資料託管或 SaaS 服務。

## Capabilities

### New Capabilities

- `open-source-readiness`: 定義 CareTaiwan repository 公開開源前的 secret / PII hygiene、public docs、security reporting、issue safety、production limitation disclosure 與 visibility approval gate。

### Modified Capabilities

- `documentation-governance`: 公開文件與治理文件需符合 open-source readiness 要求。
- `security-operations`: vulnerability reporting、secret rotation、redacted evidence 與 public issue hygiene 需在公開前具備。

## Impact

- Affected documentation in later implementation PRs:
  - `README.md`
  - `README.zh-TW.md` or equivalent Traditional Chinese public README
  - `SECURITY.md`
  - `CONTRIBUTING.md`
  - `CODE_OF_CONDUCT.md`
  - `LICENSE`
  - `.github/ISSUE_TEMPLATE/*`
  - `docs/governance/KNOWN_LIMITATIONS.md`
  - `docs/operations/RUNBOOK.md`
  - `docs/engineering/TESTING.md`
  - `docs/releases/CHANGELOG.md`
- Affected verification:
  - secret / PII scan for current tree and git history
  - docs link / public wording checks
  - existing CI-style commands before repository visibility change
- Affected operational decisions:
  - license choice
  - security contact channel
  - public demo boundaries
  - whether to publish anonymized screenshots or keep the first public release text-only
