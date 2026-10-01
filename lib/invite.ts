"use client";

// دعوت دوست — «بهونه»ی اشتراک‌گذاری: هر کارت اشتراکی (استریک، داشبورد) کد
// رفرال شخصی کاربر رو همراه داره و دوستی که با لینکش بیاد روی اولین
// اشتراکش REFERRAL_DISCOUNT_PERCENT ٪ تخفیف می‌گیره (همون منطق موجود
// lib/discountValidation.ts — این‌جا هیچ پاداش تازه‌ای سمت سرور ساخته نشده).
//
// جریان: لینک `/?ref=CODE` → InviteRefCapture کد رو (فقط روی همین مرورگر،
// ۳۰ روز) نگه می‌داره → صفحه‌ی ثبت‌نام خبر می‌ده که تخفیف منتظرشه → چک‌اوت
// فیلد کد تخفیف رو خودش پر می‌کنه. اعتبار واقعی کد همیشه سمت سرور چک می‌شه.

import { useEffect, useState } from "react";
import { getAccount } from "./accountCache";
import { REFERRAL_CODE_RE } from "./referral";

const KEY = "arion:inviteRef";
const TTL_MS = 30 * 86_400_000;

function normalize(raw: string | null | undefined): string | null {
  const c = (raw ?? "").trim().toUpperCase();
  return REFERRAL_CODE_RE.test(c) ? c : null;
}

/** اگه آدرس `?ref=` داشت، نگهش می‌داره (آخرین دعوت برنده‌ست) */
export function captureInviteRef(): void {
  if (typeof window === "undefined") return;
  const code = normalize(new URLSearchParams(window.location.search).get("ref"));
  if (!code) return;
  try {
    localStorage.setItem(KEY, JSON.stringify({ code, at: Date.now() }));
  } catch {
    // ذخیره‌سازی بسته — دعوت فقط برای همین بازدید از دست می‌ره
  }
}

export function readInviteRef(): string | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as { code?: string; at?: number };
    if (!v.at || Date.now() - v.at > TTL_MS) {
      localStorage.removeItem(KEY);
      return null;
    }
    return normalize(v.code);
  } catch {
    return null;
  }
}

export function inviteUrl(code: string | null): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return code ? `${origin}/?ref=${encodeURIComponent(code)}` : `${origin}/`;
}

export type MyInvite = { code: string | null; url: string };

/** کد رفرال خود کاربر (از کش /api/account) + لینک دعوت */
export function useMyInvite(): MyInvite | null {
  const [invite, setInvite] = useState<MyInvite | null>(null);
  useEffect(() => {
    let alive = true;
    getAccount().then((acc) => {
      if (!alive) return;
      const code = normalize((acc?.user as { referralCode?: { code?: string } | null } | undefined)?.referralCode?.code);
      setInvite({ code, url: inviteUrl(code) });
    });
    return () => { alive = false; };
  }, []);
  return invite;
}
