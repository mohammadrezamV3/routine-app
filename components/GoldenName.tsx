// نام طلایی — برای کسی که *همه‌ی* اچیومنت‌های «روتین من» رو باز کرده
// (User.goldenSince، فقط سمت سرور ست می‌شه). طلایی دورنگ (طلای روشن ↔
// طلای عسلی) که آروم و بی‌درز روی متن جریان داره (حلقه‌ی کاشی‌شده، هیچ
// پرش یا شروع دوباره‌ای دیده نمی‌شه — globals.css → .golden-name)؛ با
// prefers-reduced-motion ثابت می‌مونه. هیچ بک‌گراندی به
// خود عنصر اضافه نمی‌شه — گرادیان فقط با background-clip:text روی حروفه.
//
// نام بنفش سمی — Owner و ادمین‌ها (staff، فقط سمت سرور از دیتابیس) همیشه این
// سبک رو دارن و بر طلایی مقدمه (lib/nameStyle.ts → resolveNameStyle). همون
// تکنیک حلقه‌ی بی‌درز، با پالت بنفش نئون (globals.css → .toxic-name).

import type { ReactNode } from "react";
import { resolveNameStyle } from "@/lib/nameStyle";

export function GoldenName({ golden, staff, children, className }: { golden?: boolean | null; staff?: boolean | null; children: ReactNode; className?: string }) {
  const style = resolveNameStyle({ golden, staff });
  if (!style) return <>{children}</>;
  const cls = style === "toxic" ? "toxic-name" : "golden-name";
  return (
    <span className={`${cls}${className ? ` ${className}` : ""}`} title={style === "toxic" ? "تیم آریون" : "همه‌ی اچیومنت‌ها باز شده"}>
      {children}
    </span>
  );
}
