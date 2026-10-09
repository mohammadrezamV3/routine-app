"use client";

// نوار دوره‌ی آزمایشی «روتین من» — فقط وقتی کاربر هنوز در ۱۴ روز رایگانه
// (ردیف ROUTINE انقضا داره و هیچ اشتراک فعالی نداره). بعد از تموم‌شدنش
// ModuleGate خودش پیام خرید رو نشون می‌ده؛ این نوار فقط هشدار قبل از اونه.

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { getAccount } from "@/lib/accountCache";
import { ROUTINE_PLAN_KEY, ROUTINE_TRIAL_DAYS } from "@/lib/trial";
import { entryOffer } from "@/lib/planPricing";
import { usePlanPricing } from "@/lib/usePlanPricing";
import { useLiveRefresh } from "@/lib/liveSync";
import { tr, isEn } from "@/lib/i18n";

export function routineTrialDaysLeft(data: Awaited<ReturnType<typeof getAccount>>): number | null {
  const u = data?.user;
  if (!u || u.isSuperAdmin) return null;
  if (Array.isArray(u.subscriptions) && u.subscriptions.length > 0) return null;
  const row = (u.moduleAccess ?? []).find((m) => m.module === "ROUTINE");
  if (!row?.active || !row.expiresAt) return null;
  const ms = new Date(row.expiresAt).getTime() - Date.now();
  if (ms <= 0) return null;
  const days = Math.ceil(ms / 86_400_000);
  return days > ROUTINE_TRIAL_DAYS ? null : days;
}

export function RoutineTrialBanner({ className }: { className?: string }) {
  const { status } = useSession();
  const [left, setLeft] = useState<number | null>(null);
  const [v, setV] = useState(0);
  useLiveRefresh(["account"], () => setV((x) => x + 1));
  const { pricing, ready } = usePlanPricing();
  const offer = entryOffer(pricing, ROUTINE_PLAN_KEY);

  useEffect(() => {
    if (status !== "authenticated") return;
    let alive = true;
    getAccount().then((d) => { if (alive) setLeft(routineTrialDaysLeft(d)); }).catch(() => {});
    return () => { alive = false; };
  }, [status, v]);

  if (left === null) return null;
  return (
    <div className={`routine-trial-strip${left <= 3 ? " is-urgent" : ""}${className ? ` ${className}` : ""}`} role="status">
      <span>
        {isEn() ? <><b>{left}</b> {left === 1 ? "day" : "days"} left in your free My Routine trial</> : <><b>{left}</b> روز از دوره‌ی رایگان «روتین من» مونده</>}
      </span>
      <Link href={`/subscription/checkout?plan=${ROUTINE_PLAN_KEY}&duration=${offer.duration}`} prefetch={false}>
        {ready ? tr(`خرید — ${offer.label}`, `Buy: ${offer.label}`) : tr("خرید", "Buy")}
      </Link>
    </div>
  );
}
