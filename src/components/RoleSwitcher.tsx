"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, Users } from "lucide-react";
import { getRole, setRole, type Role } from "@/lib/role";

export default function RoleSwitcher() {
  const router = useRouter();
  const [current, setCurrent] = useState<Role | null>(null);

  useEffect(() => {
    setCurrent(getRole());
  }, []);

  const switchTo = (role: Role) => {
    setRole(role);
    window.dispatchEvent(new Event("app-role-changed"));
    setCurrent(role);
    router.push(role === "family" ? "/family" : "/");
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        onClick={() => switchTo("caregiver")}
        className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-colors ${
          current === "caregiver"
            ? "bg-emerald-100 dark:bg-emerald-900 ring-2 ring-emerald-500"
            : "bg-slate-100 dark:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700"
        }`}
      >
        <Heart
          className={`w-6 h-6 ${
            current === "caregiver"
              ? "text-emerald-600 dark:text-emerald-300"
              : "text-slate-500"
          }`}
          strokeWidth={2.2}
        />
        <span
          className={`text-sm font-bold ${
            current === "caregiver"
              ? "text-emerald-900 dark:text-emerald-100"
              : "text-slate-700 dark:text-slate-200"
          }`}
        >
          看護端
        </span>
        {current === "caregiver" && (
          <span className="text-xs text-emerald-700 dark:text-emerald-300">目前</span>
        )}
      </button>
      <button
        onClick={() => switchTo("family")}
        className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-colors ${
          current === "family"
            ? "bg-violet-100 dark:bg-violet-900 ring-2 ring-violet-500"
            : "bg-slate-100 dark:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700"
        }`}
      >
        <Users
          className={`w-6 h-6 ${
            current === "family"
              ? "text-violet-600 dark:text-violet-300"
              : "text-slate-500"
          }`}
          strokeWidth={2.2}
        />
        <span
          className={`text-sm font-bold ${
            current === "family"
              ? "text-violet-900 dark:text-violet-100"
              : "text-slate-700 dark:text-slate-200"
          }`}
        >
          家屬端
        </span>
        {current === "family" && (
          <span className="text-xs text-violet-700 dark:text-violet-300">目前</span>
        )}
      </button>
    </div>
  );
}
