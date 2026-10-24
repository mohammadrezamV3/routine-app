// راه‌اندازی آفلاین سمت کلاینت — از SessionBridge صدا زده می‌شه، یک‌بار برای هر نشست.
//
//  - هویت: کاربر نشست رو ثبت می‌کنه (عوض‌شدن کاربر = پاک‌سازی)
//  - کش رو از پاسخ bootstrap پر می‌کنه (تنظیمات، حساب، بازه‌ی روزانه)
//  - پخش صف رو راه می‌اندازه
//  - پوسته‌ی صفحه‌های اصلی رو برای اولین باز شدن آفلاین گرم می‌کنه

import { getPreloadedBootstrap } from "../preload";
import { getKnownUserId, loadKnownUser, setKnownUser, swCall } from "./identity";
import { refreshPending, seedFromBootstrap } from "./fetchLayer";
import { isNavigatorOffline } from "./status";
import { isSectionKey, pathAllowedIn } from "../sections";

let started = false;

const MAIN_ROUTES = ["/dashboard", "/weekly", "/sleep", "/analysis/weekly", "/account"];
const TRADE_ROUTES = ["/trade/journal", "/trade/checklists", "/trade/notes", "/trade/calendar", "/trade/clock"];

/**
 * مسیرهایی که باید برای آفلاین گرم بشن (workout: خود داشبورد کافیه). فقط مسیرهایی که بخش فعلی بازشون
 * می‌ذاره: واکشی مسیر مال بخش دیگه (مثلا /weekly در بخش ورزش) middleware رو وادار می‌کرد کوکی بخش
 * کاربر رو عوض کنه.
 */
export function shellRoutes(section: string | null | undefined): string[] {
  const all = section === "trade" ? [...MAIN_ROUTES, ...TRADE_ROUTES] : [...MAIN_ROUTES];
  if (!section || !isSectionKey(section)) return all;
  return all.filter((p) => pathAllowedIn(section, p));
}

function whenIdle(cb: () => void) {
  if (typeof window === "undefined") return;
  if ("requestIdleCallback" in window) (window as any).requestIdleCallback(cb, { timeout: 6000 });
  else setTimeout(cb, 3000);
}

function warmShellOnce() {
  try {
    if (window.sessionStorage.getItem("arion:shellWarmed") === "1") return;
    window.sessionStorage.setItem("arion:shellWarmed", "1");
  } catch {}
  if (isNavigatorOffline()) return;
  const section = document.documentElement.getAttribute("data-section");
  void swCall((m) => m.warmShell(shellRoutes(section)));
}

/** داده و چانک‌های بخش فعلی: بعد از گرم‌شدن پوسته و خالی‌شدن صف، یک‌بار برای هر نشست */
function warmDataSoon() {
  setTimeout(() => whenIdle(() => { void import("./warm").then((m) => m.warmSectionOnce()).catch(() => {}); }), 4000);
}

/**
 * نتیجه‌ی نشست: userId = کاربر واردشده. null (مهمان/نشست منقضی) کاربر شناخته‌شده رو
 * پاک نمی‌کنه — فقط خروج صریح یا ورود کاربر دیگه این کار رو می‌کنه.
 */
export async function onSessionResolved(userId: string | null): Promise<void> {
  if (typeof window === "undefined") return;
  if (userId) await setKnownUser(userId);
  else await loadKnownUser();
  if (!getKnownUserId()) return;
  if (started) return;
  started = true;
  void refreshPending();
  if (userId) {
    const boot = getPreloadedBootstrap();
    if (boot) boot.data.then((b) => { if (b) void seedFromBootstrap(b); }, () => {});
  }
  const sync = await import("./sync");
  sync.startSync();
  if (userId) { whenIdle(warmShellOnce); warmDataSoon(); }
}

/** فقط تست */
export function __resetBootForTests() { started = false; }
