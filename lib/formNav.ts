import type { KeyboardEvent, RefObject } from "react";

// وقتی چند فیلد پشت‌سرهم توی یه فرم هست (اسم، تگ، ساعت شروع/پایان و...)،
// زدن اینتر باید مثل Tab بره فیلد بعدی، نه اینکه کاربر مجبور باشه
// دونه‌دونه روی هر فیلد کلیک کنه. فقط روی <input>هایی که مستقیم توی
// containerRef هستن اثر می‌ذاره — دکمه‌ها (مثلا دکمه‌ی تاریخ) دست‌نخورده
// می‌مونن تا رفتار پیش‌فرض اینترشون (کلیک) خراب نشه.
export function focusNextOnEnter(
  e: KeyboardEvent<HTMLElement>,
  containerRef: RefObject<HTMLElement>,
  onLastEnter?: () => void
) {
  if (e.key !== "Enter") return;
  const target = e.target as HTMLElement;
  if (target.tagName !== "INPUT") return;
  const container = containerRef.current;
  if (!container) return;
  const focusables = Array.from(container.querySelectorAll<HTMLElement>("input:not([disabled])"));
  const idx = focusables.indexOf(target);
  if (idx === -1) return;
  e.preventDefault();
  if (idx < focusables.length - 1) focusables[idx + 1].focus();
  else onLastEnter?.();
}
