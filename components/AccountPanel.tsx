"use client";

import { useEffect, useRef, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { Camera, Trash2 } from "lucide-react";
import { getNotificationPermission, requestNotificationPermission } from "@/lib/notifications";
import { DEFAULT_SLEEP, DEFAULT_WAKE, getWakeSleepTimes, WakeSleepTimes } from "@/lib/wakeSleep";
import { WakeSleepSetup } from "@/components/WakeSleepSetup";
import { MarketPicker } from "@/components/MarketPicker";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { TradeStatsPicker } from "@/components/TradeStatsPicker";
import { getSetting, setSetting } from "@/lib/storage";
import { getSiteMarket } from "@/lib/market";
import { DEFAULT_TICKER_SYMBOLS_IRAN, DEFAULT_TICKER_SYMBOLS_INTERNATIONAL, MAX_TICKER_SYMBOLS, MIN_TICKER_SYMBOLS, TICKER_SETTING_KEY } from "@/lib/tickerSymbols";
import {
  CAL_SYSTEM_KEY, MONTHLY_GOAL_KEY, CalSystem,
  TradeStatKey, DEFAULT_VISIBLE_TRADE_STATS, TRADE_STATS_VISIBILITY_KEY,
} from "@/lib/tradeTypes";
import { resizeImageToDataUrl } from "@/lib/avatarUpload";
import { AgentAvatar } from "@/components/AgentAvatar";
import { getNotifPrefs, saveNotifPrefs, NotifPrefs, DEFAULT_NOTIF_PREFS } from "@/lib/notifPrefs";
import { getDashboardPrefs, saveDashboardPrefs, setCachedDashboardPrefs, DashboardPrefs, DEFAULT_DASHBOARD_PREFS } from "@/lib/dashboardPrefs";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";

// EXERCISE و CALORIE هر دو زیر یک قابلیت واحد («بدنسازی») نمایش داده می‌شن —
// عمداً هم‌نام تا توی لیست به‌جای دو ردیف جدا، یکی merge بشه (پایین‌تر با seenLabels)
const MODULE_LABELS: Record<string, string> = {
  ROUTINE: "روتین روزانه",
  SLEEP: "خواب",
  TASKS: "کارهای روزمره",
  EXERCISE: "بدنسازی",
  CALORIE: "بدنسازی",
  TRADE: "ژورنال ترید",
  ROADMAP: "رودمپ آموزشی (ai mapping)",
  AI_INSIGHT: "تحلیل هوشمند (Correlation Insight)",
};

type AccountData = {
  email: string | null;
  username: string | null;
  phone: string | null;
  name: string | null;
  market: "IRAN" | "INTERNATIONAL";
  createdAt: string;
  isSuperAdmin: boolean;
  referralCode: { code: string } | null;
  moduleAccess: { module: string; active: boolean; expiresAt: string | null }[];
  subscriptions: { status: string; currentPeriodEnd: string; plan: { nameFa: string; key: string } }[];
};

// پنل کاربری حالا به‌جای صفحه جدا، به‌صورت باکس/مودال روی همون صفحه‌ای که
// کاربر بود باز می‌شه — با کلیک روی آیکون پروفایل توی هدر.
function ModalShell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <>
      <div className="modal-overlay open" onClick={onClose} />
      <div className="modal-panel account-modal-panel open">
        <div className="modal-head">
          <div className="modal-title">پنل کاربری</div>
          <button className="nav-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </>
  );
}

// کش‌شده بیرونِ کامپوننت — این پنل هم مثلِ NotificationPanel با هر
// باز/بسته‌شدن کاملاً unmount/mount می‌شه؛ بدونِ این کش هر بار «در حال
// بارگذاری…» رو دوباره نشون می‌داد، حتی وقتی چیزی عوض نشده بود.
let cachedAccountData: AccountData | null = null;

