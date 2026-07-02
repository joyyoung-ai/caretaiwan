"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ChevronLeft,
  NotebookPen,
  Send,
  Cloud,
  LifeBuoy,
  RotateCcw,
  Check,
  ArrowRight,
  KeyRound,
  type LucideIcon,
} from "lucide-react";

export default function TutorialPage() {
  const [resetMsg, setResetMsg] = useState<string | null>(null);

  const handleResetOnboarding = () => {
    if (typeof window === "undefined") return;
    localStorage.removeItem("onboarding-dismissed");
    setResetMsg("已重設！回首頁就會看到「下一步」引導卡片。");
    setTimeout(() => setResetMsg(null), 4000);
  };

  return (
    <main className="flex flex-col flex-1 pb-32">
      <header className="px-5 pt-4 pb-3 flex items-center gap-3">
        <Link
          href="/"
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/70 dark:bg-slate-800/70 shadow-card active:scale-95 transition-transform"
        >
          <ChevronLeft
            className="w-5 h-5 text-slate-700 dark:text-slate-200"
            strokeWidth={2.4}
          />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold">使用教學</h1>
          <p className="text-xs text-slate-500">5 個主要功能怎麼用</p>
        </div>
      </header>

      {/* Reset toast */}
      {resetMsg && (
        <div className="px-5 pt-2">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950 ring-1 ring-emerald-300/60 dark:ring-emerald-800 rounded-xl text-sm text-emerald-900 dark:text-emerald-100 flex items-start gap-2">
            <Check
              className="w-5 h-5 text-emerald-600 dark:text-emerald-300 mt-0.5 shrink-0"
              strokeWidth={2.4}
            />
            <div>{resetMsg}</div>
          </div>
        </div>
      )}

      {/* Intro */}
      <div className="px-5 pt-3 pb-2">
        <div className="p-4 bg-gradient-to-br from-blue-50 to-sky-100 dark:from-blue-950 dark:to-sky-900 ring-1 ring-blue-200/60 dark:ring-blue-900/60 rounded-2xl">
          <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
            看護端流程：家屬建立醫護卡並產生配對碼 → 你輸入碼 → 你做 3 秒記錄 → 推播給家屬。
          </p>
        </div>
      </div>

      {/* Steps */}
      <div className="px-5 mt-4 space-y-3">
        <TutorialCard
          n={1}
          Icon={KeyRound}
          title="輸入家屬給的配對碼"
          desc="第一步必做。醫護卡由家屬建立，你輸入 6 位配對碼後就能讀到老人資料（病史、用藥、過敏、緊急聯絡人）。"
          bullets={[
            "用 LINE 登入後再輸入碼",
            "配對碼 24 小時內有效，過期請家屬重產",
            "看護端為唯讀；要修改請通知家屬",
          ]}
          cta="去輸入配對碼"
          href="/card"
          color="from-violet-50 to-indigo-100 dark:from-violet-950 dark:to-indigo-900 ring-violet-200/60 dark:ring-violet-900/60"
          iconColor="text-violet-600 dark:text-violet-300"
        />

        <TutorialCard
          n={2}
          Icon={NotebookPen}
          title="3 秒記錄"
          desc="每次老人有變化就點一下記錄。6 種項目：體溫、排便、睡眠、跌倒、吃藥、吃飯。"
          bullets={[
            "點選類型 → 加備註（5 個快捷短語可選 / 自由文字 / 跳過）",
            "想送家屬就把切到「🟢 送出給家屬」（預設關）",
            "歷史記錄可在這頁一鍵清除",
          ]}
          cta="去做記錄"
          href="/record"
          color="from-blue-50 to-sky-100 dark:from-blue-950 dark:to-sky-900 ring-blue-200/60 dark:ring-blue-900/60"
          iconColor="text-blue-600 dark:text-blue-300"
        />

        <TutorialCard
          n={3}
          Icon={Send}
          title="家屬 LINE Bot 推播流程"
          desc="家屬端產生 6 位配對碼給你，你輸入後即配對。家屬另外加 LINE Bot 為好友後，你按「送出給家屬」家屬即時收到。"
          bullets={[
            "配對碼由家屬端產生（24 小時內有效）",
            "你在第 1 步「醫護卡」頁面輸入此碼",
            "家屬要自行加 Bot 為好友才能收推播",
          ]}
          cta="看完整教學"
          href="/family-setup"
          color="from-emerald-50 to-teal-100 dark:from-emerald-950 dark:to-teal-900 ring-emerald-200/60 dark:ring-emerald-900/60"
          iconColor="text-emerald-600 dark:text-emerald-300"
          recommended
        />

        <TutorialCard
          n={4}
          Icon={Cloud}
          title="登入 / 雲端"
          desc="LINE 登入主要用於配對碼驗證；3 秒記錄都存在你這支手機，也可下載加密備份檔自行轉移。"
          bullets={[
            "用 LINE 登入後才能輸入配對碼",
            "記錄(本地)可下載 .json 加密備份",
            "想換手機就把備份檔搬過去再還原",
          ]}
          cta="去備份頁"
          href="/backup"
          color="from-sky-50 to-cyan-100 dark:from-sky-950 dark:to-cyan-900 ring-sky-200/60 dark:ring-sky-900/60"
          iconColor="text-sky-600 dark:text-sky-300"
        />

        <TutorialCard
          n={5}
          Icon={LifeBuoy}
          title="緊急電話"
          desc="119 / 110 / 1955 移工專線 / 0800-474-580 失智關懷專線等公開電話。"
          bullets={[
            "點電話直接撥號",
            "「我需要協助」不會通知雇主／家屬",
            "緊急狀況請優先打 119",
          ]}
          cta="看電話清單"
          href="/help"
          color="from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 ring-red-200/60 dark:ring-red-900/60"
          iconColor="text-red-600 dark:text-red-300"
        />
      </div>

      {/* Reset onboarding */}
      <div className="px-5 mt-6">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
          🔄 重新顯示首頁引導
        </h2>
        <button
          onClick={handleResetOnboarding}
          className="w-full flex items-center justify-between gap-2 px-4 h-14 bg-white dark:bg-slate-900 rounded-2xl shadow-card active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center">
              <RotateCcw
                className="w-5 h-5 text-blue-600 dark:text-blue-300"
                strokeWidth={2.2}
              />
            </div>
            <div className="text-left">
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                重設「下一步」引導
              </div>
              <div className="text-xs text-slate-500">
                如果你按過「稍後再說」想再看引導
              </div>
            </div>
          </div>
          <ArrowRight
            className="w-5 h-5 text-slate-400 shrink-0"
            strokeWidth={2.2}
          />
        </button>
      </div>

      <div className="px-5 mt-5">
        <Link
          href="/about"
          className="block text-center text-sm text-blue-600 dark:text-blue-400 underline py-2"
        >
          關於本 APP（隱私／條款）
        </Link>
      </div>
    </main>
  );
}

