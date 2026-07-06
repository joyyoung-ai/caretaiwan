# 看護助手 CareTaiwan

**給台灣外籍家庭看護的長照日常記錄 PWA，搭配家屬端 LINE Bot 做即時更新。**

🌐 [English](./README.md) ｜ **繁體中文**

> [!NOTE]
> ## 目前分支狀態
>
> 這個分支現在由 **中揚資訊股份有限公司** 接手維護。原作者的研究脈絡會保留，但目前維護狀態與原本的線上服務不同。
>
> CareTaiwan 是台灣外籍家庭看護與家屬之間的照護協作工具。它不是 EMR、HIS、醫療器材、長照 ERP、排班薪資系統，也不是醫療分流工具。正式導入前，請先閱讀 [已知限制](./docs/governance/KNOWN_LIMITATIONS.md)。
>
> 中揚資訊接手後，會把這個原型往可維運、可稽核、可合規的方向整理。接手說明請見 [FORK_NOTICE.md](./docs/governance/FORK_NOTICE.md)。

> [!IMPORTANT]
> ## 原始上游狀態
>
> 原本運行於 `caretaiwan.app` 的線上服務已在 2026 年 6 月停止。原作者在停止服務後，以 MIT 授權釋出原始碼，原因是長期營運、合規、資安修補與使用者支援已超過個人 side project 能負擔的範圍。
>
> 這段狀態描述的是原始上游服務，不代表中揚資訊維護的這個 fork 已停止維護。

> [!NOTE]
> ## 原作者保留說明
>
> 原作者將這個專案定位為個人 side project、參考實作與作品集。原服務當時仍在朋友測試階段，原作者也說明沒有真實使用者資料受到影響。
>
> 下面保留原作者的第一人稱敘事，目的是讓讀者理解這個專案為什麼存在、服務誰，以及哪些邊界不能輕率跨越。

📄 **資安稽核**：[SECURITY_AUDIT.md](./docs/security/SECURITY_AUDIT.md)
📅 **開發**：2026-04 ／ 獨自一人、約 1 週 · **封存**：2026-06
🧭 **分支接手說明**：[FORK_NOTICE.md](./docs/governance/FORK_NOTICE.md)
🎮 **線上 demo**：**<https://caretaiwan-demo.vercel.app>** —— 一個自帶資料、可點擊的單檔原型（示意資料、零後端），呈現看護端與家屬端。線上服務已下線，這個 demo 就是它原本運作的樣子。原始碼在 [`/demo`](./demo)。

## 維護分支快速導覽

- **這個 fork 是什麼**：台灣外籍家庭看護與家屬之間的照護協作工具。
- **這個 fork 不是什麼**：不是 EMR、HIS、醫療器材、長照 ERP、排班薪資系統，也不是醫療分流工具。
- **本機啟動**：執行 `npm ci`，把 `.env.example` 複製成 `.env.local`，填入測試用 secret，再執行 `npm run dev`。
- **正式部署方向**：VM / Docker，不綁定特定供應商。請看 [DEPLOY.md](./docs/operations/DEPLOY.md) 與 [RUNBOOK.md](./docs/operations/RUNBOOK.md)。
- **已知限制**：回報 bug 前，先看 [KNOWN_LIMITATIONS.md](./docs/governance/KNOWN_LIMITATIONS.md)。
- **資安與支援**：漏洞通報看 [SECURITY.md](./SECURITY.md)，支援邊界看 [SUPPORT.md](./SUPPORT.md)。

## Repository Governance

中揚資訊接手後的治理文件放在 [`docs/`](./docs/README.md)：

- [專案願景](./docs/governance/PROJECT_VISION.md)：產品定位、優先順序與不做的事。
- [已知限制](./docs/governance/KNOWN_LIMITATIONS.md)：哪些限制不是 bug。
- [Roadmap](./docs/product/ROADMAP.md)：後續產品方向。
- [Contributing](./docs/governance/CONTRIBUTING.md)：Issue、PR、branch、migration 與 review 規則。
- [Decisions](./docs/governance/DECISIONS.md)：架構與產品決策紀錄。
- [Maintainers](./docs/governance/MAINTAINERS.md)：維護責任與聯絡方式。

