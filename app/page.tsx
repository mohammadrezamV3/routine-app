"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { LandingPage } from "@/components/LandingPage";

// تایم/استریکِ کاربرِ لاگین‌کرده دیگه این‌جا نیست — رفته توی هدر (سمت چپ
// دکمه‌ی نوتیف، HeaderStreakClock)، چون از هر صفحه‌ای باید دیده بشه، نه فقط
// اینجا. صفحه‌ی اصلی برای کاربر لاگین‌کرده چیزی برای نشون دادن نداره، پس
// مستقیم به برنامه هفتگی (مقصد واقعی بعد از ورود) هدایتش می‌کنیم.
export default function HomePage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") router.replace("/weekly");
  }, [status, router]);

  // مهم برای سرعتِ لود: این‌جا عمداً روی "loading" چیزی رو بلاک نمی‌کنیم.
  // قبلاً `status === "loading"` هم null برمی‌گردوند، و چون این کامپوننت روی
  // سرور هم با همون وضعیتِ اولیه ("loading") پری‌رندر می‌شه، یعنی HTMLِ
  // استاتیکِ صفحه‌ی اصلی عملاً *خالی* تولید می‌شد — بازدیدکننده تا وقتی که
  // (۱) کلِ باندلِ JS دانلود و پارس بشه، (۲) React هیدریت کنه، و (۳) یه فچِ
  // شبکه‌ای به /api/auth/session برگرده، یه صفحه‌ی سفید/خالی می‌دید. اگه اون
  // فچ کند یا ناموفق بود، صفحه هیچ‌وقت بالا نمی‌اومد (همون «چند بار ریلود
  // بزنم شاید بیاد»). حالا LandingPage از همون HTMLِ اولِ سرور میاد و بدونِ
  // هیچ JSای دیده می‌شه.
  // کاربرِ لاگین‌کرده یه لحظه لندینگ رو می‌بینه و بعد به /weekly می‌ره؛ این
  // معامله‌ی درستیه چون کوکیِ سشن httpOnlyه و سمتِ کلاینت اصلاً قابلِ خوندن
  // نیست، پس هیچ راهی نیست که *بدونِ* اون فچ بفهمیم کاربر لاگین کرده یا نه.
  if (status === "authenticated") {
    return null;
  }
  return <LandingPage />;
}
