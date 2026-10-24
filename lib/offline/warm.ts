// گرم‌کردن داده و چانک‌ها برای آفلاین — یک‌بار برای هر نشست (تب) و هر بخش، فقط بخش فعلی.
//
// بدون این، یک ماژول فقط وقتی آفلاین کار می‌کرد که قبلا آنلاین بازش کرده بودی (مثلا ثبت معامله
// بدون باز شدن قبلی فرم، چون /api/trade/accounts کش نشده بود). این‌جا کلیدی‌ترین GETهای همون
// بخش از طریق fetch هوک‌شده (پس توی کش آفلاین می‌شینن) و بعدش چانک‌های تنبل مودال‌ها/شیت‌های
// قابل‌استفاده‌ی آفلاین (برای کش دارایی‌های سرویس‌ورکر) یکی‌یکی و در زمان بیکاری گرفته می‌شن.
// سیاست عملکرد: فقط آنلاین، فقط اتصال سریع و بدون صرفه‌جویی داده (canPrefetch)، سریال و کم‌اولویت.

import { canPrefetch } from "../prefetchPolicy";
import { DEFAULT_SECTION, isSectionKey, type SectionKey } from "../sections";
import { isoLocal } from "../jalali";
import { startOfWeek } from "../schedule";
import * as db from "./db";
import { getKnownUserId } from "./identity";
import { isNavigatorOffline } from "./status";
import { splitUrl } from "./reducers";
import { cacheKeyFor } from "./fetchLayer";

export const WARM_FLAG = "arion:dataWarmed";
const FRESH_MS = 5 * 60_000;
const GAP_MS = 250;
const DAY = 24 * 60 * 60 * 1000;

const ago = (days: number) => isoLocal(new Date(Date.now() - days * DAY));

function idle(): Promise<void> {
  return new Promise((resolve) => {
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    const go = () => setTimeout(resolve, GAP_MS);
    if (w.requestIdleCallback) w.requestIdleCallback(go, { timeout: 4000 });
    else setTimeout(go, 1000);
  });
}

type Ctx = { userId: string; alive: () => boolean };

