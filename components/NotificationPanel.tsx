"use client";

import { useEffect, useRef, useState } from "react";
import { getCustomOccurrences, getRemovedOccurrences, getDaily, getSetting, setSetting } from "@/lib/storage";
import { tasksForDate, timeStartMinutes } from "@/lib/schedule";
import { FA_WEEKDAY, isoLocal } from "@/lib/jalali";
import { getNotifPrefs } from "@/lib/notifPrefs";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";

type NotifItem =
  | { kind: "info"; id: string; title: string; body: string }
  | { kind: "static"; id: string; title: string; body: string; modalTitle: string; modalBody: string };

const EXERCISE_REMINDER_HOUR = 17;

// دو اطلاعیه‌ی ثابت که همیشه (تا وقتی کاربر روشون کلیک نکرده) اولِ لیست
// نشون داده می‌شن — برخلافِ بقیه‌ی آیتم‌ها که هر بار از نو محاسبه می‌شن،
// اینا فقط یک‌بار (با کلیک) به‌ازای هر کاربر/دستگاه بسته می‌شن، توی همون
// UserSetting عمومی (کلید dismissedStaticNotifs) که برای مهمون هم localStorage کار می‌کنه.
const STATIC_NOTIFS: Extract<NotifItem, { kind: "static" }>[] = [
  {
    kind: "static",
    id: "welcome",
    title: "به آریون خوش اومدی!",
    body: "یه نگاه سریع به این‌که آریون چیکار برات می‌کنه.",
    modalTitle: "به آریون خوش اومدی! 👋",
    modalBody:
      "آریون همه‌ی برنامه‌ت رو یه‌جا نگه می‌داره: روتینِ روزانه، خواب، بدنسازی و کالری، ژورنالِ ترید، و رودمپِ یادگیری — بدونِ اینکه لازم باشه بینِ چندتا اپ جابه‌جا بشی.\n\nهر بخش رو از منوی همبرگری (بالا-راست) پیدا می‌کنی. اگه سوالی داشتی یا چیزی گیر کرد، از همین‌جا (زنگوله‌ی بالای صفحه) یا بخشِ «درباره ما» می‌تونی پیگیرش بشی.\n\nامیدواریم روزهای بهتری رو با آریون بسازی.",
  },
  {
    kind: "static",
    id: "pwa",
    title: "آریون رو نصب کن",
    body: "برای تجربه‌ی بهتر و سریع‌تر، به‌جای مرورگر، به‌صورتِ اپ نصبش کن.",
    modalTitle: "نصبِ آریون به‌عنوانِ اپ (PWA)",
    modalBody:
      "آریون رو می‌تونی مثل یه اپِ واقعی روی گوشیت نصب کنی — بدون کافه‌بازار/گوگل‌پلی، مستقیم از همین مرورگر:\n\nآیفون (سافاری): پایینِ صفحه، آیکونِ Share (مربع با فلشِ رو به بالا) رو بزن، بعد «Add to Home Screen» رو انتخاب کن.\n\nاندروید (کروم): از منوی سه‌نقطه‌ی بالای مرورگر، «Add to Home screen» یا «Install app» رو بزن.\n\nبعدِ نصب، آیکونِ آریون میاد رو صفحه‌ی اصلیِ گوشیت و بازش کردن دقیقاً مثلِ یه اپِ معمولیه — سریع‌تر بالا میاد و نوارِ آدرسِ مرورگر هم نشون داده نمی‌شه.",
  },
];

async function loadExerciseReminder(): Promise<NotifItem | null> {
  try {
    const planRes = await fetch("/api/exercise/plan");
    if (!planRes.ok) return null;
    const { plan } = await planRes.json();
    if (!plan) return null;
    const todayName = FA_WEEKDAY[new Date().getDay()];
    const todayPlan = plan.planData.find((d: { day: string; focus: string }) => d.day === todayName);
    if (!todayPlan) return null;
    const logRes = await fetch(`/api/exercise/log?planId=${plan.id}&date=${isoLocal(new Date())}`);
    const logData = logRes.ok ? await logRes.json() : {};
    if (logData.completed) return null;
    return { kind: "info", id: "exercise-today", title: "یادآوری تمرین", body: `برنامه‌ی ورزشی امروز (${todayPlan.focus}) هنوز ثبت نشده.` };
  } catch {
    return null;
  }
}

