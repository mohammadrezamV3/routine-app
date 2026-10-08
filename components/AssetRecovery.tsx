"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { installAssetRecovery, scheduleStyleCheck } from "@/lib/assetRecovery";

// خودترمیمی لود CSS/چانک‌ها (lib/assetRecovery.ts). هیچ UI‌ای نداره و پولینگ نمی‌کنه:
// لیسنرها یک بار نصب می‌شن و سلامت استایل‌شیت‌ها فقط بعد از هر ناوبری یک بار سنجیده می‌شه.
export function AssetRecovery() {
  const pathname = usePathname();
  useEffect(() => installAssetRecovery(), []);
  useEffect(() => { scheduleStyleCheck(); }, [pathname]);
  return null;
}
