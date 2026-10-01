"use client";

// منطق مشترک تنها دکمه‌ی «اشتراک» (داشبورد و جشن استریک):
//  - برچسب از اول درسته: مرورگری که اشتراک فایل نداره «ذخیره تصویر» می‌بینه
//  - blob باید از *قبل* آماده باشه و navigator.share بدون هیچ await قبلی صدا
//    زده می‌شه — سافاری iOS فقط داخل همون حرکت کاربر اجازه‌ی اشتراک می‌ده
//  - دو تپ پشت‌سرهم دو برگه‌ی اشتراک باز نمی‌کنه (قفل همزمان با ref، نه state)
//  - بعد از موفقیت تیک کوتاه + لرزش (اگه کاربر هپتیک رو خاموش نکرده)

import { useCallback, useEffect, useRef, useState } from "react";
import { hapticsEnabled } from "./haptics";
import { canShareFiles, shareImage } from "./shareCard";

export type SharePhase = "idle" | "busy" | "done" | "error";
export type ShareResult = "shared" | "downloaded";

const DONE_MS = 2400;

export function useImageShare() {
  // null = هنوز روی کلاینت تشخیص داده نشده (رندر سرور)
  const [canShare, setCanShare] = useState<boolean | null>(null);
  useEffect(() => { setCanShare(canShareFiles()); }, []);

  const [phase, setPhase] = useState<SharePhase>("idle");
  const [result, setResult] = useState<ShareResult | null>(null);
  const busyRef = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; if (timer.current) clearTimeout(timer.current); };
  }, []);

  const reset = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setPhase("idle");
    setResult(null);
  }, []);

  const share = useCallback((blob: Blob, name: string, title: string, text: string) => {
    if (busyRef.current) return;
    busyRef.current = true;
    if (timer.current) clearTimeout(timer.current);
    setPhase("busy");
    setResult(null);
    // shareImage تا خود navigator.share هیچ await ی نداره — حرکت کاربر حفظ می‌شه
    shareImage(blob, name, title, text)
      .then((res) => {
        if (!alive.current) return;
        if (res === "cancelled") { setPhase("idle"); return; }
        setResult(res);
        setPhase("done");
        try { if (hapticsEnabled()) navigator.vibrate?.([14, 60, 22]); } catch { /* بدون هپتیک */ }
        timer.current = setTimeout(() => { if (alive.current) setPhase("idle"); }, DONE_MS);
      })
      .catch(() => { if (alive.current) setPhase("error"); })
      .finally(() => { busyRef.current = false; });
  }, []);

  return { canShare, phase, result, share, reset };
}
