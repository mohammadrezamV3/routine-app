"use client";

import { useCallback, useState } from "react";

/**
 * اجرای یک عملیات شبکه‌ای کوتاه (آرشیو، حذف، کپی، سنجاق) با سه چیزی که
 * قبلا نبود و باعث می‌شد دکمه‌ها «کند و باگ‌دار» حس شوند:
 *
 *   ۱) بازخورد فوری — تا وقتی درخواست در راه است، همان دکمه غیرفعال و
 *      در حال چرخش است. قبلا هیچ اتفاقی روی صفحه نمی‌افتاد و کاربر
 *      فکر می‌کرد کلیکش نگرفته و دوباره می‌زد.
 *   ۲) خطای دیده‌شدنی — اگر درخواست شکست بخورد پیامش برمی‌گردد. قبلا
 *      پاسخ کاملا نادیده گرفته می‌شد؛ یک خطای ۵۰۰ یعنی دکمه‌ای که
 *      بی‌صدا هیچ کاری نمی‌کند (دقیقا حس «باگ خورد»).
 *   ۳) جلوگیری از اجرای هم‌زمان — کلیک دوم روی همان دکمه نادیده گرفته
 *      می‌شود، پس درخواست تکراری نمی‌رود.
 *
 * `key` مشخص می‌کند کدام دکمه در حال کار است، تا فقط همان یکی اسپینر
 * بگیرد نه همه‌ی دکمه‌های لیست.
 */
export function useAsyncAction() {
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (key: string, fn: () => Promise<Response | void>): Promise<boolean> => {
      // اگر همین عملیات از قبل در جریان است، کلیک دوباره را نادیده بگیر
      if (pendingKey) return false;
      setPendingKey(key);
      setError(null);
      try {
        const res = await fn();
        if (res && !res.ok) {
          const body = await res.json().catch(() => null);
          setError(body?.error || "انجام نشد — دوباره تلاش کن");
          return false;
        }
        return true;
      } catch {
        setError("ارتباط با سرور برقرار نشد");
        return false;
      } finally {
        setPendingKey(null);
      }
    },
    [pendingKey]
  );

  return { pendingKey, error, run, clearError: () => setError(null) };
}
