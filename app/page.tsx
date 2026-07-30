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

  // status شروعش همیشه "loading"ه (useSession باید اول یه فچ به
  // /api/auth/session بزنه)؛ قبلاً این حالت چک نمی‌شد، پس فقط unauthenticated
  // رد می‌شد و در نتیجه هر مهمونی یه لحظه دیتای داشبوردِ کاربرِ لاگین‌کرده رو
  // می‌دید و بعد ناگهان LandingPage جایگزینش می‌شد. تا این وضعیت مشخص نشه،
  // چیزی رندر نمی‌کنیم.
  if (status === "loading" || status === "authenticated") {
    return null;
  }
  return <LandingPage />;
}
