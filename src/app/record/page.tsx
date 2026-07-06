"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Trash2, FastForward, Check, NotebookPen, Clock, AlertTriangle, Plus } from "lucide-react";
import { pushRecordToFamily } from "@/app/actions/push-actions";
import { getActiveElderForRecord, setActivePairedElder } from "@/lib/elder";
import { getRole } from "@/lib/role";
import { useT } from "@/lib/i18n";
import { uploadPhoto } from "@/lib/photo";
import { RecordTypeIcon, RECORD_ICON_COLOR, RECORD_EMOJI_FALLBACK, type RecordType } from "@/components/icons";

type Stage = "menu" | "more" | "tempInput" | "bpInput" | "glucoseInput" | "spo2Input" | "note" | "saved";
type ShareMode = "none" | "family" | "group"; // group 隱含 family(同時推 1對1 + 群組)

// 數值輸入類:儲存時 value 為對應格式字串
// temp: "36.5"
// bp: "120/80"
// glucose: "110"
// spo2: "98"
const NUMERIC_TYPES: RecordType[] = ["temp", "bp", "glucose", "spo2"];

export default function RecordPage() {
  const router = useRouter();
  const t = useT();
  // 主選單(日常常用 6 個,維持老看護的肌肉記憶)
  const PRIMARY_ITEMS: { id: RecordType; label: string }[] = [
    { id: "temp", label: t.record.typeTemp },
    { id: "stool", label: t.record.typeStool },
    { id: "sleep", label: t.record.typeSleep },
    { id: "fall", label: t.record.typeFall },
    { id: "med", label: t.record.typeMed },
    { id: "meal", label: t.record.typeMeal },
  ];
  // 第二層:更多照護項目,分日常/醫療操作兩組
  const MORE_DAILY: { id: RecordType; label: string }[] = [
    { id: "turn", label: t.record.typeTurn },
    { id: "back_pat", label: t.record.typeBackPat },
    { id: "diaper", label: t.record.typeDiaper },
  ];
  const MORE_MEDICAL: { id: RecordType; label: string }[] = [
    { id: "bp", label: t.record.typeBp },
    { id: "glucose", label: t.record.typeGlucose },
    { id: "spo2", label: t.record.typeSpo2 },
    { id: "ng_feed", label: t.record.typeNgFeed },
    { id: "ng_change", label: t.record.typeNgChange },
    { id: "catheter_change", label: t.record.typeCatheterChange },
  ];
  const ALL_ITEMS = [...PRIMARY_ITEMS, ...MORE_DAILY, ...MORE_MEDICAL];
  const NOTE_TEMPLATES: Record<RecordType, string[]> = t.record.notePhrases;
  const [stage, setStage] = useState<Stage>("menu");
  const [selected, setSelected] = useState<RecordType | null>(null);
  const [shareMode, setShareMode] = useState<ShareMode>("none");
  const [hasGroup, setHasGroup] = useState(false); // 家屬有沒有綁家族群組
  const [tempValue, setTempValue] = useState("");
  const [bpSys, setBpSys] = useState("");
  const [bpDia, setBpDia] = useState("");
  const [bpFocus, setBpFocus] = useState<"sys" | "dia">("sys");
  const [glucoseValue, setGlucoseValue] = useState("");
  const [spo2Value, setSpo2Value] = useState("");
  const [note, setNote] = useState("");
  const [recordCount, setRecordCount] = useState(0);
  const [recentHourCount, setRecentHourCount] = useState(0);
  const [recentItems, setRecentItems] = useState<{ icon: string; label: string; ts: number }[]>([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearedCount, setClearedCount] = useState<number | null>(null);
  const [hasPairedElder, setHasPairedElder] = useState(false);
  // photoPath = VM local storage path (push 時才簽 signed URL)
  // photoPreviewUrl = client local blob URL,只給 <img> 預覽用
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const confirmRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const findItem = (id: RecordType) =>
    ALL_ITEMS.find((it) => it.id === id) ?? { id, label: id };

  // 取得目前該 record 對應的「最終顯示 value 字串」,供儲存與推播使用
  const getCurrentValue = (id: RecordType | null): string | undefined => {
    if (!id) return undefined;
    if (id === "temp") return tempValue || undefined;
    if (id === "bp") return bpSys && bpDia ? `${bpSys}/${bpDia}` : undefined;
    if (id === "glucose") return glucoseValue || undefined;
    if (id === "spo2") return spo2Value || undefined;
    return undefined;
  };

  // 取消 / 換新照片 / unmount 時釋放 blob URL,避免記憶體洩漏
  const revokePreview = (url: string | null) => {
    if (url) {
      try {
        URL.revokeObjectURL(url);
      } catch {}
    }
  };
  useEffect(() => {
    return () => revokePreview(photoPreviewUrl);
  }, [photoPreviewUrl]);

  // 家屬端不該進到 /record,重導
  useEffect(() => {
    if (getRole() === "family") router.replace("/family");
  }, [router]);

  // 偵測是否已配對(否則「送出給家屬」會無聲無息失敗)
  useEffect(() => {
    setHasPairedElder(!!getActiveElderForRecord());
  }, [stage]);

  useEffect(() => {
    if (getRole() === "family") return;
    let cancelled = false;
    fetch("/api/family/paired")
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (
          data: {
            items?: {
              elderId: string;
              displayName: string | null;
              hasGroup?: boolean;
            }[];
          } | null
        ) => {
          if (cancelled || !data?.items) return;
          const first = data.items[0];
          if (first) {
            setActivePairedElder({ id: first.elderId, name: first.displayName ?? "" });
            setHasPairedElder(true);
            setHasGroup(!!first.hasGroup);
          } else {
            setActivePairedElder(null);
            setHasPairedElder(false);
            setHasGroup(false);
          }
        }
      )
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    type R = { type: RecordType; timestamp: number };
    const all = JSON.parse(localStorage.getItem("records") || "[]") as R[];
    setRecordCount(all.length);
    const cutoff = Date.now() - 60 * 60 * 1000;
    const lastHour = all.filter((r) => r.timestamp >= cutoff);
    setRecentHourCount(lastHour.length);
    setRecentItems(
      lastHour
        .slice(-5)
        .reverse()
        .map((r) => ({
          icon: RECORD_EMOJI_FALLBACK[r.type] ?? "📝",
          label: findItem(r.type).label,
          ts: r.timestamp,
        }))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, showClearConfirm]);

  // Scroll confirm dialog into view when it opens
  useEffect(() => {
    if (showClearConfirm && confirmRef.current) {
      confirmRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [showClearConfirm]);

  const today = new Date().toLocaleDateString("zh-TW", {
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  });

  const handleItemClick = (id: RecordType) => {
    setSelected(id);
    setNote("");
    setTempValue("");
    setBpSys("");
    setBpDia("");
    setBpFocus("sys");
    setGlucoseValue("");
    setSpo2Value("");
    revokePreview(photoPreviewUrl);
    setPhotoPath(null);
    setPhotoPreviewUrl(null);
    setPhotoError(null);
    if (id === "temp") setStage("tempInput");
    else if (id === "bp") setStage("bpInput");
    else if (id === "glucose") setStage("glucoseInput");
    else if (id === "spo2") setStage("spo2Input");
    else setStage("note");
  };

  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  const handleSave = () => {
    if (!selected) return;
    const shareEnabled = shareMode !== "none";
    const value = getCurrentValue(selected);
    const record = {
      type: selected,
      value: NUMERIC_TYPES.includes(selected) ? value ?? "" : true,
      note: note.trim(),
      timestamp: Date.now(),
      shared: shareEnabled,
    };
    const all = JSON.parse(localStorage.getItem("records") || "[]");
    all.push(record);
    localStorage.setItem("records", JSON.stringify(all));

    if (shareEnabled) {
      const elder = getActiveElderForRecord();
      if (elder?.id) {
        pushRecordToFamily({
          elderId: elder.id,
          elderName: elder.name,
          recordType: selected,
          value,
          note: note.trim(),
          timestamp: record.timestamp,
          photoPath: photoPath ?? undefined,
          alsoSendToGroup: shareMode === "group",
        }).catch(() => {});
      }
    }

    const oldPreview = photoPreviewUrl;
    setStage("saved");
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => {
      setStage("menu");
      setSelected(null);
      setTempValue("");
      setBpSys("");
      setBpDia("");
      setGlucoseValue("");
      setSpo2Value("");
      setNote("");
      revokePreview(oldPreview);
      setPhotoPath(null);
      setPhotoPreviewUrl(null);
      setPhotoError(null);
      resetTimerRef.current = null;
    }, 1500);
  };

  const handlePhotoPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    setPhotoError(null);
    revokePreview(photoPreviewUrl);
    setPhotoPreviewUrl(null);
    setPhotoPath(null);
    try {
      const elder = getActiveElderForRecord();
      if (!elder?.id) {
        setPhotoError(t.record.photoUploadFail);
        return;
      }
      const result = await uploadPhoto(file, {
        elderId: elder.id,
        purpose: "record",
      });
      if (result.ok && result.path && result.previewUrl) {
        setPhotoPath(result.path);
        setPhotoPreviewUrl(result.previewUrl);
      } else {
        setPhotoError(result.error ?? t.record.photoUploadFail);
      }
    } finally {
      setPhotoUploading(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  };

  const handleClearHistory = () => {
    const before = recordCount;
    localStorage.removeItem("records");
    setRecordCount(0);
    setShowClearConfirm(false);
    setClearedCount(before);
    setTimeout(() => setClearedCount(null), 3000);
  };

  // ----- Stage: saved -----
  if (stage === "saved") {
    return (
      <main className="flex flex-col flex-1 items-center justify-center pb-8">
        <div className="w-24 h-24 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center mb-4 shadow-lift">
          <Check className="w-14 h-14 text-emerald-600 dark:text-emerald-300" strokeWidth={3} />
        </div>
        <p className="text-2xl font-bold">{t.record.saved}</p>
        {shareMode === "family" && (
          <p className="text-sm text-slate-500 mt-2">{t.record.notifiedFamily}</p>
        )}
        {shareMode === "group" && (
          <p className="text-sm text-slate-500 mt-2">{t.record.notifiedFamilyGroup}</p>
        )}
      </main>
    );
  }

  // ----- Stage: temperature input -----
  if (stage === "tempInput") {
    return (
      <NumericInputStage
        title={t.record.tempTitle}
        iconType="temp"
        display={tempValue || "0.0"}
        unit="°C"
        onBack={() => setStage("menu")}
        onNext={() => setStage("note")}
        nextLabel={t.common.next}
        canNext={!!tempValue}
        keypad={["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "←"]}
        onKey={(k) => {
          if (k === "←") setTempValue((v) => v.slice(0, -1));
          else setTempValue((v) => (v.length < 5 ? v + k : v));
        }}
      />
    );
  }

  // ----- Stage: BP input (兩格) -----
  if (stage === "bpInput") {
    return (
      <main className="flex flex-col flex-1 pb-[calc(env(safe-area-inset-bottom)+12rem)]">
        <header className="px-5 pt-4 pb-3 flex items-center gap-3">
          <button
            onClick={() => setStage("menu")}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/70 dark:bg-slate-800/70 shadow-card active:scale-95 transition-transform"
          >
            <ChevronLeft className="w-5 h-5 text-slate-700 dark:text-slate-200" strokeWidth={2.4} />
          </button>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <RecordTypeIcon type="bp" className="w-6 h-6" />
            {t.record.bpTitle}
          </h1>
        </header>

        <div className="px-5 pt-6">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setBpFocus("sys")}
              className={`bg-white dark:bg-slate-900 rounded-3xl p-5 text-center shadow-card border-2 ${
                bpFocus === "sys" ? "border-rose-500" : "border-transparent"
              }`}
            >
              <div className="text-xs text-slate-500">{t.record.bpSystolicLabel}</div>
              <div className="text-4xl font-bold tabular-nums mt-1">{bpSys || "—"}</div>
              <div className="text-xs text-slate-400 mt-1">{t.record.bpUnit}</div>
            </button>
            <button
              onClick={() => setBpFocus("dia")}
              className={`bg-white dark:bg-slate-900 rounded-3xl p-5 text-center shadow-card border-2 ${
                bpFocus === "dia" ? "border-rose-500" : "border-transparent"
              }`}
            >
              <div className="text-xs text-slate-500">{t.record.bpDiastolicLabel}</div>
              <div className="text-4xl font-bold tabular-nums mt-1">{bpDia || "—"}</div>
              <div className="text-xs text-slate-400 mt-1">{t.record.bpUnit}</div>
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-6">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "→", "0", "←"].map((k) => (
              <button
                key={k}
                onClick={() => {
                  const setter = bpFocus === "sys" ? setBpSys : setBpDia;
                  if (k === "←") setter((v) => v.slice(0, -1));
                  else if (k === "→") setBpFocus("dia");
                  else
                    setter((v) =>
                      v.length < 3 ? v + k : v
                    );
                  if (bpFocus === "sys" && k !== "←" && k !== "→") {
                    const next = (bpSys + k).length;
                    if (next >= 3) setBpFocus("dia");
                  }
                }}
                className="h-16 bg-white dark:bg-slate-900 rounded-2xl text-2xl font-semibold shadow-card active:scale-95 transition-transform"
              >
                {k}
              </button>
            ))}
          </div>

          <button
            onClick={() => setStage("note")}
            disabled={!bpSys || !bpDia}
            className="w-full mt-6 h-16 bg-gradient-to-br from-blue-500 to-blue-600 active:from-blue-600 active:to-blue-700 text-white rounded-2xl text-xl font-bold shadow-lift disabled:opacity-30 disabled:from-slate-400 disabled:to-slate-500"
          >
            {t.common.next}
          </button>
        </div>
      </main>
    );
  }

  // ----- Stage: glucose input -----
  if (stage === "glucoseInput") {
    return (
      <NumericInputStage
        title={t.record.glucoseTitle}
        iconType="glucose"
        display={glucoseValue || "—"}
        unit={t.record.glucoseUnit}
        onBack={() => setStage("menu")}
        onNext={() => setStage("note")}
        nextLabel={t.common.next}
        canNext={!!glucoseValue}
        keypad={["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "←"]}
        onKey={(k) => {
          if (k === "←") setGlucoseValue((v) => v.slice(0, -1));
          else if (k !== "") setGlucoseValue((v) => (v.length < 3 ? v + k : v));
        }}
      />
    );
  }

  // ----- Stage: SpO2 input -----
  if (stage === "spo2Input") {
    return (
      <NumericInputStage
        title={t.record.spo2Title}
        iconType="spo2"
        display={spo2Value || "—"}
        unit={t.record.spo2Unit}
        onBack={() => setStage("menu")}
        onNext={() => setStage("note")}
        nextLabel={t.common.next}
        canNext={!!spo2Value}
        keypad={["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "←"]}
        onKey={(k) => {
          if (k === "←") setSpo2Value((v) => v.slice(0, -1));
          else if (k !== "") setSpo2Value((v) => (v.length < 3 ? v + k : v));
        }}
      />
    );
  }

  // ----- Stage: note (description) -----
  if (stage === "note" && selected) {
    const item = findItem(selected);
    const templates = NOTE_TEMPLATES[selected];
    const currentValue = getCurrentValue(selected);
    const valueUnit =
      selected === "temp"
        ? "°C"
        : selected === "bp"
        ? ` ${t.record.bpUnit}`
        : selected === "glucose"
        ? ` ${t.record.glucoseUnit}`
        : selected === "spo2"
        ? t.record.spo2Unit
        : "";
    const backStage: Stage =
      selected === "temp"
        ? "tempInput"
        : selected === "bp"
        ? "bpInput"
        : selected === "glucose"
        ? "glucoseInput"
        : selected === "spo2"
        ? "spo2Input"
        : "menu";
    return (
      <main className="flex flex-col flex-1 pb-[calc(env(safe-area-inset-bottom)+12rem)]">
        <header className="px-5 pt-4 pb-3 flex items-center gap-3">
          <button
            onClick={() => setStage(backStage)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/70 dark:bg-slate-800/70 shadow-card active:scale-95 transition-transform"
          >
            <ChevronLeft className="w-5 h-5 text-slate-700 dark:text-slate-200" strokeWidth={2.4} />
          </button>
          <div className="flex-1">
            <div className="text-xs text-slate-500">{t.record.noteTitle}</div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <RecordTypeIcon type={selected} className="w-6 h-6" />
              {item.label}
              {currentValue && (
                <span className="ml-2 text-base text-slate-500">
                  {currentValue}
                  {valueUnit}
                </span>
              )}
            </h1>
          </div>
        </header>

        {/* Quick save (top) */}
        <div className="px-5 pt-4">
          <button
            onClick={handleSave}
            className="w-full h-14 bg-white dark:bg-slate-800 active:bg-slate-50 dark:active:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-2xl font-semibold shadow-card flex items-center justify-center gap-2"
          >
            <FastForward className="w-5 h-5" strokeWidth={2.2} />
            {t.record.quickSave}
          </button>
        </div>

        {/* Quick phrase chips */}
        <div className="px-5 mt-5">
          <h2 className="text-sm font-semibold text-slate-500 mb-2">{t.record.quickPhrasesTitle}</h2>
          <div className="flex flex-wrap gap-2">
            {templates.map((phrase) => {
              const active = note === phrase;
              return (
                <button
                  key={phrase}
                  onClick={() => setNote(active ? "" : phrase)}
                  className={`px-4 h-12 rounded-full font-medium transition-all ${
                    active
                      ? "bg-blue-600 text-white shadow-card"
                      : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 shadow-card active:scale-95"
                  }`}
                >
                  {phrase}
                </button>
              );
            })}
          </div>
        </div>

        {/* Free text */}
        <div className="px-5 mt-5">
          <h2 className="text-sm font-semibold text-slate-500 mb-2">{t.record.freeTextTitle}</h2>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t.record.freeTextPlaceholder}
            rows={3}
            maxLength={200}
            className="w-full p-4 text-base rounded-2xl bg-white dark:bg-slate-900 shadow-card border border-transparent focus:border-blue-500 focus:outline-none resize-none"
          />
          <div className="text-xs text-slate-400 text-right mt-1">
            {note.length}/200
          </div>
        </div>

        {/* Photo upload */}
        <div className="px-5 mt-5">
          <h2 className="text-sm font-semibold text-slate-500 mb-2">
            {t.record.photoTitle}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 leading-relaxed">
            {t.record.photoHelp}
          </p>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoPick}
            className="hidden"
          />
          {!photoPreviewUrl && !photoUploading && (
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className="w-full h-14 bg-white dark:bg-slate-900 rounded-2xl shadow-card font-semibold text-slate-700 dark:text-slate-200 active:scale-[0.98] transition-transform"
            >
              {t.record.photoAddBtn}
            </button>
          )}
          {photoUploading && (
            <div className="w-full h-14 bg-white dark:bg-slate-900 rounded-2xl shadow-card flex items-center justify-center text-sm text-slate-500">
              {t.record.photoUploading}
            </div>
          )}
          {photoPreviewUrl && (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoPreviewUrl}
                alt="record"
                className="w-full max-h-64 object-contain rounded-2xl bg-slate-100 dark:bg-slate-800 shadow-card"
              />
              <button
                type="button"
                onClick={() => {
                  revokePreview(photoPreviewUrl);
                  setPhotoPath(null);
                  setPhotoPreviewUrl(null);
                  setPhotoError(null);
                }}
                className="absolute top-2 right-2 px-3 h-9 bg-slate-900/80 text-white text-xs rounded-full font-semibold backdrop-blur"
              >
                ✕ {t.record.photoRemove}
              </button>
            </div>
          )}
          {photoError && (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400">
              {photoError}
            </p>
          )}
        </div>

        {/* Share toggle */}
        <div className="px-5 mt-3">
          <ShareToggle
            mode={shareMode}
            onChange={setShareMode}
            disabled={!hasPairedElder}
            hasGroup={hasGroup}
          />
        </div>

        {/* Save */}
        <div className="px-5 mt-5">
          <button
            onClick={handleSave}
            className="w-full h-16 bg-gradient-to-br from-blue-500 to-blue-600 active:from-blue-600 active:to-blue-700 text-white rounded-2xl text-xl font-bold shadow-lift"
          >
            {t.record.saveButton}
          </button>
        </div>
      </main>
    );
  }

  // ----- Stage: more (二級照護項目選單) -----
  if (stage === "more") {
    return (
      <main className="flex flex-col flex-1 pb-[calc(env(safe-area-inset-bottom)+12rem)]">
        <header className="px-5 pt-4 pb-3 flex items-center gap-3">
          <button
            onClick={() => setStage("menu")}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/70 dark:bg-slate-800/70 shadow-card active:scale-95 transition-transform"
          >
            <ChevronLeft className="w-5 h-5 text-slate-700 dark:text-slate-200" strokeWidth={2.4} />
          </button>
          <h1 className="text-xl font-bold">{t.record.moreCareTitle}</h1>
        </header>

        <div className="px-5 pt-4">
          <h2 className="text-sm font-semibold text-slate-500 mb-3">
            {t.record.moreCareSectionDaily}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {MORE_DAILY.map((item) => (
              <TypeTile key={item.id} id={item.id} label={item.label} onClick={handleItemClick} />
            ))}
          </div>
        </div>

        <div className="px-5 mt-6">
          <h2 className="text-sm font-semibold text-slate-500 mb-3">
            {t.record.moreCareSectionMedical}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {MORE_MEDICAL.map((item) => (
              <TypeTile key={item.id} id={item.id} label={item.label} onClick={handleItemClick} />
            ))}
          </div>
        </div>
      </main>
    );
  }

  // ----- Stage: menu (default) -----
  return (
    <main className="flex flex-col flex-1 pb-[calc(env(safe-area-inset-bottom)+12rem)] relative">
      {/* Cleared confirmation toast */}
      {clearedCount !== null && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 w-full max-w-md">
          <div className="flex items-center gap-3 p-4 bg-emerald-600 text-white rounded-2xl shadow-lift">
            <Check className="w-7 h-7 shrink-0" strokeWidth={3} />
            <div className="flex-1">
              <div className="font-semibold">
                {t.record.clearedToast.replace("{n}", String(clearedCount))}
              </div>
              <div className="text-xs opacity-90 mt-0.5">
                {t.record.clearedToastDesc}
              </div>
            </div>
          </div>
        </div>
      )}

      <header className="px-5 pt-4 pb-3 flex items-center gap-3">
        <Link
          href="/"
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/70 dark:bg-slate-800/70 shadow-card active:scale-95 transition-transform"
        >
          <ChevronLeft className="w-5 h-5 text-slate-700 dark:text-slate-200" strokeWidth={2.4} />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <NotebookPen className="w-5 h-5 text-blue-600 dark:text-blue-400" strokeWidth={2.2} />
            {t.record.title}
          </h1>
          <p className="text-xs text-slate-500">{today}</p>
        </div>
      </header>

      {/* Last 1hr quick view */}
      {recentHourCount > 0 && (
        <div className="px-5 pt-4">
          <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl shadow-card flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500 dark:text-slate-400" strokeWidth={2.2} />
            <span className="text-xs text-slate-500 mr-1">{t.record.recentHour}</span>
            <span className="text-sm font-bold">
              {t.record.recentCount.replace("{n}", String(recentHourCount))}
            </span>
            <div className="flex gap-1 ml-auto">
              {recentItems.map((r, i) => (
                <span key={i} title={r.label} className="text-lg">
                  {r.icon}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="px-5 pt-5">
        <h2 className="text-sm font-semibold text-slate-500 mb-3">{t.record.pickType}</h2>
        <div className="grid grid-cols-2 gap-3">
          {PRIMARY_ITEMS.map((item) => (
            <TypeTile key={item.id} id={item.id} label={item.label} onClick={handleItemClick} />
          ))}

          {/* 進階照護項目入口 */}
          <button
            onClick={() => setStage("more")}
            className="aspect-square flex flex-col items-center justify-center bg-gradient-to-br from-slate-700 to-slate-900 text-white rounded-3xl shadow-card active:scale-95 active:shadow-lift transition-all"
          >
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-2 bg-white/15">
              <Plus className="w-9 h-9" strokeWidth={2.4} />
            </div>
            <span className="text-base font-semibold">{t.record.moreCareTitle}</span>
            <span className="text-xs opacity-80 mt-0.5">{t.record.moreCareSub}</span>
          </button>
        </div>
      </div>

      {/* 記帳入口(獨立區塊,跟健康記錄分開) */}
      <div className="px-5 mt-5">
        <Link
          href="/expense"
          className="flex items-center gap-4 p-4 bg-gradient-to-br from-blue-500 to-blue-600 active:from-blue-600 active:to-blue-700 text-white rounded-3xl shadow-lift"
        >
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-3xl shrink-0">
            💰
          </div>
          <div className="flex-1">
            <div className="text-lg font-bold">{t.expense.entryTitle}</div>
            <div className="text-xs opacity-90">{t.expense.entrySub}</div>
          </div>
          <ChevronRight className="w-6 h-6" strokeWidth={2.4} />
        </Link>
      </div>

      {/* Share toggle (default) */}
      <div className="px-5 mt-6">
        <ShareToggle
          mode={shareMode}
          onChange={setShareMode}
          disabled={!hasPairedElder}
          hasGroup={hasGroup}
        />
      </div>

      {/* Clear history */}
      <div className="px-5 mt-6">
        <h2 className="text-sm font-semibold text-slate-500 mb-2">{t.record.recordHistoryTitle}</h2>
        {recordCount === 0 ? (
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-card text-sm text-slate-500 text-center">
            {t.record.historyEmpty}
          </div>
        ) : !showClearConfirm ? (
          <button
            onClick={() => setShowClearConfirm(true)}
            className="w-full flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-card active:scale-[0.98] transition-transform"
          >
            <div className="text-left flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600 dark:text-red-300" strokeWidth={2.2} />
              </div>
              <div>
                <div className="font-semibold">{t.record.clearOneClickTitle}</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {t.record.clearOneClickSub.replace("{n}", String(recordCount))}
                </div>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" strokeWidth={2.2} />
          </button>
        ) : (
          <div
            ref={confirmRef}
            className="p-4 bg-amber-50 dark:bg-amber-950 ring-1 ring-amber-300/60 dark:ring-amber-800 rounded-2xl scroll-mt-20 shadow-card"
          >
            <p className="font-semibold text-amber-900 dark:text-amber-100">
              {t.record.clearConfirmTitle.replace("{n}", String(recordCount))}
            </p>
            <p className="text-xs text-amber-800 dark:text-amber-200 mt-1">
              {t.record.clearConfirmDesc}
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 h-12 bg-white dark:bg-slate-900 rounded-xl font-semibold shadow-card"
              >
                {t.common.cancel}
              </button>
              <button
                onClick={handleClearHistory}
                className="flex-1 h-12 bg-gradient-to-br from-red-500 to-red-600 active:from-red-600 active:to-red-700 text-white rounded-xl font-semibold shadow-card"
              >
                {t.common.confirm}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

// ----- 子元件 -----

function TypeTile({
  id,
  label,
  onClick,
}: {
  id: RecordType;
  label: string;
  onClick: (id: RecordType) => void;
}) {
  return (
    <button
      onClick={() => onClick(id)}
      className="aspect-square flex flex-col items-center justify-center bg-white dark:bg-slate-900 rounded-3xl shadow-card active:scale-95 active:shadow-lift transition-all"
    >
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-2 bg-slate-50 dark:bg-slate-800">
        <RecordTypeIcon type={id} className={`w-9 h-9 ${RECORD_ICON_COLOR[id]}`} />
      </div>
      <span className="text-base font-semibold text-center px-1 leading-tight">{label}</span>
    </button>
  );
}

// 共用單值數值輸入畫面 (體溫 / 血糖 / 血氧)
function NumericInputStage({
  title,
  iconType,
  display,
  unit,
  onBack,
  onNext,
  nextLabel,
  canNext,
  keypad,
  onKey,
}: {
  title: string;
  iconType: RecordType;
  display: string;
  unit: string;
  onBack: () => void;
  onNext: () => void;
  nextLabel: string;
  canNext: boolean;
  keypad: string[];
  onKey: (k: string) => void;
}) {
  return (
    <main className="flex flex-col flex-1 pb-[calc(env(safe-area-inset-bottom)+12rem)]">
      <header className="px-5 pt-4 pb-3 flex items-center gap-3">
        <button
          onClick={onBack}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/70 dark:bg-slate-800/70 shadow-card active:scale-95 transition-transform"
        >
          <ChevronLeft className="w-5 h-5 text-slate-700 dark:text-slate-200" strokeWidth={2.4} />
        </button>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <RecordTypeIcon type={iconType} className="w-6 h-6" />
          {title}
        </h1>
      </header>

      <div className="px-5 pt-8">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 text-center shadow-card">
          <div className="text-5xl font-bold tabular-nums">
            {display}
            <span className="text-2xl text-slate-400 ml-1">{unit}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-6">
          {keypad.map((k, idx) =>
            k === "" ? (
              <div key={`gap-${idx}`} className="h-16" />
            ) : (
              <button
                key={k + idx}
                onClick={() => onKey(k)}
                className="h-16 bg-white dark:bg-slate-900 rounded-2xl text-2xl font-semibold shadow-card active:scale-95 transition-transform"
              >
                {k}
              </button>
            )
          )}
        </div>

        <button
          onClick={onNext}
          disabled={!canNext}
          className="w-full mt-6 h-16 bg-gradient-to-br from-blue-500 to-blue-600 active:from-blue-600 active:to-blue-700 text-white rounded-2xl text-xl font-bold shadow-lift disabled:opacity-30 disabled:from-slate-400 disabled:to-slate-500"
        >
          {nextLabel}
        </button>
      </div>
    </main>
  );
}

// 三段式說明:未配對家屬時鎖住、家屬有綁群組時才顯示第三段
// v56: 提到 file scope（lint react-hooks/static-components）
// 原本 inline 在 ShareToggle 內、每次 render 都重建 component reference → 效能差 + child state lost
function RadioDot({ active, color }: { active: boolean; color: string }) {
  return (
    <div
      className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 ${
        active ? `border-${color}-600 bg-${color}-600` : "border-slate-300 dark:border-slate-700"
      }`}
    >
      {active && (
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-white" />
        </div>
      )}
    </div>
  );
}

function ShareToggle({
  mode,
  onChange,
  disabled,
  hasGroup,
}: {
  mode: ShareMode;
  onChange: (m: ShareMode) => void;
  disabled?: boolean;
  hasGroup?: boolean;
}) {
  const t = useT();
  const effectiveMode: ShareMode = disabled ? "none" : mode;

  return (
    <div className="rounded-3xl overflow-hidden bg-white dark:bg-slate-900 shadow-card">
      {disabled && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950 ring-1 ring-amber-300/60 dark:ring-amber-800 text-xs">
          <AlertTriangle
            className="w-4 h-4 text-amber-600 dark:text-amber-300 mt-0.5 shrink-0"
            strokeWidth={2.4}
          />
          <div className="flex-1 text-amber-900 dark:text-amber-100">
            {t.record.shareToggle.lockedNoPair}
            <Link href="/card" className="underline ml-1 font-semibold">
              {t.record.shareToggle.lockedGoPair}
            </Link>
          </div>
        </div>
      )}

      {/* Mode 1: 僅本地 */}
      <button
        onClick={() => onChange("none")}
        className={`w-full text-left p-4 transition-colors ${
          effectiveMode === "none"
            ? "bg-slate-100 dark:bg-slate-800"
            : "active:bg-slate-50 dark:active:bg-slate-800/60"
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 ${
              effectiveMode === "none"
                ? "border-slate-900 dark:border-slate-100 bg-slate-900 dark:bg-slate-100"
                : "border-slate-300 dark:border-slate-700"
            }`}
          >
            {effectiveMode === "none" && (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-white dark:bg-slate-900" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <div className="font-semibold">{t.record.shareToggle.localOnly}</div>
            <ul className="text-xs text-slate-600 dark:text-slate-400 mt-1 space-y-0.5 list-disc list-inside">
              <li>{t.record.shareToggle.localOnlyB1}</li>
              <li>{t.record.shareToggle.localOnlyB2}</li>
              <li>{t.record.shareToggle.localOnlyB3}</li>
            </ul>
          </div>
        </div>
      </button>

      <div className="border-t border-slate-200/60 dark:border-slate-800" />

      {/* Mode 2: 送出給家屬 (1對1) */}
      <button
        onClick={() => !disabled && onChange("family")}
        disabled={disabled}
        className={`w-full text-left p-4 transition-colors ${
          disabled
            ? "opacity-40 cursor-not-allowed"
            : effectiveMode === "family"
            ? "bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-emerald-950 dark:to-teal-900"
            : "active:bg-slate-50 dark:active:bg-slate-800/60"
        }`}
      >
        <div className="flex items-start gap-3">
          <RadioDot active={effectiveMode === "family"} color="emerald" />
          <div className="flex-1">
            <div className="font-semibold text-emerald-900 dark:text-emerald-100">
              {t.record.shareToggle.sendFamily}
            </div>
            <ul className="text-xs text-slate-600 dark:text-slate-400 mt-1 space-y-0.5 list-disc list-inside">
              <li>{t.record.shareToggle.sendFamilyB1}</li>
              <li>{t.record.shareToggle.sendFamilyB2}</li>
              <li>
                <span className="text-amber-700 dark:text-amber-400">
                  {t.record.shareToggle.sendFamilyB3}
                </span>
              </li>
            </ul>
          </div>
        </div>
      </button>

      {/* Mode 3: 送出給家屬 + 家族群組 */}
      {hasGroup && (
        <>
          <div className="border-t border-slate-200/60 dark:border-slate-800" />
          <button
            onClick={() => !disabled && onChange("group")}
            disabled={disabled}
            className={`w-full text-left p-4 transition-colors ${
              disabled
                ? "opacity-40 cursor-not-allowed"
                : effectiveMode === "group"
                ? "bg-gradient-to-br from-purple-50 to-fuchsia-100 dark:from-purple-950 dark:to-fuchsia-900"
                : "active:bg-slate-50 dark:active:bg-slate-800/60"
            }`}
          >
            <div className="flex items-start gap-3">
              <RadioDot active={effectiveMode === "group"} color="purple" />
              <div className="flex-1">
                <div className="font-semibold text-purple-900 dark:text-purple-100">
                  {t.record.shareToggle.sendFamilyAndGroup}
                </div>
                <ul className="text-xs text-slate-600 dark:text-slate-400 mt-1 space-y-0.5 list-disc list-inside">
                  <li>{t.record.shareToggle.sendFamilyAndGroupB1}</li>
                  <li>{t.record.shareToggle.sendFamilyAndGroupB2}</li>
                  <li>
                    <span className="text-amber-700 dark:text-amber-400">
                      {t.record.shareToggle.sendFamilyAndGroupB3}
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </button>
        </>
      )}
    </div>
  );
}
