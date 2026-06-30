# 看護助手 CareTaiwan

**A long-term care PWA for foreign migrant caregivers in Taiwan, with a companion family-side LINE Bot for real-time updates.**

🌐 **English** ｜ [繁體中文](./README.zh-TW.md)

> [!NOTE]
> ## 由中揚資訊股份有限公司接手維護的分支
>
> 這個分支現由 **中揚資訊股份有限公司** 接手維護。原專案由另一位作者在 GitHub 上開源；原作者已說明專案精神、社會問題脈絡，以及停止維護的原因。以下保留原作者的第一人稱敘事，因為它說明了這個專案為什麼存在、服務誰，以及哪些邊界不能輕率跨越。
>
> CareTaiwan 原本的精神不是單純做一個「照護紀錄 App」，而是為台灣外籍家庭看護設計一個低摩擦、在地優先、由看護主動控制分享的工具：快速紀錄、LINE 家屬溝通、不追蹤使用者、重視資料共有權，並且在風險評估後刻意不提供未經專業審查的醫療建議。原作者遇到的困難也必須被記住：個人兼職維護的能量有限、資安修補、個資法合規、使用者支援、營運成本、醫療責任風險，以及在權力不對等環境中直接接觸看護做研究的困難。
>
> 分支接手說明、原作者脈絡與後續維護承諾請見 [FORK_NOTICE.md](./FORK_NOTICE.md)。

> [!IMPORTANT]
> ## 🗄️ Archived & open-sourced (June 2026)
>
> This started as a solo side-project that ran at `caretaiwan.app`. **The live service has been shut down** — as a part-time solo maintainer I couldn't sustain the ongoing operational and compliance load (security patching, PDPA / 個資法 compliance, user support). It was still in friend-testing, so **no real user data was affected**.
>
> The source is released under the **MIT license** as a reference implementation and a portfolio piece — read it, learn from it, self-host it. **It is no longer maintained and comes with no support.** The `caretaiwan.app` domain will be allowed to lapse and will stop resolving.

> [!IMPORTANT]
> ## 🗄️ 已封存並開源（2026 年 6 月）
>
> 這原本是我一個人利用業餘時間獨立開發的專案，曾運行於 `caretaiwan.app`。**線上服務已停止營運**——身為半職、獨自維護的開發者，我無法長期負擔持續的營運與合規成本（安全性修補、個資法／PDPA 遵循、使用者支援）。專案當時仍在朋友測試階段，**沒有任何真實使用者的資料受到影響**。
>
> 原始碼以 **MIT** 授權開源，作為一份參考實作與作品集——歡迎閱讀、學習，或自行部署。**本專案已不再維護，亦不提供任何技術支援。** `caretaiwan.app` 網域將不再續約，到期後失效。

📄 **Security audit**: [SECURITY_AUDIT.md](./SECURITY_AUDIT.md)
📅 **Built**: 2026-04 / Solo, ~1 week elapsed · **Archived**: 2026-06
🧭 **分支接手說明**: [FORK_NOTICE.md](./FORK_NOTICE.md)
🎮 **Live demo**: **<https://caretaiwan-demo.vercel.app>** — a self-contained, click-through prototype (mock data, no backend) showing both the caregiver and family sides. The hosted app is gone; this is how it worked. Source in [`/demo`](./demo).

---

## About the Author

I'm a graphic designer (7-8 years professional experience) — **not a traditional engineer**. This project is what becomes possible when a designer with strong product thinking pairs with AI development tools (Claude Code) and gives themselves time to research deeply.

I'm not claiming I write production-grade code from scratch. I'm claiming: I researched a real social problem, made the product decisions, drove the build via AI pair-programming, audited my own security, and knew when to stop. That's the skill set this project demonstrates.

## TL;DR

I researched the working conditions of Taiwan's ~220,000 foreign live-in caregivers, identified 5 systemic challenges (phone access, fatigue, scope ambiguity, community gaps, power asymmetry), then drove the build of a dual-end product using Claude Code:

- **Caregiver PWA**: A daily activity logger and family communication tool — 3-second logging (vitals, medication, falls, meals, sleep, stool) with caregiver notes, multi-elder medical info cards, full offline-capable PWA.
- **Family-side LINE Bot**: 6-digit pairing, signed webhook, push notification when caregiver explicitly shares a record.

Then I ran a structured security audit against OWASP + Taiwan's PDPA (個資法), produced a 15-finding report, and shipped fixes for all 11 critical/high-severity issues.

