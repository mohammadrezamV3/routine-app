"use client";

import { MotionConfig } from "framer-motion";
import { useEffect, useState } from "react";
import { isLowPerfDevice } from "@/lib/perfTier";

/**
 * روی دستگاه‌های ردهٔ پایین، انیمیشن‌های framer-motion را خاموش می‌کند.
 *
 * چرا این‌جا و نه در ۴۲ فایلِ جداگانه: `MotionConfig` مقدارش را از طریقِ
 * context به *همه‌ی* کامپوننت‌های motionِ زیرِ خودش می‌دهد. یعنی یک نقطه‌ی
 * کنترل، بدونِ دست‌زدن به تک‌تکِ کامپوننت‌ها و بدونِ ریسکِ جا افتادنِ یکی.
 *
 * `reducedMotion="user"` (پیش‌فرضِ ما برای بقیه) یعنی «به تنظیمِ سیستم‌عاملِ
 * کاربر احترام بگذار». روی دستگاهِ ضعیف به `"always"` می‌رود: مقادیرِ نهایی
 * بلافاصله اعمال می‌شوند، پس چیزی از UI غایب نمی‌شود — فقط بینِ حالت‌ها
 * انیمیت نمی‌شود.
 *
 * خواندنِ attribute در useEffect انجام می‌شود (نه حین رندر) چون آن را یک
 * اسکریپتِ inline قبل از هیدریت می‌گذارد؛ خواندنش در رندرِ سرور غیرممکن است
 * و باعثِ عدم‌تطابقِ هیدریت می‌شد.
 */
export function MotionTuner({ children }: { children: React.ReactNode }) {
  const [low, setLow] = useState(false);
  useEffect(() => setLow(isLowPerfDevice()), []);
  return <MotionConfig reducedMotion={low ? "always" : "user"}>{children}</MotionConfig>;
}
