# 套件更新與相容性檢查

更新日期：2026-10-20

開源前的套件檢查必須包含開發工具，不能只檢查部署時留下的套件，也不能提高漏洞門檻讓檢查變綠。`npm run audit` 維持原本的中風險以上阻擋規則。

## 執行環境

使用 Node.js 22.12 以上的 22.x 或 24.x 版本，以及 npm 11.21.1。本機、GitHub Actions 與 Docker 都使用相同 npm 版本。

npm 10.9.8 在這次更新的相依解算階段發生 `Cannot read properties of null (reading 'edgesOut')`，乾淨目錄也能重現，因此改用 npm 11.21.1。不要使用 `--force` 或 `--legacy-peer-deps` 繞過相依檢查。

Vitest 維持 4.x，測試用 Vite 明確選用相容的 7.x。這不會改變 Next.js 使用 Turbopack 建置的方式。

## Next.js lint 的 glob 相依替換

Next.js 16.4.2 的官方 lint 外掛仍依賴 `fast-glob`，後者透過 `micromatch` 引入尚無修補版的 `braces`。[漏洞公告](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)說明了深度巢狀樣式造成堆疊耗盡的問題。

本專案只在 `@next/eslint-plugin-next` 下，以 npm 套件別名將 `fast-glob` 換成 `tinyglobby@0.2.17`。替換的是開發工具的目錄搜尋相依；Next.js 本身、完整 lint 規則與稽核門檻都保留。

目前外掛實際使用的是 `globSync(pattern, { onlyDirectories: true })`。tinyglobby 提供這個介面，且本來就以相容 globby / fast-glob 的行為為目標。[套件說明](https://github.com/SuperchupuDev/tinyglobby)

`src/lib/next-lint-config.test.ts` 透過已安裝的 Next.js 外掛驗證：

- 未設定樣式時保留目前專案目錄。
- 搜尋結果只包含目錄，不會把普通檔案當作專案。
- 字串陣列與 Windows 路徑分隔符號可以使用。
- 實際執行 ESLint 時，仍會偵測由樣式找到的專案中的錯誤內部頁面連結。

搜尋結果可能使用相對路徑並附帶結尾斜線。測試會比較解析後的實際目錄，再驗證 Next.js 規則的回報，避免把純粹的字串格式差異當成功能錯誤。

更新 `eslint-config-next` 時，必須重跑這批測試與完整 lint。若上游移除有問題的相依，應移除這個局部替換，重新產生鎖定檔後再驗證。不要把這個替換擴大到其他套件，因為其他使用者可能需要不同的 fast-glob 介面。

ESLint 暫時保留 9.x，因為目前 React、import 與 JSX（JavaScript 語法擴充）無障礙檢查外掛的正式相容範圍仍以 9.x 為上限。乾淨安裝會顯示停止支援警告；目前套件稽核沒有漏洞項目，但這不代表 9.x 仍受上游維護。外掛正式支援 10.x 後應另行更新，不用忽略相依條件的方式強行升級。

## 更新後必跑

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

密鑰掃描與 GitHub 公開切換另見 [公開檢查清單](../governance/PUBLIC_RELEASE_CHECKLIST.md)。套件稽核是執行當下的結果，公開切換前必須重跑，不沿用數月前的成功紀錄。
