// باز کردنِ آدرسِ یک‌بارمصرفِ پرداخت در **مرورگرِ سیستم** (Custom Tab)، نه
// WebView ِ اپ — صفحه‌ی درگاه نباید توی originِ اپ اجرا بشه و کاربر باید
// نوارِ آدرسِ واقعی (دامنه‌ی سایت/زیبال) رو ببینه.
//
// @capacitor/browser هنوز جزوِ وابستگی‌ها نیست (لید اضافه‌اش می‌کنه). برای
// این‌که بیلد بدونِ اون هم بشکنه نه، پلاگین با registerPlugin از روی اسم
// گرفته می‌شه (بدونِ import ِ پکیج) و فقط اگه واقعا روی دستگاه نصب باشه
// استفاده می‌شه؛ وگرنه window.open (روی اندروید هم به مرورگرِ خارجی می‌ره).
import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";

type BrowserPlugin = {
  open(opts: { url: string; presentationStyle?: "fullscreen" | "popover" }): Promise<void>;
  addListener(event: "browserFinished", cb: () => void): Promise<PluginListenerHandle>;
};

let browser: BrowserPlugin | null = null;
function nativeBrowser(): BrowserPlugin | null {
  if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable("Browser")) return null;
  browser ??= registerPlugin<BrowserPlugin>("Browser");
  return browser;
}

/** آدرس فقط https پذیرفته می‌شه — هیچ‌وقت لاگ/ذخیره نمی‌شه (توکنِ یک‌بارمصرف داخلشه) */
export async function openCheckoutUrl(url: string): Promise<void> {
  if (!/^https:\/\//i.test(url) && !/^http:\/\/localhost[:/]/i.test(url)) throw new Error("invalid checkout url");
  const b = nativeBrowser();
  if (b) {
    await b.open({ url, presentationStyle: "fullscreen" });
    return;
  }
  const w = window.open(url, "_blank", "noopener,noreferrer");
  if (!w && !Capacitor.isNativePlatform()) window.location.assign(url);
}

/**
 * «کاربر برگشت» — بسته شدنِ Custom Tab، resume ِ اپ، یا دیپ‌لینکِ
 * arion://payment-result. هر کدوم که اول برسه cb صدا زده می‌شه (ممکنه چندبار؛
 * مصرف‌کننده idempotent باشه). تابعِ برگشتی همه‌ی شنونده‌ها رو برمی‌داره.
 */
export function onReturnFromCheckout(cb: () => void): () => void {
  const handles: Promise<PluginListenerHandle | null>[] = [];
  const b = nativeBrowser();
  if (b) handles.push(b.addListener("browserFinished", cb).catch(() => null));
  if (Capacitor.isNativePlatform()) {
    handles.push(
      import("@capacitor/app")
        .then(({ App }) => App.addListener("resume", cb))
        .catch(() => null)
    );
    handles.push(
      import("@capacitor/app")
        .then(({ App }) => App.addListener("appUrlOpen", (e) => (isPaymentResultUrl(e.url) ? cb() : undefined)))
        .catch(() => null)
    );
  }
  const onVisible = () => {
    if (document.visibilityState === "visible") cb();
  };
  document.addEventListener("visibilitychange", onVisible);
  return () => {
    document.removeEventListener("visibilitychange", onVisible);
    for (const h of handles) void h.then((x) => x?.remove());
  };
}

export const PAYMENT_RESULT_SCHEME_URL = "arion://payment-result";

export function isPaymentResultUrl(url: string | null | undefined): boolean {
  return typeof url === "string" && url.toLowerCase().startsWith(PAYMENT_RESULT_SCHEME_URL);
}
