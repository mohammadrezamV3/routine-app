import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// همون کمک‌تابعِ استانداردِ shadcn/ui — ادغام کلاس‌های Tailwind با اولویتِ
// درست (آخری برنده می‌شه)، فقط برای کامپوننت‌های داشبورد (app/dashboard) استفاده می‌شه.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
