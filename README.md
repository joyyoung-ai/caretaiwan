# 看護助手 CareTaiwan

**A long-term care PWA for foreign migrant caregivers in Taiwan, with a companion family-side LINE Bot for real-time updates.**

🌐 **English** ｜ [繁體中文](./README.zh-TW.md)

> [!NOTE]
> ## Current fork status / 目前分支狀態
>
> This fork is maintained by **中揚資訊股份有限公司**. The maintained fork keeps the original author's research context, but its current maintenance status is separate from the original live service.
>
> CareTaiwan is an assistive care-collaboration tool between foreign family caregivers and families in Taiwan. It is not an EMR, HIS, medical device, long-term care ERP, scheduling/payroll system, or medical-triage tool. Before production use, read [Known Limitations](./docs/governance/KNOWN_LIMITATIONS.md).
>
> 中揚資訊接手後，會把這個原型往可維運、可稽核、可合規的方向整理。接手說明請見 [FORK_NOTICE.md](./docs/governance/FORK_NOTICE.md)。

> [!IMPORTANT]
> ## Original upstream status / 原始上游狀態
>
> The original live service at `caretaiwan.app` was shut down in June 2026. The original author released the source under the MIT license after deciding that long-term operations, compliance, security patching, and user support were beyond a solo side project.
>
> This status applies to the original upstream service, not to this maintained fork.

> [!NOTE]
> ## Original author note / 原作者保留說明
>
> The original author described this as a solo side project and portfolio/reference implementation. The original service had only reached friend-testing, and the author stated that no real user data was affected when the service shut down.
>
> 下面保留原作者的第一人稱敘事，目的是讓讀者理解這個專案為什麼存在、服務誰，以及哪些邊界不能輕率跨越。

📄 **Security audit**: [SECURITY_AUDIT.md](./docs/security/SECURITY_AUDIT.md)
📅 **Built**: 2026-04 / Solo, ~1 week elapsed · **Archived**: 2026-06
🧭 **分支接手說明**: [FORK_NOTICE.md](./docs/governance/FORK_NOTICE.md)
🎮 **Live demo**: **<https://caretaiwan-demo.vercel.app>** — a self-contained, click-through prototype (mock data, no backend) showing both the caregiver and family sides. The hosted app is gone; this is how it worked. Source in [`/demo`](./demo).

## Maintained Fork Quick Start

- **What this fork is**: a care-collaboration tool for foreign family caregivers and families in Taiwan.
- **What this fork is not**: EMR, HIS, medical device, long-term care ERP, scheduling/payroll system, or medical-triage tool.
- **Local setup**: run `npm ci`, copy `.env.example` to `.env.local`, fill test-only secrets, then run `npm run dev`.
- **Production direction**: VM / Docker, provider-neutral. See [DEPLOY.md](./docs/operations/DEPLOY.md) and [RUNBOOK.md](./docs/operations/RUNBOOK.md).
- **Known limits**: read [KNOWN_LIMITATIONS.md](./docs/governance/KNOWN_LIMITATIONS.md) before filing a bug.
- **Security and support**: use [SECURITY.md](./SECURITY.md) for vulnerability reporting and [SUPPORT.md](./SUPPORT.md) for support boundaries.

## Repository Governance

中揚資訊接手後的治理文件放在 [`docs/`](./docs/README.md)：

- [專案願景](./docs/governance/PROJECT_VISION.md)：產品定位、優先順序與不做的事。
- [已知限制](./docs/governance/KNOWN_LIMITATIONS.md)：哪些限制不是 bug。
- [Roadmap](./docs/product/ROADMAP.md)：後續產品方向。
- [Contributing](./docs/governance/CONTRIBUTING.md)：Issue、PR、branch、migration 與 review 規則。
- [Decisions](./docs/governance/DECISIONS.md)：架構與產品決策紀錄。
- [Maintainers](./docs/governance/MAINTAINERS.md)：維護責任與聯絡方式。

---

## Original Author Context

The following sections are preserved from the original author. They explain the research, product decisions, and stopping point of the original prototype. Current maintenance rules live in [`docs/`](./docs/README.md).

### About the Author

I'm a graphic designer (7-8 years professional experience) — **not a traditional engineer**. This project is what becomes possible when a designer with strong product thinking pairs with AI development tools (Claude Code) and gives themselves time to research deeply.

