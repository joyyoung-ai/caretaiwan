"use client";

// 家屬端記帳查詢 + 核帳頁
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { getStore, type Elder } from "@/lib/elder";
import { getRole } from "@/lib/role";

type Category = "med" | "supply" | "food" | "medical" | "other";

type ExpenseItem = {
  id: number;
  item_name: string;
  amount: number;
  category: Category;
  note: string | null;
  verify_status: "pending" | "confirmed" | "disputed";
  verify_note: string | null;
  created_at: string;
  photoUrl: string | null;
};

const CAT_ICON: Record<Category, string> = {
  med: "💊",
  supply: "🧻",
  food: "🍎",
  medical: "🏥",
  other: "📦",
};

const CAT_LABEL_ZH: Record<Category, string> = {
  med: "藥品",
  supply: "用品",
  food: "食品",
  medical: "醫療",
  other: "其他",
};

export default function FamilyExpensePage() {
  const router = useRouter();
  const [elder, setElder] = useState<Elder | null>(null);
  const [items, setItems] = useState<ExpenseItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (getRole() === "caregiver") router.replace("/expense");
  }, [router]);

  useEffect(() => {
    const store = getStore();
    const active = store.elders.find((e) => e.id === store.activeId) ?? store.elders[0] ?? null;
    setElder(active);
    if (!active) {
      setLoading(false);
      return;
    }
    fetch(`/api/expense/list?elderId=${encodeURIComponent(active.id)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { ok?: boolean; expenses?: ExpenseItem[] } | null) => {
        if (d?.ok && d.expenses) setItems(d.expenses);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleVerify = async (id: number, status: "confirmed" | "disputed", note?: string) => {
    const res = await fetch("/api/expense/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expenseId: id, status, note }),
    });
    if (res.ok) {
      // 樂觀更新
      setItems((prev) =>
        prev.map((i) =>
          i.id === id ? { ...i, verify_status: status, verify_note: note ?? null } : i
        )
      );
    } else {
      alert("操作失敗");
    }
  };

  const monthTotal = items
    .filter((i) => {
      const d = new Date(i.created_at);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((acc, i) => acc + Number(i.amount), 0);

  const pendingCount = items.filter((i) => i.verify_status === "pending").length;

  if (loading) return <main className="flex flex-col flex-1 pb-32" />;

  if (!elder) {
    return (
      <main className="flex flex-col flex-1 pb-32">
        <Header />
        <div className="px-5 mt-8 text-center text-sm text-slate-500">
          請先建立老人醫護卡。
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-col flex-1 pb-32">
      <Header />

      <div className="px-5 pt-2">
        {/* 本月小計卡 */}
        <div className="p-5 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-3xl shadow-lift">
          <div className="text-xs opacity-80">{elder.name} · 本月看護記帳合計</div>
          <div className="text-4xl font-bold tabular-nums mt-1">
            $ {monthTotal.toLocaleString()}
          </div>
          {pendingCount > 0 && (
            <div className="mt-3 text-sm bg-white/20 rounded-xl px-3 py-2">
              ⏳ 待核帳:<strong>{pendingCount}</strong> 筆
            </div>
          )}
        </div>
      </div>

      <div className="px-5 mt-4 space-y-2">
        {items.length === 0 && (
          <p className="text-center text-sm text-slate-500 py-8">尚未有記帳</p>
        )}
        {items.map((it) => (
          <FamilyExpenseRow key={it.id} item={it} onVerify={handleVerify} />
        ))}
      </div>
    </main>
  );
}

function Header() {
  return (
    <header className="px-5 pt-4 pb-3 flex items-center gap-3 border-b border-slate-200 dark:border-slate-800">
      <Link
        href="/family"
        className="text-2xl w-10 h-10 flex items-center justify-center rounded-full active:bg-slate-100 dark:active:bg-slate-800"
      >
        ←
      </Link>
      <h1 className="text-xl font-bold flex-1">💰 記帳本</h1>
    </header>
  );
}

function FamilyExpenseRow({
  item,
  onVerify,
}: {
  item: ExpenseItem;
  onVerify: (id: number, status: "confirmed" | "disputed", note?: string) => void;
}) {
  const [showDispute, setShowDispute] = useState(false);
  const [disputeNote, setDisputeNote] = useState("");

  const status = item.verify_status;
  const statusBadge =
    status === "confirmed"
      ? { text: "✓ 已確認", cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" }
      : status === "disputed"
      ? { text: "❓ 有問題", cls: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300" }
      : { text: "⏳ 待核帳", cls: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300" };

  return (
    <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-card">
      <div className="flex items-start gap-3">
        <div className="text-3xl">{CAT_ICON[item.category]}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-semibold truncate">{item.item_name}</p>
            <span className="font-bold tabular-nums shrink-0 text-lg">
              ${Number(item.amount).toFixed(0)}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {CAT_LABEL_ZH[item.category]} · {new Date(item.created_at).toLocaleString("zh-TW", { hour12: false })}
          </p>
          {item.note && (
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">💬 {item.note}</p>
          )}
          {item.photoUrl && (
            <div className="mt-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.photoUrl}
                alt="receipt"
                className="max-h-40 rounded-lg bg-slate-100 dark:bg-slate-800"
              />
            </div>
          )}
          <div className="flex items-center gap-2 mt-3">
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusBadge.cls}`}>
              {statusBadge.text}
            </span>
            {status === "disputed" && item.verify_note && (
              <span className="text-xs text-red-600 dark:text-red-400">
                · {item.verify_note}
              </span>
            )}
          </div>

          {/* 待核帳:給家屬兩個按鈕 */}
          {status === "pending" && !showDispute && (
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => onVerify(item.id, "confirmed")}
                className="flex-1 h-10 bg-emerald-500 active:bg-emerald-600 text-white rounded-lg font-semibold text-sm flex items-center justify-center gap-1"
              >
                <Check className="w-4 h-4" /> 確認
              </button>
              <button
                onClick={() => setShowDispute(true)}
                className="flex-1 h-10 bg-white dark:bg-slate-900 ring-1 ring-red-300 dark:ring-red-800 text-red-600 dark:text-red-400 rounded-lg font-semibold text-sm flex items-center justify-center gap-1"
              >
                <X className="w-4 h-4" /> 有問題
              </button>
            </div>
          )}

          {/* disputed 表單 */}
          {status === "pending" && showDispute && (
            <div className="mt-3 p-3 bg-red-50 dark:bg-red-950 rounded-lg space-y-2">
              <p className="text-xs font-semibold text-red-900 dark:text-red-100">
                為何認為有問題?(會通知看護)
              </p>
              <textarea
                value={disputeNote}
                onChange={(e) => setDisputeNote(e.target.value)}
                rows={2}
                maxLength={500}
                placeholder="例:金額太高、品項對不上、不知道這筆"
                className="w-full p-2 text-sm rounded-md bg-white dark:bg-slate-900 border border-red-200 dark:border-red-800 focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowDispute(false);
                    setDisputeNote("");
                  }}
                  className="flex-1 h-9 bg-white dark:bg-slate-900 rounded-md font-semibold text-sm"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    if (disputeNote.trim().length < 2) return;
                    onVerify(item.id, "disputed", disputeNote.trim());
                  }}
                  disabled={disputeNote.trim().length < 2}
                  className="flex-1 h-9 bg-red-600 active:bg-red-700 text-white rounded-md font-semibold text-sm disabled:opacity-40"
                >
                  送出
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
