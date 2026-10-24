"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { tr } from "@/lib/i18n";
import { brandName } from "@/lib/brand";

/**
 * دو کار که هردو لازمه‌ی «مثل یه اپ واقعی» بودن‌اند:
 *
 *  ۱) ثبت سرویس‌ورکر در *هر* بار لود. قبلا `lib/pushClient.ts` تنها جایی
 *     بود که SW را رجیستر می‌کرد، آن هم فقط وقتی کاربر نوتیف را روشن
 *     می‌کرد — یعنی برای اکثر کاربرها اصلا ثبت نمی‌شد و هیچ کشی اتفاق
 *     نمی‌افتاد. (رجیستر دوباره در pushClient بی‌ضرر است: مرورگر همان
 *     رجیستریشن موجود را برمی‌گرداند.)
 *
 *  ۲) پیشنهاد نصب — **دقیقا یک بار، بعد از ثبت‌نام**. کروم اندروید رویداد
 *     `beforeinstallprompt` را می‌دهد و اگر نگهش نداریم تنها راه نصب
 *     منوی سه‌نقطه‌ی مرورگر است که عملا هیچ‌کس پیدایش نمی‌کند — ولی
 *     نشان‌دادنش در هر بازدید (رفتار قبلی: «تا وقتی نبندیش هر بار
 *     می‌آید») اسپم است. حالا صفحه‌ی ثبت‌نام یک کلید می‌گذارد، این
 *     کامپوننت همان یک بار بنر را نشان می‌دهد و **بلافاصله کلید را
 *     مصرف می‌کند**؛ چه نصب کند، چه ببندد، چه اصلا واکنش ندهد و صفحه را
 *     ببندد، دیگر تکرار نمی‌شود.
 */

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * صفحه‌ی ثبت‌نام این را ست می‌کند؛ همین کامپوننت می‌خواندش و فورا پاکش
 * می‌کند. وجودش یعنی «این کاربر تازه ثبت‌نام کرده و هنوز پیشنهاد نگرفته».
 */
export const PWA_OFFER_KEY = "arion-install-offer";

/** هر جا کلید بدون ناوبری کامل ست شود این رویداد را بفرستد (ثبت‌نام الان با ناوبری کامل می‌رود و لازمش ندارد). */
export const PWA_OFFER_EVENT = "arion-pwa-offer";

export function PwaProvider() {
  const [deferred, setDeferred] = useState<InstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  // ── ثبت سرویس‌ورکر ──
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    // بعد از load ثبت می‌شود، نه قبلش: در غیر این صورت دانلود و نصب SW با
    // منابع خود لود اول رقابت می‌کند و اولین بازدید را کندتر می‌کند —
    // دقیقا خلاف چیزی که می‌خواهیم.
    // updateViaCache:"none" یعنی خود فایل sw.js هیچ‌وقت از کش HTTP خونده نمی‌شه و نسخه‌ی جدید
    // سریع پیدا می‌شه. نسخه‌ی جدید بی‌صدا فعال می‌شه (skipWaiting در sw.js) و هیچ ریلود یا
    // پیام مزاحمی نداره: کش‌های داده‌ی کاربر و دارایی‌ها بین نسخه‌ها حفظ می‌شن (public/sw.js).
    let reg: ServiceWorkerRegistration | null = null;
    const onLoad = () => {
      navigator.serviceWorker
        .register("/sw.js", { updateViaCache: "none" })
        .then((r) => { reg = r; })
        .catch(() => {});
    };
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });
    // اپ نصب‌شده ساعت‌ها در پس‌زمینه می‌مونه؛ هر بار که برمی‌گرده (حداکثر ساعتی یک بار) دنبال نسخه‌ی تازه می‌گردیم
    let lastCheck = Date.now();
    const onVisible = () => {
      if (document.visibilityState !== "visible" || !reg || Date.now() - lastCheck < 3_600_000) return;
      lastCheck = Date.now();
      reg.update().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("load", onLoad);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  // ── گرفتن رویداد نصب ──
  // `beforeinstallprompt` وقت خودش می‌آید (معمولا در همان لود اول، یعنی
  // خیلی قبل‌تر از ثبت‌نام)، پس این‌جا فقط نگهش می‌داریم. تصمیم نشان‌دادن
  // جای دیگری‌ست.
  useEffect(() => {
    function onBeforeInstall(e: Event) {
      // جلوگیری از بنر پیش‌فرض مرورگر تا خودمان در جای مناسب نشانش بدهیم
      e.preventDefault();
      setDeferred(e as InstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    // وقتی نصب شد دیگر پیشنهاد بی‌معنی‌ست
    const onInstalled = () => { setVisible(false); setDeferred(null); };
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // ── تصمیم نشان‌دادن: فقط یک بار، فقط بعد از ثبت‌نام ──
  //
  // دو مسیر لازم است و هر دو واقعی‌اند:
  //   • رویداد سفارشی — ثبت‌نام با ناوبری کلاینتی به /weekly می‌رود و این
  //     کامپوننت (که در layout است) اصلا دوباره mount نمی‌شود.
  //   • بررسی در mount — اگر کاربر بعد ثبت‌نام صفحه را رفرش کند یا
  //     `beforeinstallprompt` دیرتر برسد، کلید هنوز سر جایش است.
  useEffect(() => {
    function consume() {
      let offered = false;
      try {
        offered = localStorage.getItem(PWA_OFFER_KEY) === "1";
      } catch { /* حالت ناشناس/کوکی‌بسته */ }
      if (!offered) return;
      // بدون رویداد مرورگر دکمه‌ی نصب کار خاصی نمی‌کند، پس کلید را هم
      // مصرف نمی‌کنیم — می‌ماند تا دفعه‌ای که مرورگر واقعا نصب را پیشنهاد
      // می‌دهد (مثلا وقتی معیارهای PWA کامل شد).
      if (!deferred) return;
      try { localStorage.removeItem(PWA_OFFER_KEY); } catch { /* بی‌اهمیت */ }
      setVisible(true);
    }
    consume();
    window.addEventListener(PWA_OFFER_EVENT, consume);
    return () => window.removeEventListener(PWA_OFFER_EVENT, consume);
  }, [deferred]);

  async function install() {
    if (!deferred) return;
    setVisible(false);
    await deferred.prompt();
    await deferred.userChoice.catch(() => null);
    setDeferred(null);
  }

  function dismiss() {
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="pwa-install-bar" role="dialog" aria-label={tr("نصب آریون", `Install ${brandName()}`)}>
      <div className="pwa-install-text">
        <b>{tr("آریون را نصب کن", `Install ${brandName()}`)}</b>
        <span>{tr("سریع‌تر باز می‌شود و بدون نوار مرورگر، مثل یک اپ واقعی.", "Opens faster and without the browser bar, like a real app.")}</span>
      </div>
      <div className="pwa-install-actions">
        <button type="button" className="pwa-install-btn" onClick={install}>
          <Download size={15} aria-hidden="true" /> {tr("نصب", "Install")}
        </button>
        <button type="button" className="pwa-install-close" onClick={dismiss} aria-label={tr("بستن", "Close")}>
          <X size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
