// روشن/خاموش‌کردنِ قابلیت‌ها از پنل ادمین (بدونِ دیپلوی) — تعریف‌های مشترکِ
// کلاینت و سرور. هیچ import سروری این‌جا نیست.
//
// سه حالت:
//   on     → برای همه (همچنان با گیتِ ماژولِ پولیِ خودش، اگه داشته باشه)
//   admins → فقط Owner و ادمین‌ها (برای تست قبل از انتشار)
//   off    → خاموش؛ فقط Owner می‌بینه تا بتونه تستش کنه
// enforcement واقعی سمت سروره (lib/featureFlagsServer.ts)؛ کلاینت فقط UI رو مخفی می‌کنه.

export type FeatureMode = "on" | "admins" | "off";

export const FEATURE_KEYS = ["roadmaps", "weeklyAnalysis", "tradeChat", "routineAssistant", "calorieScan"] as const;
export type FeatureKey = (typeof FEATURE_KEYS)[number];

export const FEATURE_META: Record<FeatureKey, { label: string; hint: string; default: FeatureMode }> = {
  roadmaps: { label: "رودمپ یادگیری", hint: "ساخت رودمپ با هوش مصنوعی و صفحه‌ی /roadmaps", default: "off" },
  weeklyAnalysis: { label: "آنالیز هفتگی", hint: "صفحه‌ی /analysis/weekly و مربی AI (همچنان نیازمند ماژول AI Insight)", default: "off" },
  tradeChat: { label: "چت نمادها", hint: "گفتگوی کاربران زیر چارت هر نماد", default: "on" },
  routineAssistant: { label: "دستیار هوشمند روتین", hint: "دکمه‌ی AI در صفحه‌ی روتین", default: "on" },
  calorieScan: { label: "اسکن غذا با AI", hint: "تشخیص غذا و کالری از روی عکس (تا الان «به‌زودی» بود)", default: "off" },
};

export const FEATURE_MODE_LABELS: Record<FeatureMode, string> = { on: "روشن برای همه", admins: "فقط ادمین‌ها", off: "خاموش" };

export type FeatureFlags = Record<FeatureKey, FeatureMode>;

export function defaultFlags(): FeatureFlags {
  return Object.fromEntries(FEATURE_KEYS.map((k) => [k, FEATURE_META[k].default])) as FeatureFlags;
}

export function normalizeFlags(v: unknown): FeatureFlags {
  const out = defaultFlags();
  if (v && typeof v === "object") {
    for (const k of FEATURE_KEYS) {
      const m = (v as any)[k];
      if (m === "on" || m === "admins" || m === "off") out[k] = m;
    }
  }
  return out;
}

export function featureAllowed(mode: FeatureMode, who: { isSuperAdmin: boolean; isAdmin: boolean }): boolean {
  if (who.isSuperAdmin) return true;
  if (mode === "on") return true;
  if (mode === "admins") return who.isAdmin;
  return false;
}
