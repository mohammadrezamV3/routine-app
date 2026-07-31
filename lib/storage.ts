// لایه داده — برای مهمان‌ها (لاگین‌نکرده) روی localStorage کار می‌کند، و برای
// کاربرهای لاگین‌کرده به API واقعی (Prisma/Postgres) وصل می‌شود. هر تابع
// اول وضعیت session رو چک می‌کنه؛ بقیه کد اپ (کامپوننت‌ها) اصلاً نمی‌دونن
// داده از کجا میاد — همون قراردادی که از اول قرار بود برقرار بمونه.

import { getSession } from "next-auth/react";

const PREFIX = "panelMohammad:";

function hasLocalStorage() {
  try {
    const k = "__test__";
    window.localStorage.setItem(k, "1");
    window.localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

// getSession() هر بار که صدا زده بشه یه فچ تازه به /api/auth/session می‌زنه
// (برخلاف هوک useSession که از context مشترکِ SessionProvider استفاده می‌کنه).
// چون این تابع از خیلی جاها (هر get/setSetting، هر تابع daily/theme و...)
// صدا زده می‌شه، توی mount اولیه‌ی یه صفحه معمولاً چندین بار همزمان صدا زده
// می‌شد و چندتا فچ تکراری/موازی به session می‌زد — این‌جا با کش‌کردنِ همون
// promiseِ در حالِ اجرا (نه یه TTL زمانی)، همه‌ی صداهای هم‌زمان یک فچ واحد رو
// به اشتراک می‌ذارن؛ به‌محض resolve شدن هم کش پاک می‌شه، پس هیچ staleness‌ای
// برای چک‌های واقعاً بعدی (مثل درست بعد از لاگین/لاگ‌اوت) ایجاد نمی‌شه.
let inFlightSession: ReturnType<typeof getSession> | null = null;

async function isLoggedIn(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    if (!inFlightSession) {
      inFlightSession = getSession().finally(() => { inFlightSession = null; });
    }
    const session = await inFlightSession;
    return !!(session?.user as any)?.id;
  } catch {
    return false;
  }
}

export type DailyRecord = {
  tasks: Record<string, boolean>;
  wake: string | null;
};

export async function getDaily(dateKey: string): Promise<DailyRecord> {
  if (await isLoggedIn()) {
    try {
      const res = await fetch(`/api/tasks/daily?date=${dateKey}`);
      if (res.ok) return await res.json();
    } catch {}
    return { tasks: {}, wake: null };
  }
  if (typeof window === "undefined" || !hasLocalStorage()) return { tasks: {}, wake: null };
  const raw = window.localStorage.getItem(PREFIX + "daily:" + dateKey);
  return raw ? JSON.parse(raw) : { tasks: {}, wake: null };
}

export async function setDaily(dateKey: string, data: DailyRecord): Promise<void> {
  if (await isLoggedIn()) {
    try {
      await fetch("/api/tasks/daily", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: dateKey, tasks: data.tasks, wake: data.wake }),
      });
    } catch {}
    return;
  }
  if (typeof window === "undefined" || !hasLocalStorage()) return;
  window.localStorage.setItem(PREFIX + "daily:" + dateKey, JSON.stringify(data));
}

export async function listDailyKeys(): Promise<Set<string>> {
  if (await isLoggedIn()) {
    try {
      const res = await fetch("/api/tasks/daily/keys");
      if (res.ok) {
        const data = await res.json();
        return new Set<string>(data.keys || []);
      }
    } catch {}
    return new Set();
  }
  const keys = new Set<string>();
  if (typeof window === "undefined" || !hasLocalStorage()) return keys;
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (k && k.startsWith(PREFIX + "daily:")) {
      keys.add(k.slice((PREFIX + "daily:").length));
    }
  }
  return keys;
}

/**
 * نسخه سریع getDaily برای یک بازه تاریخی — یک درخواست شبکه به‌جای N تا.
 * برای کاربر لاگین‌کرده از /api/tasks/daily/range استفاده می‌کنه؛ برای مهمان
 * (localStorage) از قبل سریع بود، فقط همون کلیدهای موجود رو می‌خونه.
 */
