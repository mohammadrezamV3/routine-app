"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { getNotificationPermission, requestNotificationPermission } from "@/lib/notifications";
import { DEFAULT_SLEEP, DEFAULT_WAKE, getWakeSleepTimes, WakeSleepTimes } from "@/lib/wakeSleep";
import { WakeSleepSetup } from "@/components/WakeSleepSetup";

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
      <div className="modal-panel open">
        <div className="modal-head">
          <div className="modal-title">پنل کاربری</div>
          <button className="nav-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </>
  );
}

export function AccountPanel({ onClose }: { onClose: () => void }) {
  const { status, data: session } = useSession();
  const [data, setData] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | "unsupported">("default");
  const [wakeSleep, setWakeSleep] = useState<WakeSleepTimes | null>(null);
  const [editingWakeSleep, setEditingWakeSleep] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") { setLoading(false); return; }
    fetch("/api/account").then((r) => r.json()).then((res) => {
      setData(res.user || null);
      setLoading(false);
    });
    getWakeSleepTimes().then(setWakeSleep);
  }, [status]);

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
      <div className="about-list">
        {data.isSuperAdmin && (
          <div className="about-row">
            <span className="about-label">نقش</span>
            <span style={{ color: "var(--accent)", fontWeight: 700 }}>سوپریوزر — دسترسی نامحدود به همه‌چیز</span>
          </div>
        )}
        {data.username && (
          <div className="about-row">
            <span className="about-label">یوزرنیم</span>
            <span className="mono" dir="ltr">{data.username}</span>
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
        <div className="item-line">
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
    </ModalShell>
  );
}
