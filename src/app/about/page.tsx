"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";
import RoleSwitcher from "@/components/RoleSwitcher";
import { getRole } from "@/lib/role";

export default function AboutPage() {
  const [backHref, setBackHref] = useState("/");
  useEffect(() => {
    setBackHref(getRole() === "family" ? "/family" : "/");
  }, []);
  return (
    <main className="flex flex-col flex-1 pb-32">
      <header className="px-5 pt-4 pb-3 flex items-center gap-3">
        <Link
          href={backHref}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/70 dark:bg-slate-800/70 shadow-card active:scale-95 transition-transform"
        >
          <ChevronLeft className="w-5 h-5 text-slate-700 dark:text-slate-200" strokeWidth={2.4} />
        </Link>
        <h1 className="text-xl font-bold">關於本 APP</h1>
      </header>

      <div className="px-5 pt-5 space-y-4">
        <Section title="🩺 看護助手 CareTaiwan">
          <p>給在台外籍家庭看護工與家屬的**長照記錄與溝通工具**：</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>每日健康記錄（體溫、吃藥、跌倒、進食、睡眠、排便）</li>
            <li>看護備註，記錄當下狀況補充說明</li>
            <li>選擇性送家屬：看護按下「送出」家屬才收到 LINE 推播</li>
            <li>多老人醫護卡（用藥、過敏、就診醫院、緊急聯絡人）</li>
            <li>離線可用 PWA、可加到主畫面</li>
          </ul>
        </Section>

        <Section title="⚠️ 重要聲明" emphasis>
          <ul className="space-y-2">
            <li>
              <strong>本服務不提供醫療建議</strong>。所有照護判斷請依專業醫護人員指示。
            </li>
            <li>
              <strong>緊急狀況請撥 119</strong>。本 APP 不取代任何緊急醫療管道。
            </li>
            <li>
              本服務目前仍在試辦與導入準備階段，不對照護結果、LINE 推播送達或提醒即時性做保證。
              正式版上線前會重新審閱法律文件。
            </li>
          </ul>
        </Section>

        <Section title="🔒 隱私保證">
          <ul className="space-y-1.5">
            <li>・所有資料優先存在你這支手機，登入 LINE 才會有雲端備份選項</li>
            <li>・看護備註要按「送出給家屬」才會傳出去</li>
            <li>・「緊急電話」這個按鈕不會通知雇主／家屬</li>
            <li>・備份頁有「刪除全部資料」按鈕（個資法刪除權）</li>
          </ul>
        </Section>

        <Section title="📦 版本">
          <ul className="space-y-1">
            <li>v0.4 ─ 中揚資訊試辦版草案</li>
            <li>新增：照護行程、看護請假、production migration 與特種個資同意機制</li>
            <li>支援離線使用、PWA 可加到主畫面</li>
          </ul>
        </Section>

        <Section title="💾 備份你的資料">
          <p className="mb-2">資料只存在你這支手機。為避免 iOS／瀏覽器清除，請定期備份：</p>
          <Link
            href="/backup"
            className="inline-block px-4 h-11 leading-[2.75rem] bg-blue-600 active:bg-blue-700 text-white rounded-xl font-semibold"
          >
            前往備份頁
          </Link>
        </Section>

        <Section title="📮 客服與意見回報">
          <p className="mb-3">
            個資權利行使（查詢、更正、刪除）、bug 回報、功能建議，
            請透過下列信箱聯繫，我們會在 15 個工作日內回應。
          </p>
          <div className="space-y-3 text-sm">
            <a
              href="mailto:services@joyyoung.com.tw"
              className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950 active:bg-blue-100 dark:active:bg-blue-900 rounded-xl border border-blue-200 dark:border-blue-800"
            >
              <span className="text-2xl">📧</span>
              <div className="flex-1">
                <div className="font-semibold text-blue-900 dark:text-blue-100">
                  寄信給客服
                </div>
                <div className="text-xs text-blue-700 dark:text-blue-300 break-all">
                  services@joyyoung.com.tw
                </div>
              </div>
            </a>
          </div>
        </Section>

        <Section title="🔄 切換身分">
          <p className="mb-3">你目前是哪一邊？切換後會回到對應首頁。</p>
          <RoleSwitcher />
        </Section>

        <Section title="📖 使用教學">
          <p className="mb-2">5 個主要功能怎麼用：</p>
          <Link
            href="/tutorial"
            className="inline-block px-4 h-11 leading-[2.75rem] bg-blue-600 active:bg-blue-700 text-white rounded-xl font-semibold"
          >
            前往教學總覽 →
          </Link>
        </Section>

        <Section title="📜 條款與政策">
          <div className="flex flex-col gap-2">
            <Link
              href="/privacy"
              className="text-blue-600 dark:text-blue-400 underline"
            >
              隱私權政策
            </Link>
            <Link
              href="/terms"
              className="text-blue-600 dark:text-blue-400 underline"
            >
              服務條款
            </Link>
          </div>
        </Section>
      </div>
    </main>
  );
}

function Section({
  title,
  emphasis,
  children,
}: {
  title: string;
  emphasis?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`p-4 rounded-2xl shadow-card ${
        emphasis
          ? "bg-amber-50 dark:bg-amber-950 ring-1 ring-amber-300/60 dark:ring-amber-800"
          : "bg-white dark:bg-slate-900"
      }`}
    >
      <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2">
        {title}
      </h2>
      <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
        {children}
      </div>
    </section>
  );
}
