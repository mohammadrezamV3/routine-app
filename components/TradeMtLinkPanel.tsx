"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Download, Link2Off, RefreshCw } from "lucide-react";
import { faNum } from "@/lib/jalali";
import { formatTradeDateTime } from "@/lib/tradeDateTime";
import { SegmentedTabs } from "./SegmentedTabs";
import { currencySymbol, type CalSystem } from "@/lib/tradeTypes";
import { Spinner } from "./Spinner";
import { tr, trv } from "@/lib/i18n";
import { EA_LATEST_VERSION, isEaOutdated, shotErrorIsCurrent, shotErrorLabel } from "@/lib/mtShotDiag";

type Reconciliation = {
  journalBalance: number; mtBalance: number | null; difference: number | null;
  tradesPnl: number; funding: number; charges: number; initialBalance: number;
};

type MtLink = {
  id: string; platform: "MT4" | "MT5";
  brokerName: string | null; serverName: string | null; accountLogin: string | null;
  balance: number | null; equity: number | null; currency: string | null;
  tokenPrefix: string | null; connected: boolean;
  connectedAt: string | null; lastSyncAt: string | null; revokedAt: string | null;
  eaVersion?: string | null; shotsEnabled?: boolean | null;
  lastShotAt?: string | null; shotError?: string | null; shotErrorAt?: string | null;
};

