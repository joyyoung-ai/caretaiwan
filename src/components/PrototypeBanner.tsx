"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

const DISMISS_KEY = "prototype-banner-dismissed";
const CONSENT_KEY = "consent-v1";

export default function PrototypeBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // 同意條款後不再顯示（避免跟 ConsentModal 訊息重複）
    if (localStorage.getItem(CONSENT_KEY)) return;
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (!dismissed) setShow(true);
  }, []);

  if (!show) return null;

  return (
    <div className="bg-amber-50 dark:bg-amber-950 border-b border-amber-200 dark:border-amber-800 px-4 py-2.5 flex items-start gap-2">
      <AlertTriangle
        className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0"
        strokeWidth={2.4}
      />
      <div className="flex-1 text-xs text-amber-900 dark:text-amber-100 leading-relaxed">
        <strong>試辦版</strong> — 僅供受邀測試與導入準備使用，不取代醫療建議。緊急狀況請撥 <strong>119</strong>。
      </div>
      <button
        onClick={() => {
          localStorage.setItem(DISMISS_KEY, "1");
          setShow(false);
        }}
        aria-label="關閉提示"
        className="shrink-0 w-5 h-5 flex items-center justify-center rounded text-amber-700 dark:text-amber-300 active:bg-amber-100 dark:active:bg-amber-900"
      >
        <X className="w-3.5 h-3.5" strokeWidth={2.4} />
      </button>
    </div>
  );
}