export async function getDailyRange(fromIso: string, toIso: string): Promise<Record<string, DailyRecord>> {
  if (await isLoggedIn()) {
    try {
      const res = await fetch(`/api/tasks/daily/range?from=${fromIso}&to=${toIso}`);
      if (res.ok) {
        const data = await res.json();
        return data.entries || {};
      }
    } catch {}
    return {};
  }
  const result: Record<string, DailyRecord> = {};
  if (typeof window === "undefined" || !hasLocalStorage()) return result;
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (k && k.startsWith(PREFIX + "daily:")) {
      const dateKey = k.slice((PREFIX + "daily:").length);
      if (dateKey >= fromIso && dateKey <= toIso) {
        try {
          result[dateKey] = JSON.parse(window.localStorage.getItem(k) || "{}");
        } catch {}
      }
    }
  }
  return result;
}

// ---------- تنظیمات کلید-مقداری عمومی (تم، occurrenceهای حذف/اضافه‌شده) ----------

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  if (await isLoggedIn()) {
    try {
      const res = await fetch(`/api/settings/${encodeURIComponent(key)}`);
      if (res.ok) {
        const data = await res.json();
        return data.value ?? fallback;
      }
    } catch {}
    return fallback;
  }
  if (typeof window === "undefined" || !hasLocalStorage()) return fallback;
  const raw = window.localStorage.getItem(PREFIX + "settings:" + key);
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  if (await isLoggedIn()) {
    try {
      await fetch(`/api/settings/${encodeURIComponent(key)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });
    } catch {}
    return;
  }
  if (typeof window === "undefined" || !hasLocalStorage()) return;
  window.localStorage.setItem(PREFIX + "settings:" + key, JSON.stringify(value));
}

export async function getRemovedOccurrences(): Promise<string[]> {
  return getSetting<string[]>("removedOccurrences", []);
}
export async function setRemovedOccurrences(arr: string[]): Promise<void> {
  return setSetting("removedOccurrences", arr);
}

// میزان حساسیت/اهمیتِ هر برنامه — چهار سطح، پیش‌فرض «کم» (رکوردهای قدیمی که
// این فیلد رو ندارن هم همینطور رفتار می‌کنن). فقط موارد «زیاد»/«خیلی زیاد»
// توی بخش «یادآوری‌ها»ی داشبورد نشون داده می‌شن.
export type Importance = "low" | "medium" | "high" | "veryHigh";
export const IMPORTANCE_LABELS: Record<Importance, string> = {
  low: "کم",
  medium: "متوسط",
  high: "زیاد",
  veryHigh: "خیلی زیاد",
};

export type CustomOccurrence = {
  id: string;
  name: string;
  jsDay: number;
  time: string;
  endDate?: string;
  importance?: Importance;
  tag?: string;
};

export async function getCustomOccurrences(): Promise<CustomOccurrence[]> {
  return getSetting<CustomOccurrence[]>("customOccurrences", []);
}
export async function setCustomOccurrences(arr: CustomOccurrence[]): Promise<void> {
  return setSetting("customOccurrences", arr);
}

export async function getThemeSetting(): Promise<"dark" | "light" | null> {
  return getSetting<"dark" | "light" | null>("theme", null);
}
export async function setThemeSetting(value: "dark" | "light"): Promise<void> {
  // یک کوکی هم می‌نویسیم (علاوه بر localStorage/DB) — چون کوکی، برخلاف اون دوتا،
  // سمتِ سرور توی layout.tsx هم قابل‌خوندنه؛ همین باعث می‌شه data-theme از همون
  // اولین HTML سرور درست باشه، نه این‌که با یه تاخیر (بعد از resolve شدنِ
  // getThemeSetting سمتِ کلاینت) یهو از تاریک به روشن (یا برعکس) عوض بشه.
  if (typeof document !== "undefined") {
    document.cookie = `theme=${value}; path=/; max-age=31536000; samesite=lax`;
  }
  return setSetting("theme", value);
}

// ---------- روزهای «بیرون رفتن» (حالا فقط داخل تقویم اصلی نشون داده می‌شه) ----------

export async function getOutingDates(): Promise<string[]> {
  return getSetting<string[]>("outingDates", []);
}
export async function toggleOutingDate(iso: string): Promise<string[]> {
  const current = await getOutingDates();
  const next = current.includes(iso) ? current.filter((d) => d !== iso) : [...current, iso];
  await setSetting("outingDates", next);
  return next;
}