function TutorialCard({
  n,
  Icon,
  title,
  desc,
  bullets,
  cta,
  href,
  color,
  iconColor,
  recommended,
}: {
  n: number;
  Icon: LucideIcon;
  title: string;
  desc: string;
  bullets: string[];
  cta: string;
  href: string;
  color: string;
  iconColor: string;
  recommended?: boolean;
}) {
  return (
    <div
      className={`relative p-5 rounded-3xl shadow-card bg-gradient-to-br ring-1 ${color}`}
    >
      {recommended && (
        <span className="absolute top-3 right-3 text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white">
          推薦
        </span>
      )}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-12 h-12 rounded-2xl bg-white/70 dark:bg-slate-900/40 flex items-center justify-center shadow-card shrink-0">
          <Icon className={`w-6 h-6 ${iconColor}`} strokeWidth={2.2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            第 {n} 項
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
            {title}
          </h3>
        </div>
      </div>
      <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed mb-3">
        {desc}
      </p>
      <ul className="space-y-1 mb-4">
        {bullets.map((b, i) => (
          <li
            key={i}
            className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
            <span className="flex-1">{b}</span>
          </li>
        ))}
      </ul>
      <Link
        href={href}
        className="flex items-center justify-center gap-2 w-full h-11 bg-white dark:bg-slate-900 rounded-xl text-sm font-bold text-slate-900 dark:text-white shadow-card active:scale-[0.98] transition-transform"
      >
        {cta}
        <ArrowRight className="w-4 h-4" strokeWidth={2.4} />
      </Link>
    </div>
  );
}