// همون قوانینِ NotificationEngine (که فقط نوتیف واقعیِ مرورگر می‌فرسته)، ولی
// این‌جا به‌جای فرستادنِ Notification، همون آیتم‌ها رو به‌شکل لیست برمی‌گردونه —
// چون دیتای نوتیف جدایی توی دیتابیس ذخیره نمی‌شه، پنل همیشه «الان چی برات
// مونده» رو نشون می‌ده، نه تاریخچه‌ی نوتیف‌های قبلی.
//
// همه‌ی فچ‌های مستقل موازی می‌رن (قبلاً پشتِ‌سرِهم بودن — dismissedStaticNotifs
// بعد prefs بعد بقیه — که یعنی جمعِ RTTها روی هم می‌رفت). export شده چون
// NavDrawer هم همین رو از قبل (موقعِ لودِ صفحه) صدا می‌زنه تا وقتی کاربر
// واقعاً زنگوله رو می‌زنه، پنل از کشِ آماده باز شه، نه از صفر.
export async function loadPendingNotifications(): Promise<NotifItem[]> {
  const [dismissed, prefs] = await Promise.all([
    getSetting<string[]>("dismissedStaticNotifs", []),
    getNotifPrefs(),
  ]);
  const staticItems = STATIC_NOTIFS.filter((n) => !dismissed.includes(n.id));
  const items: NotifItem[] = [];

  const wantsExercise = prefs.exerciseReminders && new Date().getHours() >= EXERCISE_REMINDER_HOUR;
  const [removedArr, customArr, daily, exerciseItem] = await Promise.all([
    getRemovedOccurrences(),
    getCustomOccurrences(),
    getDaily(isoLocal(new Date())),
    wantsExercise ? loadExerciseReminder() : Promise.resolve(null),
  ]);

  if (prefs.taskReminders) {
    const tasks = tasksForDate(new Date(), { removedOccurrences: new Set(removedArr), customOccurrences: customArr });
    const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
    for (const t of tasks) {
      const startMinutes = timeStartMinutes(t.time);
      if (startMinutes === null) continue;
      if (daily.tasks[t.id]) continue;

      if (nowMinutes >= startMinutes - 30 && nowMinutes < startMinutes) {
        items.push({ kind: "info", id: `soon:${t.id}`, title: "یادآوری برنامه", body: `تا ۳۰ دقیقه دیگه وقت «${t.name}» می‌رسه.` });
      } else if (nowMinutes >= startMinutes) {
        items.push({ kind: "info", id: `now:${t.id}`, title: "یادآوری برنامه", body: `وقت «${t.name}» رسیده.` });
      }
    }
  }

  if (exerciseItem) items.push(exerciseItem);

  return [...staticItems, ...items];
}

// کش‌شده بیرونِ کامپوننت (نه یه stateِ داخلی) — پنل هر بار که باز/بسته
// می‌شه کاملاً unmount/mount می‌شه (طبقِ رندرِ شرطیِ NavDrawer)، پس یه
// stateِ معمولی هر بار از صفر می‌رفت روی «در حال بارگذاری…». با این کش،
// دفعه‌ی اول لود می‌شه و بعدش هر بار که باز می‌شه بلافاصله همون دیتای
// قبلی رو نشون می‌ده (و بی‌سروصدا در پس‌زمینه دوباره تازه‌ش می‌کنه).
let cachedItems: NotifItem[] | null = null;

