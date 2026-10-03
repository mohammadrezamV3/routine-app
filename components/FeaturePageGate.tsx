import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { FeatureKey } from "@/lib/featureFlags";
import { resolveFeaturesFor } from "@/lib/featureFlagsServer";

/**
 * گیت سمت سرور صفحه‌های هر بخش برای فلگ‌های پنل ادمین (/admin/features).
 * در layout همون بخش صدا زده می‌شه (مثلا app/trade/layout.tsx). اگه هیچ‌کدوم از
 * کلیدها برای این کاربر مجاز نباشه، به‌جای صفحه یک پیام «موقتا غیرفعال» با
 * لینک برگشت به صفحه‌ی اصلی همین کاربر میاد — کاربر هیچ‌وقت پشت قفل گیر نمی‌کنه.
 * enforcement داده همچنان روی خود روت‌های API ـه (featureBlocked/requireFeature).
 */
export async function FeaturePageGate({ feature, children }: { feature: FeatureKey | FeatureKey[]; children: React.ReactNode }) {
  const keys = Array.isArray(feature) ? feature : [feature];
  // سشن عمدا بیرون try: خواندن کوکی صفحه رو dynamic می‌کنه و خطای مخصوص
  // Next («Dynamic server usage») نباید این‌جا بلعیده بشه — وگرنه صفحه موقع
  // build استاتیک و بدون گیت ساخته می‌شد.
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  let map: Record<FeatureKey, boolean>;
  try {
    map = await resolveFeaturesFor(userId);
  } catch (e) {
    // خطای خواندن فلگ نباید صفحه رو بخوابونه؛ روت‌های API خودشون دوباره چک می‌کنن
    console.error("[feature-gate]", e);
    return <>{children}</>;
  }
  if (keys.some((k) => map[k])) return <>{children}</>;
  const home = !userId ? "/" : map.dashboard ? "/dashboard" : map.routine ? "/weekly" : "/account";
  return <FeatureOffNotice home={home} />;
}

export function FeatureOffNotice({ home }: { home: string }) {
  return (
    <section className="feature-off" dir="rtl">
      <span className="module-gate-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none"><rect x="4.5" y="10.5" width="15" height="10" rx="2.2" stroke="currentColor" strokeWidth="1.7" /><path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
      </span>
      <div className="module-gate-msg">این بخش موقتا غیرفعال است</div>
      <Link href={home} className="account-outline-btn feature-off-link">برگشت به صفحه اصلی</Link>
    </section>
  );
}
