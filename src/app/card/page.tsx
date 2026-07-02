"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  IdCard,
  Phone,
  Pill,
  Hospital,
  AlertTriangle,
  User,
  Cake,
  Stethoscope,
  Eye,
  EyeOff,
  KeyRound,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { loginWithLine } from "@/app/actions/auth-actions";
import { getRole } from "@/lib/role";
import { setActivePairedElder } from "@/lib/elder";
import { useT } from "@/lib/i18n";

type View = "loading" | "login" | "noPair" | "paired";

type Medication = { name: string; dose: string; time: string };
type Contact = { name: string; relation: string; phone: string };
type Elder = {
  id: string;
  name: string;
  gender: "male" | "female" | "";
  birthday: string;
  bloodType: string;
  history: string;
  allergies: string;
  medications: Medication[];
  doctor: string;
  hospital: string;
  contacts: Contact[];
  updatedAt: number;
};

type PairedElder = {
  elderId: string;
  displayName: string | null;
  caregiverName: string | null;
  card: Elder | null;
};

export default function CaregiverCardPage() {
  const router = useRouter();
  const [view, setView] = useState<View>("loading");
  const [paired, setPaired] = useState<PairedElder[]>([]);
  const [showSensitive, setShowSensitive] = useState(false);
  const t = useT();

  // family role 跑錯路由就重導
  useEffect(() => {
    if (getRole() === "family") router.replace("/family/card");
  }, [router]);

  // 把第一筆配對的老人寫入本地快取，供 /record 推播使用
  const persistFirstPaired = useCallback((items: PairedElder[]) => {
    if (items.length === 0) {
      setActivePairedElder(null);
      return;
    }
    const first = items[0];
    const name = first.card?.name || first.displayName || "老人";
    setActivePairedElder({ id: first.elderId, name });
  }, []);

  // 單一 round-trip:用 /api/family/paired 同時得知登入狀態 + 配對清單
  // 401 = 未登入,200 = 登入(payload 含配對列表)
  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/family/paired");
      if (res.status === 401) {
        setView("login");
        return;
      }
      if (!res.ok) {
        setView("noPair");
        return;
      }
      const data = await res.json();
      const items: PairedElder[] = data.items ?? [];
      setPaired(items);
      persistFirstPaired(items);
      setView(items.length > 0 ? "paired" : "noPair");
    } catch {
      setView("noPair");
    }
  }, [persistFirstPaired]);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = () => {
    load();
  };

  return (
    <main className="flex flex-col flex-1 pb-32">
      <header className="px-5 pt-4 pb-3 flex items-center gap-3">
        <Link
          href="/"
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/70 dark:bg-slate-800/70 shadow-card active:scale-95 transition-transform"
        >
          <span className="text-2xl">←</span>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <IdCard
              className="w-5 h-5 text-violet-600 dark:text-violet-400"
              strokeWidth={2.2}
            />
            {t.card.title}
          </h1>
          <p className="text-xs text-slate-500">{t.card.subtitle}</p>
        </div>
        <LanguageSwitcher />
        <ThemeToggle />
      </header>

      {/* Loading - 同時也直接渲染 noPair 骨架,讓使用者立刻有 context (網路慢時不會只看到「載入中」) */}
      {view === "loading" && (
        <div className="px-5 pt-4 space-y-3">
          <div className="p-5 bg-amber-50/60 dark:bg-amber-950/40 ring-1 ring-amber-300/40 dark:ring-amber-800/60 rounded-3xl shadow-card">
            <div className="flex items-start gap-3">
              <AlertTriangle
                className="w-6 h-6 text-amber-600/70 dark:text-amber-300/70 mt-0.5 shrink-0"
                strokeWidth={2.2}
              />
              <div className="flex-1">
                <h2 className="text-base font-bold text-amber-900/80 dark:text-amber-100/80 mb-1">
                  {t.card.loadingTitle}
                </h2>
                <p className="text-sm text-amber-800/70 dark:text-amber-200/70 leading-relaxed">
                  {t.card.loadingDesc}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Not logged in */}
      {view === "login" && (
        <div className="px-5 pt-4 space-y-3">
          <div className="p-5 bg-gradient-to-br from-blue-50 to-sky-100 dark:from-blue-950 dark:to-sky-900 ring-1 ring-blue-200/60 dark:ring-blue-900/60 rounded-3xl shadow-card">
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2">
              {t.card.loginTitle}
            </h2>
            <p className="text-sm text-slate-700 dark:text-slate-200 mb-4 leading-relaxed">
              {t.card.loginDesc}
            </p>
            <form action={loginWithLine}>
              <button
                type="submit"
                className="w-full h-14 bg-emerald-600 active:bg-emerald-700 text-white rounded-2xl font-bold"
              >
                {t.card.loginCta}
              </button>
            </form>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-3 leading-relaxed">
              {t.card.loginAppHint}
            </p>
          </div>

          {/* 隱私保證:看護端最在意的事(被監控、被家屬看到聊天記錄) */}
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-card">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-1.5">
              {t.card.privacyTitle}
            </h3>
            <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              {[
                t.card.privacyItem1,
                t.card.privacyItem2,
                t.card.privacyItem3,
                t.card.privacyItem4,
                t.card.privacyItem5,
                t.card.privacyItem6,
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
                    ✓
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 leading-relaxed">
              {t.card.privacyMore}
              <Link href="/privacy" className="text-blue-600 dark:text-blue-400 underline ml-1">
                {t.card.privacyPolicy}
              </Link>
              {" / "}
              <Link href="/terms" className="text-blue-600 dark:text-blue-400 underline">
                {t.card.termsLink}
              </Link>
            </p>
          </div>
        </div>
      )}

      {/* Logged in, 但還沒配對到任何老人 */}
      {view === "noPair" && (
        <div className="px-5 pt-4 space-y-3">
          <div className="p-5 bg-amber-50 dark:bg-amber-950 ring-1 ring-amber-300/60 dark:ring-amber-800 rounded-3xl shadow-card">
            <div className="flex items-start gap-3">
              <AlertTriangle
                className="w-6 h-6 text-amber-600 dark:text-amber-300 mt-0.5 shrink-0"
                strokeWidth={2.2}
              />
              <div className="flex-1">
                <h2 className="text-base font-bold text-amber-900 dark:text-amber-100 mb-1">
                  {t.card.noPairTitle}
                </h2>
                <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
                  {t.card.noPairDesc}
                </p>
                <ol className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed list-decimal list-inside mt-2 space-y-0.5">
                  <li>{t.card.noPairStep1}</li>
                  <li>{t.card.noPairStep2}</li>
                  <li>{t.card.noPairStep3}</li>
                </ol>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-2">
                  {t.card.noPairFooter}
                </p>
              </div>
            </div>
          </div>
          <PairingInputBox onSuccess={refresh} />
        </div>
      )}

      {/* 已配對 */}
      {view === "paired" && paired.length > 0 && (
        <div className="px-5 pt-4 space-y-4">
          {/* 已配對提示 + 加碼 */}
          <details className="bg-white dark:bg-slate-900 rounded-2xl shadow-card group">
            <summary className="cursor-pointer list-none px-4 py-3 flex items-center gap-2 text-sm">
              <KeyRound
                className="w-4 h-4 text-blue-600 dark:text-blue-300"
                strokeWidth={2.2}
              />
              <span className="flex-1 font-semibold text-slate-700 dark:text-slate-200">
                {t.card.pairAddedHint.replace("{n}", String(paired.length))}
              </span>
              <span className="text-slate-400 transition-transform group-open:rotate-180">
                ▾
              </span>
            </summary>
            <div className="px-4 pb-4">
              <PairingInputBox onSuccess={refresh} compact />
            </div>
          </details>

          {/* Elder list / cards */}
          {paired.map((p) => (
            <ElderCardView
              key={p.elderId}
              paired={p}
              showSensitive={showSensitive}
              onToggleSensitive={() => setShowSensitive((v) => !v)}
            />
          ))}
        </div>
      )}
    </main>
  );
}

function PairingInputBox({
  onSuccess,
  compact,
}: {
  onSuccess: () => void;
  compact?: boolean;
}) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const t = useT();

  const handleSubmit = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/pairing/bind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({
          ok: true,
          text: `${t.card.pairSuccess}${data.elderName ? ` ${data.elderName}` : ""}`,
        });
        setCode("");
        setTimeout(() => {
          setMsg(null);
          onSuccess();
        }, 1500);
      } else {
        setMsg({ ok: false, text: data.error || "失敗" });
      }
    } catch {
      setMsg({ ok: false, text: t.card.pairFailNetwork });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={`${
        compact
          ? ""
          : "p-5 bg-gradient-to-br from-violet-50 to-indigo-100 dark:from-violet-950 dark:to-indigo-900 ring-1 ring-violet-200/60 dark:ring-violet-900/60 rounded-3xl shadow-card"
      }`}
    >
      {!compact && (
        <>
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-violet-600 dark:text-violet-300" strokeWidth={2.2} />
            {t.card.pairBoxTitle}
          </h2>
          <p className="text-sm text-slate-700 dark:text-slate-200 mb-4 leading-relaxed">
            {t.card.pairBoxDesc}
          </p>
        </>
      )}

      <div className="flex gap-2">
        <input
          inputMode="text"
          maxLength={6}
          value={code}
          onChange={(e) =>
            setCode(e.target.value.toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g, ""))
          }
          placeholder={t.card.pairBoxPlaceholder}
          className="flex-1 h-14 px-4 text-2xl font-mono font-bold tracking-widest tabular-nums text-center rounded-2xl bg-white dark:bg-slate-900 shadow-card border border-transparent focus:border-blue-500 focus:outline-none uppercase"
        />
        <button
          onClick={handleSubmit}
          disabled={busy || code.length !== 6}
          className="px-5 h-14 bg-blue-600 active:bg-blue-700 text-white rounded-2xl font-bold disabled:opacity-40"
        >
          {busy ? "…" : t.card.pairBoxBindBtn}
        </button>
      </div>
      {msg && (
        <div
          className={`mt-3 p-3 rounded-xl text-sm ${
            msg.ok
              ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-100 ring-1 ring-emerald-300/60 dark:ring-emerald-800"
              : "bg-red-50 dark:bg-red-950 text-red-900 dark:text-red-100 ring-1 ring-red-300/60 dark:ring-red-800"
          }`}
        >
          {msg.text}
        </div>
      )}
      {!compact && (
        <Link
          href="/family-setup"
          className="block text-center text-xs text-violet-700 dark:text-violet-300 underline mt-3"
        >
          {t.card.pairBoxTutorial}
        </Link>
      )}
    </div>
  );
}

