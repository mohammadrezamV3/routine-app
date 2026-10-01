"use client";

// کارهای سریع داشبورد که به‌جای رفتن به یک صفحه‌ی دیگه، همون پاپ‌آپ اصلی
// اون بخش رو همین‌جا باز می‌کنن (درخواست صریح: «صفحه‌ی جدید لود نکنه»).
// عمدا هیچ فرم تازه‌ای ساخته نشده — همون مودال‌هایی که خود /weekly،
// کالری‌شمار و ژورنال استفاده می‌کنن، با همون API و همون قواعد (مثلا
// snapshot چک‌لیست معامله سمت سرور). داشبورد خودش چیزی نمی‌نویسه.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AddProgramForm } from "./AddProgramForm";
import { CalorieAddEntryModal } from "./CalorieAddEntryModal";
import { CalorieAiScanModal } from "./CalorieAiScanModal";
import { TradeFormModal } from "./TradeFormModal";
import { getSetting } from "@/lib/storage";
import { isoLocal } from "@/lib/jalali";
import { publishChange } from "@/lib/liveSync";
import type { ScheduleOpts } from "@/lib/schedule";
import { CAL_SYSTEM_KEY, type CalSystem, type TradeAccount, type TradeTag } from "@/lib/tradeTypes";

export type DashAction = "program" | "food" | "trade";

const Ctx = createContext<((a: DashAction) => void) | null>(null);

/** null یعنی بیرون از داشبورد — دکمه‌ها به لینک معمولی برمی‌گردن */
export function useDashAction() {
  return useContext(Ctx);
}

const DEFAULT_MEAL_TYPES = [
  { key: "breakfast", label: "صبحانه" },
  { key: "lunch", label: "ناهار" },
  { key: "dinner", label: "شام" },
  { key: "snack", label: "میان‌وعده" },
];

type TradeCtx = { account: TradeAccount; tags: TradeTag[]; calSystem: CalSystem };

export function DashboardActionsProvider({
  scheduleOpts,
  onChanged,
  onNeedPage,
  children,
}: {
  scheduleOpts: ScheduleOpts;
  /** بعد از ثبت موفق — دیتای داشبورد تازه بشه */
  onChanged: () => void;
  /** وقتی پاپ‌آپ بی‌معناست (مثلا هنوز حساب معاملاتی نیست) → صفحه‌ی خود اون بخش */
  onNeedPage: (href: string) => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState<DashAction | "scan" | null>(null);
  const [mealTypes, setMealTypes] = useState(DEFAULT_MEAL_TYPES);
  const [trade, setTrade] = useState<TradeCtx | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const openAction = useCallback((a: DashAction) => {
    if (a === "food") {
      setOpen("food");
      // وعده‌های سفارشی کاربر (اگه تعریف کرده) — تا اون موقع پیش‌فرض‌ها
      fetch("/api/calorie/target")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          const mb = d?.target?.mealBreakdown as { key: string; label: string }[] | undefined;
          if (mb?.length) setMealTypes(mb.map((m) => ({ key: m.key, label: m.label })));
        })
        .catch(() => {});
      return;
    }
    if (a === "trade") {
      // معامله همیشه زیر یک حسابه؛ بدون حساب، فرم معنا نداره → ساخت حساب
      Promise.all([
        fetch("/api/trade/accounts?archived=0").then((r) => (r.ok ? r.json() : null)),
        fetch("/api/trade/tags").then((r) => (r.ok ? r.json() : null)),
        getSetting<CalSystem>(CAL_SYSTEM_KEY, "jalali").catch(() => "jalali" as CalSystem),
      ])
        .then(([acc, tg, cal]) => {
          const account = ((acc?.accounts || []) as TradeAccount[]).find((x) => !x.archived);
          if (!account) { onNeedPage("/trade/journal"); return; }
          setTrade({ account, tags: tg?.tags || [], calSystem: cal });
          setOpen("trade");
        })
        .catch(() => onNeedPage("/trade/journal"));
      return;
    }
    setOpen(a);
  }, [onNeedPage]);

  const close = useCallback(() => setOpen(null), []);
  const today = useMemo(() => isoLocal(new Date()), [open]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Ctx.Provider value={openAction}>
      {children}

      {open === "program" && (
        <AddProgramForm scheduleOpts={scheduleOpts} defaultDateIso={today} onClose={close} onChanged={onChanged} />
      )}

      {mounted && open === "food" && createPortal(
        <CalorieAddEntryModal
          date={today}
          mealTypes={mealTypes}
          onClose={close}
          onAdded={() => { publishChange("calorie"); onChanged(); }}
          onOpenAiScan={() => setOpen("scan")}
        />,
        document.body
      )}

      {mounted && open === "scan" && createPortal(
        <CalorieAiScanModal date={today} mealTypes={mealTypes} onClose={close} onLogged={() => { publishChange("calorie"); onChanged(); }} />,
        document.body
      )}

      {open === "trade" && trade && (
        <TradeFormModal
          account={trade.account}
          entry={null}
          tags={trade.tags}
          calSystem={trade.calSystem}
          onTagCreated={(t) => setTrade((p) => (p ? { ...p, tags: [...p.tags, t] } : p))}
          onClose={close}
          onSaved={() => { close(); publishChange("trade"); onChanged(); }}
        />
      )}
    </Ctx.Provider>
  );
}