**Scope decision**: An earlier version included a 50-scenario medical triage library with named-source citations. I removed it after threat-modeling the legal exposure: a graphic designer (me) shipping medical advice via AI tools, even with disclaimers, sits in a risk profile where one negative outcome → 50-300K NTD lawsuit + permanent name-search hit. The communication/logging layer is genuinely useful without that exposure. **Knowing what NOT to ship is part of the skill set.** The medical content research lives in git history and the user's research memos, available for an NGO partner who can carry the legal weight properly.

Currently in active conversation with Taiwan Alzheimer's Disease Association about partnership — TADA's role would be promoting the tool to their family-caregiver network and integrating their existing services (失智關懷專線 0800-474-580, 愛的手鍊), not endorsing medical content I authored.

---

## Why This Exists

### The problem space

Taiwan has **~220,000 foreign live-in caregivers**, mostly from Indonesia, Vietnam, and the Philippines, working under labor contracts that strip many normal worker protections. They are typically:

- The **only person** in the household who notices subtle medical changes in a frail elder
- Working **24/7 on-call** with limited rest
- **Fluent in Mandarin only enough to survive** — medical terms, dialect, regional pronunciations are gaps
- **Not the decision-maker** when something goes wrong — the family is, and they're often remote
- Already using **smartphones and Facebook/Zalo** as their lifeline to home

### What I researched first

I spent a chunk of time reading rather than coding:

- Taipei Government's trilingual caregiver handbook (zh-TW + EN, ID, VI; 2022)
- Kaohsiung Chang Gung × KCG's dementia care Q&A (130p, trilingual)
- Taipei "Memory Watch" dementia handbook (88p)
- Reports from MENT (Taiwan Migrant Caregivers Association), TIWA, the labor bureau

I broke the findings into 5 challenges (each got its own deep-dive memo before any code was written):

| # | Challenge | Key insight |
|---|---|---|
| 1 | Phone access constraints | Caregiver phones are often confiscated/restricted by the employer. The app has to work in **15-second snatched glances**, no notifications, no chrome. |
| 2 | Chronic fatigue | Information density kills usage. Inverted-pyramid triage (what to do *now*) beats reference-style content. |
| 3 | Scope creep / contract ambiguity | Caregivers are routinely asked to do tasks outside their contract. The app should **inform** without taking sides on labor disputes. |
| 4 | Community trust gaps | Caregivers verify info with their FB/Zalo communities, not authorities. App can't replace community — it should produce **shareable cards** that survive the FB share flow. |
| 5 | Power asymmetry | Workers can't dispute employers without risk. Tools that store data in the family's account replicate the asymmetry. **Data co-ownership** is a feature, not a nice-to-have. |

These shaped every product decision below.

---

## What's in the App

### Caregiver side (PWA)

- **3-second logging**: 6 record types (temp, stool, sleep, fall, med, meal) with **5-tap quick phrases + free-text caregiver notes**
- **Multi-elder medical info cards** (medications, allergies, contacts, doctor) — informational data the caregiver enters, not medical advice
- **Today summary** widget — shows daily count + how many shared with family
- **Emergency hotlines** quick page — 119 / 110 / 1955 (foreign worker rights) / 0800-474-580 (dementia care) / 113 (protection)
- **Full offline support** via Service Worker (cache-first for assets, network-first for nav)
- **Encrypted backup files** (PBKDF2 + AES-GCM 256) for safe backup-file sharing
- **PWA installable**, dark mode, Lucide React icons, custom design tokens
- **No analytics, no trackers, no third-party JS**

### Family side (LINE Bot)

- LINE Messaging API channel; webhook with **HMAC-SHA256 signature verification**
- 6-digit pairing codes (32-char alphabet, confusables removed) with **24-hour TTL**
- **Anti-hijack guard**: bind only succeeds if `paired_line_user_id IS NULL` (Postgres-level check)
- **Rate limited** at 5 attempts per LINE userId per 5 minutes (in-memory)
- Push notification triggered by caregiver pressing "送出給家屬" toggle (default OFF)

### Security & privacy

- HTTPS-only, security headers (HSTS, X-Frame-Options, Permissions-Policy)
- Same-origin guard on POST endpoints (CSRF defense beyond SameSite cookies)
- Sanitized error messages (no DB schema leakage)
- Encrypted backup file format (PBKDF2-SHA256 200k iterations + AES-GCM 256-bit)
- Audit log table with **IP anonymization** (last octet zeroed, IPv6 truncated)
- **Right-to-erasure** API + UI button (PDPA Article 11 compliance)
- LINE userId never exposed to client JS (no XSS exfil path)
- **Scroll-gated dual consent flow** — first-time users must expand both Privacy and Terms accordions and scroll each to the bottom before the "I agree" button enables. Versioned in localStorage so policy bumps re-prompt.

