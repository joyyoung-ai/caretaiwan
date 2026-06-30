"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, Users, ArrowRight } from "lucide-react";
import { getRole, setRole as saveRole } from "@/lib/role";
import { useT } from "@/lib/i18n";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const CONSENT_KEY = "consent-v1";

export default function RolePicker() {
  const router = useRouter();
  const [show, setShow] = useState<boolean | null>(null);
  const t = useT();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sync = () => {
      // 必須先同意條款才會問角色
      const consented = localStorage.getItem(CONSENT_KEY);
      if (!consented) {
        setShow(false);
        return;
      }
      if (getRole()) {
        setShow(false);
        return;
      }
      setShow(true);
    };
    sync();
    window.addEventListener("app-consent-changed", sync);
    window.addEventListener("app-role-changed", sync);
    return () => {
      window.removeEventListener("app-consent-changed", sync);
      window.removeEventListener("app-role-changed", sync);
    };
  }, []);

  const pick = (role: "caregiver" | "family") => {
    saveRole(role);
    window.dispatchEvent(new Event("app-role-changed"));
    setShow(false);
    if (role === "family") router.push("/family");
    else router.push("/");
  };

  if (show !== true) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="role-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4"
    >
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-lift overflow-hidden">
        <div className="px-6 pt-6 pb-4 bg-gradient-to-br from-blue-50 to-sky-100 dark:from-blue-950 dark:to-sky-900">
          <h2
            id="role-title"
            className="text-xl font-extrabold text-slate-900 dark:text-white"
          >
            {t.rolePicker.title}
          </h2>
          <p className="text-sm text-slate-700 dark:text-slate-200 mt-1">
            {t.rolePicker.subtitle}
          </p>
        </div>

        {/* 語言選擇 (放在最上方,讓不識中文的看護工先選自己懂的) */}
        <div className="px-5 pt-5">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
            {t.rolePicker.languageLabel}
          </p>
          <LanguageSwitcher variant="inline" />
        </div>

        <div className="p-5 space-y-3">
          <RoleOption
            label={t.rolePicker.caregiver}
            sub={t.rolePicker.caregiverSub}
            features={t.rolePicker.caregiverFeatures}
            Icon={Heart}
            color="from-emerald-50 to-teal-100 dark:from-emerald-950 dark:to-teal-900 ring-emerald-200/60 dark:ring-emerald-900/60"
            iconColor="text-emerald-600 dark:text-emerald-300"
            onClick={() => pick("caregiver")}
          />
          <RoleOption
            label={t.rolePicker.family}
            sub={t.rolePicker.familySub}
            features={t.rolePicker.familyFeatures}
            Icon={Users}
            color="from-violet-50 to-indigo-100 dark:from-violet-950 dark:to-indigo-900 ring-violet-200/60 dark:ring-violet-900/60"
            iconColor="text-violet-600 dark:text-violet-300"
            onClick={() => pick("family")}
          />
        </div>
      </div>
    </div>
  );
}

function RoleOption({
  label,
  sub,
  features,
  Icon,
  color,
  iconColor,
  onClick,
}: {
  label: string;
  sub: string;
  features: string[];
  Icon: typeof Heart;
  color: string;
  iconColor: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-2xl shadow-card bg-gradient-to-br ring-1 ${color} active:scale-[0.98] transition-transform`}
    >
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-2xl bg-white/80 dark:bg-slate-900/40 flex items-center justify-center shadow-card shrink-0">
          <Icon className={`w-6 h-6 ${iconColor}`} strokeWidth={2.2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {label}
            </h3>
            <ArrowRight
              className="w-4 h-4 text-slate-400 ml-auto"
              strokeWidth={2.4}
            />
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
            {sub}
          </p>
          <ul className="mt-2 space-y-0.5">
            {features.map((f, i) => (
              <li
                key={i}
                className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5"
              >
                <span className="w-1 h-1 rounded-full bg-slate-400 inline-block" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </button>
  );
}
