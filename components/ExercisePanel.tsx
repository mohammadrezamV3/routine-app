"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { AuthGate } from "./AuthGate";
import { AiExercisePlanWizard } from "./AiExercisePlanWizard";
import { ExerciseDashboard } from "./ExerciseDashboard";
import { ExercisePlan } from "@/lib/exerciseTypes";

export function ExercisePanel() {
  const { status } = useSession();
  const [plan, setPlan] = useState<ExercisePlan | null | undefined>(undefined);

  useEffect(() => {
    // status اولش "loading"ه (نه "authenticated" نه "unauthenticated") تا
    // خودِ NextAuth سشن رو واقعاً چک کنه — قبلاً این حالت هم مثلِ
    // unauthenticated رفتار می‌کرد و plan رو null می‌ذاشت، یعنی هر بار
    // ریلودِ صفحه یه لحظه فرمِ onboarding (به‌جای داشبوردِ واقعی) چشمک می‌زد،
    // تا سشن واقعاً authenticated بشه و پلنِ واقعی فچ بشه.
    if (status === "loading") return;
    if (status !== "authenticated") { setPlan(null); return; }
    fetch("/api/exercise/plan").then((r) => r.json()).then((res) => setPlan(res.plan || null));
  }, [status]);

  if (status === "unauthenticated") {
    return <AuthGate message="برای استفاده از این سرویس وارد شوید" />;
  }

  if (plan === undefined) {
    return <div className="item-line" style={{ marginTop: 10 }}>در حال بارگذاری…</div>;
  }

  // ------------- بدون برنامه فعال: onboarding -------------
  if (!plan) {
    return (
      <div>
        <div className="section-note" style={{ marginTop: 10 }}>برنامه‌ات رو بر اساس روزهای باشگاه، سطح، هدف و توضیحاتت می‌سازیم</div>
        <AiExercisePlanWizard onCreated={setPlan} />
        <div className="disclaimer-note">
          این برنامه پیشنهاد تمرینی است، نه توصیه‌ی پزشکی؛ اجرای آن بر عهده‌ی کاربر است.
        </div>
      </div>
    );
  }

  // ------------- دارای برنامه فعال -------------
  // dash-scope دقیقاً مثلِ داشبوردِ روتین (app/weekly/page.tsx) لازمه — این
  // کلاسه که بک‌گراندِ پیش‌فرضِ لیکوئیدگلسِ سراسریِ <button> رو برای دکمه‌های
  // سبک‌ِ Tailwindِ داشبورد (شروع/پایان تمرین، افزودن برنامه، ...) خنثی می‌کنه.
  return (
    <div>
      <div className="dash-scope">
        <ExerciseDashboard plan={plan} onPlanChange={setPlan} />
      </div>
      <div className="disclaimer-note">
        <span className="disclaimer-warn">توجه: </span>
        این برنامه پیشنهاد تمرینی است، نه توصیه‌ی پزشکی؛ اجرای آن بر عهده‌ی کاربر است.
      </div>
    </div>
  );
}
