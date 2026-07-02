"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import RoleSwitcher from "@/components/RoleSwitcher";
import { getRole, type Role } from "@/lib/role";
import { useT } from "@/lib/i18n";
import { KeyRound } from "lucide-react";
import { RecordTypeIcon, Info, type RecordType } from "@/components/icons";
import {
  LineChart,
  IdCard,
  NotebookPen,
  LifeBuoy,
  Cloud,
  Send,
  ArrowRight,
  Sparkles,
  BookOpen,
  type LucideIcon,
} from "lucide-react";
import { getActiveElder, setActivePairedElder } from "@/lib/elder";
import type { Elder } from "@/lib/elder";

type Rec = {
  type: RecordType;
  value: string | true;
  note: string;
  timestamp: number;
  shared: boolean;
};

export default function Home() {
  const router = useRouter();
  const [recent, setRecent] = useState<Rec[]>([]);
  const [todayCount, setTodayCount] = useState(0);
  const [todayShared, setTodayShared] = useState(0);
  const [elder, setElder] = useState<Elder | null>(null);
  const [totalRecords, setTotalRecords] = useState(0);
  const [pairedCount, setPairedCount] = useState<number | null>(null);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const [role, setRole] = useState<Role | null | "loading">("loading");
  const t = useT();

  // v56: 避免 render 直接呼叫 Date.now()（React 19 视为 impure + hydration mismatch 風險）
  // 改用 state + 60s interval refresh。
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  // 相對時間格式化(讀字典所以放在元件內)
  const formatRelative = (ts: number): string => {
    const diff = now - ts;
    const m = Math.floor(diff / 60000);
    if (m < 1) return t.home.relativeJustNow;
    if (m < 60) return t.home.relativeMinAgo.replace("{n}", String(m));
    const h = Math.floor(m / 60);
    if (h < 24) return t.home.relativeHourAgo.replace("{n}", String(h));
    const d = Math.floor(h / 24);
    if (d < 7) return t.home.relativeDayAgo.replace("{n}", String(d));
    return new Date(ts).toLocaleDateString(undefined, { month: "2-digit", day: "2-digit" });
  };

  const REC_LABEL: Record<RecordType, { label: string }> = {
    temp:  { label: t.home.recTemp },
    stool: { label: t.home.recStool },
    sleep: { label: t.home.recSleep },
    fall:  { label: t.home.recFall },
    med:   { label: t.home.recMed },
    meal:  { label: t.home.recMeal },
    ng_feed:         { label: t.record.typeNgFeed },
    turn:            { label: t.record.typeTurn },
    bp:              { label: t.record.typeBp },
    glucose:         { label: t.record.typeGlucose },
    spo2:            { label: t.record.typeSpo2 },
    diaper:          { label: t.record.typeDiaper },
    back_pat:        { label: t.record.typeBackPat },
    ng_change:       { label: t.record.typeNgChange },
    catheter_change: { label: t.record.typeCatheterChange },
  };

  // 角色不對就重導到家屬端
  useEffect(() => {
    const syncRole = () => {
      const currentRole = getRole();
      setRole(currentRole);
      if (currentRole === "family") router.replace("/family");
    };
    syncRole();
    window.addEventListener("app-role-changed", syncRole);
    return () => window.removeEventListener("app-role-changed", syncRole);
  }, [router]);

  useEffect(() => {
    if (role !== "caregiver") return;
    try {
      const all = JSON.parse(localStorage.getItem("records") || "[]") as Rec[];
      setRecent(all.slice(-3).reverse());
      setTotalRecords(all.length);
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const todays = all.filter((r) => r.timestamp >= startOfDay.getTime());
      setTodayCount(todays.length);
      setTodayShared(todays.filter((r) => r.shared).length);
      setElder(getActiveElder());
      setOnboardingDismissed(localStorage.getItem("onboarding-dismissed") === "1");
    } catch {}
    // 看護端用 API 取得已配對的老人數，順便快取第一筆給 /record 推播用
    fetch("/api/family/paired")
      .then((r) => r.json())
      .then((d) => {
        const items = d.items ?? [];
        setPairedCount(items.length);
        if (items.length > 0) {
          const first = items[0];
          const name = first.card?.name || first.displayName || "老人";
          setActivePairedElder({ id: first.elderId, name });
        } else {
          setActivePairedElder(null);
        }
      })
      .catch(() => setPairedCount(0));
  }, [role]);

  // Onboarding：看護端流程
  //   pairedCount === 0 → 輸入配對碼（家屬產的）
  //   有配對但無記錄 → 做第一筆 3 秒記錄
  //   有記錄但 < 5 筆 → LINE Bot 教學
  const onboardingStep:
    | "enter-pairing"
    | "first-record"
    | "connect-line-bot"
    | null =
    pairedCount === null
      ? null
      : pairedCount === 0
      ? "enter-pairing"
      : totalRecords === 0
      ? "first-record"
      : !onboardingDismissed && totalRecords < 5
      ? "connect-line-bot"
      : null;

  const handleDismissOnboarding = () => {
    localStorage.setItem("onboarding-dismissed", "1");
    setOnboardingDismissed(true);
  };

  if (role !== "caregiver") {
    return (
      <main className="flex flex-col flex-1 items-center justify-center px-6 pb-24 text-center">
        <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center shadow-card mb-4">
          <Sparkles className="w-8 h-8 text-blue-600 dark:text-blue-300" strokeWidth={2.2} />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
          {t.home.appName}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
          請先選擇你要使用的身份
        </p>
      </main>
    );
  }

  return (
    <main className="flex flex-col flex-1 pb-40">
      {/* Header */}
      <header className="px-5 pt-6 pb-4 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">{t.home.appName}</h1>
          <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
            {elder ? `${t.home.caringFor}: ${elder.name}` : t.home.tagline}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href="/about"
            aria-label="About"
            className="w-11 h-11 flex items-center justify-center rounded-full bg-white/70 dark:bg-slate-800/70 shadow-card active:scale-95 transition-transform"
          >
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-300" strokeWidth={2.2} />
          </Link>
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </header>

      <div className="px-5 mb-3">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-card">
          <div className="text-sm font-bold text-slate-900 dark:text-white mb-2">
            使用身份
          </div>
          <RoleSwitcher />
        </div>
      </div>

      {/* Onboarding hint — adapts to user's progress */}
      {onboardingStep && (
        <div className="px-5 mb-3">
          <OnboardingCard
            step={onboardingStep}
            onDismiss={
              onboardingStep === "connect-line-bot" ? handleDismissOnboarding : undefined
            }
          />
        </div>
      )}

      {/* Today summary widget */}
      {todayCount > 0 && (
        <div className="px-5 mb-3">
          <Link
            href="/record"
            className="flex items-center gap-3 p-4 bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-emerald-950 dark:to-teal-900 ring-1 ring-emerald-200/60 dark:ring-emerald-900/60 rounded-3xl shadow-card active:scale-[0.98] transition-transform"
          >
            <div className="w-12 h-12 rounded-2xl bg-white/70 dark:bg-emerald-900/40 flex items-center justify-center">
              <LineChart className="w-6 h-6 text-emerald-600 dark:text-emerald-300" strokeWidth={2.2} />
            </div>
            <div className="flex-1">
              <div className="text-base font-bold text-emerald-900 dark:text-emerald-100">
                {t.home.todayRecords.replace("{n}", String(todayCount))}
              </div>
              <div className="text-xs text-emerald-800 dark:text-emerald-200 mt-0.5">
                {todayShared > 0
                  ? t.home.todaySharedSome.replace("{n}", String(todayShared))
                  : t.home.todayLocalOnly}
              </div>
            </div>
            <span className="text-emerald-600 dark:text-emerald-300 text-xl">›</span>
          </Link>
        </div>
      )}

      {/* Quick actions — primary tile is record */}
      <div className="px-5 mt-2">
        <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-3">
          {t.home.quickActionsTitle}
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <QuickTile
            href="/record"
            label={t.home.tile3Sec}
            sub={t.home.tile3SecSub}
            Icon={NotebookPen}
            color="from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 ring-blue-200/60 dark:ring-blue-900/60"
            iconColor="text-blue-600 dark:text-blue-300"
            primary
          />
          <QuickTile
            href="/card"
            label={t.home.tileCard}
            sub={t.home.tileCardSub}
            Icon={IdCard}
            color="from-violet-50 to-indigo-100 dark:from-violet-950 dark:to-indigo-900 ring-violet-200/60 dark:ring-violet-900/60"
            iconColor="text-violet-600 dark:text-violet-300"
          />
          <QuickTile
            href="/backup"
            label={t.home.tileBackup}
            sub={t.home.tileBackupSub}
            Icon={Cloud}
            color="from-sky-50 to-cyan-100 dark:from-sky-950 dark:to-cyan-900 ring-sky-200/60 dark:ring-sky-900/60"
            iconColor="text-sky-600 dark:text-sky-300"
          />
          <QuickTile
            href="/help"
            label={t.home.tileHelp}
            sub={t.home.tileHelpSub}
            Icon={LifeBuoy}
            color="from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 ring-red-200/60 dark:ring-red-900/60"
            iconColor="text-red-600 dark:text-red-300"
          />
        </div>

        {/* Tutorial entry — always accessible */}
        <Link
          href="/tutorial"
          className="mt-3 flex items-center gap-3 p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-card active:scale-[0.98] transition-transform"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5 text-amber-600 dark:text-amber-300" strokeWidth={2.2} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-slate-900 dark:text-white">{t.home.tutorialTitle}</div>
            <div className="text-xs text-slate-500 mt-0.5">{t.home.tutorialSub}</div>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-400 shrink-0" strokeWidth={2.2} />
        </Link>
      </div>

      {/* Recent records */}
      {recent.length > 0 && (
        <div className="px-5 mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              {t.home.recentRecordsTitle}
            </h2>
            <Link
              href="/record"
              className="text-xs text-blue-600 dark:text-blue-400 active:opacity-70"
            >
              {t.home.addRecord}
            </Link>
          </div>
          <div className="space-y-2">
            {recent.map((r, i) => {
              const meta = REC_LABEL[r.type];
              return (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 rounded-2xl shadow-card"
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    <RecordTypeIcon type={r.type} className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                      <span>{meta.label}</span>
                      {r.type === "temp" && typeof r.value === "string" && (
                        <span className="text-slate-500">{r.value}°C</span>
                      )}
                      {r.shared && (
                        <span className="text-xs px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 rounded">
                          {t.home.sharedTag}
                        </span>
                      )}
                    </div>
                    {r.note && (
                      <div className="text-xs text-slate-500 truncate mt-0.5">
                        {r.note}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 whitespace-nowrap">
                    {formatRelative(r.timestamp)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state when no records yet */}
      {recent.length === 0 && (
        <div className="px-5 mt-6">
          <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl shadow-card text-center text-slate-500 dark:text-slate-400 text-sm">
            {t.home.emptyRecords}
          </div>
        </div>
      )}
    </main>
  );
}

function OnboardingCard({
  step,
  onDismiss,
}: {
  step: "enter-pairing" | "first-record" | "connect-line-bot";
  onDismiss?: () => void;
}) {
  const t = useT();
  const config = {
    "enter-pairing": {
      stepNum: 1,
      title: t.home.onboardEnterPair,
      desc: t.home.onboardEnterPairDesc,
      cta: t.home.onboardEnterPairCta,
      href: "/card",
      Icon: KeyRound,
    },
    "first-record": {
      stepNum: 2,
      title: t.home.onboardFirstRecord,
      desc: t.home.onboardFirstRecordDesc,
      cta: t.home.onboardFirstRecordCta,
      href: "/record",
      Icon: NotebookPen,
    },
    "connect-line-bot": {
      stepNum: 3,
      title: t.home.onboardLineBot,
      desc: t.home.onboardLineBotDesc,
      cta: t.home.onboardLineBotCta,
      href: "/family-setup",
      Icon: Send,
    },
  }[step];

  const Icon = config.Icon;

  return (
    <div className="relative p-5 bg-gradient-to-br from-blue-50 to-sky-100 dark:from-blue-950 dark:to-sky-900 ring-1 ring-blue-200/60 dark:ring-blue-900/60 rounded-3xl shadow-card">
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute top-3 right-3 text-xs text-blue-700 dark:text-blue-300 active:opacity-70 px-2 py-1"
        >
          {t.home.laterText}
        </button>
      )}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-12 h-12 rounded-2xl bg-white/80 dark:bg-slate-900/40 flex items-center justify-center shadow-card shrink-0">
          <Sparkles className="w-6 h-6 text-blue-600 dark:text-blue-300" strokeWidth={2.2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
            {t.home.onboardStep.replace("{n}", String(config.stepNum))}
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
            {config.title}
          </h3>
        </div>
      </div>
      <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed mb-4">
        {config.desc}
      </p>
      <Link
        href={config.href}
        className="flex items-center justify-center gap-2 w-full h-12 bg-gradient-to-br from-blue-500 to-blue-600 active:from-blue-600 active:to-blue-700 text-white rounded-xl font-bold shadow-lift"
      >
        <Icon className="w-5 h-5" strokeWidth={2.2} />
        {config.cta}
        <ArrowRight className="w-4 h-4" strokeWidth={2.4} />
      </Link>
    </div>
  );
}

function QuickTile({
  href,
  label,
  sub,
  Icon,
  color,
  iconColor,
  primary,
}: {
  href: string;
  label: string;
  sub: string;
  Icon: LucideIcon;
  color: string;
  iconColor: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col aspect-square rounded-3xl shadow-card bg-gradient-to-br ring-1 ${color} active:scale-95 active:shadow-lift transition-all p-4 ${
        primary ? "ring-2" : ""
      }`}
    >
      <div className="w-14 h-14 rounded-2xl bg-white/70 dark:bg-slate-900/40 flex items-center justify-center mb-auto shadow-card">
        <Icon className={`w-8 h-8 ${iconColor}`} strokeWidth={2.2} />
      </div>
      <div className="mt-3">
        <div className="text-base font-bold text-slate-800 dark:text-slate-100">{label}</div>
        <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{sub}</div>
      </div>
    </Link>
  );
}
