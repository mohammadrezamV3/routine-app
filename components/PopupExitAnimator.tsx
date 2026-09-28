"use client";

import { useEffect } from "react";
import { installPopupExitAnimator } from "@/lib/popupExit";

/**
 * خروجِ نرمِ (پایین رفتن + محوشدن) همه‌ی پاپ‌آپ‌ها، از جمله بعد از
 * «ثبت/تأیید/اعمال». یک‌بار در app/layout.tsx mount می‌شود؛ جزئیات در
 * lib/popupExit.ts و بلاکِ «پاپ‌آپ‌ها» آخرِ app/globals.css.
 */
export function PopupExitAnimator() {
  useEffect(() => installPopupExitAnimator(), []);
  return null;
}
