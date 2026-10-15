import { getSessionFast } from "@/lib/serverSession";
import { resolveFeaturesFor } from "@/lib/featureFlagsServer";
import { getAppSetting } from "@/lib/appSettings";
import { DEFAULT_MAINTENANCE, MAINTENANCE_SETTING_KEY, isMaintenanceActive, normalizeMaintenance } from "@/lib/maintenance";
import { INLINE_META_ID } from "@/lib/inlineMeta";

/**
 * قابلیت‌های فعال (/api/features) و نوار تعمیر (/api/maintenance) رو داخل HTML می‌ذاره
 * تا کلاینت بعد از هیدریت دو رفت‌وبرگشت شبکه‌ی اضافه نزنه. هر دو از کش ۶۰ثانیه‌ای AppSetting میان
 * و همون توابع روت‌های API رو صدا می‌زنن، پس خروجی یکسانه. خطا → چیزی نمی‌ذاره و کلاینت مسیر عادی رو می‌ره.
 */
export async function InlineMeta() {
  try {
    const session = await getSessionFast();
    const userId = (session?.user as { id?: string } | undefined)?.id;
    const [features, rawMaint] = await Promise.all([
      resolveFeaturesFor(userId),
      getAppSetting<unknown>(MAINTENANCE_SETTING_KEY, DEFAULT_MAINTENANCE),
    ]);
    const state = normalizeMaintenance(rawMaint);
    const enabled = isMaintenanceActive(state);
    const meta = { features, maintenance: { enabled, message: enabled ? state.message : "", until: enabled ? state.until : null } };
    return (
      <script
        id={INLINE_META_ID}
        type="application/json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(meta).replace(/</g, "\\u003c") }}
      />
    );
  } catch {
    return null;
  }
}
