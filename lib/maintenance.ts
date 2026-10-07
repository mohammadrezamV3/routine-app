// حالت تعمیر/اطلاع‌رسانی سراسری — منطق خالص (بدون import سروری). کلید AppSetting: `maintenance`.
// اپ هیچ‌وقت بسته نمی‌شه؛ فقط یک نوار نازک بالای صفحه نشون داده می‌شه.

export const MAINTENANCE_SETTING_KEY = "maintenance";
export const MAINTENANCE_MESSAGE_MAX = 200;

export type MaintenanceState = { enabled: boolean; message: string; until: string | null };
export const DEFAULT_MAINTENANCE: MaintenanceState = { enabled: false, message: "", until: null };

export function normalizeMaintenance(raw: unknown): MaintenanceState {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_MAINTENANCE };
  const r = raw as Record<string, unknown>;
  const message = typeof r.message === "string" ? r.message.trim().slice(0, MAINTENANCE_MESSAGE_MAX) : "";
  let until: string | null = null;
  if (typeof r.until === "string" && r.until) {
    const d = new Date(r.until);
    if (!Number.isNaN(d.getTime())) until = d.toISOString();
  }
  return { enabled: r.enabled === true, message, until };
}

export type MaintenanceParse = { ok: true; value: MaintenanceState } | { ok: false; error: string };

export function parseMaintenanceInput(raw: unknown): MaintenanceParse {
  if (!raw || typeof raw !== "object") return { ok: false, error: "ورودی نامعتبر است" };
  const r = raw as Record<string, unknown>;
  if (typeof r.enabled !== "boolean") return { ok: false, error: "وضعیت نامعتبر است" };
  const message = typeof r.message === "string" ? r.message.trim() : "";
  if (message.length > MAINTENANCE_MESSAGE_MAX) return { ok: false, error: `پیام حداکثر ${MAINTENANCE_MESSAGE_MAX} حرف` };
  if (r.enabled && !message) return { ok: false, error: "برای روشن‌کردن، پیام را بنویس" };
  let until: string | null = null;
  if (typeof r.until === "string" && r.until.trim()) {
    const d = new Date(r.until);
    if (Number.isNaN(d.getTime())) return { ok: false, error: "زمان پایان نامعتبر است" };
    until = d.toISOString();
  }
  return { ok: true, value: { enabled: r.enabled, message, until } };
}

/** آیا الان باید بنر نشون داده بشه؟ «until» گذشته یعنی خودکار خاموش */
export function isMaintenanceActive(s: MaintenanceState, now: Date = new Date()): boolean {
  if (!s.enabled || !s.message) return false;
  if (s.until && new Date(s.until).getTime() <= now.getTime()) return false;
  return true;
}

/** کلید رد بنر برای همین نشست: با عوض‌شدن پیام/زمان دوباره نشون داده می‌شه */
export function maintenanceDismissKey(s: MaintenanceState): string {
  let h = 5381;
  const src = `${s.message}|${s.until ?? ""}`;
  for (let i = 0; i < src.length; i++) h = ((h * 33) ^ src.charCodeAt(i)) >>> 0;
  return `arion:maintenanceDismissed:${h.toString(36)}`;
}
