import type { SectionKey } from "@/lib/sections";
import type { FeatureKey } from "@/lib/featureFlags";
import { tr } from "@/lib/i18n";

// قرارداد مشترک کلاینت و سرور برای خروجی گرفتن. هیچ import سروری این‌جا نیست.

export const EXPORT_MODULES = ["routine", "sleep", "reflections", "exercise", "calorie", "trade"] as const;
export type ExportModule = (typeof EXPORT_MODULES)[number];
export type ExportTarget = ExportModule | "all";
export type ExportFormat = "csv" | "json";

export function isExportModule(v: unknown): v is ExportModule {
  return typeof v === "string" && (EXPORT_MODULES as readonly string[]).includes(v);
}

type Meta = {
  /** کلید ModuleKey Prisma؛ null = ماژول پایه (خوندن تاریخچه‌ی روتین/خواب آزاده) */
  moduleKey: "EXERCISE" | "CALORIE" | "TRADE" | null;
  feature: FeatureKey;
  sections: SectionKey[];
};

export const EXPORT_META: Record<ExportModule, Meta> = {
  routine: { moduleKey: null, feature: "routine", sections: ["routine"] },
  reflections: { moduleKey: null, feature: "routine", sections: ["routine"] },
  sleep: { moduleKey: null, feature: "sleep", sections: ["routine", "workout"] },
  exercise: { moduleKey: "EXERCISE", feature: "exercise", sections: ["workout"] },
  calorie: { moduleKey: "CALORIE", feature: "calorie", sections: ["workout"] },
  trade: { moduleKey: "TRADE", feature: "trade", sections: ["trade"] },
};

export function exportModuleLabel(m: ExportTarget): string {
  switch (m) {
    case "routine": return tr("روتین روزانه", "Daily routine");
    case "reflections": return tr("مرور هفتگی", "Weekly reviews");
    case "sleep": return tr("خواب", "Sleep");
    case "exercise": return tr("تمرین", "Workouts");
    case "calorie": return tr("کالری و تغذیه", "Calories and nutrition");
    case "trade": return tr("معاملات", "Trades");
    case "all": return tr("همه‌ی داده‌ها", "All my data");
  }
}

/** بیشترین تعداد ردیف هر ماژول در یک خروجی */
export const EXPORT_ROW_CAP = 50_000;
