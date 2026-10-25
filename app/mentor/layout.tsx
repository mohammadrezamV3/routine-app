import "@/app/_area/mentor.css";
import "@/components/coach.css";
import { FeaturePageGate } from "@/components/FeaturePageGate";
import { OnlineOnly } from "@/components/OnlineOnly";

/**
 * قاب مشترک پنل مربی (نسخه‌ی 3): گیت فلگ و آنلاین؛ ناوبری و سرتیتر داخل هر صفحه
 * با CoachPanelShell میاد. محتوای صفحه (template.tsx) با ورود نرم عوض می‌شه.
 */
export default function MentorPanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <FeaturePageGate feature="mentors">
      <div className="mentor-page mentor-panel">
        <OnlineOnly feature="mentor">{children}</OnlineOnly>
      </div>
    </FeaturePageGate>
  );
}