---

## 原作者脈絡

以下段落保留原作者文字，用來說明原型階段的研究、產品決策與停止點。目前維護分支的規則以 [`docs/`](./docs/README.md) 為準。

### 關於作者

我是一名平面設計師（7-8 年專業資歷）——**不是傳統工程師**。這個專案展現的是：一個具備產品思維的設計師，搭配 AI 開發工具（Claude Code），再給自己時間深入研究，能做到什麼程度。

我並不是在宣稱我能從零寫出 production 等級的程式碼。我宣稱的是：我研究了一個真實的社會問題、做了產品決策、透過 AI 結對程式設計推動整個開發、為自己的產品做了資安稽核，並且知道何時該收手。這就是這個專案要展現的能力組合。

## TL;DR

我研究了台灣約 22 萬名外籍家庭看護的工作處境，歸納出 5 個系統性挑戰（手機使用受限、慢性疲勞、合約範圍模糊、社群信任落差、權力不對等），然後用 Claude Code 推動一個雙端產品的開發：

- **看護端 PWA**：日常活動記錄 ＋ 家屬溝通工具——3 秒記錄（生命徵象、用藥、跌倒、進食、睡眠、排便）含看護備註、多位長者醫護資訊卡、完整可離線的 PWA。
- **家屬端 LINE Bot**：6 位數配對碼、簽章驗證的 webhook、看護主動分享記錄時才推播通知。

接著我依 OWASP ＋ 台灣個資法做了一次結構化資安稽核，產出 15 項發現的報告，並修補了全部 11 項高／嚴重等級的問題。

**範圍決策**：早期版本曾包含一套 50 情境的醫療分流資料庫，附具名來源引用。我在對法律風險做威脅建模後移除了它：一個平面設計師（我）透過 AI 工具發布醫療建議，即使加了免責聲明，只要出一次不良後果 → 50-300 萬元訴訟 ＋ 永久的姓名搜尋負面紀錄，風險不成比例。溝通／記錄這一層，本身就有真實價值，不需要綁那個風險。**知道什麼「不該」做，也是能力的一部分。** 醫療內容的研究仍保留在 git 歷史與個人研究筆記裡，留給有能力扛起法律責任的 NGO 夥伴接手。

原作者階段曾嘗試接觸 NGO 合作路徑。此處不代表中揚資訊目前已取得任何協會背書或合作關係。

---

## 為什麼做這個

### 問題場景

台灣有 **約 22 萬名外籍家庭看護**，多數來自印尼、越南、菲律賓，在剝奪了許多一般勞工保障的勞動契約下工作。他們通常是：

- 家中**唯一**會注意到失能長者細微病況變化的人
- **24 小時待命**、休息有限
- **中文只夠勉強生存**——醫療術語、方言、地方口音都是落差
- 出事時**不是決策者**——決策權在家屬，而家屬往往人在遠方
- 早已把**智慧型手機和 Facebook／Zalo** 當成連回家鄉的生命線

### 我先做的研究

我花了不少時間在「讀」而不是「寫程式」：

- 臺北市政府的三語看護手冊（中文 ＋ 英、印、越；2022）
- 高雄長庚 × 高市府的失智照護 Q&A（130 頁、三語）
- 臺北市《守護記憶》失智手冊（88 頁）
- 台灣移工聯盟（MENT）、TIWA、勞工局的報告

我把研究結果拆成 5 個挑戰（每個在寫任何程式之前，都先寫了一份深入備忘）：

