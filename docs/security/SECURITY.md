# CareTaiwan 資安基準

日期：2026-07-01

這份文件是中揚資訊接手後的資安整理。原作者階段的審計紀錄保留在 [SECURITY_AUDIT.md](./SECURITY_AUDIT.md)。

## Reporting a Vulnerability

請不要在 public issue 張貼漏洞細節、token、LINE user ID、照片、備份檔、完整 log 或可識別個資。

目前通報方式：

- Security email：`services@joyyoung.com.tw`。
- GitHub private vulnerability reporting：若正式 repository 已啟用，請優先使用該管道。

若無法使用 GitHub private vulnerability reporting，請寄到 `services@joyyoung.com.tw`。公開 issue 只適合留下「需要私下回報資安問題」這類簡短訊息，不要附漏洞細節。

GitHub private vulnerability reporting 尚未確認啟用前，`services@joyyoung.com.tw` 是本 repository 的正式對外資安通報窗口。

回報時請包含：

- 受影響的 endpoint、檔案或流程。
- 重現步驟。
- 影響範圍。
- 是否涉及 PII、LINE ID、照片 URL、備份檔、token 或 service-role key。
- 你是否已經能存取不屬於自己的資料。

## Supported Versions

目前尚未發布正式 production 版本。中揚資訊接手後的維護版本以 [../releases/CHANGELOG.md](../releases/CHANGELOG.md) 為準。

正式 release policy 建立前：

- 原作者已停止的 `caretaiwan.app` 線上服務不在支援範圍。
- 本 repository 的 `main` 分支視為目前維護基準。
- demo / legacy prototype 僅供歷史參考，不保證修補。

## Response Target

正式 SLA 尚未建立。公開維護初期的目標如下：

- Acknowledgement：3 個工作天內。
- Initial assessment：7 個工作天內。
- Fix / disclosure timeline：依風險與影響範圍個案處理。

若漏洞涉及可大量讀取、修改、刪除個資，或可取得 token / service-role key，應優先處理並先降低暴露面。

## Security Baseline

- 所有照護紀錄、長者卡、照片、LINE ID、顯示名稱與 audit metadata 都當成敏感資料。
- service-role key 只能留在 server-side。
- API route 必須自行檢查 ownership / role。
- 會改變狀態的 route 要做 same-origin 檢查。
- 重要 endpoint 要有 rate limit。
- LINE webhook 要先驗簽。
- public response、client log、LINE push log、audit metadata 預設不放完整 PII。
- 新增資料表要說明保留期限、刪除流程、可讀寫角色與 right-to-erasure。

## OWASP 對照

優先關注：

- Broken Access Control：pairing、family view、photo signed URL、cloud backup。
- Cryptographic Failures：secret management、backup encryption、signed URL。
- Injection：使用者可控 JSON、文字欄位、資料匯入。
- Insecure Design：醫療建議、群組推播、刪除請求與備份。
- Security Misconfiguration：VM firewall、public DB port、headers、env 洩漏。
- Identification and Authentication Failures：Auth.js session、LINE Login callback。
- Software and Data Integrity Failures：CI/CD、Docker image、dependency update。
- Security Logging and Monitoring Failures：audit log、incident runbook、log redaction。

## Threat Model

主要威脅：

- 家屬或看護看到不該看的長者資料。
- 攻擊者取得 LINE user ID、照片 URL、健康備註或備份檔。
- webhook 被偽造事件觸發。
- cron 或管理 endpoint 被猜 token。
- 本機開發誤用 production token 或真實備份。
- 歷史備份保留時間過長，導致刪除請求失效。
- 醫療提醒文案被誤解成醫療指示。

目前先用 application-level checks 管控 ownership。若公開營運，應逐步評估 RLS、scoped JWT 或 database RPC。

## Incident Response

正式 runbook 尚未完成。最低要求：

1. 停止受影響 endpoint 或 token。
2. 輪替 LINE token、service-role key、cron secret、photo signing secret。
3. 保留必要 log，但先遮蔽 PII。
4. 釐清受影響資料範圍。
5. 通知維護窗口與法律 / 隱私負責人。
6. 判斷是否需要依法通知主管機關或使用者。
7. 完成修補後補 incident report 與後續預防項目。

不要在 GitHub public issue 貼出 token、LINE user ID、照片、備份檔、完整 log 或可識別個資。

## VM Security Baseline

正式 VM 不綁供應商，但必須符合：

- public network 只開反向代理與必要 app port。
- database / storage / Redis 不開 public port。
- SSH 走 VPN、bastion、固定 IP allowlist 或等效控管。
- 備份加密並離開原 VM。
- audit log 有保存期限、查閱權限與防竄改機制。
- 刪除請求要涵蓋 live data、audit log、push log 與歷史備份處理原則。
- Docker image 建置前要跑 lint 與自動化測試。
