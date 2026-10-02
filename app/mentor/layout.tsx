import { MentorPanelNav } from "@/components/MentorPanelNav";
import { FeaturePageGate } from "@/components/FeaturePageGate";

/**
 * قاب مشترک پنل منتور: ظرف عرض (account-shell) و نوار ناوبری پنل
 * یک بار این‌جا mount می‌شوند و با رفتن بین /mentor/* ثابت می‌مانند؛ فقط
 * محتوای صفحه (template.tsx) با ورود نرم عوض می‌شود.
 */
export default function MentorPanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <FeaturePageGate feature="mentors">
      <div className="account-shell mentor-page mentor-panel" dir="rtl">
        <MentorPanelNav />
        {children}
      </div>
    </FeaturePageGate>
  );
}
