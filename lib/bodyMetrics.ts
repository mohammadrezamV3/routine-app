// قد/وزن/سن یک منبعِ مشترکِ واحد داره (نه یک فرمِ جدا برای هر ماژول) — یک‌بار
// توی هر فرمی (کالری یا بدنسازی) وارد بشه، همون مقدار توی بقیه‌ی فرم‌ها هم
// از قبل پر می‌شه. روی همون UserSetting عمومیِ کلید/مقدار ذخیره می‌شه (بدون
// نیاز به migration جدید)، کلیدش "bodyMetrics".

export type BodyMetrics = { heightCm?: number; weightKg?: number; ageYears?: number };

const KEY = "bodyMetrics";
const WEIGHT_REMINDER_DAYS = 14;

export async function getBodyMetrics(): Promise<{ data: BodyMetrics | null; updatedAt: string | null }> {
  try {
    const res = await fetch(`/api/settings/${KEY}`);
    if (!res.ok) return { data: null, updatedAt: null };
    const json = await res.json();
    return { data: (json.value as BodyMetrics) ?? null, updatedAt: json.updatedAt ?? null };
  } catch {
    return { data: null, updatedAt: null };
  }
}

// فقط فیلدهای داده‌شده رو روی مقدارِ قبلی merge می‌کنه — مثلاً فرمِ بدنسازی
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
// یادآوری لازم نیست (چیزی برای «به‌روزکردن» وجود نداره، فرمِ اولیه خودش می‌پرسه)
export function isWeightStale(updatedAt: string | null): boolean {
  if (!updatedAt) return false;
  const ageMs = Date.now() - new Date(updatedAt).getTime();
  return ageMs > WEIGHT_REMINDER_DAYS * 24 * 60 * 60 * 1000;
}
