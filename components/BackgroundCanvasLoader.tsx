"use client";

import dynamic from "next/dynamic";

// بک‌گراند ذرات فقط تزئینیه، برای اولین رندر ضروری نیست — با ssr:false و
// dynamic import، جاوااسکریپتش جدا از باندل اصلی لود می‌شه و مسیر بحرانی
// (تا وقتی که کاربر واقعاً چیزی رو ببینه) کندتر نمی‌شه.
const BackgroundCanvas = dynamic(
  () => import("./BackgroundCanvas").then((m) => m.BackgroundCanvas),
  { ssr: false }
);

export function BackgroundCanvasLoader() {
  return <BackgroundCanvas />;
}