I'm not claiming I write production-grade code from scratch. I'm claiming: I researched a real social problem, made the product decisions, drove the build via AI pair-programming, audited my own security, and knew when to stop. That's the skill set this project demonstrates.

## TL;DR

I researched the working conditions of Taiwan's ~220,000 foreign live-in caregivers, identified 5 systemic challenges (phone access, fatigue, scope ambiguity, community gaps, power asymmetry), then drove the build of a dual-end product using Claude Code:

- **Caregiver PWA**: A daily activity logger and family communication tool — 3-second logging (vitals, medication, falls, meals, sleep, stool) with caregiver notes, multi-elder medical info cards, full offline-capable PWA.
- **Family-side LINE Bot**: 6-digit pairing, signed webhook, push notification when caregiver explicitly shares a record.

Then I ran a structured security audit against OWASP + Taiwan's PDPA (個資法), produced a 15-finding report, and shipped fixes for all 11 critical/high-severity issues.

**Scope decision**: An earlier version included a 50-scenario medical triage library with named-source citations. I removed it after threat-modeling the legal exposure: a graphic designer (me) shipping medical advice via AI tools, even with disclaimers, sits in a risk profile where one negative outcome → 50-300K NTD lawsuit + permanent name-search hit. The communication/logging layer is genuinely useful without that exposure. **Knowing what NOT to ship is part of the skill set.** The medical content research lives in git history and the user's research memos, available for an NGO partner who can carry the legal weight properly.

During the original author stage, the author explored possible NGO partnership paths. No current endorsement or partnership is implied by this maintained fork.

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

Full audit report: [SECURITY_AUDIT.md](./docs/security/SECURITY_AUDIT.md). 15 findings, 11 fixed, 4 deliberately deferred with documented threat-model reasoning.

---

## Maintained Fork Architecture

For the maintained fork, see [docs/engineering/ARCHITECTURE.md](./docs/engineering/ARCHITECTURE.md). Production deployment is planned around VM / Docker and does not depend on a specific cloud provider.

The sections below describe the original prototype implementation and are preserved for historical context.

## Original Prototype Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (Turbopack) + React 19 | App router for clean route splitting; React Server Actions for the OAuth login flow (Auth.js v5 requires this) |
| Auth | Auth.js v5 (next-auth@beta) + LINE provider | The only login most caregivers already have |
| Database | Supabase (Postgres + REST) | Free tier covers prototyping; SQL is honest about schema |
| Push | LINE Messaging API | Lower friction than push notifications which iOS PWAs barely support |
| Styling | Tailwind 4 + Lucide React | No design system framework needed at this scale |
| Hosting | Vercel | Original prototype hosting |
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

## Original Prototype Architecture (10-second tour)

The original author deployed the prototype on Vercel. The maintained fork's deployment direction is VM / Docker; see [docs/operations/DEPLOY.md](./docs/operations/DEPLOY.md).

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
#   DATABASE_URL               — local or VM Postgres connection string
#   LOCAL_PHOTO_STORAGE_DIR    — local path for uploaded photos
#   LOCAL_PHOTO_SIGNING_SECRET — server-only signing secret

# Schema
# Apply supabase-schema.sql or the SQL files in supabase/migrations/ to Postgres

# Dev
npm run dev

# Docs / build / lint
npm run docs:check
npm run test
npm run build
npm run lint
```

---

## Historical Research Sources

The original prototype included medical scenario research based on public materials. Those scenarios are not shipped in the maintained fork. The maintained app does not provide diagnosis, triage, treatment advice, dosage advice, or medical urgency judgment. The sources below are preserved only to explain the original research background.

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

**Code: [MIT](./LICENSE).** Original copyright © 2026 GUOPEICHI (YuriCrystal). JoyYoung Information Co., Ltd. keeps later fork maintenance changes under the same MIT license.

Use it, study it, modify it, ship it — commercial or not — just keep the
copyright notice. No strings attached.

**Contributing:** PRs welcome; contributions are accepted under the same MIT license.

Sample data and screenshots are illustrative, not real patient information.

The original author left a handoff invitation for organizations with the capacity to carry compliance and operations. For this maintained fork, use GitHub Issues or the maintainer process in [MAINTAINERS.md](./docs/governance/MAINTAINERS.md).

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
