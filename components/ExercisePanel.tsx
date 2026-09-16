"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Dumbbell } from "lucide-react";
import { AuthGate } from "./AuthGate";
import { AiExercisePlanWizard } from "./AiExercisePlanWizard";
import { ExerciseDashboard } from "./ExerciseDashboard";
import { ExercisePlan } from "@/lib/exerciseTypes";
import { takePreloaded } from "@/lib/preload";

export function ExercisePanel() {
  const { status } = useSession();
  const [plan, setPlan] = useState<ExercisePlan | null | undefined>(undefined);
  // طبقِ درخواستِ صریح، اولین ورود دیگر مستقیم داخلِ ویزاردِ ساختِ برنامه
  // نمی‌افتد — کاربر اول صفحه‌ی خالی را می‌بیند و خودش تصمیم می‌گیرد.
  const [wizardOpen, setWizardOpen] = useState(false);

  useEffect(() => {
    // status اولش "loading"ه (نه "authenticated" نه "unauthenticated") تا
    // خود NextAuth سشن رو واقعا چک کنه — قبلا این حالت هم مثل
    // unauthenticated رفتار می‌کرد و plan رو null می‌ذاشت، یعنی هر بار
    // ریلود صفحه یه لحظه فرم onboarding (به‌جای داشبورد واقعی) چشمک می‌زد،
    // تا سشن واقعا authenticated بشه و پلن واقعی فچ بشه.
    if (status === "loading") return;
    if (status !== "authenticated") { setPlan(null); return; }
    // promise پیش‌درخواست‌شده‌ی lib/preload.ts (اگه بود) — وگرنه فچ عادی
    const pre = takePreloaded("/api/exercise/plan");
    (pre ?? fetch("/api/exercise/plan").then((r) => (r.ok ? r.json() : null)))
      .then((res: any) => setPlan(res?.plan || null));
  }, [status]);

  if (status === "unauthenticated") {
    return <AuthGate message="برای استفاده از این سرویس وارد شوید" />;
  }

  if (plan === undefined) {
    return <div className="item-line is-loading" style={{ marginTop: 10 }}>در حال بارگذاری…</div>;
  }

  // ------------- بدون برنامه فعال -------------
  if (!plan) {
    if (!wizardOpen) {
      return (
        <div>
          <div className="trade-empty-state" style={{ marginTop: 10 }}>
            <Dumbbell size={32} />
            <p>هنوز برنامه‌ی تمرینی نداری</p>
          </div>
          <div className="section-note" style={{ textAlign: "center" }}>
            هر وقت خواستی، برنامه‌ات را بر اساس روزهای باشگاه، سطح، هدف و توضیحاتت می‌سازیم.
          </div>
          <div style={{ display: "flex", justifyContent: "center", marginTop: 14 }}>
            <button type="button" className="account-outline-btn" onClick={() => setWizardOpen(true)}>
              ساخت برنامه تمرینی
            </button>
          </div>
        </div>
      );
    }
    return (
      <div>
        <div className="section-note" style={{ marginTop: 10 }}>برنامه‌ات رو بر اساس روزهای باشگاه، سطح، هدف و توضیحاتت می‌سازیم</div>
        <AiExercisePlanWizard onCreated={setPlan} onClose={() => setWizardOpen(false)} />
        <div className="disclaimer-note">
          این برنامه پیشنهاد تمرینی است، نه توصیه‌ی پزشکی؛ اجرای آن بر عهده‌ی کاربر است.
        </div>
      </div>
    );
  }

  // ------------- دارای برنامه فعال -------------
  // dash-scope دقیقا مثل داشبورد روتین (app/weekly/page.tsx) لازمه — این
  // کلاسه که بک‌گراند پیش‌فرض لیکوئیدگلس سراسری <button> رو برای دکمه‌های
  // سبک‌ Tailwind داشبورد (شروع/پایان تمرین، افزودن برنامه، ...) خنثی می‌کنه.
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
