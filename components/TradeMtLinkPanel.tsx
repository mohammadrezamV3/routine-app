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
      if (!res.ok) { setError("قطع اتصال انجام نشد — دوباره تلاش کن"); return; }
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
      {/* تایتلِ «اتصال متاتریدر» خودِ صفحه بالای این باکس هست — طبقِ درخواستِ
          صریح داخلِ باکس تکرار نمی‌شود؛ فقط وضعیتِ اتصال می‌ماند. */}
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

          {/* قدمِ اول همیشه گرفتنِ کده — قبلا کد پایینِ لیست بود و لیست از
              «کدِ زیر» حرف می‌زد، یعنی کاربر باید اول اسکرول می‌کرد پایین
              می‌دید کد کجاست، بعد برمی‌گشت بالا شروع می‌کرد. الان کد همینجا
              بالای لیسته، و خودِ لیست به‌جاش می‌گه «همون کدی که بالا گرفتی». */}
          {code ? (
            <div className="trade-mt-code-box">
              <div className="trade-stat-label">این کدته — این رو لازم داری</div>
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
                روی آیکونِ کپی که کنارِ کد هست بزن تا کد کپی بشه. این کد فقط یک‌بار قابل استفاده‌ست و
                {codeExpires ? ` تا ${formatTradeDateTime(codeExpires, calSystem)} ` : " تا ۱۵ دقیقه دیگه "}
                اعتبار داره — اگه دیر کردی، کافیه دوباره بزنی «ساخت کد اتصال» و یه کدِ تازه بگیری.
              </div>
            </div>
          ) : (
            <>
              <div className="trade-mt-note" style={{ marginTop: 10 }}>
                اول این دکمه رو بزن تا یه کدِ مخصوصِ همین حساب برات ساخته بشه. بعد توی متاتریدر همین کد رو جا می‌ذاری تا این دو تا به هم وصل بشن.
              </div>
              <button type="button" className="trade-primary-btn" onClick={requestCode} disabled={busy} style={{ marginTop: 10 }}>
                {busy ? <Loader2 size={14} className="trade-spin" /> : "ساخت کد اتصال"}
              </button>
            </>
          )}

          {error && <div className="trade-form-error">{error}</div>}

          <div className="domain-sub" style={{ marginTop: 18, marginBottom: 6 }}>حالا این مراحل رو توی متاتریدر انجام بده</div>
          <ol className="trade-mt-steps">
            <li>
              <span>
                اول این فایل رو دانلود کن — این همون برنامه‌ی کوچیکیه که قراره توی متاتریدرت نصب بشه و معاملاتت رو برای آریون بفرسته:
              </span>
              <a className="trade-mt-download" href={platform === "MT4" ? "/ea/Arion-MT4.mq4" : "/ea/Arion-MT5.mq5"} download>
                <Download size={14} /> {platform === "MT4" ? "Arion-MT4.mq4" : "Arion-MT5.mq5"}
              </a>
            </li>
            <li>
              <span>
                متاتریدر رو باز کن. از نوارِ بالا روی <b className="mono ltr-inline">File</b> بزن، بعد{" "}
                <b className="mono ltr-inline">Open Data Folder</b> رو انتخاب کن — یه پنجره‌ی جدید باز می‌شه که یه سری پوشه توشه.
              </span>
            </li>
            <li>
              <span>
                توی همون پنجره برو توی پوشه‌ی <b className="mono ltr-inline">{platform === "MT4" ? "MQL4" : "MQL5"}</b>، و از توش پوشه‌ی{" "}
                <b className="mono ltr-inline">Experts</b> رو باز کن. فایلی که مرحله‌ی ۱ دانلود کردی رو بکش و همین‌جا بنداز (یا کپی/پیست کن).
              </span>
            </li>
            <li>
              <span>
                حالا باید این فایل رو «کامپایل» کنی — یعنی بگی متاتریدر ازش استفاده کنه. روش دابل‌کلیک کن تا{" "}
                <b className="mono ltr-inline">MetaEditor</b> باز بشه، بعد کلیدِ <b className="mono ltr-inline">F7</b> رو بزن. اگه پایین صفحه نوشت{" "}
                <b className="mono ltr-inline">0 error(s)</b> یعنی درست شد؛ می‌تونی MetaEditor رو ببندی.
              </span>
            </li>
            <li>
              <span>
                برگرد به متاتریدر. توی پنجره‌ی سمتِ چپ به اسمِ <b className="mono ltr-inline">Navigator</b> (اگه نبود از منوی{" "}
                <b className="mono ltr-inline">View</b> بازش کن)، روی <b className="mono ltr-inline">Expert Advisors</b> راست‌کلیک کن و{" "}
                <b className="mono ltr-inline">Refresh</b> رو بزن — الان باید اسمِ <b className="mono ltr-inline">Arion</b> اونجا دیده بشه.
              </span>
            </li>
            <li>
              <span>
                اسمِ <b className="mono ltr-inline">Arion</b> رو با ماوس بگیر و روی نمودارِ (چارتِ) هر جفت‌ارزی که باز داری ولش کن. یه پنجره‌ی تنظیمات باز می‌شه.
              </span>
            </li>
            <li>
              <span>
                توی همون پنجره، برو تبِ <b className="mono ltr-inline">Inputs</b> (یا <b className="mono ltr-inline">Common</b> در نسخه‌های قدیمی‌تر) و جلوی{" "}
                <b className="mono ltr-inline">PairingCode</b>، همون کدی که بالای همین صفحه گرفتی رو بچسبون. بعد <b className="mono ltr-inline">OK</b> رو بزن.
              </span>
            </li>
            <li>
              <span>
                یه بار هم برو <b className="mono ltr-inline">Tools → Options → Expert Advisors</b> و تیکِ{" "}
                <b className="mono ltr-inline">Allow WebRequest for listed URL</b> رو بزن؛ بعد توی لیستِ زیرش آدرسِ{" "}
                <b className="mono ltr-inline">https://arionapp.ir</b> رو اضافه کن و <b className="mono ltr-inline">OK</b> بزن.
                بدونِ این تیک، متاتریدر اصلاً اجازه نمی‌ده اکسپرت چیزی برای آریون بفرسته.
              </span>
            </li>
          </ol>

          <div className="trade-mt-note trade-mt-note-warn">
            نکته‌ی خیلی مهم: بعد از این کارها، بالا-سمتِ راستِ نمودار باید یه آیکونِ لبخند 🙂 و رنگی ببینی، کنارِ اسمِ Arion. اگه به‌جاش یه ضربدرِ قرمز دیدی، یعنی دکمه‌ی{" "}
            <b className="mono ltr-inline">AutoTrading</b> (یا <b className="mono ltr-inline">Algo Trading</b>) بالای متاتریدر خاموشه — روش بزن تا روشن (سبز) بشه.
          </div>

          <div className="trade-mt-note" style={{ marginTop: 10 }}>
            همین که وصل بشه، آریون خودش بلافاصله کل تاریخچه‌ی معاملاتِ این حساب رو (نه فقط چند تای اخیر) می‌کِشه بالا — چیزی نیاز نیست دستی وارد کنی.
          </div>

          <div className="trade-mt-note" style={{ marginTop: 14 }}>
            رمز حساب معاملاتی‌ات هیچ‌وقت از تو خواسته و هیچ‌جا ذخیره نمی‌شود. اکسپرت فقط
            اطلاعات معاملات را می‌خواند و می‌فرستد؛ هیچ سفارشی باز یا بسته نمی‌کند.
          </div>
        </>
      )}
    </div>
  );
}
