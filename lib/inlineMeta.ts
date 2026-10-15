// داده‌ی کوچک و سراسری که سرور همراه HTML می‌فرسته (قابلیت‌های فعال + نوار تعمیر)، تا بعد از هیدریت
// دو درخواست `/api/features` و `/api/maintenance` جدا نره. فقط خوندن؛ سمت سرور InlineMeta می‌نویسه.
import type { FeatureKey } from "@/lib/featureFlags";
import type { MaintenanceState } from "@/lib/maintenance";

export const INLINE_META_ID = "__arion_meta";

export type InlineMeta = {
  features?: Record<FeatureKey, boolean>;
  maintenance?: { enabled: boolean; message: string; until: string | null };
};

let parsed: InlineMeta | null | undefined;

export function readInlineMeta(): InlineMeta | null {
  if (typeof document === "undefined") return null;
  if (parsed !== undefined) return parsed;
  try {
    const el = document.getElementById(INLINE_META_ID);
    parsed = el?.textContent ? (JSON.parse(el.textContent) as InlineMeta) : null;
  } catch {
    parsed = null;
  }
  return parsed;
}

/** هر کدوم فقط یک بار مصرف می‌شن: اولین خواندن از HTML، بعدش کش/شبکه‌ی عادی هر مصرف‌کننده */
export function takeInlineFeatures(): Record<FeatureKey, boolean> | null {
  const m = readInlineMeta();
  const v = m?.features ?? null;
  if (m) delete m.features;
  return v;
}

export function takeInlineMaintenance(): MaintenanceState | null {
  const m = readInlineMeta();
  const v = m?.maintenance ?? null;
  if (m) delete m.maintenance;
  return v;
}