| # | 挑戰 | 關鍵洞察 |
|---|---|---|
| 1 | 手機使用受限 | 看護的手機常被雇主沒收／限制。APP 必須能在 **15 秒的偷瞄**裡用完，不靠通知、不要多餘介面。 |
| 2 | 慢性疲勞 | 資訊密度會殺死使用率。倒金字塔式分流（現在「該做什麼」）勝過參考書式的內容。 |
| 3 | 合約範圍蔓延／模糊 | 看護常被要求做合約外的事。APP 應該**提供資訊**，但不在勞雇糾紛中選邊。 |
| 4 | 社群信任落差 | 看護是跟 FB／Zalo 社群求證，而不是官方。APP 取代不了社群——它該產出能在 FB 分享流程中存活的**可分享卡片**。 |
| 5 | 權力不對等 | 勞工無法在沒有風險的情況下對雇主提出異議。把資料存在家屬帳號裡的工具，會複製這種不對等。**資料共有權**是一項功能，不是加分項。 |

這 5 點形塑了底下每一個產品決策。

---

## APP 裡有什麼

### 看護端（PWA）

- **3 秒記錄**：6 種記錄類型（體溫、排便、睡眠、跌倒、吃藥、吃飯），含 **5 個一點即填的快捷短語 ＋ 自由文字看護備註**
- **多位長者醫護資訊卡**（用藥、過敏、聯絡人、醫師）——是看護自己輸入的資訊性資料，不是醫療建議
- **今日摘要** widget——顯示當日筆數 ＋ 已分享給家屬幾筆
- **緊急電話**快捷頁——119 ／ 110 ／ 1955（移工權益）／ 0800-474-580（失智照護）／ 113（保護專線）
- 透過 Service Worker 的**完整離線支援**（靜態資源 cache-first、導覽 network-first）
- **加密備份檔**（PBKDF2 ＋ AES-GCM 256），讓備份檔可安全分享
- **可安裝 PWA**、深色模式、Lucide React 圖示、自訂設計 token
- **無分析、無追蹤器、無第三方 JS**

### 家屬端（LINE Bot）

- LINE Messaging API channel；webhook 採 **HMAC-SHA256 簽章驗證**
- 6 位數配對碼（32 字元字母集、移除易混淆字）含 **24 小時有效期**
- **防劫持保護**：只有當 `paired_line_user_id IS NULL` 時綁定才會成功（Postgres 層級檢查）
- **速率限制**：每個 LINE userId 每 5 分鐘最多 5 次嘗試（in-memory）
- 由看護按下「送出給家屬」開關（預設關閉）才觸發推播

### 資安與隱私

- 全程 HTTPS、安全標頭（HSTS、X-Frame-Options、Permissions-Policy）
- POST 端點同源檢查（在 SameSite cookie 之外再加一層 CSRF 防護）
- 錯誤訊息已淨化（不洩漏 DB schema）
- 加密備份檔格式（PBKDF2-SHA256 20 萬次迭代 ＋ AES-GCM 256-bit）
- 稽核日誌表含 **IP 去識別化**（末段歸零、IPv6 截斷）
- **被遺忘權** API ＋ UI 按鈕（個資法第 11 條合規）
- LINE userId 永不暴露給前端 JS（沒有 XSS 外洩路徑）
- **捲動鎖定的雙重同意流程**——首次使用者必須展開隱私政策與服務條款兩個摺疊區、各自捲到最底，「我同意」按鈕才會啟用。版本記錄在 localStorage，政策更新會重新詢問。

完整稽核報告：[SECURITY_AUDIT.md](./docs/security/SECURITY_AUDIT.md)。15 項發現、11 項已修、4 項附威脅建模理由刻意延後。

---

## 維護分支架構

中揚資訊維護分支的目前架構請看 [docs/engineering/ARCHITECTURE.md](./docs/engineering/ARCHITECTURE.md)。正式部署方向以 VM / Docker 為主，不綁定特定雲端供應商。

下面段落描述原作者原型階段的實作，保留作為歷史脈絡。

## 原作者原型技術堆疊

