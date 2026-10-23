"use client";

// «فضای تمرین» داشبورد بخش ورزش: جای دو کارت خلاصه‌ی تمرین/کالری و صفحه‌ی قدیمی
// /exercise. یک کارت تمام‌عرض با سوییچ تمرین/تغذیه و پنل‌های واقعی داخلش.
//
// تب از ?tab= خونده می‌شه و باید به ناوبری کلاینتی منو (بدون ریمانت) زنده واکنش
// نشون بده — برای همین، مثل صفحه‌ی قدیمی /exercise، از useSearchParams واقعی استفاده
// شده (خوندن مستقیم window.location به تغییر کوئری بعد از ناوبری واکنش نشون نمی‌ده).
// عوض‌کردن تب با history.replaceState انجام می‌شه که نکست 14 با useSearchParams
// هم‌گامش می‌کنه ولی برخلاف router.replace کل صفحه‌ی سروری داشبورد رو دوباره نمی‌گیره.
// فقط تب فعال mount می‌مونه.

import { Suspense, useCallback } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { m as motion } from "framer-motion";
import { featureVisible } from "@/lib/featureFlags";
import { useFeatures } from "@/lib/useFeatures";
import { BentoCard, CardHead, Skel } from "./DashboardKit";
import { SegmentedTabs } from "./SegmentedTabs";
import { tr } from "@/lib/i18n";

type SpaceTab = "exercise" | "calorie";
type Features = ReturnType<typeof useFeatures>;

function SpaceSkeleton() {
  return (
    <div className="db-space-skel" aria-hidden="true">
      <Skel w="46%" h={14} />
      <Skel w="100%" h={88} r={16} />
      <Skel w="100%" h={140} r={16} />
    </div>
  );
}

// پنل‌ها فقط با تعامل/بعد از هیدریت لازمن؛ چانک جدا، بدون لودر بزرگ
const Panels = dynamic(() => import("./DashboardWorkoutPanels"), { ssr: false, loading: () => <SpaceSkeleton /> });

function visibleTabs(features: Features): SpaceTab[] {
  const out: SpaceTab[] = [];
  if (featureVisible(features, "exercise")) out.push("exercise");
  if (featureVisible(features, "calorie")) out.push("calorie");
  return out;
}

function SpaceCard({ tabs, active, onChange, children }: { tabs: SpaceTab[]; active: SpaceTab; onChange: (t: SpaceTab) => void; children: React.ReactNode }) {
  return (
    <BentoCard area="space" className="db-space" label={tr("فضای تمرین", "Training space")}>
      <CardHead
        icon={active === "calorie" ? "apple" : "dumbbell"}
        title={tr("فضای تمرین", "Training space")}
        extra={tabs.length > 1 ? (
          <span className="db-space-tabs">
            <SegmentedTabs<SpaceTab>
              ariaLabel={tr("تمرین یا تغذیه", "Workout or nutrition")}
              active={active}
              onChange={onChange}
              options={[
                { value: "exercise", label: tr("تمرین", "Workout") },
                { value: "calorie", label: tr("تغذیه", "Nutrition") },
              ]}
            />
          </span>
        ) : null}
      />
      {children}
    </BentoCard>
  );
}

function SpaceInner({ features }: { features: Features }) {
  const searchParams = useSearchParams();
  const tabs = visibleTabs(features);
  const requested: SpaceTab = searchParams.get("tab") === "calorie" ? "calorie" : "exercise";
  // تب خاموش (فلگ پنل ادمین) → تب دیگه
  const active: SpaceTab = tabs.includes(requested) ? requested : tabs[0] ?? "exercise";

  const change = useCallback((t: SpaceTab) => {
    try {
      const u = new URL(window.location.href);
      u.searchParams.set("tab", t);
      window.history.replaceState(window.history.state, "", u.pathname + u.search + u.hash);
    } catch {}
  }, []);

  if (!tabs.length) return null;
  return (
    <SpaceCard tabs={tabs} active={active} onChange={change}>
      <motion.div key={active} className="db-space-panel" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>
        <Panels tab={active} />
      </motion.div>
    </SpaceCard>
  );
}

export function DashboardWorkoutSpace({ features }: { features: Features }) {
  return (
    <Suspense fallback={<SpaceCard tabs={[]} active="exercise" onChange={() => {}}><SpaceSkeleton /></SpaceCard>}>
      <SpaceInner features={features} />
    </Suspense>
  );
}
