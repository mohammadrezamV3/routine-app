import { SETTING_KEYS } from "./userSettingKeys";
import { takePreloaded } from "./preload";
import { isInLimit } from "./numberLimits";
// قد/وزن/سن یک منبع مشترک واحد داره (نه یک فرم جدا برای هر ماژول) — یک‌بار
// توی هر فرمی (کالری یا بدنسازی) وارد بشه، همون مقدار توی بقیه‌ی فرم‌ها هم
// از قبل پر می‌شه. روی همون UserSetting عمومی کلید/مقدار ذخیره می‌شه (بدون
// نیاز به migration جدید)، کلیدش "bodyMetrics".

export type BodyMetrics = { heightCm?: number; weightKg?: number; ageYears?: number; gender?: "male" | "female" };

// نام کلید از allowlist میاد تا این دوتا نتونن از هم واگرا بشن
const KEY = SETTING_KEYS.bodyMetrics;
const WEIGHT_REMINDER_DAYS = 14;

// مقدار قدیمی خارج از بازه (قبل از اعمال سقف‌ها ذخیره شده) نه فرم‌ها رو با عدد
// عجیب پر کنه و نه ذخیره‌ی بعدی رو (که سرور سنجش می‌کنه) برای همیشه خراب کنه.
function sanitizeMetrics(m: BodyMetrics | null | undefined): BodyMetrics | null {
  if (!m || typeof m !== "object") return null;
  const out: BodyMetrics = {};
  if (isInLimit(m.heightCm, "heightCm")) out.heightCm = m.heightCm;
  if (isInLimit(m.weightKg, "weightKg")) out.weightKg = m.weightKg;
  if (isInLimit(m.ageYears, "ageYears")) out.ageYears = m.ageYears;
  if (m.gender === "male" || m.gender === "female") out.gender = m.gender;
  return out;
}

export async function getBodyMetrics(): Promise<{ data: BodyMetrics | null; updatedAt: string | null }> {
  try {
    const pre = takePreloaded(`/api/settings/${KEY}`);
    const json = pre ? await pre : await (async () => {
      const res = await fetch(`/api/settings/${KEY}`);
      return res.ok ? res.json() : null;
    })();
    if (!json) return { data: null, updatedAt: null };
    return { data: sanitizeMetrics(json.value as BodyMetrics), updatedAt: json.updatedAt ?? null };
  } catch {
    return { data: null, updatedAt: null };
  }
}

// فقط فیلدهای داده‌شده رو روی مقدار قبلی merge می‌کنه — مثلا فرم بدنسازی
// فقط قد/وزن می‌فرسته، سن رو دست‌نخورده نگه می‌داره.
export async function saveBodyMetrics(patch: BodyMetrics): Promise<void> {
  const { data } = await getBodyMetrics();
  const next: BodyMetrics = { ...data, ...patch };
  await fetch(`/api/settings/${KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value: next }),
  });
}

// هر دو هفته یک‌بار کاربر باید وزنش رو به‌روز کنه — اگه هیچ‌وقت ثبت نشده،
// یادآوری لازم نیست (چیزی برای «به‌روزکردن» وجود نداره، فرم اولیه خودش می‌پرسه)
export function isWeightStale(updatedAt: string | null): boolean {
  if (!updatedAt) return false;
  const ageMs = Date.now() - new Date(updatedAt).getTime();
  return ageMs > WEIGHT_REMINDER_DAYS * 24 * 60 * 60 * 1000;
}
