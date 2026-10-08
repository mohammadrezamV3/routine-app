"use client";

import { useEffect, useRef } from "react";
import { SessionProvider, useSession } from "next-auth/react";
import type { Session } from "next-auth";
import { publishSessionState } from "@/lib/storage";
import { setAuthHintCookie, clearAuthHintCookie, AUTH_HINT_COOKIE } from "@/lib/preload";
import { LiveSyncToaster } from "./LiveSyncToaster";

// refetchOnWindowFocus خاموشه — این اپ نیازی به رفرش سشن با هر بار برگشتن
// به تب نداره، و این رفتار فقط یه فچ اضافه‌ی بی‌فایده به /api/auth/session
// روی هر فوکوس اضافه می‌کرد.

/**
 * نتیجه‌ی همون فچ سشنی که SessionProvider خودش می‌زنه رو به لایه‌ی داده
 * (lib/storage.ts) می‌رسونه.
 *
 * بدون این، `lib/storage.ts` مجبور بود خودش `getSession()` صدا بزنه که یه
 * فچ *مستقل دوم* به `/api/auth/session` می‌زنه (این تابع از context
 * SessionProvider نمی‌خونه). نتیجه‌اش دو تا بود: یه درخواست تکراری در هر
 * لود صفحه، و — گران‌ترش — خواندن داده‌ها پشت اون فچ دوم صف می‌کشید،
 * یعنی دو رفت‌وبرگشت سریالی قبل از این‌که اولین درخواست داده‌ی واقعی بره.
 *
 * چیزی رندر نمی‌کنه.
 */
/**
 * هویت این تب بدون ناوبری کامل عوض شده (ورود/خروج در یک تب دیگه که با پیام
 * broadcast به next-auth این‌جا رسیده)؟ layout و صفحه‌های سرور هنوز با هویت قبلی
 * رندر شدن، پس یک ریلود کامل — همون کاری که lib/loginRedirect.ts و lib/logout.ts
 * برای خود تب انجام می‌دن. صفحه‌های /auth/* و وقتی خود این تب وسط ورود/خروجه
 * مستثنان (اون‌ها خودشون ناوبری کامل می‌کنن).
 */
function identityHandledHere(): boolean {
  if (location.pathname.startsWith("/auth/")) return true;
  const el = document.documentElement;
  return el.hasAttribute("data-logging-in") || el.hasAttribute("data-logging-out");
}

function SessionBridge() {
  const { status } = useSession();
  // آخرین وضعیت حل‌شده (نه loading) — برای تشخیص عوض‌شدن هویت در همین تب
  const lastAuthed = useRef<boolean | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    const authed = status === "authenticated";
    const prev = lastAuthed.current;
    lastAuthed.current = authed;
    if (prev !== null && prev !== authed && !identityHandledHere()) {
      window.location.reload();
      return;
    }
    publishSessionState(authed);
    // کوکی راهنمای پیش‌درخواست رو با وضعیت واقعی سشن هم‌گام نگه می‌داره.
    // این‌جا (نه فقط توی دکمه‌های ورود/خروج) انجام می‌شه تا دو حالت لبه هم
    // پوشش داده بشن: کاربری که از قبل لاگین بوده و هیچ‌وقت کوکی رو نگرفته،
    // و سشنی که سمت سرور منقضی شده ولی کوکی راهنما جا مونده (که باعث
    // می‌شد هر لود چند تا ۴۰۱ الکی بفرسته).
    if (authed) setAuthHintCookie();
    else clearAuthHintCookie();
  }, [status]);

  // برگشت از bfcache (دکمه‌ی «برگشت» بعد از ورود/خروج): صفحه‌ی منجمد با هویت
  // قبلی زنده می‌شه بدون این‌که هیچ درخواستی بره. کوکی راهنما همیشه با ورود/خروج
  // هم‌گامه، پس اگه با وضعیت این صفحه نخونه، صفحه از نو لود می‌شه.
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (!e.persisted || lastAuthed.current === null) return;
      const hinted = document.cookie.split("; ").some((c) => c === `${AUTH_HINT_COOKIE}=1`);
      if (hinted !== lastAuthed.current) window.location.reload();
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  return null;
}

// `session` از سرور می‌آید (layout با getServerSession می‌خواندش). وقتی
// SessionProvider سشن را از قبل داشته باشد دیگر `/api/auth/session` را صدا
// نمی‌زند — یک رفت‌وبرگشت کامل شبکه در هر لود صفحه کمتر. اگر داده نشود
// (مهمان، یا خطای سرور) رفتار قبلی برقرار است و خودش می‌رود می‌گیرد.
export function AuthSessionProvider({
  children,
  session,
}: {
  children: React.ReactNode;
  session?: Session | null;
}) {
  return (
    <SessionProvider session={session ?? undefined} refetchOnWindowFocus={false}>
      <SessionBridge />
      <LiveSyncToaster />
      {children}
    </SessionProvider>
  );
}
