"use client";

// باز کردن همان فرم ثبت معاملهی اصلی (TradeFormModal) از هاب ترید — عینا
// الگوی کارهای سریع داشبورد (DashboardActions): معامله همیشه زیر یک حسابه،
// پس اول حساب‌ها/برچسب‌ها گرفته می‌شن و بدون حساب به ساخت حساب می‌ریم. فرم
// دوم ساده‌تر عمدا ساخته نشده تا قواعد ثبت (snapshot چک‌لیست سمت سرور،
// ناقص‌بودن چک‌لیست بدون مانع) دور زده نشن. کد فرم تنبله و در زمان بیکاری
// گرم می‌شه، پس روی مسیر لود هاب نیست.

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { getSetting } from "@/lib/storage";
import { publishChange } from "@/lib/liveSync";
import { preloadWhenIdle } from "@/lib/preloadIdle";
import { CAL_SYSTEM_KEY, type CalSystem, type TradeAccount, type TradeTag } from "@/lib/tradeTypes";

const loadForm = () => import("./TradeFormModal").then((m) => m.TradeFormModal);
const TradeFormModal = dynamic(loadForm, { ssr: false });

type Ctx = { account: TradeAccount; tags: TradeTag[]; calSystem: CalSystem };

export function useLogTrade(enabled: boolean, onSaved: () => void) {
  const router = useRouter();
  const [ctx, setCtx] = useState<Ctx | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (enabled) preloadWhenIdle(loadForm); }, [enabled]);

  const open = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    void loadForm();
    try {
      const [acc, tg, cal] = await Promise.all([
        fetch("/api/trade/accounts?archived=0").then((r) => (r.ok ? r.json() : null)),
        fetch("/api/trade/tags").then((r) => (r.ok ? r.json() : null)),
        getSetting<CalSystem>(CAL_SYSTEM_KEY, "jalali").catch(() => "jalali" as CalSystem),
      ]);
      const account = ((acc?.accounts || []) as TradeAccount[]).find((x) => !x.archived);
      // بدون حساب فرم معنا نداره → ساخت حساب
      if (!account) { router.push("/trade/journal"); return; }
      setCtx({ account, tags: tg?.tags || [], calSystem: cal });
    } catch {
      router.push("/trade/journal");
    } finally {
      setBusy(false);
    }
  }, [busy, router]);

  const modal = ctx ? (
    <TradeFormModal
      account={ctx.account}
      entry={null}
      tags={ctx.tags}
      calSystem={ctx.calSystem}
      onTagCreated={(t) => setCtx((p) => (p ? { ...p, tags: [...p.tags, t] } : p))}
      onClose={() => setCtx(null)}
      onSaved={() => { setCtx(null); publishChange("trade"); onSaved(); }}
    />
  ) : null;

  return { open, busy, modal };
}
