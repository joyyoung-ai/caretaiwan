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

目前角色待正式指定：

- Technical Lead：待指定。
- Product Owner：待指定。
- Security Contact：`services@joyyoung.com.tw`。若 GitHub private vulnerability reporting 已啟用，資安通報優先使用該管道。
- Legal / Privacy Contact：`services@joyyoung.com.tw` 作為暫定收件窗口，正式責任人待指定。
- Release Manager：待指定。

在 GitHub organization 與 team 建立前，不要在文件裡填寫不存在的帳號或 email。

Security Contact 已有對外信箱。正式公開 repository 前，仍建議確認 GitHub private vulnerability reporting 是否啟用，並確認 `services@joyyoung.com.tw` 的收件、分派與值班責任。

## Issue 與 PR

- 一般 bug、文件、功能討論：使用 GitHub Issues。
- Pull Request：依 [CONTRIBUTING.md](./CONTRIBUTING.md)。
- 資安問題：不要公開貼 token、LINE user ID、照片、備份檔或可識別個資。若 GitHub private vulnerability reporting 已啟用，請優先使用；否則寄到 `services@joyyoung.com.tw`。

## CODEOWNERS

`.github/CODEOWNERS` 目前先保留註解範本。正式 GitHub organization、team 與責任人建立後，再啟用實際 owner。

## Release

中揚資訊接手後的 release notes 以 [../releases/CHANGELOG.md](../releases/CHANGELOG.md) 為準。每次 release 至少要記錄：

- 新增功能。
- 修正 bug。
- 資安或隱私變更。
- migration 或部署變更。
- 已知限制。
