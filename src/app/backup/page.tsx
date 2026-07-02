"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { exportAllData, importAllData, deleteAllLocalData } from "@/lib/elder";
import { loginWithLine, logout } from "@/app/actions/auth-actions";
import {
  encryptBackup,
  decryptBackup,
  isEncryptedEnvelope,
} from "@/lib/secure-backup";
import { getRole, clearRole } from "@/lib/role";

type SessionInfo =
  | { loggedIn: false }
  | { loggedIn: true; name: string | null; picture: string | null };

export default function BackupPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [passphrase, setPassphrase] = useState("");
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [pendingEncrypted, setPendingEncrypted] = useState<string | null>(null);
  const [importPassphrase, setImportPassphrase] = useState("");
  const [backHref, setBackHref] = useState("/");

  // Load session
  useEffect(() => {
    fetch("/api/session")
      .then((r) => r.json())
      .then((s) => setSession(s))
      .catch(() => setSession({ loggedIn: false }));
  }, []);

  // 依角色決定返回鍵
  useEffect(() => {
    setBackHref(getRole() === "family" ? "/family" : "/");
  }, []);

  const showMsg = (ok: boolean, text: string, ms = 4000) => {
    setMessage({ ok, text });
    setTimeout(() => setMessage(null), ms);
  };

  // Local file backup
  const handleExportFile = async () => {
    setBusy(true);
    try {
      const plainJson = exportAllData();
      let outputJson = plainJson;
      let suffix = "";
      if (passphrase.length >= 8) {
        outputJson = await encryptBackup(plainJson, passphrase);
        suffix = "-encrypted";
      } else if (passphrase.length > 0) {
        showMsg(false, "密碼至少要 8 個字元（或留空匯出未加密版）");
        setBusy(false);
        return;
      }
      const blob = new Blob([outputJson], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `caretaiwan-backup${suffix}-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showMsg(true, suffix ? "已下載加密備份檔" : "已下載備份檔");
      setPassphrase("");
    } finally {
      setBusy(false);
    }
  };

  const tryImport = (raw: string) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      showMsg(false, "失敗:JSON 解析失敗");
      return;
    }
    if (isEncryptedEnvelope(parsed)) {
      // 加密檔 → 跳出 passphrase 對話
      setPendingEncrypted(raw);
      setImportPassphrase("");
      return;
    }
    const result = importAllData(raw);
    if (result.ok) {
      showMsg(
        true,
        `匯入成功:${result.elderCount} 位老人 / ${result.recordCount} 筆記錄`,
        5000
      );
    } else {
      showMsg(false, `失敗:${result.message}`);
    }
  };

  const handleDecryptImport = async () => {
    if (!pendingEncrypted || !importPassphrase) return;
    setBusy(true);
    try {
      const r = await decryptBackup(pendingEncrypted, importPassphrase);
      if (!r.ok) {
        showMsg(
          false,
          r.error === "WRONG_PASSPHRASE" ? "密碼錯誤" : "備份檔格式錯誤"
        );
        return;
      }
      const result = importAllData(r.plaintext);
      if (result.ok) {
        showMsg(
          true,
          `匯入成功:${result.elderCount} 位老人 / ${result.recordCount} 筆記錄`,
          5000
        );
        setPendingEncrypted(null);
        setImportPassphrase("");
      } else {
        showMsg(false, `失敗:${result.message}`);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => tryImport(String(reader.result));
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Cloud backup
  const handleCloudUpload = async () => {
    setBusy(true);
    try {
      const json = exportAllData();
      const res = await fetch("/api/cloud/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: json,
      });
      const data = await res.json();
      if (res.ok) showMsg(true, "已上傳到雲端");
      else showMsg(false, `失敗:${data.error || res.status}`);
    } catch {
      showMsg(false, "網路錯誤");
    } finally {
      setBusy(false);
    }
  };

  const handleCloudDownload = async () => {
    if (!confirm("從雲端還原會覆蓋目前手機上的資料，確定？")) return;
    setBusy(true);
    try {
      const res = await fetch("/api/cloud/download");
      const data = await res.json();
      if (!res.ok) {
        showMsg(false, `失敗:${data.error || res.status}`);
        return;
      }
      if (!data.data) {
        showMsg(false, "雲端沒有備份");
        return;
      }
      const result = importAllData(JSON.stringify(data.data));
      if (result.ok) {
        showMsg(
          true,
          `已還原:${result.elderCount} 位老人 / ${result.recordCount} 筆記錄`,
          5000
        );
      } else {
        showMsg(false, `還原失敗:${result.message}`);
      }
    } catch {
      showMsg(false, "網路錯誤");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex flex-col flex-1 pb-32">
      <header className="px-5 pt-4 pb-3 flex items-center gap-3 border-b border-slate-200 dark:border-slate-800">
        <Link
          href={backHref}
          className="text-2xl w-10 h-10 flex items-center justify-center rounded-full active:bg-slate-100 dark:active:bg-slate-800"
        >
          ←
        </Link>
        <h1 className="text-xl font-bold">💾 備份與還原</h1>
      </header>

      <div className="px-5 pt-5 space-y-4">
        {message && (
          <div
            className={`p-4 rounded-xl ${
              message.ok
                ? "bg-emerald-50 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100"
                : "bg-red-50 dark:bg-red-950 border border-red-300 dark:border-red-800 text-red-900 dark:text-red-100"
            }`}
          >
            {message.ok ? "✅" : "⚠️"} {message.text}
          </div>
        )}

        {/* Family LINE Bot setup tutorial */}
        <Link
          href="/family-setup"
          className="block p-4 bg-gradient-to-br from-blue-50 to-sky-100 dark:from-blue-950 dark:to-sky-900 ring-1 ring-blue-200/60 dark:ring-blue-900/60 rounded-2xl shadow-card active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/80 dark:bg-slate-900/40 flex items-center justify-center shadow-card shrink-0">
              <span className="text-2xl">📲</span>
            </div>
            <div className="flex-1">
              <div className="text-base font-bold text-slate-900 dark:text-white">
                配對家屬 LINE Bot
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                完整 5 步教學（雙端流程＋故障排除）
              </div>
            </div>
            <span className="text-blue-600 dark:text-blue-400 text-xl">›</span>
          </div>
        </Link>

        {/* Cloud (LINE login) */}
        <Section title="☁️ 雲端備份（LINE 登入）" emphasis>
          <p className="mb-3">
            登入 LINE 之後，可一鍵把資料備份到雲端。換手機、清資料都能還原。
            <br />
            <span className="text-xs text-slate-500">
              不登入也能用 APP，只是資料只在這支手機。
            </span>
          </p>

          {session === null && (
            <div className="text-sm text-slate-500">載入中…</div>
          )}

          {session?.loggedIn === false && (
            <form action={loginWithLine}>
              <button
                type="submit"
                className="w-full h-14 bg-emerald-600 active:bg-emerald-700 text-white rounded-2xl font-bold"
              >
                用 LINE 登入
              </button>
            </form>
          )}

          {session?.loggedIn === true && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                {session.picture && (
                  // LINE profile images are external user avatars; keep them unoptimized and out of Next image config.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={session.picture}
                    alt=""
                    className="w-10 h-10 rounded-full"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">
                    {session.name || "LINE 使用者"}
                  </div>
                  <div className="text-xs text-slate-500">已登入</div>
                </div>
                <form action={logout}>
                  <button
                    type="submit"
                    className="text-sm text-slate-500 px-3 py-2 active:text-slate-700"
                  >
                    登出
                  </button>
                </form>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleCloudUpload}
                  disabled={busy}
                  className="h-14 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-2xl font-bold disabled:opacity-50"
                >
                  ☁️ 上傳到雲端
                </button>
                <button
                  onClick={handleCloudDownload}
                  disabled={busy}
                  className="h-14 bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-100 rounded-2xl font-bold disabled:opacity-50"
                >
                  📥 從雲端還原
                </button>
              </div>
            </div>
          )}
        </Section>

        {/* Local file */}
        <Section title="📤 匯出備份檔（不登入也可用）">
          <p className="mb-3">
            把資料下載成 JSON 檔存到手機。這個方法不需登入，只是要自己保管檔案。
          </p>
          <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-xl">
            <label className="text-xs font-semibold text-blue-900 dark:text-blue-200">
              🔒 密碼保護（選擇性，至少 8 字元）
            </label>
            <p className="text-xs text-blue-800 dark:text-blue-300 mt-1 mb-2">
              設密碼後備份檔即使被別人拿到也無法讀取（AES-256 加密）。
              <strong>密碼丟失無法救回</strong>。
            </p>
            <div className="flex gap-2">
              <input
                type={showPassphrase ? "text" : "password"}
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="留空＝不加密"
                autoComplete="new-password"
                className="flex-1 h-10 px-3 rounded-lg bg-white dark:bg-slate-900 text-sm border border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassphrase((v) => !v)}
                className="px-3 h-10 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
              >
                {showPassphrase ? "隱藏" : "顯示"}
              </button>
            </div>
          </div>
          <button
            onClick={handleExportFile}
            disabled={busy}
            className="w-full h-14 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-2xl text-base font-bold disabled:opacity-50"
          >
            {passphrase.length >= 8 ? "下載加密備份檔" : "下載備份檔"}
          </button>
        </Section>

        <Section title="📥 從備份檔還原">
          <p className="mb-3">選擇你之前下載的 .json 備份檔。**會覆蓋目前資料**。</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFile}
            className="block w-full text-sm file:mr-4 file:px-4 file:py-3 file:rounded-2xl file:border-0 file:bg-slate-900 dark:file:bg-slate-100 file:text-white dark:file:text-slate-900 file:font-bold file:cursor-pointer"
          />

          {pendingEncrypted && (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 ring-1 ring-blue-300/60 dark:ring-blue-800 rounded-2xl space-y-3">
              <div className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                🔒 此備份檔已加密，請輸入密碼
              </div>
              <input
                type="password"
                value={importPassphrase}
                onChange={(e) => setImportPassphrase(e.target.value)}
                placeholder="解密密碼"
                autoComplete="off"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleDecryptImport();
                }}
                className="w-full h-12 px-3 rounded-lg bg-white dark:bg-slate-900 text-base border border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setPendingEncrypted(null);
                    setImportPassphrase("");
                  }}
                  className="flex-1 h-11 bg-white dark:bg-slate-900 rounded-lg font-semibold"
                >
                  取消
                </button>
                <button
                  onClick={handleDecryptImport}
                  disabled={busy || importPassphrase.length === 0}
                  className="flex-1 h-11 bg-blue-600 active:bg-blue-700 text-white rounded-lg font-semibold disabled:opacity-50"
                >
                  解密並還原
                </button>
              </div>
            </div>
          )}
        </Section>

        <Section title="ℹ️ 注意事項">
          <ul className="space-y-2 list-disc list-inside">
            <li>登入 LINE 後我們只記住你的 LINE userId（無臉書、密碼、電話等）</li>
            <li>雲端只存「醫護卡 + 記錄」JSON，不上傳任何 LINE 個資</li>
            <li>登出後雲端資料保留（下次登入仍可還原）</li>
            <li>「我需要協助」這個按鈕完全不會通知任何人，跟登入無關</li>
          </ul>
        </Section>

        {/* Right to erasure (個資法第 11 條) */}
        <Section title="🗑️ 刪除全部資料" emphasis={false}>
          <p className="mb-3 text-sm">
            依個人資料保護法，你可以隨時刪除全部資料：
          </p>
          <ul className="text-xs text-slate-500 dark:text-slate-400 mb-4 space-y-1 list-disc list-inside">
            <li>本機資料（醫護卡、記錄、配對狀態）</li>
            <li>雲端備份（如果有登入過）</li>
            <li>配對紀錄（已連線的另一端會解除連結）</li>
            <li>已送出到 LINE 的訊息屬於 LINE 平台，不在我們可刪除範圍</li>
          </ul>
          <DeleteAllButton
            loggedIn={session?.loggedIn === true}
            onDone={() => showMsg(true, "已清除全部資料")}
            onError={(t) => showMsg(false, t)}
          />
        </Section>
      </div>
    </main>
  );
}

function DeleteAllButton({
  loggedIn,
  onDone,
  onError,
}: {
  loggedIn: boolean;
  onDone: () => void;
  onError: (msg: string) => void;
}) {
  const [stage, setStage] = useState<"idle" | "confirm" | "busy">("idle");

  if (stage === "idle") {
    return (
      <button
        onClick={() => setStage("confirm")}
        className="w-full h-12 bg-white dark:bg-slate-900 border-2 border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl font-semibold"
      >
        刪除全部資料…
      </button>
    );
  }
  if (stage === "confirm") {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-950 ring-1 ring-red-300/60 dark:ring-red-800 rounded-xl space-y-3">
        <p className="font-semibold text-red-900 dark:text-red-100">
          確定要清除全部資料？
        </p>
        <p className="text-xs text-red-800 dark:text-red-200">
          清除後**無法復原**。會一併執行下列動作:
        </p>
        <ul className="text-xs text-red-800 dark:text-red-200 list-disc list-inside space-y-0.5 ml-1">
          <li>刪除本機 + 雲端所有資料</li>
          <li>解除所有配對關係</li>
          <li>登出 LINE</li>
          <li>清除身分(看護/家屬)</li>
        </ul>
        <div className="flex gap-2">
          <button
            onClick={() => setStage("idle")}
            className="flex-1 h-12 bg-white dark:bg-slate-900 rounded-xl font-semibold"
          >
            取消
          </button>
          <button
            onClick={async () => {
              setStage("busy");
              try {
                // 1. 先雲端刪除 (網路操作放最前面,失敗可中止流程)
                if (loggedIn) {
                  const res = await fetch("/api/cloud/delete", { method: "POST" });
                  if (!res.ok) {
                    onError("雲端刪除失敗,請稍後再試");
                    setStage("idle");
                    return;
                  }
                }
                // 2. 本機資料 + 角色一次清掉,中間沒空檔
                deleteAllLocalData();
                clearRole();
                onDone();
                // 3. 登出 (server action 會 redirect 到 /backup)
                //    不登入的情況直接 reload,讓 RolePicker 在乾淨狀態重新跳出
                if (loggedIn) {
                  await logout();
                } else {
                  location.reload();
                }
              } catch {
                onError("發生錯誤");
                setStage("idle");
              }
            }}
            className="flex-1 h-12 bg-red-600 active:bg-red-700 text-white rounded-xl font-semibold"
          >
            確定刪除全部
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="text-sm text-slate-500 text-center py-3">刪除中…</div>
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
      className={`p-4 rounded-2xl ${
        emphasis
          ? "bg-emerald-50 dark:bg-emerald-950 border-2 border-emerald-300 dark:border-emerald-800"
          : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
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
