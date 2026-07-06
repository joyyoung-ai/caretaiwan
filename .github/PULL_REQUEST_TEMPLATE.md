## 變更內容

請簡短說明這個 PR 改了什麼。

## 類型

- [ ] Bug fix
- [ ] Feature
- [ ] Documentation
- [ ] Refactor
- [ ] Security
- [ ] Migration / schema
- [ ] Deployment

## 風險檢查

- [ ] 沒有把 production secret、LINE token、DB URL、photo signing secret 或真實備份放進 repo。
- [ ] 沒有在 API response、client log、push log、audit metadata 或 raw provider error 輸出未遮蔽 PII。
- [ ] 沒有提交真實照護紀錄、照片、signed URL、LINE user ID 或可識別截圖。
- [ ] 若新增資料表或敏感欄位，已說明資料保留、刪除流程與可讀寫角色。
- [ ] 若涉及醫療相關提醒，文案沒有提供醫療判斷或醫療指示。
- [ ] 若涉及 migration，沒有修改已套用到 production 的 migration。

## 驗證

- [ ] `npm run docs:check`
- [ ] `npm run migrations:check`
- [ ] `npm run test`
- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] 手動測試：

## 文件

- [ ] README / docs 已更新或不需要更新。
- [ ] `docs/releases/CHANGELOG.md` 已更新或不需要更新。
- [ ] `docs/governance/DECISIONS.md` 已更新或不需要更新。
