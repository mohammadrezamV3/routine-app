// اسپلش تمام‌صفحه برای ناوبری داخلی (درخواست صاحب محصول: همون اسپلش ورود اپ روی
// همه‌ی صفحه‌ها). از همون نود .boot-splash  layout ریشه استفاده می‌کنه و فقط
// data-boot روی <html> رو عوض می‌کنه: on ← نمایش (انیمیشن‌های ورود چون از
// display:none برمی‌گرده از اول اجرا می‌شن)، out ← خروج پخش‌شونده، done ← پنهان.
//
// دو منبع «در حال بارگذاری»:
//   1. ناوبری (RouteProgress: کلیک روی لینک داخلی / برگشت و جلو) تا عوض‌شدن مسیر؛
//   2. hold: هر PageLoader (loading.tsx) تا وقتی mount‌ه — یعنی داده‌ی سرور هنوز نرسیده.
// اسپلش فقط وقتی میاد که یکی از این دو بیش از SHOW_DELAY_MS طول بکشه (صفحه‌ی
// سریع چشمک نمی‌زنه)، و وقتی اومد حداقل MIN_VISIBLE_MS می‌مونه تا ورودش نصفه قطع نشه.
// تا اسپلش لود کامل صفحه (BootSplash) تموم نشده، کاری نمی‌کنه.

import { whenPageReady } from "./pageReady";

const SHOW_DELAY_MS = 250;
const MIN_VISIBLE_MS = 800;
const OUT_MS = 1300;
const MAX_VISIBLE_MS = 10_000;

let navPending = false;
let holds = 0;
let showTimer: ReturnType<typeof setTimeout> | null = null;
let hideTimer: ReturnType<typeof setTimeout> | null = null;
let outTimer: ReturnType<typeof setTimeout> | null = null;
let capTimer: ReturnType<typeof setTimeout> | null = null;
let shownAt = 0;
let visible = false;

const busy = () => navPending || holds > 0;

function html(): HTMLElement | null {
  return typeof document === "undefined" ? null : document.documentElement;
}

/** اسپلش لود کامل صفحه هنوز روی صفحه‌ست؟ (اون خودش مدیریت می‌شه) */
function bootActive(): boolean {
  const v = html()?.getAttribute("data-boot");
  return v === "on" || v === "out";
}

function clear(t: ReturnType<typeof setTimeout> | null) {
  if (t) clearTimeout(t);
}

function show() {
  showTimer = null;
  const d = html();
  if (!d || !busy() || visible || bootActive()) return;
  clear(outTimer);
  outTimer = null;
  visible = true;
  shownAt = Date.now();
  d.setAttribute("data-boot", "on");
  clear(capTimer);
  // هیچ‌وقت بیشتر از سقف روی صفحه نمی‌مونه، حتی اگه یک hold آزاد نشه
  capTimer = setTimeout(() => { navPending = false; holds = 0; hide(); }, MAX_VISIBLE_MS);
}

function hide() {
  hideTimer = null;
  const d = html();
  if (!d || !visible) return;
  visible = false;
  clear(capTimer);
  capTimer = null;
  d.setAttribute("data-boot", "out");
  clear(outTimer);
  outTimer = setTimeout(() => {
    outTimer = null;
    if (!visible) d.setAttribute("data-boot", "done");
  }, OUT_MS);
}

function update() {
  if (busy()) {
    clear(hideTimer);
    hideTimer = null;
    if (!visible && !showTimer) showTimer = setTimeout(show, SHOW_DELAY_MS);
    return;
  }
  clear(showTimer);
  showTimer = null;
  if (!visible || hideTimer) return;
  const wait = Math.max(0, MIN_VISIBLE_MS - (Date.now() - shownAt));
  hideTimer = setTimeout(hide, wait);
}

export function navSplashStart() {
  if (readySignal) { readySignal.cancelled = true; readySignal = null; }
  navPending = true;
  update();
}

let readySignal: { cancelled: boolean } | null = null;

/**
 * مسیر عوض شد. اسپلش هنوز نمی‌ره: تا وقتی خود صفحه‌ی تازه اسپینر/اسکلت داده
 * نشون می‌ده (lib/pageReady.ts) ناوبری «در جریان» حساب می‌شه، وگرنه کاربر بعد از
 * اسپلش دوباره لودینگ می‌دید.
 */
export function navSplashEnd() {
  if (readySignal) readySignal.cancelled = true;
  const signal = { cancelled: false };
  readySignal = signal;
  void whenPageReady(8000, signal).then(() => {
    if (signal.cancelled) return;
    readySignal = null;
    navPending = false;
    update();
  });
}

/** برای PageLoader: تا وقتی mount‌ه اسپلش رو نگه می‌داره؛ تابع برگشتی آزادش می‌کنه */
export function navSplashHold(): () => void {
  holds++;
  update();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    holds = Math.max(0, holds - 1);
    update();
  };
}
