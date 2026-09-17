// رویدادهای ساختِ رودمپ — لاگِ ساختاریافته برای دیدنِ اینکه تولید چقدر
// طول کشیده، چند بار تعمیر شده، و چه‌قدر شکست می‌خورد.
//
// چرا console و نه جدولِ ErrorLog: این‌ها *خطا* نیستند، رویدادِ عادی‌اند؛
// ریختنشان در ErrorLog آن جدول را (که برای دیدنِ خرابی‌های واقعی است)
// بی‌مصرف می‌کند. هزینه/توکن هم جدا در AiUsageRecord ثبت می‌شود.
//
// هیچ‌وقت کلید، توکن، یا متنِ کاملِ ورودیِ کاربر این‌جا نمی‌آید — فقط
// شناسه‌ها و عددها.

export type RoadmapEvent =
  | "roadmap_generation_started"
  | "roadmap_generation_completed"
  | "roadmap_generation_failed"
  | "roadmap_validation_failed"
  | "roadmap_updated"
  | "roadmap_version_restored";

/** فیلدهایی که هرگز نباید لاگ شوند، حتی اگر اشتباهی پاس داده شوند. */
const REDACT = new Set(["apiKey", "api_key", "token", "authorization", "password", "secret"]);

export function logEvent(event: RoadmapEvent, data: Record<string, unknown> = {}) {
  const safe: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (REDACT.has(k)) continue;
    // موضوع/دستورِ کاربر می‌تواند طولانی باشد؛ برای لاگ فقط طولش مهم است
    safe[k] = typeof v === "string" && v.length > 120 ? `${v.slice(0, 120)}…` : v;
  }
  console.log(JSON.stringify({ event, at: new Date().toISOString(), ...safe }));
}