// اتصال متاتریدر **همین حساب**. عمدا داخل صفحه‌ی حساب است نه یک صفحه‌ی
// سراسری: هر کاربر ده‌ها حساب دارد و هرکدام ترمینال و لاگین خودش را دارد.
export function TradeMtLinkPanel({ accountId, calSystem, accountName }: { accountId: string; calSystem: CalSystem; accountName?: string }) {
  const [link, setLink] = useState<MtLink | null>(null);
  const [recon, setRecon] = useState<Reconciliation | null>(null);
  const [platform, setPlatform] = useState<"MT4" | "MT5">("MT4");
  const [code, setCode] = useState<string | null>(null);
  const [codeExpires, setCodeExpires] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/trade/metatrader?accountId=${accountId}`).catch(() => null);
    // قبلا خطا بی‌صدا رد می‌شد و پنل «غیرفعال» می‌موند بدون هیچ توضیحی
    if (!res || !res.ok) { setError(tr("وضعیت اتصال خوانده نشد. چند لحظه بعد «بررسی اتصال» رو بزنید.", "Could not read the connection status. Try \"Check connection\" in a moment.")); return; }
    setError(null);
    const data = await res.json();
    setLink(data.link);
    setRecon(data.reconciliation ?? null);
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
    if (!res.ok) { setError(data?.error || tr("خطا در ساخت کد اتصال", "Failed to create the connection code")); return; }
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
      if (!res.ok) { setError(tr("قطع اتصال انجام نشد. دوباره تلاش کنید.", "Could not disconnect. Try again.")); return; }
      setCode(null);
      await load();
    } catch {
      setError(tr("ارتباط با سرور برقرار نشد", "Could not reach the server"));
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
      {accountName && <div className="trade-mt-account-name-line">{tr("نام حساب:", "Account name:")} <b>{accountName}</b></div>}
      {/* تایتل «اتصال متاتریدر» خود صفحه بالای این باکس هست — طبق درخواست
          صریح داخل باکس تکرار نمی‌شود؛ فقط وضعیت اتصال می‌ماند. */}
      <div className="trade-mt-panel-head">
        <span className={`trade-mt-live${link?.connected ? " connected" : ""}`}>
          <span className="trade-mt-live-dot" />
          {link?.connected ? tr("فعال", "Active") : tr("غیرفعال", "Inactive")}
        </span>
      </div>

      {link?.connected ? (
        <>
          <div className="trade-detail-grid" style={{ marginTop: 12 }}>
            <div className="trade-detail-cell"><span>{tr("نسخه", "Platform")}</span><b>{link.platform}</b></div>
            {link.brokerName && <div className="trade-detail-cell"><span>{tr("بروکر", "Broker")}</span><b>{link.brokerName}</b></div>}
            {link.serverName && <div className="trade-detail-cell"><span>{tr("سرور", "Server")}</span><b>{link.serverName}</b></div>}
            {link.accountLogin && <div className="trade-detail-cell"><span>{tr("شماره حساب", "Account number")}</span><b className="mono">{faNum(link.accountLogin)}</b></div>}
            {link.balance !== null && <div className="trade-detail-cell"><span>{tr("بالانس ترمینال", "Terminal balance")}</span><b className="mono">{faNum(link.balance.toFixed(2))}</b></div>}
            {link.equity !== null && <div className="trade-detail-cell"><span>{tr("اکوئیتی", "Equity")}</span><b className="mono">{faNum(link.equity.toFixed(2))}</b></div>}
            <div className="trade-detail-cell">
              <span>{tr("آخرین همگام‌سازی", "Last sync")}</span>
              <b>{link.lastSyncAt ? formatTradeDateTime(link.lastSyncAt, calSystem) : tr("هنوز انجام نشده", "Not yet")}</b>
            </div>
            <div className="trade-detail-cell">
              <span>{tr("نسخه‌ی اکسپرت", "EA version")}</span>
              <b className="mono">{link.eaVersion ? faNum(link.eaVersion) : tr("نامشخص", "Unknown")}</b>
            </div>
            <div className="trade-detail-cell">
              <span>{tr("آخرین اسکرین", "Last screenshot")}</span>
              <b>{link.lastShotAt ? formatTradeDateTime(link.lastShotAt, calSystem) : tr("هنوز نرسیده", "None yet")}</b>
            </div>
          </div>

          {link.lastSyncAt && isEaOutdated(link.eaVersion) && (
            <div className="trade-mt-note-warn" style={{ marginTop: 12 }}>
              {trv(
                <>
                  اکسپرت روی ترمینال {link.eaVersion ? `نسخه‌ی ${faNum(link.eaVersion)}` : "قدیمی"} است. برای اسکرین ورود و خروج
                  نسخه‌ی {faNum(EA_LATEST_VERSION)} را دانلود کنید، جای فایل قبلی بگذارید و در MetaEditor با{" "}
                  <b className="mono ltr-inline">F7</b> کامپایل کنید.
                </>,
                <>
                  The EA on your terminal is {link.eaVersion ? `version ${faNum(link.eaVersion)}` : "outdated"}. For entry and exit screenshots,
                  download version {faNum(EA_LATEST_VERSION)}, replace the old file and compile it in MetaEditor with{" "}
                  <b className="mono ltr-inline">F7</b>.
                </>
              )}
              <div style={{ marginTop: 8 }}>
                <a className="trade-mt-download" href={link.platform === "MT4" ? "/ea/Arion-MT4.mq4" : "/ea/Arion-MT5.mq5"} download>
                  <Download size={14} /> {link.platform === "MT4" ? "Arion-MT4.mq4" : "Arion-MT5.mq5"}
                </a>
              </div>
            </div>
          )}
          {link.shotsEnabled === false && (
            <div className="trade-mt-note" style={{ marginTop: 12 }}>
              {trv(
                <>اسکرین ورود و خروج در تنظیمات اکسپرت خاموش است (<b className="mono ltr-inline">SendScreenshots</b>).</>,
                <>Entry and exit screenshots are turned off in the EA settings (<b className="mono ltr-inline">SendScreenshots</b>).</>
              )}
            </div>
          )}
          {link.shotError && shotErrorIsCurrent(link.shotErrorAt, link.lastShotAt) && (
            <div className="trade-mt-note-warn" style={{ marginTop: 12 }}>
              {shotErrorLabel(link.shotError)}
              <div style={{ marginTop: 6, opacity: 0.8 }}>
                <span className="mono ltr-inline">{link.shotError}</span>
                {link.shotErrorAt && <> · {formatTradeDateTime(link.shotErrorAt, calSystem)}</>}
              </div>
            </div>
          )}

          {recon && recon.mtBalance !== null && recon.difference !== null && (() => {
            const sym = currencySymbol(link.currency ?? "USD");
            const fmt = (n: number) => `${faNum(n.toFixed(2))} ${sym}`;
            const mismatch = Math.abs(recon.difference) > 0.01;
            return (
              <div style={{ marginTop: 14 }}>
                <div className="domain-sub" style={{ marginBottom: 6 }}>{tr("تطبیق موجودی", "Balance reconciliation")}</div>
                <div className="trade-detail-grid">
                  <div className="trade-detail-cell"><span>{tr("موجودی متاتریدر", "MetaTrader balance")}</span><b className="mono">{fmt(recon.mtBalance)}</b></div>
                  <div className="trade-detail-cell"><span>{tr("موجودی ژورنال", "Journal balance")}</span><b className="mono">{fmt(recon.journalBalance)}</b></div>
                </div>
                <div className="trade-mt-note">
                  {tr("سود خالص معاملات:", "Net trade profit:")} <b className="mono">{fmt(recon.tradesPnl)}</b>
                  {" · "}{tr("واریز و برداشت:", "Deposits and withdrawals:")} <b className="mono">{fmt(recon.funding)}</b>
                  {" · "}{tr("هزینه‌های غیرمعاملاتی:", "Non-trading charges:")} <b className="mono">{fmt(recon.charges)}</b>
                </div>
                {mismatch ? (
                  <div className="trade-mt-note-warn">
                    {tr(
                      `موجودی ژورنال ${fmt(Math.abs(recon.difference))} با موجودی متاتریدر اختلاف دارد. محتمل‌ترین دلیل‌ها:`,
                      `The journal balance differs from the MetaTrader balance by ${fmt(Math.abs(recon.difference))}. Most likely reasons:`
                    )}
                    {link.platform === "MT4" && trv(<>
                      {" "}در متاتریدر 4 تب <b className="mono ltr-inline">Account History</b> باید روی <b className="mono ltr-inline">All History</b> باشد
                      (راست‌کلیک روی تب و انتخاب <b className="mono ltr-inline">All History</b>) تا اکسپرت کل تاریخچه را ببیند.
                    </>, <>
                      {" "}In MetaTrader 4 the <b className="mono ltr-inline">Account History</b> tab must be set to <b className="mono ltr-inline">All History</b>
                      {" "}(right-click the tab and choose <b className="mono ltr-inline">All History</b>) so the EA can see the whole history.
                    </>)}
                    {" "}{tr(`اکسپرت باید نسخه‌ی جدید (v${faNum(EA_LATEST_VERSION)}) باشد: آن را از همین صفحه دوباره دانلود کنید و جای فایل قبلی بگذارید.`, `The EA must be the latest version (v${faNum(EA_LATEST_VERSION)}): download it again from this page and replace the old file.`)}
                    {/* لینک دانلود فقط یک بار: اگه هشدار نسخه‌ی قدیمی بالا هست، همون کافیه */}
                    {!(link.lastSyncAt && isEaOutdated(link.eaVersion)) && (
                      <div style={{ marginTop: 8 }}>
                        <a className="trade-mt-download" href={link.platform === "MT4" ? "/ea/Arion-MT4.mq4" : "/ea/Arion-MT5.mq5"} download>
                          <Download size={14} /> {link.platform === "MT4" ? "Arion-MT4.mq4" : "Arion-MT5.mq5"}
                        </a>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="trade-mt-note" style={{ color: "var(--pnl-win)" }}>
                    <Check size={12} style={{ verticalAlign: "-2px" }} /> {tr("موجودی‌ها یکی‌ان", "Balances match")}
                  </div>
                )}
              </div>
            );
          })()}

          <div className="trade-mt-note" style={{ marginTop: 12 }}>
            {tr("توجه: برای همگام‌سازی، هر بار باید هم متاتریدر (با اکسپرت روشن روی چارت) و هم سایت هر دو روشن باشند.", "Note: to sync, both MetaTrader (with the EA running on a chart) and the site must be open each time.")}
          </div>
          <div className="trade-modal-actions">
            <button type="button" className="account-outline-btn" onClick={refresh} disabled={refreshing}>
              <RefreshCw size={14} className={refreshing ? "trade-spin" : undefined} /> {tr("بررسی اتصال", "Check connection")}
            </button>
            <button type="button" className="trade-danger-btn" onClick={revoke} disabled={busy}>
              <Link2Off size={14} /> {tr("قطع اتصال", "Disconnect")}
            </button>
          </div>
        </>
      ) : (
        <>
          <label className="exercise-form-label">{tr("کدام نسخه‌ی متاتریدر؟", "Which MetaTrader version?")}</label>
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
              <div className="trade-stat-label">{tr("کد اتصال این حساب", "Connection code for this account")}</div>
              <div className="trade-mt-code-row">
                <button
                  type="button"
                  className="trade-icon-btn trade-mt-copy-btn"
                  onClick={copyCode}
                  aria-label={tr("کپی کد", "Copy code")}
                  title={tr("کپی کد", "Copy code")}
                >
                  {copied ? <Check size={15} /> : <Copy size={15} />}
                </button>
                <div className="trade-mt-code mono">{code}</div>
              </div>
              <div className="trade-mt-note">
                {tr(
                  `این کد یک‌بارمصرف است و ${codeExpires ? ` تا ${formatTradeDateTime(codeExpires, calSystem)} ` : " تا 15 دقیقه "} اعتبار دارد. در صورت انقضا، کد جدیدی بسازید.`,
                  `This code is single-use and valid ${codeExpires ? `until ${formatTradeDateTime(codeExpires, calSystem)}` : "for 15 minutes"}. If it expires, create a new one.`
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="trade-mt-note" style={{ marginTop: 10 }}>
                {tr("ابتدا یک کد اتصال برای این حساب بسازید.", "First create a connection code for this account.")}
              </div>
              <button type="button" className="trade-primary-btn" onClick={requestCode} disabled={busy} style={{ marginTop: 10 }}>
                {busy ? <Spinner size={13} /> : tr("ساخت کد اتصال", "Create connection code")}
              </button>
            </>
          )}

          {error && <div className="trade-form-error">{error}</div>}

          <div className="domain-sub" style={{ marginTop: 18, marginBottom: 6 }}>{tr("مراحل اتصال", "Connection steps")}</div>
          <ol className="trade-mt-steps">
            <li>
              <span>{tr("فایل اکسپرت را دانلود کنید:", "Download the EA file:")}</span>
              <a className="trade-mt-download" href={platform === "MT4" ? "/ea/Arion-MT4.mq4" : "/ea/Arion-MT5.mq5"} download>
                <Download size={14} /> {platform === "MT4" ? "Arion-MT4.mq4" : "Arion-MT5.mq5"}
              </a>
            </li>
            <li>
              <span>
                {trv(<>
                  در متاتریدر از منوی <b className="mono ltr-inline">File → Open Data Folder</b> پوشه‌ی{" "}
                  <b className="mono ltr-inline">{platform === "MT4" ? "MQL4/Experts" : "MQL5/Experts"}</b> را باز کنید و فایل را در آن قرار دهید.
                </>, <>
                  In MetaTrader, choose <b className="mono ltr-inline">File → Open Data Folder</b>, open the{" "}
                  <b className="mono ltr-inline">{platform === "MT4" ? "MQL4/Experts" : "MQL5/Experts"}</b> folder and put the file in it.
                </>)}
              </span>
            </li>
            <li>
              <span>
                {trv(<>
                  در <b className="mono ltr-inline">Tools → Options → Expert Advisors</b> گزینه‌ی{" "}
                  <b className="mono ltr-inline">Allow WebRequest for listed URL</b> را فعال کنید و آدرس{" "}
                  <b className="mono ltr-inline">https://arionapp.ir</b> را به فهرست اضافه کنید.
                </>, <>
                  In <b className="mono ltr-inline">Tools → Options → Expert Advisors</b> enable{" "}
                  <b className="mono ltr-inline">Allow WebRequest for listed URL</b> and add{" "}
                  <b className="mono ltr-inline">https://arionapp.ir</b> to the list.
                </>)}
              </span>
            </li>
            <li>
              <span>
                {trv(<>
                  در پنجره‌ی <b className="mono ltr-inline">Navigator</b> روی <b className="mono ltr-inline">Expert Advisors</b> راست‌کلیک کرده و{" "}
                  <b className="mono ltr-inline">Refresh</b> را بزنید، سپس اکسپرت <b className="mono ltr-inline">Arion</b> را روی یک چارت بکشید.
                  اگر در فهرست نبود، فایل را در MetaEditor باز کنید و با <b className="mono ltr-inline">F7</b> کامپایل کنید.
                </>, <>
                  In the <b className="mono ltr-inline">Navigator</b> window, right-click <b className="mono ltr-inline">Expert Advisors</b> and choose{" "}
                  <b className="mono ltr-inline">Refresh</b>, then drag the <b className="mono ltr-inline">Arion</b> EA onto a chart.
                  If it is not in the list, open the file in MetaEditor and compile it with <b className="mono ltr-inline">F7</b>.
                </>)}
              </span>
            </li>
            <li>
              <span>
                {trv(<>
                  در تب <b className="mono ltr-inline">Inputs</b>، کد اتصال را در فیلد <b className="mono ltr-inline">PairingCode</b> وارد کنید و{" "}
                  <b className="mono ltr-inline">OK</b> را بزنید.
                </>, <>
                  In the <b className="mono ltr-inline">Inputs</b> tab, enter the connection code in the <b className="mono ltr-inline">PairingCode</b> field and click{" "}
                  <b className="mono ltr-inline">OK</b>.
                </>)}
              </span>
            </li>
            {platform === "MT4" && (
              <li>
                <span>
                  {trv(<>
                    در پایین متاتریدر تب <b className="mono ltr-inline">Account History</b> را باز کنید، راست‌کلیک کنید و{" "}
                    <b className="mono ltr-inline">All History</b> را بزنید تا اکسپرت کل تاریخچه را ببیند.
                  </>, <>
                    At the bottom of MetaTrader open the <b className="mono ltr-inline">Account History</b> tab, right-click and choose{" "}
                    <b className="mono ltr-inline">All History</b> so the EA can see the whole history.
                  </>)}
                </span>
              </li>
            )}
            <li>
              <span>
                {trv(<>
                  دکمه‌ی <b className="mono ltr-inline">{platform === "MT4" ? "AutoTrading" : "Algo Trading"}</b> را روشن کنید. پس از اتصال، وضعیت این صفحه «فعال» می‌شود
                  و معاملات حساب به‌طور خودکار همگام‌سازی می‌شوند.
                </>, <>
                  Turn on the <b className="mono ltr-inline">{platform === "MT4" ? "AutoTrading" : "Algo Trading"}</b> button. Once connected, this page shows &quot;Active&quot;
                  and the account&apos;s trades sync automatically.
                </>)}
              </span>
            </li>
          </ol>

          <div className="trade-mt-note" style={{ marginTop: 12 }}>
            {tr("توجه: برای همگام‌سازی، هر بار باید هم متاتریدر (با اکسپرت روشن روی چارت) و هم سایت هر دو روشن باشند.", "Note: to sync, both MetaTrader (with the EA running on a chart) and the site must be open each time.")}
          </div>
          <div className="trade-mt-note" style={{ marginTop: 10 }}>
            {tr(
              "نسخه‌ی فعلی اکسپرت v1.41 است. اگر قبلا نسخه‌ی قدیمی را نصب کرده‌اید، فایل را دوباره دانلود کنید و جایگزین کنید. این نسخه برای هر معامله‌ی تازه از چارت همون نماد در لحظه‌ی ورود و خروج اسکرین می‌گیره و به معامله‌ی ژورنال وصل می‌کنه (موقع اسکرین یک چارت لحظه‌ای باز و بسته می‌شه؛ از تنظیمات اکسپرت با SendScreenshots خاموش می‌شه).",
              "The current EA version is v1.41. If you installed an older version, download the file again and replace it. For every new trade, this version takes a screenshot of that symbol's chart at entry and exit and attaches it to the journal trade (a temporary chart is opened and closed while taking the screenshot; turn it off with SendScreenshots in the EA settings)."
            )}
          </div>
          <div className="trade-mt-note" style={{ marginTop: 14 }}>
            {tr(
              "رمز حساب معاملاتی هیچ‌گاه درخواست یا ذخیره نمی‌شود. اکسپرت فقط اطلاعات معاملات را ارسال می‌کند و هیچ سفارشی باز یا بسته نمی‌کند.",
              "Your trading account password is never requested or stored. The EA only sends trade data and never opens or closes any order."
            )}
          </div>
        </>
      )}
    </div>
  );
}