export function AccountPanel({ onClose }: { onClose: () => void }) {
  useLockBodyScroll();
  const { status, data: session } = useSession();
  const [data, setData] = useState<AccountData | null>(cachedAccountData);
  const [loading, setLoading] = useState(!cachedAccountData);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | "unsupported">("default");
  const [wakeSleep, setWakeSleep] = useState<WakeSleepTimes | null>(null);
  const [editingWakeSleep, setEditingWakeSleep] = useState(false);
  const [tickerSymbols, setTickerSymbols] = useState<string[]>([]);
  const [marketPickerOpen, setMarketPickerOpen] = useState(false);
  const [calSystem, setCalSystem] = useState<CalSystem>("jalali");
  const [monthlyGoal, setMonthlyGoal] = useState(0);
  const [goalDraft, setGoalDraft] = useState("");
  const [goalSaved, setGoalSaved] = useState(false);
  const [visibleStats, setVisibleStats] = useState<TradeStatKey[]>(DEFAULT_VISIBLE_TRADE_STATS);
  const [statsPickerOpen, setStatsPickerOpen] = useState(false);
  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameDraft, setUsernameDraft] = useState("");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameSaving, setUsernameSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>(DEFAULT_NOTIF_PREFS);
  const [dashboardPrefs, setDashboardPrefs] = useState<DashboardPrefs>(DEFAULT_DASHBOARD_PREFS);

  useEffect(() => {
    if (status !== "authenticated") { setLoading(false); return; }
    fetch("/api/account").then((r) => r.json()).then((res) => {
      cachedAccountData = res.user || null;
      setData(cachedAccountData);
      setLoading(false);
    });
    getWakeSleepTimes().then(setWakeSleep);
    const defaultSymbols = getSiteMarket() === "INTERNATIONAL" ? DEFAULT_TICKER_SYMBOLS_INTERNATIONAL : DEFAULT_TICKER_SYMBOLS_IRAN;
    getSetting<string[]>(TICKER_SETTING_KEY, defaultSymbols).then((saved) => setTickerSymbols(saved?.length ? saved : defaultSymbols));
    getSetting<CalSystem>(CAL_SYSTEM_KEY, "jalali").then(setCalSystem);
    getSetting<number>(MONTHLY_GOAL_KEY, 0).then((v) => { setMonthlyGoal(v); setGoalDraft(v ? String(v) : ""); });
    getSetting<TradeStatKey[]>(TRADE_STATS_VISIBILITY_KEY, DEFAULT_VISIBLE_TRADE_STATS).then((v) => setVisibleStats(v?.length ? v : DEFAULT_VISIBLE_TRADE_STATS));
    fetch("/api/account/avatar").then((r) => (r.ok ? r.json() : null)).then((res) => { if (res?.avatarUrl) setAvatarUrl(res.avatarUrl); });
    getNotifPrefs().then(setNotifPrefs);
    getDashboardPrefs().then(setDashboardPrefs);
  }, [status]);

  async function uploadAvatar(file: File) {
    setAvatarError(null);
    setAvatarSaving(true);
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      const res = await fetch("/api/account/avatar", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl }),
      });
      const resData = await res.json().catch(() => ({}));
      if (!res.ok) { setAvatarError(resData.error || "خطایی پیش اومد"); return; }
      setAvatarUrl(resData.avatarUrl);
      window.dispatchEvent(new Event("avatar-updated"));
    } catch {
      setAvatarError("خطا در پردازش عکس");
    } finally {
      setAvatarSaving(false);
    }
  }

  async function removeAvatar() {
    setAvatarSaving(true);
    await fetch("/api/account/avatar", { method: "DELETE" });
    setAvatarUrl(null);
    setAvatarSaving(false);
    window.dispatchEvent(new Event("avatar-updated"));
  }

  function toggleNotifPref(key: keyof NotifPrefs) {
    setNotifPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      saveNotifPrefs(next);
      return next;
    });
  }

  function toggleDashboardPref(key: keyof DashboardPrefs) {
    setDashboardPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      saveDashboardPrefs(next);
      setCachedDashboardPrefs(next);
      window.dispatchEvent(new Event("dashboard-prefs-updated"));
      return next;
    });
  }

  function toggleVisibleStat(key: TradeStatKey) {
    setVisibleStats((prev) => {
      const has = prev.includes(key);
      if (has && prev.length <= 1) return prev;
      const next = has ? prev.filter((k) => k !== key) : [...prev, key];
      setSetting(TRADE_STATS_VISIBILITY_KEY, next);
      return next;
    });
  }

  function changeCalSystem(v: CalSystem) {
    setCalSystem(v);
    setSetting(CAL_SYSTEM_KEY, v);
  }

  function saveMonthlyGoal() {
    const v = Math.max(0, +goalDraft || 0);
    setMonthlyGoal(v);
    setSetting(MONTHLY_GOAL_KEY, v);
    setGoalSaved(true);
    setTimeout(() => setGoalSaved(false), 1800);
  }

  function toggleTickerSymbol(symbol: string) {
    setTickerSymbols((prev) => {
      const has = prev.includes(symbol);
      if (has && prev.length <= MIN_TICKER_SYMBOLS) return prev;
      if (!has && prev.length >= MAX_TICKER_SYMBOLS) return prev;
      const next = has ? prev.filter((s) => s !== symbol) : [...prev, symbol];
      setSetting(TICKER_SETTING_KEY, next);
      return next;
    });
  }

  async function saveUsername() {
    const v = usernameDraft.trim();
    setUsernameSaving(true);
    setUsernameError(null);
    const res = await fetch("/api/account/username", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: v }),
    });
    const resData = await res.json().catch(() => ({}));
    setUsernameSaving(false);
    if (!res.ok) { setUsernameError(resData.error || "خطایی پیش اومد"); return; }
    setData((d) => (d ? { ...d, username: resData.username } : d));
    setEditingUsername(false);
  }

  useEffect(() => { setNotifPermission(getNotificationPermission()); }, []);

  async function enableNotifications() {
    const perm = await requestNotificationPermission();
    setNotifPermission(perm);
  }

  if (status === "unauthenticated") {
    return (
      <ModalShell onClose={onClose}>
        <div className="section-note">برای دیدن پنل کاربری اول باید وارد حساب بشی.</div>
        <Link href="/auth/login" onClick={onClose} className="nav-link" style={{ display: "inline-block", marginTop: 10 }}>
          ورود / ثبت‌نام →
        </Link>
      </ModalShell>
    );
  }

  if (loading || status === "loading") {
    return (
      <ModalShell onClose={onClose}>
        <div className="item-line">در حال بارگذاری…</div>
      </ModalShell>
    );
  }

  if (!data) {
    return (
      <ModalShell onClose={onClose}>
        <div className="item-line empty">اطلاعاتی پیدا نشد.</div>
      </ModalShell>
    );
  }

  const activeModules = data.moduleAccess.filter((m) => m.active);
  // بدنسازی هم اسم EXERCISE هم CALORIE رو به یک لیبل نگاشت می‌ده — این‌جا
  // موقع نمایش، دومیشو حذف می‌کنیم که یک قابلیت به‌جای دو ردیف تکراری دیده بشه
  const seenModuleLabels = new Set<string>();
  const displayModules = activeModules.filter((m) => {
    const label = MODULE_LABELS[m.module] || m.module;
    if (seenModuleLabels.has(label)) return false;
    seenModuleLabels.add(label);
    return true;
  });
  const currentSub = data.subscriptions[0];

  return (
    <ModalShell onClose={onClose}>
      <div className="account-avatar-row">
        <div className="account-avatar-wrap">
          {avatarUrl ? (
            <img src={avatarUrl} alt="عکس پروفایل" className="account-avatar-img" />
          ) : (
            <AgentAvatar seed={data.name || data.username || data.email || "؟"} size={76} className="account-avatar-fallback" />
          )}
          <button
            type="button"
            className="account-avatar-edit-btn"
            onClick={() => avatarInputRef.current?.click()}
            aria-label="تغییر عکس پروفایل"
            disabled={avatarSaving}
          >
            <Camera size={13} />
          </button>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); e.target.value = ""; }}
          />
        </div>
        {avatarUrl && (
          <button type="button" className="account-avatar-remove-btn" onClick={removeAvatar} disabled={avatarSaving} aria-label="حذف عکس پروفایل">
            <Trash2 size={13} />
            حذف عکس
          </button>
        )}
      </div>
      {avatarError && <div className="field-error-msg" style={{ display: "block", marginBottom: 10 }}>{avatarError}</div>}

      <div className="about-list">
        {data.isSuperAdmin && (
          <div className="about-row">
            <span className="about-label">نقش</span>
            <span style={{ color: "var(--accent)", fontWeight: 700 }}>سوپریوزر — دسترسی نامحدود به همه‌چیز</span>
          </div>
        )}
        {data.username && !editingUsername && (
          <div className="about-row">
            <span className="about-label">یوزرنیم</span>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="mono" dir="ltr">{data.username}</span>
              <button
                type="button"
                className="small"
                onClick={() => { setUsernameDraft(data.username || ""); setUsernameError(null); setEditingUsername(true); }}
                style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
              >
                ویرایش
              </button>
            </span>
          </div>
        )}
        {data.phone && (
          <div className="about-row">
            <span className="about-label">شماره موبایل</span>
            <span className="mono" dir="ltr">{data.phone}</span>
          </div>
        )}
        {data.email && (
          <div className="about-row">
            <span className="about-label">ایمیل</span>
            <span className="mono" dir="ltr">{data.email}</span>
          </div>
        )}
        {data.name && (
          <div className="about-row">
            <span className="about-label">اسم</span>
            <span>{data.name}</span>
          </div>
        )}
        {data.referralCode && (
          <div className="about-row">
            <span className="about-label">کد رفرال شما</span>
            <span className="mono" dir="ltr" style={{ color: "var(--accent)" }}>{data.referralCode.code}</span>
          </div>
        )}
        {/* اثباتِ ملموسِ اینکه «منو به‌یاد داشته باش» واقعاً روی طول نشست اثر
            داره — تاریخ واقعیِ انقضای همین JWT، مستقیم از next-auth */}
        {session?.expires && (
          <div className="about-row">
            <span className="about-label">این نشست معتبره تا</span>
            <span className="mono" dir="ltr">{new Date(session.expires).toLocaleDateString("fa-IR")}</span>
          </div>
        )}
      </div>

      {(!data.username || editingUsername) && (
        <div className="tm-extra">
          <div className="domain-sub">یوزرنیم</div>
          {!data.username && !editingUsername && (
            <div className="section-note" style={{ marginTop: 0 }}>
              هنوز یوزرنیم نداری — بدونش کسی نمی‌تونه پیدات کنه و باهات دوست بشه (مخصوصاً اگه با گوگل ثبت‌نام کردی).
            </div>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <input
              type="text"
              dir="ltr"
              className="wsearch-newform-name"
              placeholder="username"
              value={usernameDraft}
              onChange={(e) => { setUsernameDraft(e.target.value); setUsernameError(null); }}
              onFocus={() => { if (!editingUsername) setEditingUsername(true); }}
            />
            <button type="button" disabled={usernameSaving} onClick={saveUsername} style={{ borderColor: "var(--accent)", color: "var(--accent)" }}>
              ذخیره
            </button>
            {editingUsername && data.username && (
              <button type="button" onClick={() => { setEditingUsername(false); setUsernameError(null); }}>
                انصراف
              </button>
            )}
          </div>
          {usernameError && <div className="field-error-msg" style={{ display: "block", marginTop: 6 }}>{usernameError}</div>}
        </div>
      )}

      <div className="tm-extra">
        <div className="domain-sub">وضعیت اشتراک</div>
        {data.isSuperAdmin ? (
          <div className="item-line">دسترسی نامحدود — نیازی به اشتراک نداری</div>
        ) : currentSub ? (
          <div className="item-line">
            {currentSub.plan.nameFa} — {currentSub.status === "ACTIVE" ? "فعال" : currentSub.status === "TRIAL" ? "دوره آزمایشی" : currentSub.status}
          </div>
        ) : (
          <div className="item-line empty">
            هنوز پلن پولی فعالی نداری — فقط ماژول‌های دوره آزمایشی در دسترسته.
          </div>
        )}
      </div>

      <div className="tm-extra">
        <div className="domain-sub">ماژول‌های فعال</div>
        {displayModules.length ? (
          <ul>
            {displayModules.map((m) => (
              <li key={m.module}>
                {MODULE_LABELS[m.module] || m.module}
                {m.expiresAt && (
                  <span className="mono" style={{ color: "var(--muted2)" }}>
                    {" "}— تا {new Date(m.expiresAt).toLocaleDateString("fa-IR")}
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="item-line empty">هیچ ماژول فعالی نداری.</div>
        )}
      </div>

      <div className="tm-extra">
        <div className="domain-sub">ساعت بیداری و خواب</div>
        <div className="item-line" style={{ textAlign: "center" }}>
          بیداری <b className="mono" style={{ color: "var(--accent)" }}>{wakeSleep?.wake || DEFAULT_WAKE}</b>
          {" — "}خواب <b className="mono" style={{ color: "var(--accent)" }}>{wakeSleep?.sleep || DEFAULT_SLEEP}</b>
        </div>
        <button onClick={() => setEditingWakeSleep(true)} style={{ marginTop: 8, borderColor: "var(--accent)", color: "var(--accent)" }}>
          تغییر ساعت‌ها
        </button>
      </div>

      <div className="tm-extra">
        <div className="domain-sub">یادآوری‌ها</div>
        {notifPermission === "unsupported" ? (
          <div className="item-line empty">مرورگرت از نوتیف پشتیبانی نمی‌کنه.</div>
        ) : notifPermission === "granted" ? (
          <div className="item-line">فعاله — وقتی این صفحه بازه، سر وقتِ برنامه یادآوری می‌گیری.</div>
        ) : notifPermission === "denied" ? (
          <div className="item-line empty">مرورگر مسدودش کرده — از تنظیمات سایت توی مرورگرت می‌تونی بازش کنی.</div>
        ) : (
          <>
            <div className="section-note" style={{ marginBottom: 8 }}>
              وقتی برنامه‌ی امروزت (یا تمرینت) به وقتش برسه، یادآوری می‌گیری — فقط تا وقتی این صفحه توی مرورگرت بازه.
            </div>
            <button onClick={enableNotifications} style={{ borderColor: "var(--accent)", color: "var(--accent)" }}>
              فعال‌کردن یادآوری‌ها
            </button>
          </>
        )}
        <div className="section-note" style={{ marginTop: 12, marginBottom: 6 }}>کدوم دسته‌ها یادآوری بگیرن</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {([
            ["taskReminders", "یادآوریِ برنامه‌های روزانه"],
            ["exerciseReminders", "یادآوریِ تمرینِ ثبت‌نشده"],
            ["friendRequests", "درخواستِ دوستی"],
          ] as [keyof NotifPrefs, string][]).map(([key, label]) => (
            <div key={key} className="task" style={{ cursor: "pointer", padding: "4px 0" }} onClick={() => toggleNotifPref(key)}>
              <div className={`check${notifPrefs[key] ? " on" : ""}`}>
                <svg className="c-check" viewBox="0 0 24 24" fill="none"><path d="M2.5 13l5.5 5.5L21.5 4.5" stroke="var(--bg)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <div className="task-name">{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="tm-extra">
        <div className="domain-sub">شخصی‌سازیِ چیدمانِ داشبورد</div>
        <div className="section-note" style={{ marginBottom: 6 }}>کدوم کارت‌های اختیاری توی داشبوردها نشون داده بشن</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {([
            ["showReminders", "کارتِ «یادآوری‌ها» (داشبوردِ روتین)"],
            ["showFriends", "کارتِ «دوستان»"],
            ["showChart", "نمودارها"],
          ] as [keyof DashboardPrefs, string][]).map(([key, label]) => (
            <div key={key} className="task" style={{ cursor: "pointer", padding: "4px 0" }} onClick={() => toggleDashboardPref(key)}>
              <div className={`check${dashboardPrefs[key] ? " on" : ""}`}>
                <svg className="c-check" viewBox="0 0 24 24" fill="none"><path d="M2.5 13l5.5 5.5L21.5 4.5" stroke="var(--bg)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <div className="task-name">{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="tm-extra">
        <div className="domain-sub">بازارهای دنبال‌شده</div>
        <div className="item-line">
          {tickerSymbols.length} بازار برای نوار قیمتِ بالای صفحه‌ی ترید انتخاب شده
        </div>
        <button onClick={() => setMarketPickerOpen(true)} style={{ marginTop: 8, borderColor: "var(--accent)", color: "var(--accent)" }}>
          تغییر بازارها
        </button>
      </div>

      <div className="tm-extra">
        <div className="domain-sub">تقویم ژورنال ترید</div>
        <div className="item-line" style={{ marginBottom: 8 }}>
          تاریخ‌های ژورنال ترید به چه تقویمی نمایش داده بشه
        </div>
        <SegmentedTabs
          options={[
            { value: "jalali", label: "شمسی" },
            { value: "gregorian", label: "میلادی" },
          ]}
          active={calSystem}
          onChange={changeCalSystem}
        />
      </div>

      <div className="tm-extra">
        <div className="domain-sub">هدف سود ماهانه ترید</div>
        <div className="item-line" style={{ marginBottom: 8 }}>
          {monthlyGoal > 0
            ? <>هدف فعلی: <b className="mono" style={{ color: "var(--accent)" }}>{monthlyGoal}</b> — به‌صورت آمار دایره‌ای توی صفحه ترید نشون داده می‌شه</>
            : "هنوز هدفی تنظیم نکردی — با تعیین هدف، پیشرفتت توی صفحه ترید به‌صورت دایره نشون داده می‌شه"}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="number"
            min={0}
            value={goalDraft}
            onChange={(e) => setGoalDraft(e.target.value)}
            placeholder="مثلاً 500"
            style={{ maxWidth: 140 }}
          />
          <button onClick={saveMonthlyGoal} style={{ borderColor: "var(--accent)", color: "var(--accent)" }}>
            {goalSaved ? "ذخیره شد ✓" : "ذخیره هدف"}
          </button>
        </div>
      </div>

      <div className="tm-extra">
        <div className="domain-sub">آمارهای صفحه ترید</div>
        <div className="item-line" style={{ marginBottom: 8 }}>
          {visibleStats.length} از ۱۰ آمار برای نمایش توی صفحه‌ی ترید انتخاب شده
        </div>
        <button onClick={() => setStatsPickerOpen(true)} style={{ borderColor: "var(--accent)", color: "var(--accent)" }}>
          تغییر
        </button>
      </div>

      <div className="tm-extra">
        <button disabled title="به‌زودی" style={{ opacity: 0.5, cursor: "not-allowed" }}>
          تحلیل برنامه‌ها
        </button>
      </div>

      <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
        <button onClick={() => signOut({ callbackUrl: "/" })} style={{ borderColor: "#E05252", color: "#E05252" }}>
          خروج از حساب
        </button>
      </div>

      {editingWakeSleep && (
        <WakeSleepSetup
          initial={wakeSleep}
          onClose={() => setEditingWakeSleep(false)}
          onDone={(v) => { setWakeSleep(v); setEditingWakeSleep(false); }}
        />
      )}

      {marketPickerOpen && (
        <MarketPicker
          title="بازارهای دنبال‌شده"
          symbols={tickerSymbols}
          onToggle={toggleTickerSymbol}
          onClose={() => setMarketPickerOpen(false)}
        />
      )}

      {statsPickerOpen && (
        <TradeStatsPicker
          visible={visibleStats}
          onToggle={toggleVisibleStat}
          onClose={() => setStatsPickerOpen(false)}
        />
      )}
    </ModalShell>
  );
}
