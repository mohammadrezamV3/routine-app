// اسلایدهای «داستان هفته» مخصوص بخش ورزش (خالص، بدون React): به‌جای متن‌های
// روتین، جلسه‌های تمرین و سوخت هفته رو نشون می‌دن. هر اسلاید بدون داده ساخته نمی‌شه.
import { tr } from "@/lib/i18n";
import type { FitWeek } from "./fitWeek";

type Base = { dur: number; label: string; fit: FitWeek };

export type FitStorySlide =
  | (Base & { id: "fitTrain" })
  | (Base & { id: "fitFuel" });

export function fitStorySlides(fit: FitWeek): FitStorySlide[] {
  const out: FitStorySlide[] = [];
  const t = fit.training;
  if (t && (t.sessions.planned + t.sessions.extra + t.sessions.rest > 0)) {
    out.push({ id: "fitTrain", dur: 6200, label: tr("تمرین هفته", "Training this week"), fit });
  }
  if (fit.fuel && fit.fuel.days.some((d) => d.kcal != null)) {
    out.push({ id: "fitFuel", dur: 6200, label: tr("سوخت هفته", "Fuel this week"), fit });
  }
  return out;
}

/** اسلایدهای عمومی که این دو اسلاید جاشون رو می‌گیرن (عددها و قوی‌ترین بخش، با خواب‌محوری) */
const REPLACED = new Set(["numbers", "domains"]);

/** اسلایدهای ورزش رو قبل از اولین «بینش/ریتم/روند/…» می‌ذاره و دوتای تکراری رو برمی‌داره */
export function withFitSlides<T extends { id: string }>(slides: T[], fit: FitWeek): (T | FitStorySlide)[] {
  const extra = fitStorySlides(fit);
  if (!extra.length) return slides;
  const base = slides.filter((s) => !REPLACED.has(s.id));
  const at = base.findIndex((s) => ["rhythm", "best", "trend", "insight", "streak", "reflection", "summary"].includes(s.id));
  const i = at < 0 ? base.length : at;
  return [...base.slice(0, i), ...extra, ...base.slice(i)];
}