function ElderCardView({
  paired,
  showSensitive,
  onToggleSensitive,
}: {
  paired: PairedElder;
  showSensitive: boolean;
  onToggleSensitive: () => void;
}) {
  const t = useT();
  if (!paired.card) {
    return (
      <div className="p-5 bg-amber-50 dark:bg-amber-950 ring-1 ring-amber-300/60 dark:ring-amber-800 rounded-3xl shadow-card">
        <div className="flex items-start gap-3">
          <AlertTriangle
            className="w-6 h-6 text-amber-600 dark:text-amber-300 mt-0.5 shrink-0"
            strokeWidth={2.2}
          />
          <div>
            <h2 className="text-base font-bold text-amber-900 dark:text-amber-100">
              {t.card.pairCard.familyNotUploaded}
            </h2>
            <p className="text-sm text-amber-800 dark:text-amber-200 mt-1 leading-relaxed">
              {t.card.pairCard.familyNotUploadedDesc.replace(
                "{name}",
                paired.displayName ?? "—"
              )}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const card = paired.card;
  const updatedDate = card.updatedAt
    ? new Date(card.updatedAt).toLocaleDateString("zh-TW", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
    : "—";

  return (
    <div className="space-y-3">
      {/* Hero */}
      <div className="p-5 bg-gradient-to-br from-violet-50 to-indigo-100 dark:from-violet-950 dark:to-indigo-900 ring-1 ring-violet-200/60 dark:ring-violet-900/60 rounded-3xl shadow-card">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-14 h-14 rounded-2xl bg-white/80 dark:bg-slate-900/40 flex items-center justify-center shadow-card shrink-0">
            <User
              className="w-7 h-7 text-violet-600 dark:text-violet-300"
              strokeWidth={2.2}
            />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white truncate">
              {card.name}
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              {card.gender === "male" && t.card.pairCard.maleSuffix}
              {card.gender === "female" && t.card.pairCard.femaleSuffix}
              {card.bloodType && ` · ${card.bloodType} ${t.card.pairCard.bloodType}`}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs text-slate-700 dark:text-slate-300">
          {card.birthday && (
            <div className="flex items-center gap-1">
              <Cake className="w-3.5 h-3.5" strokeWidth={2.2} />
              <span>{card.birthday}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <span>{t.card.pairCard.updated}: {updatedDate}</span>
          </div>
        </div>
      </div>

      <button
        onClick={onToggleSensitive}
        className="w-full flex items-center justify-center gap-2 h-11 bg-slate-100 dark:bg-slate-800 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200"
      >
        {showSensitive ? (
          <>
            <EyeOff className="w-4 h-4" strokeWidth={2.2} />
            {t.card.pairCard.hideSensitive}
          </>
        ) : (
          <>
            <Eye className="w-4 h-4" strokeWidth={2.2} />
            {t.card.pairCard.showSensitive}
          </>
        )}
      </button>

      {card.history && (
        <Section title={t.card.pairCard.sectionHistory} Icon={Stethoscope}>
          <p className={showSensitive ? "" : "blur-sm select-none"}>
            {card.history}
          </p>
        </Section>
      )}

      {card.allergies && (
        <Section title={t.card.pairCard.sectionAllergies} Icon={AlertTriangle} accent="red">
          <p>{card.allergies}</p>
        </Section>
      )}

      {card.medications && card.medications.length > 0 && (
        <Section title={t.card.pairCard.sectionMedications} Icon={Pill}>
          <ul className="space-y-2">
            {card.medications.map((m, i) => (
              <li
                key={i}
                className={`p-3 rounded-xl bg-slate-50 dark:bg-slate-800 ${
                  showSensitive ? "" : "blur-sm select-none"
                }`}
              >
                <div className="font-semibold">{m.name}</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {m.dose} · {m.time}
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {(card.doctor || card.hospital) && (
        <Section title={t.card.pairCard.sectionDoctor} Icon={Hospital}>
          {card.doctor && <p>{t.card.pairCard.doctorLabel}: {card.doctor}</p>}
          {card.hospital && <p className="mt-1">{t.card.pairCard.hospitalLabel}: {card.hospital}</p>}
        </Section>
      )}

      {card.contacts && card.contacts.length > 0 && (
        <Section title={t.card.pairCard.sectionContacts} Icon={Phone}>
          <ul className="space-y-2">
            {card.contacts.map((c, i) => (
              <li key={i} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                <div className="font-semibold">
                  {c.name}{" "}
                  <span className="text-xs text-slate-500 font-normal">
                    （{c.relation}）
                  </span>
                </div>
                {c.phone && (
                  <a
                    href={`tel:${c.phone}`}
                    className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 mt-1"
                  >
                    <Phone className="w-3.5 h-3.5" strokeWidth={2.2} />
                    {c.phone}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <div className="text-xs text-slate-400 text-center pt-2">
        {t.card.pairCard.readonlyFooter}
      </div>
    </div>
  );
}

function Section({
  title,
  Icon,
  accent,
  children,
}: {
  title: string;
  Icon: typeof Pill;
  accent?: "red";
  children: React.ReactNode;
}) {
  const titleColor =
    accent === "red"
      ? "text-red-600 dark:text-red-400"
      : "text-slate-900 dark:text-white";
  const iconColor =
    accent === "red"
      ? "text-red-600 dark:text-red-400"
      : "text-violet-600 dark:text-violet-300";
  return (
    <section className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-card">
      <h3 className="text-sm font-bold flex items-center gap-1.5 mb-2">
        <Icon className={`w-4 h-4 ${iconColor}`} strokeWidth={2.2} />
        <span className={titleColor}>{title}</span>
      </h3>
      <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
        {children}
      </div>
    </section>
  );
}
