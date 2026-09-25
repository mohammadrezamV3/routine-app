// شناسه‌ی رکوردهای محلی — پیشوند 'm' + UUID بدون خط‌تیره، هم‌قرارداد با
// بقیه‌ی ماژول‌های آفلاین موبایل (mobile/src/db). این‌طوری هیچ‌وقت با
// cuid سمت سرور (ExercisePlan.id و…) تصادم نمی‌کنه.
export function newLocalId(): string {
  return "m" + crypto.randomUUID().replace(/-/g, "");
}

export function nowIso(): string {
  return new Date().toISOString();
}
