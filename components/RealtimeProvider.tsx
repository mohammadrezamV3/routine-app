"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { startRealtime, stopRealtime } from "@/lib/realtimeClient";

/**
 * یک‌بار در app/layout.tsx (داخلِ AuthSessionProvider) — اتصالِ WebSocket فقط
 * برای کاربرِ لاگین‌کرده؛ مهمان هیچ‌وقت وصل نمی‌شه (سرور هم ردش می‌کرد).
 * با عوض‌شدنِ کاربر (خروج/ورودِ حسابِ دیگه) اتصال از نو ساخته می‌شه تا
 * رویدادهای کاربرِ قبلی هیچ‌وقت به این تب نرسه.
 */
export function RealtimeProvider() {
  const { data, status } = useSession();
  const userId = (data?.user as { id?: string } | undefined)?.id ?? null;

  useEffect(() => {
    if (status !== "authenticated" || !userId) {
      if (status === "unauthenticated") stopRealtime();
      return;
    }
    startRealtime();
    return () => stopRealtime();
  }, [status, userId]);

  return null;
}
