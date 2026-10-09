"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Dumbbell } from "lucide-react";
import { AuthGate } from "./AuthGate";
import { AiExercisePlanWizard } from "./AiExercisePlanWizard";
import { ExerciseDashboard } from "./ExerciseDashboard";
import { ExercisePlan } from "@/lib/exerciseTypes";
import { takePreloaded } from "@/lib/preload";
import { useFeature } from "@/lib/useFeatures";
import { AddExerciseProgramForm } from "./AddExerciseProgramForm";
import { tr } from "@/lib/i18n";

export function ExercisePanel() {
  const { status } = useSession();
  const [plan, setPlan] = useState<ExercisePlan | null | undefined>(undefined);
  // طبق درخواست صریح، اولین ورود دیگر مستقیم داخل ویزارد ساخت برنامه
  // نمی‌افتد — کاربر اول صفحه‌ی خالی را می‌بیند و خودش تصمیم می‌گیرد.
  const [wizardOpen, setWizardOpen] = useState(false);
  const aiOn = useFeature("aiExercisePlan") !== false;

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
    return <AuthGate message={tr("برای استفاده از این سرویس وارد شوید", "Sign in to use this service")} />;
  }

  if (plan === undefined) {
    return <div className="item-line is-loading" style={{ marginTop: 10 }}>{tr("در حال بارگذاری…", "Loading…")}</div>;
  }

  // ------------- بدون برنامه فعال -------------
  if (!plan) {
    if (!wizardOpen) {
      return (
        <div>
          <div className="trade-empty-state" style={{ marginTop: 10 }}>
            <Dumbbell size={32} />
            <p>{tr("هنوز برنامه‌ی تمرینی نداری", "You don't have a workout plan yet")}</p>
          </div>
          <div className="section-note" style={{ textAlign: "center" }}>
            {tr("هر وقت خواستی، برنامه‌ات را بر اساس روزهای باشگاه، سطح، هدف و توضیحاتت می‌سازیم.", "Whenever you are ready, we will build your plan from your gym days, level, goal and notes.")}
          </div>
          <div style={{ display: "flex", justifyContent: "center", marginTop: 14 }}>
            <button type="button" className="account-outline-btn" onClick={() => setWizardOpen(true)}>
              {tr("ساخت برنامه تمرینی", "Create a workout plan")}
            </button>
          </div>
        </div>
      );
    }
    // ساخت با AI خاموشه (فلگ aiExercisePlan) → همون فرم «وارد کردن برنامه‌ی خودم»
    if (!aiOn) {
      return <AddExerciseProgramForm onClose={() => setWizardOpen(false)} onCreated={(p) => { setPlan(p); setWizardOpen(false); }} />;
    }
    return (
      <div>
        <div className="section-note" style={{ marginTop: 10 }}>{tr("برنامه‌ات رو بر اساس روزهای باشگاه، سطح، هدف و توضیحاتت می‌سازیم", "We will build your plan from your gym days, level, goal and notes")}</div>
        <AiExercisePlanWizard onCreated={setPlan} onClose={() => setWizardOpen(false)} />
        <div className="disclaimer-note">
          {tr("این برنامه پیشنهاد تمرینی است، نه توصیه‌ی پزشکی؛ اجرای آن بر عهده‌ی کاربر است.", "This plan is a training suggestion, not medical advice; following it is the user's responsibility.")}
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
        <ExerciseDashboard plan={plan} onPlanChange={setPlan} onPlanDeleted={() => { setPlan(null); setWizardOpen(false); }} />
      </div>
      <div className="disclaimer-note">
        <span className="disclaimer-warn">{tr("توجه: ", "Note: ")}</span>
        این برنامه پیشنهاد تمرینی است، نه توصیه‌ی پزشکی؛ اجرای آن بر عهده‌ی کاربر است.
      </div>
    </div>
  );
}
