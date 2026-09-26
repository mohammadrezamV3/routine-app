import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { Check, Copy, Download, Link2Off, Loader2, RefreshCw } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import BottomSheet from "@/components/BottomSheet";
import SegmentedTabs from "@/components/SegmentedTabs";
import { useNetworkStatus } from "@/lib/useNetworkStatus";
import { tapHaptic } from "@/lib/haptics";
import { db as tradeDb } from "@/features/trade/db";
import { MT_EA_FILES, type MtLinkDto, type MtPlatform } from "@/lib/trade-online-contract";
import { OFFLINE_MESSAGE, TradeOnlineError, describeTradeOnlineError, isModuleLockedError, useTradeOnlineApi } from "../api";
import { onlineDb } from "../db";
import OnlineGate from "../components/OnlineGate";
import { jalaliDateTime } from "../lib/calendar";

// پورتِ TradeMtLinkPanelِ وب (اتصالِ متاتریدرِ *همین حساب*).
// امنیت: رمزِ حسابِ معاملاتی هیچ‌جا خواسته نمی‌شه؛ کدِ اتصال فقط در stateِ
// همین صفحه نگه داشته می‌شه (نه Dexie، نه localStorage) و با ترکِ صفحه از بین
// می‌ره — سرور هم فقط هشش رو داره، پس اگه گم شد باید کدِ تازه گرفت.
export default function MetaTraderAccount() {
  const [locked, setLocked] = useState(false);
  return (
    <div>
      <AppHeader title="اتصال متاتریدر" showBack />
      <OnlineGate locked={locked}>
        <AccountBody onLocked={() => setLocked(true)} />
      </OnlineGate>
    </div>
  );
}

