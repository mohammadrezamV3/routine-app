"use client";

import { useFeature } from "@/lib/useFeatures";
import { FeatureKey } from "@/lib/featureFlags";
import { SuperAdminGate } from "./SuperAdminGate";

// گیتِ کلاینتیِ قابلیت‌هایی که از پنل ادمین روشن/خاموش می‌شن. خاموش →
// همون صفحه‌ی قفلِ «این بخش موقتا غیرفعال است» (SuperAdminGate با locked).
// enforcement واقعی سمت سروره (requireFeature / featureBlocked).
export function FeatureGate({ feature, children }: { feature: FeatureKey; children: React.ReactNode }) {
  const on = useFeature(feature);
  if (on === null) return null;
  if (on) return <>{children}</>;
  return <SuperAdminGate forceLocked>{children}</SuperAdminGate>;
}
