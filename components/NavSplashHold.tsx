"use client";

import { useEffect } from "react";
import { navSplashHold } from "@/lib/navSplash";

// داخل PageLoader: تا وقتی loading.tsx  یک صفحه روی صفحه‌ست، اسپلش ناوبری رو
// نگه می‌داره (lib/navSplash.ts). روی لود کامل صفحه بی‌اثره چون اسپلش ورود اپ
// خودش فعاله و navSplash تا تموم‌شدن اون کاری نمی‌کنه.
export function NavSplashHold() {
  useEffect(() => navSplashHold(), []);
  return null;
}