function AccountBody({ onLocked }: { onLocked: () => void }) {
  const { accountId = "" } = useParams();
  const api = useTradeOnlineApi();
  const online = useNetworkStatus();

  const cachedList = useLiveQuery(() => onlineDb.kv.get("mtAccounts"), []);
  const localAccount = useLiveQuery(() => tradeDb.accounts.get(accountId), [accountId]);
  const cachedStatus = cachedList?.key === "mtAccounts" ? cachedList.value.accounts.find((a) => a.accountId === accountId) : undefined;
  const accountName = cachedStatus?.name ?? localAccount?.name ?? null;

  const [link, setLink] = useState<MtLinkDto | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [platform, setPlatform] = useState<MtPlatform>("MT4");
  const [code, setCode] = useState<string | null>(null);
  const [codeExpires, setCodeExpires] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // تا وقتی جوابِ سرور نیومده، وضعیتِ ذخیره‌شده‌ی فهرست رو نشون بده
  const shownLink = loaded ? link : cachedStatus?.link ?? null;

  const load = useCallback(async () => {
    if (!online || !api.available) return;
    try {
      const l = await api.mtLink(accountId);
      setLink(l);
      setLoaded(true);
      setNotFound(false);
      if (l?.platform) setPlatform(l.platform);
    } catch (err) {
      if (isModuleLockedError(err)) onLocked();
      else if (err instanceof TradeOnlineError && err.status === 404) setNotFound(true);
      else setError(describeTradeOnlineError(err));
    }
  }, [api, online, accountId, onLocked]);

  useEffect(() => {
    void load();
  }, [load]);

  async function requestCode() {
    if (!online) return setError(OFFLINE_MESSAGE);
    setBusy(true);
    setError(null);
    try {
      const r = await api.mtCreateCode(accountId, platform);
      setCode(r.code);
      setCodeExpires(r.expiresAt);
      setLink(r.link);
      setLoaded(true);
    } catch (err) {
      if (isModuleLockedError(err)) onLocked();
      setError(describeTradeOnlineError(err) || "خطا در ساخت کد اتصال");
    } finally {
      setBusy(false);
    }
  }

  async function revoke() {
    if (busy) return;
    setConfirmRevoke(false);
    if (!online) return setError(OFFLINE_MESSAGE);
    setBusy(true);
    setError(null);
    try {
      await api.mtRevoke(accountId);
      setCode(null);
      await load();
    } catch (err) {
      if (isModuleLockedError(err)) onLocked();
      setError(describeTradeOnlineError(err) || "قطع اتصال انجام نشد — دوباره تلاش کن");
    } finally {
      setBusy(false);
    }
  }

  async function refresh() {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }

  function copyCode() {
    if (!code) return;
    void tapHaptic();
    navigator.clipboard
      ?.writeText(code)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      })
      .catch(() => {});
  }

  if (notFound) {
    return (
      <p className="px-6 py-10 text-center font-vazir text-[13.5px] leading-7" style={{ color: "var(--muted)" }}>
        این حساب روی سرور پیدا نشد. اگه تازه روی گوشی ساختیش، اول همگام‌سازی کن و دوباره بیا.
      </p>
    );
  }

  const ea = MT_EA_FILES[platform];
  const eaUrl = api.eaDownloadUrl(platform);
  const connected = !!shownLink?.connected;

  return (
    <div className="flex flex-col gap-3 px-4 py-4">
      {accountName && (
        <p className="font-vazir text-[13px]" style={{ color: "var(--muted)" }}>
          نام حساب: <b style={{ color: "var(--text)" }}>{accountName}</b>
        </p>
      )}

      <div className="flex items-center justify-between">
        <span className="font-vazir text-[14px] font-semibold" style={{ color: "var(--text)" }}>
          اتصال متاتریدر
        </span>
        <span className="flex items-center gap-1.5 font-vazir text-[12.5px] font-semibold" style={{ color: connected ? "var(--pnl-win)" : "var(--muted)" }}>
          <span className="inline-block rounded-full" style={{ width: 8, height: 8, background: connected ? "var(--pnl-win)" : "var(--muted)" }} />
          {connected ? "فعال" : "غیرفعال"}
        </span>
      </div>

      {!online && (
        <p className="rounded-card border px-3 py-2 font-vazir text-[12px]" style={{ borderColor: "var(--surface-line)", color: "var(--muted)" }} role="status">
          {OFFLINE_MESSAGE} — وضعیتِ نمایش‌داده‌شده ممکنه قدیمی باشه.
        </p>
      )}

      {connected && shownLink ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Cell label="نسخه" value={shownLink.platform} ltr />
            {shownLink.brokerName && <Cell label="بروکر" value={shownLink.brokerName} ltr />}
            {shownLink.serverName && <Cell label="سرور" value={shownLink.serverName} ltr />}
            {shownLink.accountLogin && <Cell label="شماره حساب" value={shownLink.accountLogin} ltr />}
            {shownLink.balance !== null && <Cell label="بالانس ترمینال" value={shownLink.balance.toFixed(2)} ltr />}
            {shownLink.equity !== null && <Cell label="اکوئیتی" value={shownLink.equity.toFixed(2)} ltr />}
            <Cell label="آخرین همگام‌سازی" value={shownLink.lastSyncAt ? jalaliDateTime(shownLink.lastSyncAt) : "هنوز انجام نشده"} />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={refresh}
              disabled={refreshing || !online}
              className="flex flex-1 items-center justify-center gap-2 rounded-card border font-vazir text-[13.5px]"
              style={{ borderColor: "var(--surface-line)", color: "var(--text)", height: 44 }}
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin" : undefined} /> بررسی اتصال
            </button>
            <button
              type="button"
              onClick={() => setConfirmRevoke(true)}
              disabled={busy || !online}
              className="flex flex-1 items-center justify-center gap-2 rounded-card border font-vazir text-[13.5px]"
              style={{ borderColor: "var(--pnl-loss)", color: "var(--pnl-loss)", height: 44 }}
            >
              <Link2Off size={14} /> قطع اتصال
            </button>
          </div>
        </>
      ) : (
        <>
          <span className="font-vazir text-[12.5px]" style={{ color: "var(--muted)" }}>
            کدام نسخه‌ی متاتریدر؟
          </span>
          <SegmentedTabs
            active={platform}
            onChange={setPlatform}
            options={[
              { value: "MT4" as const, label: "MetaTrader 4" },
              { value: "MT5" as const, label: "MetaTrader 5" },
            ]}
          />

          {code ? (
            <div className="flex flex-col gap-2 rounded-card border px-3 py-3" style={{ borderColor: "var(--accent)" }}>
              <span className="font-vazir text-[12.5px]" style={{ color: "var(--muted)" }}>
                این کدته — این رو لازم داری
              </span>
              <div className="flex items-center gap-2">
                <button type="button" onClick={copyCode} aria-label="کپی کد" className="flex items-center justify-center" style={{ width: 44, height: 44 }}>
                  {copied ? <Check size={18} color="var(--pnl-win)" /> : <Copy size={18} color="var(--text)" />}
                </button>
                <span className="flex-1 select-all text-center text-[20px] font-bold tracking-wider" style={{ color: "var(--text)" }} dir="ltr">
                  {code}
                </span>
              </div>
              <p className="font-vazir text-[12px] leading-6" style={{ color: "var(--muted)" }}>
                روی آیکونِ کپی بزن تا کد کپی بشه. این کد فقط یک‌بار قابل استفاده‌ست و
                {codeExpires ? ` تا ${jalaliDateTime(codeExpires)} ` : " تا ۱۵ دقیقه دیگه "}
                اعتبار داره — اگه دیر کردی، کافیه دوباره بزنی «ساخت کد اتصال» و یه کدِ تازه بگیری.
              </p>
            </div>
          ) : (
            <>
              <p className="font-vazir text-[12.5px] leading-6" style={{ color: "var(--muted)" }}>
                اول این دکمه رو بزن تا یه کدِ مخصوصِ همین حساب برات ساخته بشه. بعد توی متاتریدر همین کد رو جا می‌ذاری تا این دو تا به هم وصل بشن.
              </p>
              <button
                type="button"
                onClick={requestCode}
                disabled={busy || !online}
                className="flex items-center justify-center rounded-card font-vazir text-[14px] font-semibold"
                style={{ background: "var(--accent)", color: "var(--bg)", height: 46, opacity: busy || !online ? 0.6 : 1 }}
              >
                {busy ? <Loader2 size={16} className="animate-spin" /> : "ساخت کد اتصال"}
              </button>
            </>
          )}

          {error && (
            <p className="font-vazir text-[12.5px]" style={{ color: "var(--pnl-loss)" }} role="alert">
              {error}
            </p>
          )}

          <span className="mt-2 font-vazir text-[13.5px] font-semibold" style={{ color: "var(--text)" }}>
            حالا این مراحل رو توی متاتریدر (روی کامپیوتر) انجام بده
          </span>
          <ol className="flex list-decimal flex-col gap-2.5 ps-5 font-vazir text-[12.5px] leading-7" style={{ color: "var(--text)" }}>
            <li>
              اول این فایل رو دانلود کن — این همون برنامه‌ی کوچیکیه که قراره توی متاتریدرت نصب بشه و معاملاتت رو برای آریون بفرسته:{" "}
              {eaUrl ? (
                <button
                  type="button"
                  onClick={() => window.open(eaUrl, "_blank")}
                  className="inline-flex items-center gap-1 font-semibold"
                  style={{ color: "var(--accent)" }}
                  dir="ltr"
                >
                  <Download size={13} /> {ea.name}
                </button>
              ) : (
                <b dir="ltr">{ea.name}</b>
              )}
            </li>
            <li>
              متاتریدر رو باز کن. از نوارِ بالا روی <Ltr>File</Ltr> بزن، بعد <Ltr>Open Data Folder</Ltr> رو انتخاب کن — یه پنجره‌ی جدید باز می‌شه که یه سری پوشه توشه.
            </li>
            <li>
              توی همون پنجره برو توی پوشه‌ی <Ltr>{ea.mqlFolder}</Ltr>، و از توش پوشه‌ی <Ltr>Experts</Ltr> رو باز کن. فایلی که مرحله‌ی ۱ دانلود کردی رو بکش و همین‌جا بنداز (یا کپی/پیست کن).
            </li>
            <li>
              حالا باید این فایل رو «کامپایل» کنی. روش دابل‌کلیک کن تا <Ltr>MetaEditor</Ltr> باز بشه، بعد کلیدِ <Ltr>F7</Ltr> رو بزن. اگه پایین صفحه نوشت{" "}
              <Ltr>0 error(s)</Ltr> یعنی درست شد؛ می‌تونی MetaEditor رو ببندی.
            </li>
            <li>
              برگرد به متاتریدر. توی پنجره‌ی <Ltr>Navigator</Ltr> (اگه نبود از منوی <Ltr>View</Ltr> بازش کن)، روی <Ltr>Expert Advisors</Ltr> راست‌کلیک کن و{" "}
              <Ltr>Refresh</Ltr> رو بزن — الان باید اسمِ <Ltr>Arion</Ltr> اونجا دیده بشه.
            </li>
            <li>
              اسمِ <Ltr>Arion</Ltr> رو با ماوس بگیر و روی نمودارِ هر جفت‌ارزی که باز داری ولش کن. یه پنجره‌ی تنظیمات باز می‌شه.
            </li>
            <li>
              توی همون پنجره، برو تبِ <Ltr>Inputs</Ltr> (یا <Ltr>Common</Ltr> در نسخه‌های قدیمی‌تر) و جلوی <Ltr>PairingCode</Ltr>، همون کدی که بالای همین صفحه گرفتی رو بچسبون. بعد{" "}
              <Ltr>OK</Ltr> رو بزن.
            </li>
            <li>
              یه بار هم برو <Ltr>Tools → Options → Expert Advisors</Ltr> و تیکِ <Ltr>Allow WebRequest for listed URL</Ltr> رو بزن؛ بعد توی لیستِ زیرش آدرسِ{" "}
              <Ltr>https://arionapp.ir</Ltr> رو اضافه کن و <Ltr>OK</Ltr> بزن. بدونِ این تیک، متاتریدر اصلاً اجازه نمی‌ده اکسپرت چیزی برای آریون بفرسته.
            </li>
          </ol>

          <p className="rounded-card border px-3 py-2 font-vazir text-[12px] leading-6" style={{ borderColor: "var(--pnl-loss)", color: "var(--text)" }}>
            نکته‌ی خیلی مهم: بعد از این کارها، بالا-سمتِ راستِ نمودار باید یه آیکونِ لبخند 🙂 و رنگی ببینی، کنارِ اسمِ Arion. اگه به‌جاش یه ضربدرِ قرمز دیدی، یعنی دکمه‌ی{" "}
            <Ltr>AutoTrading</Ltr> (یا <Ltr>Algo Trading</Ltr>) بالای متاتریدر خاموشه — روش بزن تا روشن (سبز) بشه.
          </p>
          <p className="font-vazir text-[12px] leading-6" style={{ color: "var(--muted)" }}>
            همین که وصل بشه، آریون خودش بلافاصله کل تاریخچه‌ی معاملاتِ این حساب رو (نه فقط چند تای اخیر) می‌کِشه بالا — چیزی نیاز نیست دستی وارد کنی.
          </p>
          <p className="font-vazir text-[12px] leading-6" style={{ color: "var(--muted)" }}>
            رمز حساب معاملاتی‌ات هیچ‌وقت از تو خواسته و هیچ‌جا ذخیره نمی‌شود. اکسپرت فقط اطلاعات معاملات را می‌خواند و می‌فرستد؛ هیچ سفارشی باز یا بسته نمی‌کند.
          </p>
        </>
      )}

      {connected && error && (
        <p className="font-vazir text-[12.5px]" style={{ color: "var(--pnl-loss)" }} role="alert">
          {error}
        </p>
      )}

      <BottomSheet open={confirmRevoke} onClose={() => setConfirmRevoke(false)} title="قطعِ اتصالِ متاتریدر">
        <div className="flex flex-col gap-3 px-4 pb-6">
          <p className="font-vazir text-[13px] leading-7" style={{ color: "var(--text)" }}>
            بعد از قطعِ اتصال، اکسپرتِ این حساب دیگه نمی‌تونه معامله‌ای بفرسته. معاملاتی که تا الان همگام شدن دست نمی‌خورن. برای وصلِ دوباره باید کدِ تازه بگیری.
          </p>
          <button
            type="button"
            onClick={revoke}
            className="rounded-card font-vazir text-[14px] font-semibold"
            style={{ background: "var(--pnl-loss)", color: "#fff", height: 46 }}
          >
            قطع اتصال
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}

function Ltr({ children }: { children: React.ReactNode }) {
  return (
    <b className="font-semibold" dir="ltr" style={{ unicodeBidi: "isolate" }}>
      {children}
    </b>
  );
}

function Cell({ label, value, ltr }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-card border px-3 py-2" style={{ borderColor: "var(--surface-line)" }}>
      <span className="font-vazir text-[11.5px]" style={{ color: "var(--muted)" }}>
        {label}
      </span>
      <b className="text-[13px] tabular-nums" style={{ color: "var(--text)" }} dir={ltr ? "ltr" : undefined}>
        {value}
      </b>
    </div>
  );
}
