// بعد از pullی که ردیفِ ریموتی رو واقعا عوض کرده (SyncEngine.onRemoteApplied):
//   ۱) کشِ درون‌حافظه‌ی lib/storage (TTLِ ۱۵ثانیه‌ای + کشِ بازه‌ها) دور ریخته
//      می‌شه تا خواندنِ بعدی از Dexie ِ تازه باشه — و وضعیتِ «واردشده» همون
//      لحظه دوباره اعلام می‌شه (وگرنه خواندن‌ها معطلِ fallbackِ ۳ثانیه‌ای می‌موندن)
//   ۲) صفحه‌ی فعلی remount می‌شه (همون router.refresh) — ولی نه وسطِ کارِ کاربر:
//      اگه مودالی بازه (قفلِ اسکرولِ body) یا فیلدی فوکوس داره، تا بسته‌شدنِ
//      مودال/خروج از فیلد یا برگشت به اپ صبر می‌کنه.
import { emitRouteRefresh } from "@m/shims/navRegistry";
import { bodyScrollLocked } from "@m/shell/hardwareBack";
import { services } from "./services";

let pending = false;
let observer: MutationObserver | null = null;

function editing(): boolean {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

export function canRemountNow(): boolean {
  return !bodyScrollLocked() && !editing();
}

async function invalidateWebCaches(): Promise<void> {
  const storage = await import("@/lib/storage");
  storage.invalidateStorageCache();
  storage.publishSessionState(services().tokens.isLoggedIn());
}

function flush(): void {
  if (!pending || !canRemountNow()) return;
  pending = false;
  observer?.disconnect();
  observer = null;
  document.removeEventListener("focusout", onFocusOut, true);
  void invalidateWebCaches().then(() => emitRouteRefresh());
}

function onFocusOut(): void {
  // فوکوس بعد از این رویداد جابه‌جا می‌شه
  setTimeout(flush, 0);
}

/** درخواستِ remount؛ اگه الان نمی‌شه، بعدا (بستنِ مودال / خروج از فیلد / resume) */
export function requestRemount(): void {
  pending = true;
  if (canRemountNow()) {
    flush();
    return;
  }
  // حتی وقتی remount عقب می‌افته، خواندن‌های بعدی باید تازه باشن
  void invalidateWebCaches();
  if (!observer && typeof MutationObserver !== "undefined") {
    observer = new MutationObserver(() => flush());
    observer.observe(document.body, { attributes: true, attributeFilter: ["style", "class"] });
  }
  document.addEventListener("focusout", onFocusOut, true);
}

/** برگشت به اپ (appStateChange/visibilitychange) — remountِ عقب‌افتاده، اگه هنوز مودال بازه هم نه */
export function flushPendingRemount(): void {
  flush();
}

export function hasPendingRemount(): boolean {
  return pending;
}

/** اتصال به موتورِ سینک + رویدادهای برگشت به اپ. خروجی: تابعِ لغو */
export function startRemoteRefresh(): () => void {
  const offEngine = services().engine.onRemoteApplied(() => requestRemount());
  const onVisible = () => {
    if (document.visibilityState === "visible") flushPendingRemount();
  };
  document.addEventListener("visibilitychange", onVisible);
  let removeApp: (() => void) | null = null;
  let cancelled = false;
  void import("@capacitor/app")
    .then(({ App }) => App.addListener("appStateChange", (s) => s.isActive && flushPendingRemount()))
    .then((h) => {
      if (cancelled) void h.remove();
      else removeApp = () => void h.remove();
    })
    .catch(() => undefined);
  return () => {
    cancelled = true;
    offEngine();
    document.removeEventListener("visibilitychange", onVisible);
    removeApp?.();
  };
}
