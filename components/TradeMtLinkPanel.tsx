"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Download, Link2Off, RefreshCw } from "lucide-react";
import { faNum } from "@/lib/jalali";
import { formatTradeDateTime } from "@/lib/tradeDateTime";
import { SegmentedTabs } from "./SegmentedTabs";
import type { CalSystem } from "@/lib/tradeTypes";
import { Spinner } from "./Spinner";

type MtLink = {
  id: string; platform: "MT4" | "MT5";
  brokerName: string | null; serverName: string | null; accountLogin: string | null;
  balance: number | null; equity: number | null; currency: string | null;
  tokenPrefix: string | null; connected: boolean;
  connectedAt: string | null; lastSyncAt: string | null; revokedAt: string | null;
};

// اتصال متاتریدر **همین حساب**. عمدا داخل صفحه‌ی حساب است نه یک صفحه‌ی
// سراسری: هر کاربر ده‌ها حساب دارد و هرکدام ترمینال و لاگین خودش را دارد.
export function TradeMtLinkPanel({ accountId, calSystem, accountName }: { accountId: string; calSystem: CalSystem; accountName?: string }) {
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
      if (!res.ok) { setError("قطع اتصال انجام نشد. دوباره تلاش کنید."); return; }
      setCode(null);
      await load();
    } catch {
      setError("ارتباط با سرور برقرار نشد");
    } finally {
      setBusy(false);
    }
  }

  // «بررسی اتصال» یک درخواست شبکه است؛ بدون این حالت دکمه هیچ نشانه‌ای
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
    <div className="trade-surface trade-page-box trade-mt-panel">
      {accountName && <div className="trade-mt-account-name-line">نام حساب: <b>{accountName}</b></div>}
      {/* تایتل «اتصال متاتریدر» خود صفحه بالای این باکس هست — طبق درخواست
          صریح داخل باکس تکرار نمی‌شود؛ فقط وضعیت اتصال می‌ماند. */}
      <div className="trade-mt-panel-head">
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

          <div className="trade-mt-note" style={{ marginTop: 12 }}>
            توجه: برای همگام‌سازی، هر بار باید هم متاتریدر (با اکسپرت روشن روی چارت) و هم سایت هر دو روشن باشند.
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

          {/* قدم اول همیشه گرفتن کده — قبلا کد پایین لیست بود و لیست از
              «کد زیر» حرف می‌زد، یعنی کاربر باید اول اسکرول می‌کرد پایین
              می‌دید کد کجاست، بعد برمی‌گشت بالا شروع می‌کرد. الان کد همینجا
              بالای لیسته، و خود لیست به‌جاش می‌گه «همون کدی که بالا گرفتی». */}
          {code ? (
            <div className="trade-mt-code-box">
              <div className="trade-stat-label">کد اتصال این حساب</div>
              <div className="trade-mt-code-row">
                <button
                  type="button"
                  className="trade-icon-btn trade-mt-copy-btn"
                  onClick={copyCode}
                  aria-label="کپی کد"
                  title="کپی کد"
                >
                  {copied ? <Check size={15} /> : <Copy size={15} />}
                </button>
                <div className="trade-mt-code mono">{code}</div>
              </div>
              <div className="trade-mt-note">
                این کد یک‌بارمصرف است و
                {codeExpires ? ` تا ${formatTradeDateTime(codeExpires, calSystem)} ` : " تا 15 دقیقه "}
                اعتبار دارد. در صورت انقضا، کد جدیدی بسازید.
              </div>
            </div>
          ) : (
            <>
              <div className="trade-mt-note" style={{ marginTop: 10 }}>
                ابتدا یک کد اتصال برای این حساب بسازید.
              </div>
              <button type="button" className="trade-primary-btn" onClick={requestCode} disabled={busy} style={{ marginTop: 10 }}>
                {busy ? <Spinner size={13} /> : "ساخت کد اتصال"}
              </button>
            </>
          )}

          {error && <div className="trade-form-error">{error}</div>}

          <div className="domain-sub" style={{ marginTop: 18, marginBottom: 6 }}>مراحل اتصال</div>
          <ol className="trade-mt-steps">
            <li>
              <span>فایل اکسپرت را دانلود کنید:</span>
              <a className="trade-mt-download" href={platform === "MT4" ? "/ea/Arion-MT4.mq4" : "/ea/Arion-MT5.mq5"} download>
                <Download size={14} /> {platform === "MT4" ? "Arion-MT4.mq4" : "Arion-MT5.mq5"}
              </a>
            </li>
            <li>
              <span>
                در متاتریدر از منوی <b className="mono ltr-inline">File → Open Data Folder</b> پوشه‌ی{" "}
                <b className="mono ltr-inline">{platform === "MT4" ? "MQL4/Experts" : "MQL5/Experts"}</b> را باز کنید و فایل را در آن قرار دهید.
              </span>
            </li>
            <li>
              <span>
                در <b className="mono ltr-inline">Tools → Options → Expert Advisors</b> گزینه‌ی{" "}
                <b className="mono ltr-inline">Allow WebRequest for listed URL</b> را فعال کنید و آدرس{" "}
                <b className="mono ltr-inline">https://arionapp.ir</b> را به فهرست اضافه کنید.
              </span>
            </li>
            <li>
              <span>
                در پنجره‌ی <b className="mono ltr-inline">Navigator</b> روی <b className="mono ltr-inline">Expert Advisors</b> راست‌کلیک کرده و{" "}
                <b className="mono ltr-inline">Refresh</b> را بزنید، سپس اکسپرت <b className="mono ltr-inline">Arion</b> را روی یک چارت بکشید.
                اگر در فهرست نبود، فایل را در MetaEditor باز کنید و با <b className="mono ltr-inline">F7</b> کامپایل کنید.
              </span>
            </li>
            <li>
              <span>
                در تب <b className="mono ltr-inline">Inputs</b>، کد اتصال را در فیلد <b className="mono ltr-inline">PairingCode</b> وارد کنید و{" "}
                <b className="mono ltr-inline">OK</b> را بزنید.
              </span>
            </li>
            <li>
              <span>
                دکمه‌ی <b className="mono ltr-inline">{platform === "MT4" ? "AutoTrading" : "Algo Trading"}</b> را روشن کنید. پس از اتصال، وضعیت این صفحه «فعال» می‌شود
                و معاملات حساب به‌طور خودکار همگام‌سازی می‌شوند.
              </span>
            </li>
          </ol>

          <div className="trade-mt-note" style={{ marginTop: 12 }}>
            توجه: برای همگام‌سازی، هر بار باید هم متاتریدر (با اکسپرت روشن روی چارت) و هم سایت هر دو روشن باشند.
          </div>
          <div className="trade-mt-note" style={{ marginTop: 14 }}>
            رمز حساب معاملاتی هیچ‌گاه درخواست یا ذخیره نمی‌شود. اکسپرت فقط اطلاعات معاملات را ارسال می‌کند
            و هیچ سفارشی باز یا بسته نمی‌کند.
          </div>
        </>
      )}
    </div>
  );
}
