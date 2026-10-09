"use client";

import { motion } from "framer-motion";
import { CalendarDays, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { tr } from "@/lib/i18n";
import "./week-plan-grid.css";

export type WeekPlanGridItem = {
  id: string;
  label: string;
  /** متن کوچک کمکی کنار اسم (مثلا ساعت برنامه) — اختیاری */
  meta?: string;
  /** وضعیت واقعی آیتم؛ فقط با آیکون جای شماره نشان داده می‌شود، نه متن */
  state?: "done" | "missed";
};

export type WeekPlanGridDay = {
  key: string;
  dayName: string;
  isToday: boolean;
  /** خط سبز زیر اسم روز (هم‌نقش focus در برنامه‌ی تمرینی) */
  subtitle?: string;
  items: WeekPlanGridItem[];
};

// «برنامه هفتگی» به همان شکل برنامه‌ی هفتگی بخش ورزش (ExerciseWeekGrid):
// یک باکس واحد؛ موبایل تک‌ستونی، sm دوستونی، lg هفت‌ستونی با جداکننده‌ی
// گرادیانی بین روزها. نسخه‌ی عمومی است تا روتین (app/weekly) هم همین
// چیدمان را با داده‌ی خودش بگیرد. طبق درخواست صریح، زیر/کنار آیتم‌ها هیچ
// متن «انجام دادی»/«وقتش گذشته» نمی‌آید — وضعیت فقط با آیکون کوچک جای
// شماره دیده می‌شود.
export function WeekPlanGrid({
  days,
  title = tr("برنامه هفتگی", "Weekly plan"),
  emptyLabel = tr("برنامه‌ای ثبت نشده", "No plans yet"),
  onItemClick,
}: {
  days: WeekPlanGridDay[];
  title?: string;
  emptyLabel?: string;
  onItemClick?: (item: WeekPlanGridItem, day: WeekPlanGridDay) => void;
}) {
  return (
    // div نه section: قانون سراسری section{border-top} خط اضافه می‌کشید.
    <div>
      <h1 className="mb-4 flex items-center justify-start gap-2 text-[20px] font-bold text-dash-text sm:mb-5 sm:text-[26px]">
        <CalendarDays className="h-[19px] w-[19px] text-dash-green sm:h-6 sm:w-6" />
        {title}
      </h1>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="rounded-dash border border-dash-border bg-dash-card p-2.5 backdrop-blur-xl sm:p-3"
      >
        <div className="grid grid-cols-1 divide-y divide-dash-border sm:grid-cols-2 sm:divide-x lg:grid-cols-7 lg:divide-x-0 lg:divide-y-0">
          {days.map((d, idx) => (
            <div
              key={d.key}
              className={cn(
                "flex flex-col p-2.5 sm:p-3 lg:min-h-[220px]",
                d.isToday && "rounded-xl bg-dash-green/[0.08] lg:rounded-none lg:bg-transparent",
                idx > 0 && "exercise-week-cell-divider"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className={cn("text-[12px] font-bold sm:text-[13px]", d.isToday ? "text-dash-green" : "text-dash-text")}>
                  {d.dayName}
                </span>
                {d.isToday && (
                  <span className="shrink-0 rounded-full bg-dash-green px-1.5 py-0.5 text-[8px] font-bold text-dash-bg sm:text-[8.5px]">
                    {tr("امروز", "Today")}
                  </span>
                )}
              </div>

              {!d.items.length ? (
                <div className="flex flex-1 items-center py-1.5 text-[10.5px] text-dash-muted lg:justify-center lg:text-center">{emptyLabel}</div>
              ) : (
                <>
                  {d.subtitle && (
                    <div className="mt-1 truncate text-[10px] font-semibold text-dash-green sm:text-[11px]" title={d.subtitle}>
                      {d.subtitle}
                    </div>
                  )}
                  <ol className="mt-2 flex flex-1 flex-col gap-1">
                    {d.items.map((it) => (
                      <li key={it.id}>
                        <button
                          type="button"
                          disabled={!onItemClick}
                          onClick={() => onItemClick?.(it, d)}
                          title={it.meta ? `${it.label} — ${it.meta}` : it.label}
                          className="flex w-full items-start gap-1.5 bg-transparent p-0 text-start text-[10px] leading-tight text-dash-text transition hover:text-dash-green disabled:cursor-default disabled:hover:text-dash-text sm:text-[11px]"
                        >
                          {it.state === "done" ? (
                            <Check aria-label={tr("انجام‌شده", "Done")} className="mt-px h-3 w-3 shrink-0 text-dash-green" strokeWidth={3} />
                          ) : it.state === "missed" ? (
                            <X aria-label={tr("انجام‌نشده", "Not done")} className="mt-px h-3 w-3 shrink-0" style={{ color: "#E05252" }} strokeWidth={3} />
                          ) : null}
                          <span className="min-w-0 flex-1 truncate">{it.label}</span>
                          {it.meta && <bdi dir="ltr" className="mono shrink-0 text-dash-muted">{it.meta}</bdi>}
                        </button>
                      </li>
                    ))}
                  </ol>
                </>
              )}
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