| 層 | 選擇 | 為什麼 |
|---|---|---|
| 框架 | Next.js 16（Turbopack）＋ React 19 | App Router 做乾淨的路由切分；Server Actions 處理 OAuth 登入流程（Auth.js v5 需要） |
| 認證 | Auth.js v5（next-auth@beta）＋ LINE provider | 多數看護唯一已經有的登入方式 |
| 資料庫 | Supabase（Postgres ＋ REST） | 免費方案夠做原型；SQL 對 schema 很誠實 |
| 推播 | LINE Messaging API | 比 push notification 阻力低（iOS PWA 幾乎不支援推播） |
| 樣式 | Tailwind 4 ＋ Lucide React | 這個規模不需要設計系統框架 |
| 部署 | Vercel | 原作者原型部署方式 |
| PWA | 手寫 Service Worker | 不用第三方 PWA 套件——快取策略完全可控 |

### 我刻意「不」用的

- **不用狀態管理函式庫**——`useState` ＋ `localStorage` 就夠；這個 APP 主要是表單與清單
- **不做分析**——隱私優先；之後若需要使用數據，再明確埋點
- **不用 CSS-in-JS runtime**——Tailwind 編譯掉、沒有 runtime 成本
- **不用 Supabase Auth**——LINE Login 本來就必須有；再疊一層 Supabase Auth 等於要管兩套身分系統

---

## 關鍵決策與取捨

### 1. LINE Bot vs. Web Push

iOS PWA 的 Web Push 在使用者把圖示加到主畫面之前都不可靠，就算加了也很脆弱。多數台灣家庭本來就 24 小時在用 LINE。選 LINE 移動了隱私邊界（LINE 公司看得到訊息），但換來**更高的送達率**與對家屬**零安裝阻力**。

我在隱私政策裡明確記錄了這個取捨。

### 2. service-role ＋ 認證檢查 vs. Supabase RLS

我選了 service-role 搭配嚴格的伺服器端認證檢查，而不是 RLS。RLS 架構上更乾淨，但會需要把 APP 改成用 anon-key ＋ 自訂 JWT 簽發——多日的重構，換來的真實安全提升有限，因為 service-role 本來就只在伺服器端。

我把它標為 production 的 Phase B TODO，威脅建模理由寫在稽核報告裡。

### 3. localStorage 加密：刻意不做

我考慮過用 WebCrypto 把 `localStorage` 裡的個資靜態加密。威脅建模後發現：任何能讀到 `localStorage` 的、有裝置存取權的攻擊者，也能讀到放金鑰的 `IndexedDB`。那是**做做樣子**，不是真正的保護。

我改做了**加密備份檔**（PBKDF2 ＋ AES-GCM ＋ 使用者通關密語）——這才防到最實際的威脅：備份 JSON 檔不小心透過 Email／雲端硬碟外流。

### 4. 從醫療內容轉向

最初的 v1 包含 50 個情境，附紅／橘／綠分流與處置步驟，引用具名的台灣醫療來源。在評估法律風險後——即使有免責聲明，由非醫療背景作者透過 AI 發布的醫療內容會造成直接責任——我移除了它。

這個轉向把產品從「醫療參考 ＋ 記錄」重新定位成「記錄 ＋ 家屬溝通工具」。剩下的功能面（記錄、醫護資訊卡、家屬推播）完全不涉及醫療建議——就只是看護輸入的資料，以及一個受控的分享管道。這是本質上完全不同的風險輪廓。

研究與內容草稿仍留在 git 歷史與個人研究筆記裡，留給任何有能力妥善扛起法律責任的 NGO 夥伴。

### 5. 停在作品集，不走商業

這是最難的決定。這個 APP 能用。我大可推政府採購（台北市勞動局有移工工具的預算）。

但從「朋友能用」走到「公開上架、政府採購的服務」，實際的合規工程是：

- 個資保護管理制度（PIMS）——每年 3-10 萬元顧問費
- ISO 27001——一次性 5-15 萬
- 滲透測試——每年 1.2-3 萬
- 隱私／服務條款律師審閱——3-5 萬
- 24 小時待命維運