Full audit report: [SECURITY_AUDIT.md](./SECURITY_AUDIT.md). 15 findings, 11 fixed, 4 deliberately deferred with documented threat-model reasoning.

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (Turbopack) + React 19 | App router for clean route splitting; React Server Actions for the OAuth login flow (Auth.js v5 requires this) |
| Auth | Auth.js v5 (next-auth@beta) + LINE provider | The only login most caregivers already have |
| Database | Supabase (Postgres + REST) | Free tier covers prototyping; SQL is honest about schema |
| Push | LINE Messaging API | Lower friction than push notifications which iOS PWAs barely support |
| Styling | Tailwind 4 + Lucide React | No design system framework needed at this scale |
| Hosting | Vercel | Zero-config Next.js deploys |
| PWA | Hand-written Service Worker | No third-party PWA plugin — clear control of cache strategy |

### What I deliberately didn't use

- **No state management library** — `useState` + `localStorage` are enough; the app is mostly forms and lists
- **No analytics** — privacy first; if I need usage data later, I'll instrument explicitly
- **No CSS-in-JS runtime** — Tailwind compiles down, no runtime cost
- **No Supabase Auth** — LINE Login was already required; layering Supabase Auth on top would mean managing two identity systems

---

## Key Decisions & Trade-offs

### 1. LINE Bot vs. Web Push

Web Push on iOS PWAs is unreliable until users install the home-screen icon, and even then is brittle. Most Taiwanese families already use LINE 24/7. Choosing LINE shifted the privacy boundary (LINE Corp sees the messages) but bought a **higher delivery rate** and **zero install friction** for family.

I documented the trade-off in the privacy policy explicitly.

### 2. Service-role + auth-check vs. Supabase RLS

I chose service-role with strict server-side auth checks over RLS. RLS is architecturally cleaner but would require switching the app to use anon-key + custom JWT minting — a multi-day refactor for marginal real-world security gain since service-role is already server-only.

I marked it as a Phase B TODO for production, with the threat-model reasoning written in the audit.

### 3. localStorage encryption: deliberately not done

I considered encrypting `localStorage` PII at rest with WebCrypto. After threat-modeling: any attacker with device access who can read `localStorage` can also read `IndexedDB` where the key would live. It's **theater**, not real protection.

I implemented **encrypted backup files** instead (PBKDF2 + AES-GCM with user passphrase) — that protects the most realistic threat: backup JSON files accidentally shared via Email/Drive.

### 4. Pivot away from medical content

The original v1 included 50 scenarios with red/orange/green triage and treatment steps, citing named Taiwan healthcare sources. After scoping the legal risk — even with disclaimers, AI-drafted medical content shipped by a non-medical author creates direct liability — I removed it.

The pivot reframed the product from "medical reference + log" to "log + family communication tool". The remaining surface (logging, medical-info cards, family push) involves zero medical advice — it's just data the caregiver enters and a controlled channel to share it. This is a fundamentally different risk profile.

The research and content drafts still exist in git history and personal research memos, available for any NGO partner who can carry the legal weight properly.

### 5. Stop at portfolio, not commercial

This was the hardest call. The app works. I could push for government procurement (the Taipei Bureau of Labor has budget for migrant worker tools).

But the compliance lift to go from "works for friends" to "publicly listed gov-procured service" is realistically:

- 个資保護管理制度 (PIMS) — 30-100K TWD / year consulting
- ISO 27001 — 50-150K one-time
- Penetration test — 12-30K / year
- Privacy/ToS lawyer review — 30-50K
- 24/7 on-call ops

…and I have a full-time job and a music side career. So I'm:

1. **Keeping it as portfolio + open source**
2. **Reaching out to dementia/Red Cross associations** that have the institutional capacity
3. **Stripping it down to portfolio-safe scope** (no public sign-up, banner labeling it as prototype)

This decision is itself a portfolio signal: knowing what NOT to build is more valuable than building everything.

---

## Architecture (10-second tour)

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

## What This Project Demonstrates (Designer-as-Builder Skill Set)

This is intentionally a portfolio piece for a *designer* role, not a dev role. The skills it shows:

