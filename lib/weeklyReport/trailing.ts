import { ModuleKey } from "@prisma/client";
import { getUserWeekRange, WeekRange } from "./weekRange";
import { Domain, DomainMetric, computeAllDomainMetrics } from "./metrics";
import { computeDailyBreakdown, DailyBreakdownDay } from "./analysis";

export type TrailingWeek = { week: WeekRange; metrics: Record<Domain, DomainMetric>; daily: DailyBreakdownDay[] };

/**
 * N هفته‌ی متوالی قبل از fromOffset (هرکدوم شاملِ متریک‌های دامنه + شکستِ
 * روزانه). هم برای میانگینِ ۴هفته‌ی V1، هم Baselineِ V3، هم Trend/Correlationِ
 * V2 از همین یک منبعِ مشترک استفاده می‌کنن — تا محاسبه‌ی هفته دوباره‌کاری نشه.
 */
export async function computeTrailingWeeks(
  userId: string, timezone: string, fromOffset: number, count: number, activeModules: Set<ModuleKey>
): Promise<TrailingWeek[]> {
  const offsets = Array.from({ length: count }, (_, i) => fromOffset - i);
  return Promise.all(
    offsets.map(async (offset) => {
      const week = getUserWeekRange(timezone, new Date(), offset);
      const metrics = await computeAllDomainMetrics(userId, week, activeModules);
      const daily = computeDailyBreakdown(week.weekStart, metrics);
      return { week, metrics, daily };
    })
  );
}