……而我有一份正職，還有一條音樂副業。所以我選擇：

1. **保留為作品集 ＋ 開源**
2. **聯繫有機構量能的失智症／紅十字會等協會**
3. **收斂成作品集安全範圍**（不開放公開註冊、加上「原型」標示橫幅）

這個決定本身就是一個作品集訊號：知道什麼「不該」做，比把所有東西都做出來更有價值。

---

## 原作者原型架構（10 秒導覽）

原作者當時以 Vercel 部署原型。中揚資訊維護分支的正式部署方向是 VM / Docker；請看 [docs/operations/DEPLOY.md](./docs/operations/DEPLOY.md)。

```
┌─────────────────────────────────────────────────────────────┐
│  Caregiver Phone (PWA)                                      │
│  ├─ Service Worker (offline cache)                          │
│  ├─ localStorage: medical card, daily records (plaintext)   │
│  ├─ React 19 + Next.js 16 client components                 │
│  └─ Server Actions: pushRecordToFamily, login/logout        │
└──────────────┬──────────────────────────────────────────────┘
               │
               │ HTTPS only
               ▼
┌─────────────────────────────────────────────────────────────┐
│  Vercel (Next.js 16 server runtime)                         │
│  ├─ Auth.js v5 (LINE OAuth, JWT in HttpOnly cookie)         │
│  ├─ /api/cloud/{upload,download,delete}                     │
│  ├─ /api/pairing/ensure                                     │
│  ├─ /api/line/webhook (signature-verified)                  │
│  ├─ Origin check + rate limit (in-memory)                   │
│  └─ Audit log writer (IP-anonymized)                        │
└──────────────┬───────────────────────────┬──────────────────┘
               │                           │
               ▼                           ▼
┌──────────────────────────┐    ┌──────────────────────────┐
│  Supabase Postgres        │    │  LINE Messaging API      │
│  ├─ cloud_backups        │    │  ├─ webhook              │
│  ├─ elder_pairings       │    │  ├─ reply / push         │
│  ├─ push_logs (no PII)   │    │  └─ HMAC-SHA256 signing  │
│  └─ audit_logs (90-day)  │    └──────────────────────────┘
└──────────────────────────┘
```

---

## 這個專案展現了什麼（設計師即建造者的能力組合）

這刻意是給**設計師**職位、而非開發職位的作品集。它展現的能力：

| 能力 | 證據 |
|---|---|
| **先研究再設計** | 5 份挑戰備忘、6+ 份來源文件，都在第一張 wireframe 之前 |
| **產品決策** | 4 個取捨分析（LINE vs Push、RLS vs service-role、加密 vs 不加密、收手 vs 商業化） |
| **AI 輔助執行** | 以非傳統寫程式者的身分，透過 Claude Code 推動完整的 Next.js ＋ Auth ＋ DB ＋ LINE Bot 開發 |
| **自我稽核的嚴謹** | 跑了一次結構化的 15 項資安稽核並修補 11 項——多數設計師（與很多工程師）不會做 |
| **知道邊界** | 找出商業 vs 作品集的分岔點，並做了站得住腳的判斷 |
| **利害關係人溝通** | NGO 接洽信、白話中文的隱私政策、威脅建模書面說明 |

如果你要找的是資深設計師／產品設計師／設計主管，這就是我在 Figma 之外能帶來的。

## 如果重來會怎麼做

如果用現在的認知重新開始：

1. **先跟看護談，再寫程式。** 我選擇了讀研究。研究對掌握脈絡很好，但在排優先順序上，比不上 3 場使用者訪談。（被挑戰 5 的接觸問題卡住——勞工很難在不受雇主干預下與外人交談。）

2. **在做情境內容前先鎖定資料結構。** 我在加入多長者支援與看護備註時被迫遷移了兩次儲存格式——然後又把整個情境資料庫砍掉。提早鎖定資料結構，怎樣都會幫到。

