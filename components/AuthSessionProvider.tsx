"use client";

import { useEffect } from "react";
import { SessionProvider, useSession } from "next-auth/react";
import type { Session } from "next-auth";
import { publishSessionState } from "@/lib/storage";
import { setAuthHintCookie, clearAuthHintCookie } from "@/lib/preload";

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
function SessionBridge() {
  const { status } = useSession();

  useEffect(() => {
    if (status === "loading") return;
    const authed = status === "authenticated";
    publishSessionState(authed);
    // کوکی راهنمای پیش‌درخواست رو با وضعیت واقعی سشن هم‌گام نگه می‌داره.
    // این‌جا (نه فقط توی دکمه‌های ورود/خروج) انجام می‌شه تا دو حالت لبه هم
    // پوشش داده بشن: کاربری که از قبل لاگین بوده و هیچ‌وقت کوکی رو نگرفته،
    // و سشنی که سمت سرور منقضی شده ولی کوکی راهنما جا مونده (که باعث
    // می‌شد هر لود چند تا ۴۰۱ الکی بفرسته).
    if (authed) setAuthHintCookie();
    else clearAuthHintCookie();
  }, [status]);

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
      {children}
    </SessionProvider>
  );
}
