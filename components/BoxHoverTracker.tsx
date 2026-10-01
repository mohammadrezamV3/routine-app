"use client";

import { useEffect } from "react";
import { installBoxHover } from "@/lib/boxHover";

/**
 * نور هاور دور همه‌ی باکس‌ها (همان افکت کارت‌های بنتو داشبورد). یک‌بار در
 * app/layout.tsx mount می‌شود؛ جزئیات در lib/boxHover.ts و بلاک «نور هاور
 * دور باکس‌ها» در app/globals.css.
 */
export function BoxHoverTracker() {
  useEffect(() => installBoxHover(), []);
  return null;
}