3. **在做 PWA 殼之前先決定 LINE vs Push 架構。** 我做了一個 Web Push 原型，後來整個丟掉。

4. **先寫隱私政策。** 留到最後做，逼出了回頭的改動（稽核發現 `lineUserId` 透過 `/api/session` 暴露，那是因為我設計時沒考慮到 XSS 面）。

5. **在做內容前先評估法律風險。** 我做了 50 個含完整分流邏輯的醫療情境，才意識到對一個透過 AI 發布的非醫療作者來說，責任輪廓太高。在專案中途砍掉了整個內容庫。風險最好在第 1 天就評估。

---

## 本機安裝

```bash
# 複製
git clone <this-repo>
cd caregiver-app

# 安裝
npm install

# 環境變數（完整清單見 .env.example）
cp .env.example .env.local
# 填入：
#   AUTH_SECRET                — openssl rand -base64 32
#   LINE_CHANNEL_ID/SECRET     — LINE Login Channel
#   LINE_BOT_*                 — LINE Messaging API Channel
#   DATABASE_URL               — 本機或 VM Postgres connection string
#   LOCAL_PHOTO_STORAGE_DIR    — 照片上傳使用的本機目錄
#   LOCAL_PHOTO_SIGNING_SECRET — 僅限伺服器端使用的照片簽名 secret

# Schema
# 將 supabase-schema.sql 或 supabase/migrations/ 內的 SQL 套用到 Postgres

# 開發
npm run dev

# 文件檢查／建置／lint
npm run docs:check
npm run test
npm run build
npm run lint
```

---

## 歷史研究來源

原作者早期曾整理醫療情境資料，來源包含下列公開資料。這些情境目前沒有作為產品功能發布。中揚資訊維護的分支不提供診斷、分流、治療、劑量或急迫性判斷。以下來源只保留為原研究背景，不代表目前產品提供醫療建議。

- 臺北市政府《外籍家庭看護工照顧手冊》三語版（中英／中越／中印 2022）
- 高雄長庚 × 高雄市政府衛生局《外籍移工的認知症（失智症）照護手冊》三語版
- 台北市衛生局《守護記憶》失智症專題手冊
- 台灣腦中風學會 2025 急性中風治療指引
- American Heart Association 2025 CPR & ECC Guidelines（中文摘要）
- 天主教失智老人基金會教材
- 健保署藥師諮詢專線 0800-030-598

UI 靈感：醫療 APP 的 dribbble 參考（另外保存，未收進 repo）。

---

## 授權與使用

**程式碼：[MIT](./LICENSE)。** 原作者版權所有 © 2026 GUOPEICHI（YuriCrystal）。中揚資訊股份有限公司後續維護分支的修改同樣採 MIT 授權。

自由使用、研究、修改、發布——商用或非商用都可以——保留版權聲明就好，沒有其他限制。

**貢獻：** 歡迎 PR，貢獻同樣以 MIT 授權納入。

範例資料與截圖皆為示意，並非真實的病患資訊。

原作者曾留下交接邀請，希望由有能力承擔合規與營運的組織延續這個專案。目前維護分支的聯絡方式，請使用 GitHub Issues，或依 [MAINTAINERS.md](./docs/governance/MAINTAINERS.md) 的流程處理。

---

## 專案數據

- **6 種日常記錄類型**，含快捷短語 chip ＋ 看護備註
- **多位長者支援**——每位長者一張完整醫護資訊卡，含血型、病史、過敏、用藥、醫師、醫院、聯絡人
- **家屬推播**，每筆記錄需明確選擇加入（預設關閉）
- **15 項資安發現**已稽核、**11 項已修**，4 項附理由延後
- **約 1.5 週**實際工時，獨自一人，含一次專案中途的重大範圍轉向
- **0 個第三方追蹤器**、0 分析
- **0 個正式使用者**（刻意如此——這是原型）
- **0 則醫療建議**（威脅建模後刻意排除）