/** JSON آدرس (کش تازه یا واکشی کم‌اولویت از fetch هوک‌شده که خودش توی کش آفلاین می‌ذاره) */
async function get(ctx: Ctx, url: string, force = false): Promise<any | null> {
  if (!ctx.alive()) return null;
  if (!force) try {
    const { path, params } = splitUrl(url);
    const hit = await db.cacheGet(ctx.userId, cacheKeyFor(path, params));
    if (hit && Date.now() - hit.storedAt < FRESH_MS) return JSON.parse(hit.body);
  } catch {}
  try {
    const res = await window.fetch(url, { credentials: "same-origin", priority: "low" } as RequestInit);
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

async function step(ctx: Ctx, url: string, force = false): Promise<any | null> {
  await idle();
  return get(ctx, url, force);
}

function dashboardUrl(): string {
  return `/api/dashboard?date=${isoLocal(new Date())}&tz=${-new Date().getTimezoneOffset()}`;
}

async function warmRoutine(ctx: Ctx) {
  await step(ctx, `/api/sleep?from=${ago(13)}&to=${isoLocal(new Date())}`);
  // داشبورد همیشه تازه: کلیدش بین بخش‌ها یکیه ولی بلوک‌های پاسخ مال بخش درخواست‌دهنده‌ست
  await step(ctx, dashboardUrl(), true);
}

async function warmWorkout(ctx: Ctx) {
  const today = isoLocal(new Date());
  const plan = await step(ctx, "/api/exercise/plan");
  const planId = plan?.plan?.id;
  if (typeof planId === "string") {
    await step(ctx, `/api/exercise/log?planId=${planId}&date=${today}`);
    await step(ctx, `/api/exercise/log/range?planId=${planId}&start=${isoLocal(startOfWeek(new Date()))}&end=${today}`);
  }
  await step(ctx, "/api/calorie/target");
  await step(ctx, `/api/calorie/log?date=${today}`);
  await step(ctx, `/api/calorie/log/range?from=${ago(29)}&to=${today}`);
  await step(ctx, "/api/calorie/foods?q=");
  await step(ctx, `/api/sleep?from=${ago(13)}&to=${today}`);
  // داشبورد همیشه تازه: کلیدش بین بخش‌ها یکیه ولی بلوک‌های پاسخ مال بخش درخواست‌دهنده‌ست
  await step(ctx, dashboardUrl(), true);
}

async function warmTrade(ctx: Ctx) {
  const acc = await step(ctx, "/api/trade/accounts?archived=0");
  await step(ctx, "/api/trade/tags");
  await step(ctx, "/api/trade/checklists");
  await step(ctx, "/api/trade/notes");
  const list: { id?: unknown; archived?: unknown }[] = Array.isArray(acc?.accounts) ? acc.accounts : [];
  for (const a of list.filter((x) => !x.archived && typeof x.id === "string").slice(0, 6)) {
    await step(ctx, `/api/trade/entries?accountId=${a.id}`);
  }
  await step(ctx, "/api/trade/accounts?archived=1");
  await step(ctx, "/api/trade/hub");
  // داشبورد همیشه تازه: کلیدش بین بخش‌ها یکیه ولی بلوک‌های پاسخ مال بخش درخواست‌دهنده‌ست
  await step(ctx, dashboardUrl(), true);
}

/** چانک‌های تنبل مودال‌ها/شیت‌هایی که آفلاین هم کار می‌کنن (همون ماژول‌هایی که next/dynamic لود می‌کنه) */
const CHUNKS: Record<SectionKey, (() => Promise<unknown>)[]> = {
  routine: [
    () => import("@/components/AddProgramForm"),
    () => import("@/components/EditOccurrenceForm"),
    () => import("@/components/DayModal"),
    () => import("@/components/SleepCycleSheet"),
    () => import("@/components/SleepToolsPanels"),
  ],
  workout: [
    () => import("@/components/CalorieAddEntryModal"),
    () => import("@/components/ExerciseSetTrackerModal"),
    () => import("@/components/ExerciseSetTutorial"),
    () => import("@/components/CalorieGoalModal"),
    () => import("@/components/AddProgramForm"),
    () => import("@/components/SleepCycleSheet"),
    () => import("@/components/SleepToolsPanels"),
  ],
  trade: [
    () => import("@/components/TradeFormModal"),
    () => import("@/components/TradeDetailDrawer"),
    () => import("@/components/AddProgramForm"),
  ],
};

export function sectionOfDocument(): SectionKey {
  try {
    const s = document.documentElement.getAttribute("data-section");
    if (s && isSectionKey(s)) return s;
  } catch {}
  return DEFAULT_SECTION;
}

export function canWarmNow(): boolean {
  return typeof window !== "undefined" && !isNavigatorOffline() && canPrefetch();
}

/** یک‌بار برای هر نشست (تب). هیچ‌وقت خطا پرت نمی‌کنه. */
export async function warmSectionOnce(): Promise<void> {
  const section = sectionOfDocument();
  let done = "";
  try { done = window.sessionStorage.getItem(WARM_FLAG) || ""; } catch {}
  if (done.split(",").includes(section)) return;
  const userId = getKnownUserId();
  if (!userId || !canWarmNow()) return;
  try { window.sessionStorage.setItem(WARM_FLAG, done ? `${done},${section}` : section); } catch {}
  const ctx: Ctx = { userId, alive: () => getKnownUserId() === userId && canWarmNow() };
  try {
    if (section === "trade") await warmTrade(ctx);
    else if (section === "workout") await warmWorkout(ctx);
    else await warmRoutine(ctx);
    for (const load of CHUNKS[section]) {
      if (!ctx.alive()) return;
      await idle();
      await load().catch(() => {});
    }
  } catch {}
}
