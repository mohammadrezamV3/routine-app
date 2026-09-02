"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Download, Link2Off, Loader2, RefreshCw } from "lucide-react";
import { faNum } from "@/lib/jalali";
import { formatTradeDateTime } from "@/lib/tradeDateTime";
import { SegmentedTabs } from "./SegmentedTabs";
import type { CalSystem } from "@/lib/tradeTypes";

type MtLink = {
  id: string; platform: "MT4" | "MT5";
  brokerName: string | null; serverName: string | null; accountLogin: string | null;
  balance: number | null; equity: number | null; currency: string | null;
  tokenPrefix: string | null; connected: boolean;
  connectedAt: string | null; lastSyncAt: string | null; revokedAt: string | null;
};

// اتصالِ متاتریدرِ **همین حساب**. عمداً داخلِ صفحه‌ی حساب است نه یک صفحه‌ی
// سراسری: هر کاربر ده‌ها حساب دارد و هرکدام ترمینال و لاگینِ خودش را دارد.
export function TradeMtLinkPanel({ accountId, calSystem }: { accountId: string; calSystem: CalSystem }) {
  const [link, setLink] = useState<MtLink | null>(null);
  const [platform, setPlatform] = useState<"MT4" | "MT5">("MT4");
  const [code, setCode] = useState<string | null>(null);
  const [codeExpires, setCodeExpires] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/trade/metatrader?accountId=${accountId}`);
    if (!res.ok) return;
    const data = await res.json();
    setLink(data.link);
    if (data.link?.platform) setPlatform(data.link.platform);
  }, [accountId]);

  useEffect(() => { load(); }, [load]);

  async function requestCode() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/trade/metatrader", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId, platform }),
    });
    const data = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) { setError(data?.error || "خطا در ساخت کد اتصال"); return; }
    setCode(data.code);
    setCodeExpires(data.expiresAt);
    load();
  }

  async function revoke() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/trade/metatrader?accountId=${accountId}`, { method: "DELETE" });
      if (!res.ok) { setError("قطع اتصال انجام نشد — دوباره تلاش کن"); return; }
      setCode(null);
      await load();
    } catch {
      setError("ارتباط با سرور برقرار نشد");
    } finally {
      setBusy(false);
    }
  }

  // «بررسی اتصال» یک درخواستِ شبکه است؛ بدونِ این حالت دکمه هیچ نشانه‌ای
  // نمی‌داد و کاربر فکر می‌کرد کلیکش نگرفته.
  async function refresh() {
    if (refreshing) return;
    setRefreshing(true);
    try { await load(); } finally { setRefreshing(false); }
  }

  function copyCode() {
    if (!code) return;
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }).catch(() => {});
  }

  return (
    <div className="trade-surface trade-mt-panel">
      <div className="trade-mt-panel-head">
        <div className="domain-sub" style={{ margin: 0 }}>اتصال متاتریدر</div>
        <span className={`trade-mt-live${link?.connected ? " connected" : ""}`}>
          <span className="trade-mt-live-dot" />
          {link?.connected ? "فعال" : "غیرفعال"}
        </span>
      </div>

      {link?.connected ? (
        <>
          <div className="trade-detail-grid" style={{ marginTop: 12 }}>
            <div className="trade-detail-cell"><span>نسخه</span><b>{link.platform}</b></div>
            {link.brokerName && <div className="trade-detail-cell"><span>بروکر</span><b>{link.brokerName}</b></div>}
            {link.serverName && <div className="trade-detail-cell"><span>سرور</span><b>{link.serverName}</b></div>}
            {link.accountLogin && <div className="trade-detail-cell"><span>شماره حساب</span><b className="mono">{faNum(link.accountLogin)}</b></div>}
            {link.balance !== null && <div className="trade-detail-cell"><span>بالانس ترمینال</span><b className="mono">{faNum(link.balance.toFixed(2))}</b></div>}
            {link.equity !== null && <div className="trade-detail-cell"><span>اکوئیتی</span><b className="mono">{faNum(link.equity.toFixed(2))}</b></div>}
            <div className="trade-detail-cell">
              <span>آخرین همگام‌سازی</span>
              <b>{link.lastSyncAt ? formatTradeDateTime(link.lastSyncAt, calSystem) : "هنوز انجام نشده"}</b>
            </div>
          </div>

          <div className="trade-modal-actions">
            <button type="button" className="account-outline-btn" onClick={refresh} disabled={refreshing}>
              <RefreshCw size={14} className={refreshing ? "trade-spin" : undefined} /> بررسی اتصال
            </button>
            <button type="button" className="trade-danger-btn" onClick={revoke} disabled={busy}>
              <Link2Off size={14} /> قطع اتصال
            </button>
          </div>
        </>
      ) : (
        <>
          <label className="exercise-form-label">کدام نسخه‌ی متاتریدر؟</label>
          <SegmentedTabs
            active={platform}
            onChange={setPlatform}
            options={[{ value: "MT4" as const, label: "MetaTrader 4" }, { value: "MT5" as const, label: "MetaTrader 5" }]}
          />

          <ol className="trade-mt-steps">
            <li>
              <span>فایل اکسپرت را دانلود کنید</span>
              <a className="trade-mt-download" href={platform === "MT4" ? "/ea/Arion-MT4.mq4" : "/ea/Arion-MT5.mq5"} download>
                <Download size={14} /> {platform === "MT4" ? "Arion-MT4.mq4" : "Arion-MT5.mq5"}
              </a>
            </li>
            <li>
              <span>
                از منوی <b className="mono ltr-inline">File</b> در متاتریدر گزینه‌ی{" "}
                <b className="mono ltr-inline">Open Data Folder</b> را بزن؛ در پوشه‌ای که باز می‌شود مسیرِ{" "}
                <b className="mono ltr-inline">{platform === "MT4" ? "MQL4/Experts" : "MQL5/Experts"}</b> را باز کن
                و فایلِ دانلودشده را همان‌جا کپی کن.
              </span>
            </li>
            <li>
              <span>
                در <b className="mono ltr-inline">MetaEditor</b> بازش کن و <b className="mono ltr-inline">F7</b> بزن تا کامپایل شود
              </span>
            </li>
            <li>
              <span>
                در متاتریدر: <b className="mono ltr-inline">Tools → Options → Expert Advisors</b> — گزینه‌ی{" "}
                <b className="mono ltr-inline">Allow WebRequest for listed URL</b> را تیک بزن و آدرس سایت را اضافه کن.
              </span>
            </li>
            <li>
              <span>اکسپرت را روی یک چارت بینداز و کد زیر را در فیلد <b className="mono ltr-inline">PairingCode</b> بگذار</span>
            </li>
          </ol>

          {code ? (
            <div className="trade-mt-code-box">
              <div className="trade-stat-label">کد اتصال</div>
              <div className="trade-mt-code mono">{code}</div>
              <div className="trade-mt-note">
                این کد فقط یک‌بار مصرف می‌شود و
                {codeExpires ? ` تا ${formatTradeDateTime(codeExpires, calSystem)} ` : " تا ۱۵ دقیقه "}
                معتبر است. بعد از بستن این صفحه دیگر نمایش داده نمی‌شود.
              </div>
              <button type="button" className="account-outline-btn" onClick={copyCode}>
                {copied ? <><Check size={14} /> کپی شد</> : <><Copy size={14} /> کپی کد</>}
              </button>
            </div>
          ) : (
            <button type="button" className="trade-primary-btn" onClick={requestCode} disabled={busy} style={{ marginTop: 14 }}>
              {busy ? <><Loader2 size={14} className="trade-spin" /> در حال ساخت…</> : "ساخت کد اتصال"}
            </button>
          )}

          {error && <div className="trade-form-error">{error}</div>}

          <div className="trade-mt-note" style={{ marginTop: 14 }}>
            رمز حساب معاملاتی‌ات هیچ‌وقت از تو خواسته و هیچ‌جا ذخیره نمی‌شود. اکسپرت فقط
            اطلاعات معاملات را می‌خواند و می‌فرستد؛ هیچ سفارشی باز یا بسته نمی‌کند.
          </div>
        </>
      )}
    </div>
  );
}