// NavDrawer همین رو موقعِ لودِ صفحه صدا می‌زنه (برای نشونِ تعدادِ نخونده‌ها
// روی خودِ زنگوله) — همون فچ رو توی cachedItems می‌ذاره، پس وقتی کاربر
// واقعاً زنگوله رو می‌زنه، پنل به‌جای «در حال بارگذاری…» بلافاصله همین
// دیتای از‌قبل‌آماده رو نشون می‌ده.
export async function preloadNotifications(): Promise<NotifItem[]> {
  const res = await loadPendingNotifications();
  cachedItems = res;
  return res;
}

export function NotificationPanel({ onClose, anchor }: { onClose: () => void; anchor: { top: number; right: number } }) {
  useLockBodyScroll();
  const [items, setItems] = useState<NotifItem[] | null>(cachedItems);
  const [openStatic, setOpenStatic] = useState<Extract<NotifItem, { kind: "static" }> | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    loadPendingNotifications().then((res) => {
      if (cancelled) return;
      cachedItems = res;
      setItems(res);
    });
    return () => { cancelled = true; };
  }, []);

  // یه لیسنرِ سطحِ document به‌جای لایه‌ی overlayِ fixed — چون app-topbar
  // (والدِ این پنل) backdrop-filter داره و برای فرزندهای position:fixed یه
  // containing-block جدید می‌سازه؛ یعنی اون overlay فقط داخلِ کادرِ خودِ
  // هدر (۵۸px بالای صفحه) پوشش می‌داد، نه کلِ صفحه، پس کلیک روی بقیه‌ی
  // صفحه هیچ‌وقت بسته‌ش نمی‌کرد.
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (panelRef.current?.contains(target)) return;
      // دکمه‌ی زنگوله عمداً از «بیرون» مستثناست — وگرنه mousedown اول
      // پنل رو می‌بست، و بلافاصله click همون کلیک روی زنگوله دوباره
      // toggle می‌کرد و بازش می‌کرد (پنل هیچ‌وقت واقعاً بسته نمی‌شد).
      if (target.closest?.(".bell-btn")) return;
      onClose();
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [onClose]);

  async function openStaticNotif(it: Extract<NotifItem, { kind: "static" }>) {
    setOpenStatic(it);
    setItems((prev) => prev && prev.filter((x) => x.id !== it.id));
    const dismissed = await getSetting<string[]>("dismissedStaticNotifs", []);
    if (!dismissed.includes(it.id)) await setSetting("dismissedStaticNotifs", [...dismissed, it.id]);
  }

  return (
    <>
      <div
        className="notif-panel dash-scope open"
        ref={panelRef}
        style={{ position: "fixed", top: anchor.top, right: anchor.right, left: "auto" }}
      >
        <div className="notif-panel-head">اطلاعیه‌ها</div>
        {items === null ? (
          <div className="item-line" style={{ padding: "10px 4px" }}>در حال بارگذاری…</div>
        ) : items.length === 0 ? (
          <div className="item-line empty" style={{ padding: "10px 4px" }}>چیزی برای نمایش نیست</div>
        ) : (
          <div className="notif-panel-list">
            {items.map((it) =>
              it.kind === "static" ? (
                <div key={it.id} className="notif-panel-item" onClick={() => openStaticNotif(it)} style={{ cursor: "pointer" }}>
                  <div className="notif-panel-item-title">{it.title}</div>
                  <div className="notif-panel-item-body">{it.body}</div>
                </div>
              ) : (
                <div key={it.id} className="notif-panel-item">
                  <div className="notif-panel-item-title">{it.title}</div>
                  <div className="notif-panel-item-body">{it.body}</div>
                </div>
              )
            )}
          </div>
        )}
      </div>

      <div className={`modal-overlay${openStatic ? " open" : ""}`} onClick={() => setOpenStatic(null)} />
      {openStatic && (
        <div className="modal-panel open">
          <div className="modal-head">
            <div className="modal-title">{openStatic.modalTitle}</div>
            <button className="nav-close" onClick={() => setOpenStatic(null)}>×</button>
          </div>
          <div className="modal-body" style={{ whiteSpace: "pre-line", lineHeight: 1.9, fontSize: 13.5 }}>
            {openStatic.modalBody}
          </div>
        </div>
      )}
    </>
  );
}
