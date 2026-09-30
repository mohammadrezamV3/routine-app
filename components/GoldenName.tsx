// نامِ طلایی — برای کسی که *همه‌ی* اچیومنت‌های «روتین من» رو باز کرده
// (User.goldenSince، فقط سمتِ سرور ست می‌شه). طلاییِ دورنگ (طلای روشن ↔
// طلای عسلی) که آروم روی متن جریان داره و یک برقِ کوتاه ازش رد می‌شه — حسِ
// «زنده بودن»؛ با prefers-reduced-motion ثابت می‌مونه. هیچ بک‌گراندی به
// خودِ عنصر اضافه نمی‌شه — گرادیان فقط با background-clip:text روی حروفه.

import type { ReactNode } from "react";

export function GoldenName({ golden, children, className }: { golden?: boolean | null; children: ReactNode; className?: string }) {
  if (!golden) return <>{children}</>;
  return (
    <span className={`golden-name${className ? ` ${className}` : ""}`} title="همه‌ی اچیومنت‌ها باز شده">
      {children}
    </span>
  );
}
