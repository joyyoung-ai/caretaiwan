"use client";

import { useEffect, useRef, useState } from "react";
import { ShieldCheck, Lock, FileText, ChevronDown, Check } from "lucide-react";
import { PrivacyContent, TermsContent } from "@/components/legal/PolicyContent";

const CONSENT_KEY = "consent-v1";
// 版本變動時 bump 這個（例如政策大改），會讓所有使用者重新同意
// v2 (2026-05-15): Closed Beta 版本，加入特種個資獨立勾選
const CURRENT_VERSION = 2;

type ConsentRecord = {
  version: number;
  agreedAt: number;
  sensitiveDataConsent?: boolean;
};

type SectionId = "privacy" | "terms";

export default function ConsentModal() {
  const [needsConsent, setNeedsConsent] = useState<boolean | null>(null);
  const [openSection, setOpenSection] = useState<SectionId | null>(null);
  const [scrolledToBottom, setScrolledToBottom] = useState<Record<SectionId, boolean>>({
    privacy: false,
    terms: false,
  });
  const [showRefuseHint, setShowRefuseHint] = useState(false);
  // 特種個資獨立同意(個資法 §6)
  const [sensitiveDataConsent, setSensitiveDataConsent] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(CONSENT_KEY);
      if (!raw) {
        setNeedsConsent(true);
        return;
      }
      const rec = JSON.parse(raw) as ConsentRecord;
      if (rec.version !== CURRENT_VERSION) {
        setNeedsConsent(true);
        return;
      }
      setNeedsConsent(false);
    } catch {
      setNeedsConsent(true);
    }
  }, []);

  const handleAgree = () => {
    if (!scrolledToBottom.privacy || !scrolledToBottom.terms) return;
    if (!sensitiveDataConsent) return;
    const rec: ConsentRecord = {
      version: CURRENT_VERSION,
      agreedAt: Date.now(),
      sensitiveDataConsent: true,
    };
    localStorage.setItem(CONSENT_KEY, JSON.stringify(rec));
    // Server-side audit (fire-and-forget)
    fetch("/api/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        version: CURRENT_VERSION,
        sensitiveDataConsent: true,
      }),
    }).catch(() => {});
    setNeedsConsent(false);
    window.dispatchEvent(new Event("app-consent-changed"));
  };

  const markScrolled = (id: SectionId) => {
    setScrolledToBottom((prev) => (prev[id] ? prev : { ...prev, [id]: true }));
  };

  const bothRead = scrolledToBottom.privacy && scrolledToBottom.terms;
  const canAgree = bothRead && sensitiveDataConsent;

  if (needsConsent !== true) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="consent-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4"
    >
      <div className="w-full max-w-md max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 rounded-3xl shadow-lift overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 bg-gradient-to-br from-blue-50 to-sky-100 dark:from-blue-950 dark:to-sky-900 shrink-0">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-white/80 dark:bg-slate-900/40 flex items-center justify-center shadow-card">
              <ShieldCheck className="w-7 h-7 text-blue-600 dark:text-blue-300" strokeWidth={2.2} />
            </div>
            <h2
              id="consent-title"
              className="text-xl font-extrabold text-slate-900 dark:text-white"
            >
              開始使用前
            </h2>
          </div>
          <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
            請閱讀並同意以下條款。展開後請<strong>滾動到最下方</strong>，兩份都讀完才能同意。
          </p>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          <Accordion
            label="隱私權政策"
            Icon={Lock}
            open={openSection === "privacy"}
            onToggle={() =>
              setOpenSection((s) => (s === "privacy" ? null : "privacy"))
            }
            onScrolledToBottom={() => markScrolled("privacy")}
            done={scrolledToBottom.privacy}
          >
            <PrivacyContent />
          </Accordion>

          <Accordion
            label="服務條款"
            Icon={FileText}
            open={openSection === "terms"}
            onToggle={() =>
              setOpenSection((s) => (s === "terms" ? null : "terms"))
            }
            onScrolledToBottom={() => markScrolled("terms")}
            done={scrolledToBottom.terms}
          >
            <TermsContent />
          </Accordion>

          {showRefuseHint && (
            <div className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950 ring-1 ring-amber-200/60 dark:ring-amber-800 rounded-xl p-3">
              需要同意條款才能使用本服務。如果不同意，請關閉此頁。
            </div>
          )}
        </div>

        {/* Footer / Actions */}
        <div className="px-6 py-4 border-t border-slate-200/60 dark:border-slate-800 shrink-0">
          {!bothRead && (
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-3 text-center">
              {!scrolledToBottom.privacy && !scrolledToBottom.terms
                ? "請展開兩份條款並滾動到底"
                : !scrolledToBottom.privacy
                ? "尚需閱讀：隱私權政策"
                : "尚需閱讀：服務條款"}
            </div>
          )}

          {/* 特種個資獨立同意（個資法 §6）— 讀完兩份條款才出現 */}
          {bothRead && (
            <button
              type="button"
              onClick={() => setSensitiveDataConsent((v) => !v)}
              className={`w-full flex items-start gap-3 p-3 mb-3 rounded-xl text-left transition-colors ${
                sensitiveDataConsent
                  ? "bg-emerald-50 dark:bg-emerald-950 ring-1 ring-emerald-300/60 dark:ring-emerald-800"
                  : "bg-amber-50 dark:bg-amber-950 ring-1 ring-amber-300/60 dark:ring-amber-800"
              }`}
            >
              <div
                className={`mt-0.5 w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center ${
                  sensitiveDataConsent
                    ? "border-emerald-600 bg-emerald-600"
                    : "border-amber-500 bg-white dark:bg-slate-900"
                }`}
              >
                {sensitiveDataConsent && (
                  <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                )}
              </div>
              <div className="flex-1 text-xs leading-relaxed">
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  我同意處理長者之特種個人資料
                </span>
                <span className="block text-slate-600 dark:text-slate-400 mt-0.5">
                  依個資法第 6 條,病歷、用藥、過敏屬特種個資。
                  我確認為長者法定代理人,或已取得其同意。
                </span>
              </div>
            </button>
          )}

          <button
            onClick={handleAgree}
            disabled={!canAgree}
            className={`w-full h-14 rounded-2xl text-base font-bold transition-all ${
              canAgree
                ? "bg-gradient-to-br from-blue-500 to-blue-600 active:from-blue-600 active:to-blue-700 text-white shadow-lift"
                : "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed"
            }`}
          >
            {!bothRead
              ? "請先讀完兩份條款"
              : !sensitiveDataConsent
              ? "請勾選特種個資同意"
              : "我已閱讀並同意"}
          </button>
          <button
            onClick={() => setShowRefuseHint(true)}
            className="w-full h-11 mt-2 text-sm text-slate-500 dark:text-slate-400 active:text-slate-700 dark:active:text-slate-200"
          >
            不同意
          </button>
        </div>
      </div>
    </div>
  );
}

