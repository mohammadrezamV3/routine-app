"use client";
// دسترسی تنبل به نام‌های انگلیسی غذاها (lib/foodNamesEn.ts، 264 غذا). جدول
// فقط در زبان انگلیسی و بعد از اولین رندر با import() پویا لود می‌شه؛ در
// فارسی هیچ‌وقت. کامپوننتی که foodNameDisplay رو در رندر صدا می‌زنه باید
// `useFoodNamesEn()` رو هم صدا بزنه تا بعد از آماده‌شدن دوباره رندر بشه.
import { useSyncExternalStore } from "react";
import { isEn } from "./i18n";

type Mod = typeof import("./foodNamesEn");

let mod: Mod | null = null;
let promise: Promise<Mod | null> | null = null;
let version = 0;
const listeners = new Set<() => void>();

export function loadFoodNamesEn(): Promise<Mod | null> {
  if (mod) return Promise.resolve(mod);
  if (!promise) {
    promise = import("./foodNamesEn")
      .then((m) => {
        mod = m;
        version += 1;
        listeners.forEach((l) => l());
        return m;
      })
      .catch(() => {
        promise = null;
        return null;
      });
  }
  return promise;
}

export function useFoodNamesEn(): number {
  if (typeof window !== "undefined" && isEn() && !mod) void loadFoodNamesEn();
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    () => version,
    () => 0,
  );
}

/** نام غذا برای نمایش؛ تا لود نشدن جدول انگلیسی همون نام ذخیره‌شده. */
export function foodNameDisplay(nameFa: string, nameEn?: string | null): string {
  if (!isEn()) return nameFa;
  if (nameEn) return nameEn;
  return mod ? mod.foodNameDisplay(nameFa, nameEn) : nameFa;
}

/** جستجوی انگلیسی (بعد از loadFoodNamesEn)؛ خروجی نام‌های فارسی کلید. */
export function searchFoodNamesEn(query: string, limit = 10): string[] {
  return mod ? mod.searchFoodNamesEn(query, limit) : [];
}
