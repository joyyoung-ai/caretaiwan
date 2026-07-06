# CareTaiwan 維護者資訊

日期：2026-07-01

這份文件說明 repository 的維護責任。不要用它取代授權文件；授權仍以 [../../LICENSE](../../LICENSE) 為準。

## Original Author

- 原作者：GUOPEICHI（YuriCrystal）
- 原專案：CareTaiwan / caregiver-app
- 原作者階段：研究、原型、資安審計、MIT 開源、原線上服務停止維護。

後續文件與程式碼不得移除原作者署名、MIT 授權資訊、研究脈絡與停止維護原因。

## Maintained By

- 維護單位：中揚資訊股份有限公司
- 維護範圍：本分支的開源維護、文件治理、正式部署規劃、後續功能整理。
- 法律主體：正式服務上線前，隱私權政策與服務條款需切換為中揚資訊股份有限公司版本。
- 對外聯絡信箱：`services@joyyoung.com.tw`

## Roles

目前採 single-maintainer mode。GitHub repository、技術判斷、產品範圍與 release 先由同一位維護者負責；公司資安長與法務窗口作為內部 escalation / review，不需要 GitHub 帳號。

- Technical Lead：廖俊雄，軟體部經理（GitHub login email：`cosmos@joyyoung.com.tw`）。
- Product Owner：廖俊雄，軟體部經理。
- Release Manager：廖俊雄，軟體部經理。
- Security Contact primary：廖俊雄，負責 GitHub / 技術初步處理；對外入口仍為 `services@joyyoung.com.tw`。
- Security escalation：鄧榮駐，資安長，透過公司內部流程升級處理。
- Legal / Privacy Contact：蔡雅雯，公司法務窗口，透過公司內部流程處理隱私、條款與個資事件判斷。

在 GitHub organization 與 team 建立前，不要在文件裡填寫不存在的 GitHub team。若要啟用 CODEOWNERS，需先確認可被 GitHub tag 的 username 或 team slug；登入 email 不一定能放進 `.github/CODEOWNERS`。

Security Contact 已有對外信箱。正式公開 repository 前，仍建議確認 GitHub private vulnerability reporting 是否啟用，並確認 `services@joyyoung.com.tw` 的收件、分派與備援責任。

角色確認方式：

1. Technical Lead / Product Owner / Release Manager：目前由廖俊雄兼任。
2. Security Contact：`services@joyyoung.com.tw` 是公開入口，廖俊雄負責 GitHub / 技術初步處理，必要時升級給資安長鄧榮駐。
3. Legal / Privacy Contact：涉及條款、隱私、資料保留、刪除請求或個資事件時，升級給蔡雅雯。
4. GitHub team：未來若建立對應 team，再把 `.github/CODEOWNERS` 從註解範本改成實際 team。

## Issue 與 PR

- 一般 bug、文件、功能討論：使用 GitHub Issues。
- Pull Request：依 [CONTRIBUTING.md](./CONTRIBUTING.md)。
- 資安問題：不要公開貼 token、LINE user ID、照片、備份檔或可識別個資。若 GitHub private vulnerability reporting 已啟用，請優先使用；否則寄到 `services@joyyoung.com.tw`。

## CODEOWNERS

`.github/CODEOWNERS` 目前先保留註解範本。正式 GitHub organization、team 與責任人建立後，再啟用實際 owner。

## Release

中揚資訊接手後的 release 流程以 [RELEASE_PROCESS.md](./RELEASE_PROCESS.md) 為準，release notes 以 [../releases/CHANGELOG.md](../releases/CHANGELOG.md) 為準。每次 release 至少要記錄：

- 新增功能。
- 修正 bug。
- 資安或隱私變更。
- migration 或部署變更。
- 已知限制。
