"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// طبقِ درخواستِ صریح، «اشتراک» از پنل کاربری حذف شد — صفحه‌ی مستقلِ
// `/subscription` (که خودش پلن‌ها/قیمت‌گذاری/چک‌اوت کامل را دارد) تنها
// جای مدیریت اشتراک است. این مسیرِ قدیمی فقط برای لینک‌ها/بوکمارک‌های
// قبلی نگه داشته شده و بی‌صدا ریدایرکت می‌کند.
export default function AccountSubscriptionRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/subscription");
  }, [router]);
  return null;
}
