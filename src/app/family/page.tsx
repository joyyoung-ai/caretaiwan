"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  IdCard,
  Send,
  ArrowRight,
  Plus,
  Cloud,
  CalendarDays,
  ClipboardList,
  BellOff,
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

type CareEventItem = {
  id: number;
  title: string;
  type: string;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  note: string | null;
  status: string;
};

type LeaveItem = {
  id: number;
  reason: string;
  starts_at: string;
  ends_at: string;
  status: string;
  note: string | null;
};

const EVENT_TYPE_LABEL: Record<string, string> = {
  medical_appointment: "回診",
  rehab: "復健",
  medication_pickup: "拿藥",
  exam: "檢查",
  care_visit: "家訪",
  other: "其他",
};

const LEAVE_REASON_LABEL: Record<string, string> = {
  personal: "私人事務",
  health: "身體不適",
  family: "家庭因素",
  documents: "證件或行政事項",
  other: "其他",
};

function toLocalDateTimeValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function isoToLocalDateTimeValue(value: string | null): string {
  if (!value) return "";
  return toLocalDateTimeValue(new Date(value));
}

function formatEventTime(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function FamilyHome() {
  const router = useRouter();
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [elders, setElders] = useState<Elder[]>([]);
  const [selectedElderId, setSelectedElderId] = useState("");
  const [careEvents, setCareEvents] = useState<CareEventItem[]>([]);
  const [leaveItems, setLeaveItems] = useState<LeaveItem[]>([]);
  const [calendarMessage, setCalendarMessage] = useState("");
  const [leaveMessage, setLeaveMessage] = useState("");
  const [eventType, setEventType] = useState("medical_appointment");
  const [eventTitle, setEventTitle] = useState("回診");
  const [eventStartsAt, setEventStartsAt] = useState(() => toLocalDateTimeValue(new Date(Date.now() + 24 * 60 * 60 * 1000)));
  const [eventEndsAt, setEventEndsAt] = useState(() => toLocalDateTimeValue(new Date(Date.now() + 25 * 60 * 60 * 1000)));
  const [eventLocation, setEventLocation] = useState("");
  const [eventNote, setEventNote] = useState("");
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingStartsAt, setEditingStartsAt] = useState("");
  const [editingEndsAt, setEditingEndsAt] = useState("");
  const [editingLocation, setEditingLocation] = useState("");
  const [editingNote, setEditingNote] = useState("");

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
    const stored = getStore().elders;
    setElders(stored);
    setSelectedElderId(stored[0]?.id ?? "");
  }, []);

  const loadCareCalendar = useCallback(async () => {
    if (!selectedElderId) return;
    const eventResult = await fetch(`/api/care-events/list?elderId=${encodeURIComponent(selectedElderId)}&rangeDays=30`)
      .then((r) => r.json().then((d) => ({ ok: r.ok, data: d })))
      .catch(() => ({ ok: false, data: { error: "照護行程暫時無法載入" } }));
    if (eventResult.ok) {
      setCareEvents(eventResult.data.events ?? []);
      setCalendarMessage("");
    } else {
      setCareEvents([]);
      setCalendarMessage(eventResult.data.error || "照護行程暫時無法載入");
    }

    const leaveResult = await fetch(`/api/caregiver-leave/list?elderId=${encodeURIComponent(selectedElderId)}`)
      .then((r) => r.json().then((d) => ({ ok: r.ok, data: d })))
      .catch(() => ({ ok: false, data: { error: "請假紀錄暫時無法載入" } }));
    if (leaveResult.ok) {
      setLeaveItems(leaveResult.data.leaves ?? []);
      setLeaveMessage("");
    } else {
      setLeaveItems([]);
      setLeaveMessage(leaveResult.data.error || "請假紀錄暫時無法載入");
    }
  }, [selectedElderId]);

  useEffect(() => {
    if (session?.loggedIn !== true || !selectedElderId) return;
    void loadCareCalendar();
  }, [session?.loggedIn, selectedElderId, loadCareCalendar]);

  const createCareEvent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCalendarMessage("");
    if (!selectedElderId) {
      setCalendarMessage("請先建立老人醫護卡");
      return;
    }
    const response = await fetch("/api/care-events/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        elderId: selectedElderId,
        type: eventType,
        title: eventTitle,
        startsAt: new Date(eventStartsAt).toISOString(),
        endsAt: eventEndsAt ? new Date(eventEndsAt).toISOString() : null,
        location: eventLocation,
        note: eventNote,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setCalendarMessage(data.error || "照護行程建立失敗");
      return;
    }
    setCalendarMessage("照護行程已建立");
    setEventLocation("");
    setEventNote("");
    setCareEvents((items) => (data.event ? [data.event, ...items] : items));
  };

  const updateCareEventStatus = async (eventId: number, status: "done" | "cancelled") => {
    setCalendarMessage("");
    const response = await fetch("/api/care-events/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, status }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setCalendarMessage(data.error || "照護行程更新失敗");
      return;
    }
    if (status === "cancelled") {
      setCareEvents((items) => items.filter((item) => item.id !== eventId));
    } else if (data.event) {
      setCareEvents((items) => items.map((item) => (item.id === eventId ? data.event : item)));
    }
  };

  const startEditingEvent = (item: CareEventItem) => {
    setEditingEventId(item.id);
    setEditingTitle(item.title);
    setEditingStartsAt(isoToLocalDateTimeValue(item.starts_at));
    setEditingEndsAt(isoToLocalDateTimeValue(item.ends_at));
    setEditingLocation(item.location ?? "");
    setEditingNote(item.note ?? "");
  };

  const saveEditingEvent = async (eventId: number) => {
    setCalendarMessage("");
    const response = await fetch("/api/care-events/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId,
        title: editingTitle,
        startsAt: new Date(editingStartsAt).toISOString(),
        endsAt: editingEndsAt ? new Date(editingEndsAt).toISOString() : null,
        location: editingLocation,
        note: editingNote,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setCalendarMessage(data.error || "照護行程更新失敗");
      return;
    }
    if (data.event) {
      setCareEvents((items) => items.map((item) => (item.id === eventId ? data.event : item)));
    }
    setEditingEventId(null);
  };

  const acknowledgeLeave = async (leaveId: number) => {
    setLeaveMessage("");
    const response = await fetch("/api/caregiver-leave/acknowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leaveId }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setLeaveMessage(data.error || "請假紀錄確認失敗");
      return;
    }
    if (data.leave) {
      setLeaveItems((items) => items.map((item) => (item.id === leaveId ? data.leave : item)));
    }
  };

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
                使用身份
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

          <div className="px-5 mt-5">
            <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-3">
              照護行程
            </h2>
            <section className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-card">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center shrink-0">
                  <CalendarDays className="w-5 h-5 text-emerald-600 dark:text-emerald-300" strokeWidth={2.2} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-emerald-950 dark:text-emerald-100">
                    家屬與看護共同管理行程
                  </div>
                  <div className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                    回診、復健、家訪等日程先集中在這裡
                  </div>
                </div>
              </div>

              {elders.length > 0 && (
                <label className="block mt-4">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">長者</span>
                  <select
                    value={selectedElderId}
                    onChange={(event) => setSelectedElderId(event.target.value)}
                    className="mt-1 w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm"
                  >
                    {elders.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name || "未命名長者"}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <form onSubmit={createCareEvent} className="mt-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className="block">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">行程類型</span>
                    <select
                      value={eventType}
                      onChange={(event) => {
                        setEventType(event.target.value);
                        setEventTitle(EVENT_TYPE_LABEL[event.target.value] ?? "照護行程");
                      }}
                      className="mt-1 w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm"
                    >
                      {Object.entries(EVENT_TYPE_LABEL).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">標題</span>
                    <input
                      value={eventTitle}
                      onChange={(event) => setEventTitle(event.target.value)}
                      className="mt-1 w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm"
                    />
                  </label>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className="block">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">開始時間</span>
                    <input
                      type="datetime-local"
                      value={eventStartsAt}
                      onChange={(event) => setEventStartsAt(event.target.value)}
                      className="mt-1 w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">結束時間</span>
                    <input
                      type="datetime-local"
                      value={eventEndsAt}
                      onChange={(event) => setEventEndsAt(event.target.value)}
                      className="mt-1 w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm"
                    />
                  </label>
                </div>
                <label className="block">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">地點</span>
                  <input
                    value={eventLocation}
                    onChange={(event) => setEventLocation(event.target.value)}
                    className="mt-1 w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">備註</span>
                  <textarea
                    value={eventNote}
                    onChange={(event) => setEventNote(event.target.value)}
                    rows={2}
                    className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                  />
                </label>
                <button
                  type="submit"
                  className="w-full h-12 rounded-2xl bg-emerald-600 text-white text-sm font-bold active:bg-emerald-700"
                >
                  新增照護行程
                </button>
              </form>

              <div className="mt-4 flex items-start gap-2 rounded-2xl bg-slate-50 dark:bg-slate-800 p-3">
                <BellOff className="w-4 h-4 text-slate-500 dark:text-slate-300 mt-0.5 shrink-0" strokeWidth={2.2} />
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  LINE 提醒尚未啟用。這裡先保留提醒時間，實際推播會在後續版本處理。
                </p>
              </div>

              {calendarMessage && (
                <p className="mt-3 text-xs text-slate-600 dark:text-slate-300" role="status">
                  {calendarMessage}
                </p>
              )}

              <div className="mt-4 space-y-2">
                {careEvents.length === 0 ? (
                  <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-3">
                    <div className="text-sm text-slate-600 dark:text-slate-300">
                      目前沒有即將到來的照護行程
                    </div>
                    <button
                      type="button"
                      disabled
                      className="mt-3 h-10 px-4 rounded-xl bg-slate-200 dark:bg-slate-700 text-xs font-bold text-slate-500 dark:text-slate-300"
                    >
                      取消行程
                    </button>
                  </div>
                ) : (
                  careEvents.map((item) => (
                    <div key={item.id} className="rounded-2xl bg-emerald-50 dark:bg-emerald-950 p-3">
                      <div className="text-sm font-bold text-emerald-950 dark:text-emerald-100">
                        {item.title}
                      </div>
                      <div className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                        {formatEventTime(item.starts_at)}
                        {item.location ? ` · ${item.location}` : ""}
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => startEditingEvent(item)}
                          className="h-10 rounded-xl bg-white dark:bg-slate-900 text-xs font-bold text-emerald-700 dark:text-emerald-300"
                        >
                          編輯行程
                        </button>
                        <button
                          type="button"
                          onClick={() => updateCareEventStatus(item.id, "done")}
                          className="h-10 rounded-xl bg-white dark:bg-slate-900 text-xs font-bold text-emerald-700 dark:text-emerald-300"
                        >
                          標記完成
                        </button>
                        <button
                          type="button"
                          onClick={() => updateCareEventStatus(item.id, "cancelled")}
                          className="h-10 rounded-xl bg-white dark:bg-slate-900 text-xs font-bold text-slate-600 dark:text-slate-300"
                        >
                          取消行程
                        </button>
                      </div>
                      {editingEventId === item.id && (
                        <div className="mt-3 space-y-2 rounded-xl bg-white/70 dark:bg-slate-900/70 p-3">
                          <label className="block">
                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">標題</span>
                            <input
                              value={editingTitle}
                              onChange={(event) => setEditingTitle(event.target.value)}
                              className="mt-1 w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm"
                            />
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <label className="block">
                              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">開始時間</span>
                              <input
                                type="datetime-local"
                                value={editingStartsAt}
                                onChange={(event) => setEditingStartsAt(event.target.value)}
                                className="mt-1 w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm"
                              />
                            </label>
                            <label className="block">
                              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">結束時間</span>
                              <input
                                type="datetime-local"
                                value={editingEndsAt}
                                onChange={(event) => setEditingEndsAt(event.target.value)}
                                className="mt-1 w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm"
                              />
                            </label>
                          </div>
                          <label className="block">
                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">地點</span>
                            <input
                              value={editingLocation}
                              onChange={(event) => setEditingLocation(event.target.value)}
                              className="mt-1 w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm"
                            />
                          </label>
                          <label className="block">
                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">備註</span>
                            <textarea
                              value={editingNote}
                              onChange={(event) => setEditingNote(event.target.value)}
                              rows={2}
                              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                            />
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => saveEditingEvent(item.id)}
                              className="h-10 rounded-xl bg-emerald-600 text-xs font-bold text-white"
                            >
                              儲存行程
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingEventId(null)}
                              className="h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300"
                            >
                              取消編輯
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          <div className="px-5 mt-5">
            <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-3">
              請假紀錄
            </h2>
            <section className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-card">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950 flex items-center justify-center shrink-0">
                  <ClipboardList className="w-5 h-5 text-orange-600 dark:text-orange-300" strokeWidth={2.2} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-orange-950 dark:text-orange-100">
                    看護請假紀錄
                  </div>
                  <div className="text-xs text-orange-700 dark:text-orange-300 mt-0.5">
                    看護送出後，家屬可在這裡標記已收到；不處理薪資、扣款或排班。
                  </div>
                </div>
              </div>

              {leaveMessage && (
                <p className="mt-3 text-xs text-slate-600 dark:text-slate-300" role="status">
                  {leaveMessage}
                </p>
              )}

              <div className="mt-4 space-y-2">
                {leaveItems.length === 0 ? (
                  <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-3">
                    <div className="text-sm text-slate-600 dark:text-slate-300">
                      目前沒有新的請假紀錄
                    </div>
                    <button
                      type="button"
                      disabled
                      className="mt-3 h-10 px-4 rounded-xl bg-slate-200 dark:bg-slate-700 text-xs font-bold text-slate-500 dark:text-slate-300"
                    >
                      已收到
                    </button>
                  </div>
                ) : (
                  leaveItems.map((item) => (
                    <div key={item.id} className="rounded-2xl bg-orange-50 dark:bg-orange-950 p-3">
                      <div className="text-sm font-bold text-orange-950 dark:text-orange-100">
                        {LEAVE_REASON_LABEL[item.reason] ?? "其他"}
                      </div>
                      <div className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                        {formatEventTime(item.starts_at)} - {formatEventTime(item.ends_at)}
                      </div>
                      {item.note && (
                        <div className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                          {item.note}
                        </div>
                      )}
                      <button
                        type="button"
                        disabled={item.status === "acknowledged"}
                        onClick={() => acknowledgeLeave(item.id)}
                        className="mt-3 h-10 px-4 rounded-xl bg-white dark:bg-slate-900 text-xs font-bold text-orange-700 dark:text-orange-300 disabled:text-slate-400"
                      >
                        {item.status === "acknowledged" ? "已收到" : "標記已收到"}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </section>
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
