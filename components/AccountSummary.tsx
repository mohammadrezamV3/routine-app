"use client";

import { useEffect, useState } from "react";
import { getAccount, getAvatarUrl, type AccountData } from "@/lib/accountCache";
import { planDisplayName } from "@/lib/subscriptionI18n";
import { toJalali, jMonthName } from "@/lib/jalali";
import { tr } from "@/lib/i18n";

// خلاصه‌ی حساب برای سرصفحه‌ی /account و سایدبار: فقط از همون کش مشترک
// getAccount()/getAvatarUrl() می‌خونه (بدون درخواست اضافه). مقدار اولیه
// null و پر شدن در effect — هیدریشن امن (قرارداد CLAUDE.md).

export type AccountSummary = {
  name: string;
  username: string | null;
  golden?: boolean;
  staff?: boolean;
  avatarUrl: string | null;
  plan: { name: string; trial: boolean; end: string | null; daysLeft: number | null } | null;
  createdAt: string | null;
};

type RawUser = {
  golden?: boolean; staff?: boolean; name: string | null; username: string | null; createdAt?: string | null;
  subscriptions?: { status: string; currentPeriodEnd?: string | null; plan: { key: string; nameFa: string } }[];
};

/** تاریخ جلالی با ارقام لاتین، مثلا «12 Farvardin 1405» / «12 فروردین 1405» */
export function formatAccountDate(iso: string): string {
  const d = new Date(iso);
  const [jy, jm, jd] = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return `${jd} ${jMonthName(jm - 1)} ${jy}`;
}

function build(data: AccountData, avatarUrl: string | null): AccountSummary | null {
  const u = data?.user as RawUser | undefined;
  if (!u) return null;
  // /api/account فقط اشتراک واقعا فعال (ACTIVE/TRIAL منقضی‌نشده) رو برمی‌گردونه
  const sub = u.subscriptions?.[0];
  const end = sub?.currentPeriodEnd ?? null;
  const daysLeft = end ? Math.max(0, Math.ceil((new Date(end).getTime() - Date.now()) / 86_400_000)) : null;
  return {
    // name از قبل «نام + نام خانوادگی»ه
    name: u.name?.trim() || tr("کاربر آریون", "Arion user"),
    username: u.username ?? null,
    golden: u.golden,
    staff: u.staff,
    avatarUrl,
    plan: sub ? { name: planDisplayName(sub.plan), trial: sub.status === "TRIAL", end, daysLeft } : null,
    createdAt: u.createdAt ?? null,
  };
}

export function useAccountSummary(): AccountSummary | null {
  const [summary, setSummary] = useState<AccountSummary | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () => {
      Promise.all([getAccount(), getAvatarUrl()]).then(([acc, avatar]) => {
        if (alive) setSummary(build(acc, avatar));
      });
    };
    load();
    // بعد از تغییر عکس یا اطلاعات پروفایل، سایدبار و سرصفحه هم تازه می‌شن
    window.addEventListener("avatar-updated", load);
    window.addEventListener("account-updated", load);
    return () => {
      alive = false;
      window.removeEventListener("avatar-updated", load);
      window.removeEventListener("account-updated", load);
    };
  }, []);

  return summary;
}