function Accordion({
  label,
  Icon,
  open,
  onToggle,
  onScrolledToBottom,
  done,
  children,
}: {
  label: string;
  Icon: typeof Lock;
  open: boolean;
  onToggle: () => void;
  onScrolledToBottom: () => void;
  done: boolean;
  children: React.ReactNode;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // When opened, check if content is short enough to be already "fully visible"
  useEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    if (!el) return;
    // 如果內容區一打開就完全顯示（沒有 overflow），直接標記已讀
    if (el.scrollHeight - el.clientHeight < 4) {
      onScrolledToBottom();
    }
  }, [open, onScrolledToBottom]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 8) {
      onScrolledToBottom();
    }
  };

  return (
    <div
      className={`rounded-2xl overflow-hidden transition-shadow ${
        done
          ? "bg-emerald-50 dark:bg-emerald-950 ring-1 ring-emerald-300/60 dark:ring-emerald-800"
          : "bg-slate-50 dark:bg-slate-800 ring-1 ring-slate-200 dark:ring-slate-700"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3.5 active:opacity-70"
      >
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
            done
              ? "bg-emerald-100 dark:bg-emerald-900"
              : "bg-white dark:bg-slate-900"
          }`}
        >
          {done ? (
            <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-300" strokeWidth={2.6} />
          ) : (
            <Icon className="w-5 h-5 text-blue-600 dark:text-blue-300" strokeWidth={2.2} />
          )}
        </div>
        <div className="flex-1 text-left">
          <div className="text-base font-bold text-slate-900 dark:text-slate-100">
            {label}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {done ? "✓ 已讀完" : open ? "請滾動到最下方" : "點擊展開"}
          </div>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-slate-400 transition-transform shrink-0 ${
            open ? "rotate-180" : ""
          }`}
          strokeWidth={2.2}
        />
      </button>

      {open && (
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="max-h-72 overflow-y-auto px-4 pb-4 bg-white dark:bg-slate-900 border-t border-slate-200/60 dark:border-slate-800"
        >
          <div className="pt-4">{children}</div>
        </div>
      )}
    </div>
  );
}
