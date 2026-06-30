"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  IdCard,
  NotebookPen,
  LifeBuoy,
  Send,
  type LucideIcon,
} from "lucide-react";
import { getRole, type Role } from "@/lib/role";
import { useT } from "@/lib/i18n";

type Item = { href: string; Icon: LucideIcon; label: string; danger?: boolean };

export default function BottomNav() {
  const pathname = usePathname();
  const [role, setRole] = useState<Role | null>(null);
  const t = useT();

  useEffect(() => {
    const syncRole = () => setRole(getRole());
    syncRole();
    window.addEventListener("app-role-changed", syncRole);
    return () => window.removeEventListener("app-role-changed", syncRole);
  }, [pathname]);

  const CAREGIVER_ITEMS: Item[] = [
    { href: "/", Icon: Home, label: t.nav.home },
    { href: "/card", Icon: IdCard, label: t.nav.card },
    { href: "/record", Icon: NotebookPen, label: t.nav.record },
    { href: "/help", Icon: LifeBuoy, label: t.nav.help, danger: true },
  ];

  // 家屬端維持中文(目標族群是台灣家屬)
  const FAMILY_ITEMS: Item[] = [
    { href: "/family", Icon: Home, label: "首頁" },
    { href: "/family/card", Icon: IdCard, label: "醫護卡" },
    { href: "/family-setup", Icon: Send, label: "連線教學" },
    { href: "/help", Icon: LifeBuoy, label: "我需要協助", danger: true },
  ];

  if (!role) return null;

  const items = role === "family" ? FAMILY_ITEMS : CAREGIVER_ITEMS;

  const isActive = (href: string) => {
    if (href === "/" || href === "/family") return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/60 dark:border-slate-800/60 pb-[env(safe-area-inset-bottom)] z-30 shadow-lift">
      <div className="grid grid-cols-4 gap-1 p-2">
        {items.map((it) => {
          const active = isActive(it.href);
          const baseCls = "flex flex-col items-center gap-1 py-2 rounded-xl transition-all";
          let cls = baseCls;
          let iconCls = "w-6 h-6";
          if (it.danger) {
            cls += active
              ? " bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900 dark:to-red-800 shadow-card"
              : " bg-red-50 dark:bg-red-950/50 active:bg-red-100 dark:active:bg-red-900";
            iconCls += " text-red-600 dark:text-red-300";
          } else {
            cls += active
              ? " bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 shadow-card"
              : " active:bg-slate-100 dark:active:bg-slate-800";
            iconCls += active
              ? " text-blue-600 dark:text-blue-300"
              : " text-slate-500 dark:text-slate-400";
          }
          const labelCls = it.danger
            ? "text-xs font-bold text-red-700 dark:text-red-300"
            : active
            ? "text-xs font-bold text-blue-700 dark:text-blue-300"
            : "text-xs font-medium text-slate-600 dark:text-slate-400";
          return (
            <Link key={it.href} href={it.href} className={cls}>
              <it.Icon className={iconCls} strokeWidth={2.2} />
              <span className={labelCls}>{it.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
