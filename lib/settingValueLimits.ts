// اعتبارسنجی عددهای داخل مقدارهای تنظیمات کاربر (`/api/settings/[key]`).
//
// این روت فروشگاه کلید/مقدار JSON آزاده، پس بدون این، عددهایی مثل قد/وزن
// (کلید bodyMetrics) یا طول دوره‌ی دارو بدون هیچ سقفی ذخیره می‌شدن. فقط
// کلیدهایی که عدد دارن اینجا سنجیده می‌شن؛ بقیه دست‌نخورده رد می‌شن.
// سقف‌ها از lib/numberLimits.ts میان (تک‌منبع).

import { tr } from "./i18n";
import { checkNumber, limitError, NUMBER_LIMITS, type LimitSpec } from "./numberLimits";

export type SettingCheck = { ok: true; value: unknown } | { ok: false; error: string };

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

const BAD = (): SettingCheck => ({ ok: false, error: tr("مقدار تنظیمات نامعتبر است", "The setting value is invalid") });

function numField(obj: Record<string, unknown>, field: string, spec: LimitSpec): string | null {
  const v = obj[field];
  if (v === undefined || v === null) return null;
  const c = checkNumber(v, spec);
  if (!c.ok) return c.error;
  obj[field] = c.value;
  return null;
}

export function validateSettingNumbers(key: string, value: unknown): SettingCheck {
  switch (key) {
    case "bodyMetrics": {
      if (value === null || value === undefined) return { ok: true, value: null };
      if (!isPlainObject(value)) return BAD();
      const out: Record<string, unknown> = {};
      for (const k of ["heightCm", "weightKg", "ageYears"] as const) {
        if (value[k] !== undefined && value[k] !== null) out[k] = value[k];
      }
      // قد/سن صحیح‌ان: اعشار (175.5) گرد می‌شه
      for (const k of ["heightCm", "ageYears"]) {
        if (typeof out[k] === "number" && Number.isFinite(out[k] as number)) out[k] = Math.round(out[k] as number);
      }
      for (const [f, spec] of [["heightCm", "heightCm"], ["weightKg", "weightKg"], ["ageYears", "ageYears"]] as const) {
        const err = numField(out, f, spec);
        if (err) return { ok: false, error: err };
      }
      if (value.gender === "male" || value.gender === "female") out.gender = value.gender;
      return { ok: true, value: out };
    }
    case "sleepLatency": {
      if (value === null || value === undefined) return { ok: true, value: null };
      const c = checkNumber(value, "sleepLatency");
      return c.ok ? { ok: true, value: c.value } : { ok: false, error: c.error };
    }
    case "medications": {
      if (value === null || value === undefined) return { ok: true, value: [] };
      if (!Array.isArray(value) || value.length > 100) return BAD();
      for (const m of value) {
        if (!isPlainObject(m)) return BAD();
        const t = numField(m, "timesPerDay", "medicationTimes");
        if (t) return { ok: false, error: t };
        const d = numField(m, "durationDays", "medicationDays");
        if (d) return { ok: false, error: d };
      }
      return { ok: true, value };
    }
    case "customOccurrences": {
      if (value === null || value === undefined) return { ok: true, value: [] };
      if (!Array.isArray(value)) return BAD();
      if (value.length > NUMBER_LIMITS.routineOccurrences.max) return { ok: false, error: limitError("routineOccurrences") };
      for (const o of value) {
        if (!isPlainObject(o)) return BAD();
        if (o.jsDay !== undefined && o.jsDay !== null && !(typeof o.jsDay === "number" && Number.isInteger(o.jsDay) && o.jsDay >= 0 && o.jsDay <= 6)) return BAD();
        if (o.items !== undefined && o.items !== null) {
          if (!Array.isArray(o.items) || o.items.length > NUMBER_LIMITS.routineItems.max) return { ok: false, error: limitError("routineItems") };
        }
      }
      return { ok: true, value };
    }
    default:
      return { ok: true, value };
  }
}
