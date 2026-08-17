"use client";

import { useEffect, useRef, useState } from "react";
import { getCustomOccurrences, getRemovedOccurrences, getDaily } from "@/lib/storage";
import { tasksForDate, timeStartMinutes } from "@/lib/schedule";
import { FA_WEEKDAY, isoLocal } from "@/lib/jalali";
import { getNotifPrefs } from "@/lib/notifPrefs";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";

type NotifItem =
  | { kind: "info"; id: string; title: string; body: string }
  | { kind: "friendRequest"; id: string; friendshipId: string; name: string };

const EXERCISE_REMINDER_HOUR = 17;

async function loadFriendRequests(): Promise<NotifItem[]> {
  try {
    const res = await fetch("/api/friends/requests");
    if (!res.ok) return [];
    const { requests } = await res.json();
    return (requests as { friendshipId: string; id: string; name: string; username: string | null }[]).map((r) => ({
      kind: "friendRequest" as const,
      id: `friend:${r.friendshipId}`,
      friendshipId: r.friendshipId,
      name: r.name || r.username || "کاربر",
    }));
  } catch {
    return [];
  }
}

// همون قوانینِ NotificationEngine (که فقط نوتیف واقعیِ مرورگر می‌فرسته)، ولی
// این‌جا به‌جای فرستادنِ Notification، همون آیتم‌ها رو به‌شکل لیست برمی‌گردونه —
// چون دیتای نوتیف جدایی توی دیتابیس ذخیره نمی‌شه، پنل همیشه «الان چی برات
// مونده» رو نشون می‌ده، نه تاریخچه‌ی نوتیف‌های قبلی.
async function loadPendingNotifications(): Promise<NotifItem[]> {
  const items: NotifItem[] = [];
  const prefs = await getNotifPrefs();
  const [removedArr, customArr, daily] = await Promise.all([
    getRemovedOccurrences(),
    getCustomOccurrences(),
    getDaily(isoLocal(new Date())),
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

  if (prefs.exerciseReminders && new Date().getHours() >= EXERCISE_REMINDER_HOUR) {
    try {
      const planRes = await fetch("/api/exercise/plan");
      if (planRes.ok) {
        const { plan } = await planRes.json();
        if (plan) {
          const todayName = FA_WEEKDAY[new Date().getDay()];
          const todayPlan = plan.planData.find((d: { day: string; focus: string }) => d.day === todayName);
          if (todayPlan) {
            const logRes = await fetch(`/api/exercise/log?planId=${plan.id}&date=${isoLocal(new Date())}`);
            const logData = logRes.ok ? await logRes.json() : {};
            if (!logData.completed) {
              items.push({ kind: "info", id: "exercise-today", title: "یادآوری تمرین", body: `برنامه‌ی ورزشی امروز (${todayPlan.focus}) هنوز ثبت نشده.` });
            }
          }
        }
      }
    } catch {}
  }

  const friendRequests = prefs.friendRequests ? await loadFriendRequests() : [];
  return [...friendRequests, ...items];
}

// کش‌شده بیرونِ کامپوننت (نه یه stateِ داخلی) — پنل هر بار که باز/بسته
// می‌شه کاملاً unmount/mount می‌شه (طبقِ رندرِ شرطیِ NavDrawer)، پس یه
// stateِ معمولی هر بار از صفر می‌رفت روی «در حال بارگذاری…». با این کش،
// دفعه‌ی اول لود می‌شه و بعدش هر بار که باز می‌شه بلافاصله همون دیتای
// قبلی رو نشون می‌ده (و بی‌سروصدا در پس‌زمینه دوباره تازه‌ش می‌کنه).
let cachedItems: NotifItem[] | null = null;

export function NotificationPanel({ onClose, anchor }: { onClose: () => void; anchor: { top: number; right: number } }) {
  useLockBodyScroll();
  const [items, setItems] = useState<NotifItem[] | null>(cachedItems);
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
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [onClose]);

  async function respondFriendRequest(friendshipId: string, accept: boolean) {
    await fetch(`/api/friends/${friendshipId}`, { method: accept ? "PATCH" : "DELETE" });
    setItems((prev) => prev && prev.filter((it) => !(it.kind === "friendRequest" && it.friendshipId === friendshipId)));
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
              it.kind === "friendRequest" ? (
                <div key={it.id} className="notif-panel-item" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => respondFriendRequest(it.friendshipId, false)}
                      aria-label="رد کردن"
                      style={{ color: "#E05252" }}
                    >
                      ✕
                    </button>
                    <button
                      type="button"
                      onClick={() => respondFriendRequest(it.friendshipId, true)}
                      aria-label="قبول کردن"
                      style={{ color: "var(--accent)" }}
                    >
                      ✓
                    </button>
                  </div>
                  <div>
                    <div className="notif-panel-item-title">درخواست دوستی</div>
                    <div className="notif-panel-item-body">{it.name} می‌خواد باهات دوست بشه.</div>
                  </div>
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
    </>
  );
}
