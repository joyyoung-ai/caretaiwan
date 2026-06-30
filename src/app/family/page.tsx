"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  IdCard,
  Send,
  ArrowRight,
  Plus,
  Cloud,
  type LucideIcon,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import RoleSwitcher from "@/components/RoleSwitcher";
import { Info } from "@/components/icons";
import { loginWithLine } from "@/app/actions/auth-actions";
import { getRole } from "@/lib/role";
import { getStore, type Elder } from "@/lib/elder";

type SessionInfo =
  | { loggedIn: false }
  | { loggedIn: true; name: string | null; picture: string | null };

export default function FamilyHome() {
  const router = useRouter();
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [elders, setElders] = useState<Elder[]>([]);

  useEffect(() => {
    if (getRole() === "caregiver") router.replace("/");
  }, [router]);

  useEffect(() => {
    fetch("/api/session")
      .then((r) => r.json())
      .then((s) => setSession(s))
      .catch(() => setSession({ loggedIn: false }));
  }, []);

  useEffect(() => {
    setElders(getStore().elders);
  }, []);

  return (
    <main className="flex flex-col flex-1 pb-40">
      <header className="px-5 pt-6 pb-4 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            家屬端
          </h1>
          <p className="text-sm text-violet-600 dark:text-violet-400 font-medium">
            CareTaiwan Family
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href="/about"
            aria-label="關於"
            className="w-11 h-11 flex items-center justify-center rounded-full bg-white/70 dark:bg-slate-800/70 shadow-card active:scale-95 transition-transform"
          >
            <Info
              className="w-5 h-5 text-violet-600 dark:text-violet-300"
              strokeWidth={2.2}
            />
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {/* Login required */}
      {session === null && (
        <div className="px-5">
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-card text-sm text-slate-500 text-center">
            載入中…
          </div>
        </div>
      )}

      {session?.loggedIn === false && (
        <div className="px-5 mb-4 space-y-3">
          <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl shadow-card">
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-3">
              👋 歡迎家屬端
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
              你會在這裡建立老人的醫護卡，產生配對碼給看護，並接收看護的日常記錄推播。
            </p>
            <ol className="space-y-3">
              <OnboardStep n={1} title="用 LINE 登入" desc="按下方按鈕登入（雲端備份用）" />
              <OnboardStep n={2} title="建立老人醫護卡" desc="填入用藥、過敏、緊急聯絡人" />
              <OnboardStep n={3} title="加 LINE Bot 為好友" desc="掃 QR 加入，才能收推播" />
              <OnboardStep n={4} title="產生配對碼給看護" desc="6 位英數字，看護輸入後完成配對" />
            </ol>
          </div>

          <div className="p-5 bg-gradient-to-br from-violet-50 to-indigo-100 dark:from-violet-950 dark:to-indigo-900 ring-1 ring-violet-200/60 dark:ring-violet-900/60 rounded-3xl shadow-card">
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2">
              第 1 步：用 LINE 登入
            </h2>
            <p className="text-sm text-slate-700 dark:text-slate-200 mb-4 leading-relaxed">
              登入後資料會自動雲端備份，看護端用同樣的 LINE 登入後輸入你的配對碼，就能看到醫護卡。
            </p>
            <form action={loginWithLine}>
              <button
                type="submit"
                className="w-full h-14 bg-emerald-600 active:bg-emerald-700 text-white rounded-2xl font-bold"
              >
                用 LINE 登入
              </button>
            </form>
          </div>

          <Link
            href="/family-setup"
            className="flex items-center gap-3 p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-card active:scale-[0.98] transition-transform"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center shrink-0">
              <Send className="w-5 h-5 text-blue-600 dark:text-blue-300" strokeWidth={2.2} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                看 5 步配對教學
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                含 QR code、Bot ID、故障排除
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400 shrink-0" strokeWidth={2.2} />
          </Link>
        </div>
      )}

      {/* Logged in */}
      {session?.loggedIn === true && (
        <>
          <div className="px-5 mb-3">
            <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 rounded-2xl shadow-card">
              {session.picture && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={session.picture} alt="" className="w-10 h-10 rounded-full" />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">
                  {session.name || "LINE 使用者"}
                </div>
                <div className="text-xs text-slate-500">已登入</div>
              </div>
            </div>
          </div>

          <div className="px-5 mb-3">
            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-card">
              <div className="text-sm font-bold text-slate-900 dark:text-white mb-2">
                POC 測試身份
              </div>
              <RoleSwitcher />
            </div>
          </div>

          {/* Elders summary */}
          <div className="px-5 mt-2">
            <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-3">
              老人醫護卡
            </h2>
            {elders.length === 0 ? (
              <Link
                href="/family/card/edit?id=new"
                className="flex flex-col items-center justify-center gap-3 p-8 bg-gradient-to-br from-violet-50 to-indigo-100 dark:from-violet-950 dark:to-indigo-900 ring-1 ring-violet-200/60 dark:ring-violet-900/60 rounded-3xl shadow-card active:scale-[0.98] transition-transform text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-white/80 dark:bg-slate-900/40 flex items-center justify-center shadow-card">
                  <Plus className="w-9 h-9 text-violet-600 dark:text-violet-300" strokeWidth={2.4} />
                </div>
                <div>
                  <div className="text-base font-bold text-slate-900 dark:text-white">
                    建立第一位老人醫護卡
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                    填入姓名、用藥、緊急聯絡人等資料
                  </div>
                </div>
              </Link>
            ) : (
              <Link
                href="/family/card"
                className="flex items-center gap-3 p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-card active:scale-[0.98] transition-transform"
              >
                <div className="w-12 h-12 rounded-2xl bg-violet-50 dark:bg-violet-950 flex items-center justify-center shrink-0">
                  <IdCard className="w-6 h-6 text-violet-600 dark:text-violet-300" strokeWidth={2.2} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-base font-bold text-slate-900 dark:text-white">
                    {elders.length} 位老人
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    管理醫護卡 · 產生配對碼
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-400 shrink-0" strokeWidth={2.2} />
              </Link>
            )}
          </div>

          {/* Quick actions */}
          <div className="px-5 mt-5">
            <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-3">
              其他功能
            </h2>
            <div className="space-y-2">
              <Link
                href="/family/expense"
                className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-950 rounded-2xl active:bg-blue-100 dark:active:bg-blue-900"
              >
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center text-2xl shrink-0">
                  💰
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-blue-900 dark:text-blue-100">
                    記帳本
                  </div>
                  <div className="text-xs text-blue-700 dark:text-blue-300">
                    看護幫長者買的東西 / 待核帳
                  </div>
                </div>
              </Link>
              <QuickRow
                href="/family-setup"
                Icon={Send}
                title="LINE Bot 連線教學"
                sub="家屬如何收到推播 / 5 步教學"
                color="bg-blue-50 dark:bg-blue-950"
                iconColor="text-blue-600 dark:text-blue-300"
              />
              <QuickRow
                href="/backup"
                Icon={Cloud}
                title="雲端備份"
                sub="LINE 登入 / 加密備份 / 刪除資料"
                color="bg-sky-50 dark:bg-sky-950"
                iconColor="text-sky-600 dark:text-sky-300"
              />
            </div>
          </div>
        </>
      )}
    </main>
  );
}

function OnboardStep({
  n,
  title,
  desc,
}: {
  n: number;
  title: string;
  desc: string;
}) {
  return (
    <li className="flex items-start gap-3">
      <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center text-xs font-bold shrink-0">
        {n}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-slate-900 dark:text-white">{title}</div>
        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{desc}</div>
      </div>
    </li>
  );
}

function QuickRow({
  href,
  Icon,
  title,
  sub,
  color,
  iconColor,
}: {
  href: string;
  Icon: LucideIcon;
  title: string;
  sub: string;
  color: string;
  iconColor: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-card active:scale-[0.98] transition-transform"
    >
      <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center shrink-0`}>
        <Icon className={`w-5 h-5 ${iconColor}`} strokeWidth={2.2} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-slate-900 dark:text-white">{title}</div>
        <div className="text-xs text-slate-500 mt-0.5">{sub}</div>
      </div>
      <ArrowRight className="w-5 h-5 text-slate-400 shrink-0" strokeWidth={2.2} />
    </Link>
  );
}
