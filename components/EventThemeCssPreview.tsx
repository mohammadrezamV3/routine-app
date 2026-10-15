"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

// CSS تم‌های مناسبتی (app/event-themes.css، ~60KB خام) از bundle مشترک بیرونه و فقط وقتی لود می‌شه
// که تم فعال باشه: سمت سرور (تم منتشرشده، لینک CSS توی همون HTML سرور میاد، بدون پرش) یا
// پیش‌نمایش ادمین (اسکریپت inline هدر ویژگی data-event-theme رو از localStorage ست کرده).
// dynamic داخل کامپوننت کلاینت: CSS اون chunk فقط وقتی رندر بشه لود می‌شه (نه همیشه با layout).
const EventThemeCss = dynamic(() => import("./EventThemeCss"));

export function EventThemeCssPreview({ serverActive }: { serverActive: boolean }) {
  const [preview, setPreview] = useState(false);
  useEffect(() => {
    if (serverActive) return;
    if (document.documentElement.hasAttribute("data-event-theme")) setPreview(true);
  }, [serverActive]);
  return serverActive || preview ? <EventThemeCss /> : null;
}