| Skill | Evidence |
|---|---|
| **Research before designing** | 5 challenge memos, 6+ source documents, before the first wireframe |
| **Product decision-making** | The 4 trade-off analyses (LINE vs Push, RLS vs service-role, encrypt vs not, stop vs commercialize) |
| **AI-assisted execution** | Drove a full Next.js + Auth + DB + LINE Bot build via Claude Code as a non-traditional coder |
| **Self-auditing rigor** | Ran a structured 15-finding security audit and shipped 11 fixes — most designers (and many engineers) wouldn't |
| **Knowing the boundary** | Identified the commercial-vs-portfolio fork point and made a defensible call |
| **Stakeholder communication** | NGO outreach letter, privacy policy in plain Chinese, threat-model write-ups |

If you're hiring a senior designer / product designer / design lead, this is what I bring beyond Figma.

## What I'd Do Differently

If I were starting over, knowing what I know now:

1. **Talk to caregivers first, code second.** I read research instead. Research is great for context but worse than 3 user interviews for prioritization. (Stalled by the contact problem in Challenge 5 — workers can't easily talk to outsiders without employer interference.)

2. **Lock the data shape before building scenario content.** I had to migrate the storage format twice when adding multi-elder support and caregiver notes — and then I scoped out the scenario library entirely. The early data-shape lockdown would have helped either way.

3. **Decide on the LINE-vs-Push architecture before the PWA shell.** I built a Web Push prototype that I later threw away.

4. **Write the privacy policy first.** Doing it last forced retroactive changes (the audit found `lineUserId` exposed via `/api/session`, which existed because I'd designed it without thinking about XSS surface).

5. **Scope the legal risk *before* building content.** I built 50 medical scenarios with full triage logic, then realized the liability profile was too high for a non-medical author shipping via AI tools. Removed the entire content library mid-project. Better to scope risk on day 1.

---

## Local Setup

```bash
# Clone
git clone <this-repo>
cd caregiver-app

# Install
npm install

# Env (see .env.example for full list)
cp .env.example .env.local
# Fill in:
#   AUTH_SECRET                — openssl rand -base64 32
#   LINE_CHANNEL_ID/SECRET     — LINE Login Channel
#   LINE_BOT_*                 — LINE Messaging API Channel
#   NEXT_PUBLIC_SUPABASE_URL   — Supabase project
#   SUPABASE_SERVICE_ROLE_KEY  — service_role (server-only!)

# Schema
# Run supabase-schema.sql in Supabase SQL Editor

# Dev
npm run dev

# Build / lint / typecheck
npm run build
npm run lint
```

---

## Sources & Acknowledgments

Medical content draws from publicly available materials. All scenarios cite their source. **Nothing in the app is original medical advice — it's curated and re-formatted from authoritative Taiwan healthcare sources, pending professional review.**

- 臺北市政府《外籍家庭看護工照顧手冊》三語版（中英／中越／中印 2022）
- 高雄長庚 × 高雄市政府衛生局《外籍移工的認知症（失智症）照護手冊》三語版
- 台北市衛生局《守護記憶》失智症專題手冊
- 台灣腦中風學會 2025 急性中風治療指引
- American Heart Association 2025 CPR & ECC Guidelines (Mandarin summary)
- 天主教失智老人基金會教材
- 健保署藥師諮詢專線 0800-030-598

UI inspiration: medical app dribbble references (saved separately, not included in repo).

---

## License & Use

**Code: [MIT](./LICENSE).** Copyright © 2026 GUOPEICHI (YuriCrystal).

Use it, study it, modify it, ship it — commercial or not — just keep the
copyright notice. No strings attached.

**Contributing:** PRs welcome; contributions are accepted under the same MIT license.

Sample data and screenshots are illustrative, not real patient information.

If you're an NGO or healthcare organization that could carry this forward responsibly — please reach out. I'd rather hand it to people with the institutional capacity to do compliance properly than have it fade as a portfolio piece.

---

## Project Stats

- **6 daily record types** with quick-phrase chips + caregiver notes
- **Multi-elder support** — full medical info card per elder with blood type, history, allergies, meds, doctor, hospital, contacts
- **Family push** with explicit per-record opt-in (default OFF)
- **15 security findings** audited, **11 fixed**, 4 deferred with documented reasoning
- **~1.5 weeks** elapsed wall-clock, solo, with one major mid-project scope pivot
- **0 third-party trackers**, 0 analytics
- **0 production users** (by design — this is a prototype)
- **0 medical advice given** (deliberately scoped out after threat-modeling)
