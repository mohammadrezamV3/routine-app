"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, Lock } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { ICONS } from "./NavIcons";
import { isGroup, useNavModel } from "./useNavModel";

// کشوی منوی ناوبری (overlay + پنل شیشه‌ای: سوییچ تم، لینک‌ها، ورود/ثبت‌نام
// مهمان). جدا از هدر وب تا اپ موبایل هم بتونه همین پنل رو از تب «منو» باز
// کنه. `children` یه اسلات اختیاری ته پنله (مثلا زنگوله/پروفایل در اپ) —
// وب چیزی پاس نمی‌ده، پس DOM وب دقیقا مثل قبل می‌مونه.
export function NavMenuPanel({ open, onClose, children }: { open: boolean; onClose: () => void; children?: ReactNode }) {
  // گروه بازشده‌ی منو (بدنسازی/ترید) — با کلیک روی هرکدوم toggle می‌شه؛
  // همیشه با همه‌چیز بسته شروع می‌شه، هیچ‌وقت خودکار باز نمی‌شه.
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  // هر بار منو بسته می‌شه (از هر مسیری: کلیک بیرون، دکمه‌ی ضربدر، رفتن به
  // یه لینک)، گروه بازشده هم باید ریست بشه — وگرنه دفعه‌ی بعد که منو باز
  // می‌شه، همون گروه هنوز «انتخاب‌شده»/بازشده می‌موند.
  useEffect(() => { if (!open) setExpandedGroup(null); }, [open]);
  const { toggle } = useTheme();
  const { status, items, isLocked } = useNavModel();

  // آیتم‌های منو عمداً `<Link>` واقعی‌اند، نه `<a onClick={router.push}>`.
  // دو باگِ گزارش‌شده مستقیم از همان می‌آمد: «دکمه رو می‌زنم نمی‌ره» و «خیلی
  // دیر می‌ره». با router.push هیچ prefetchی وجود ندارد، پس ضربه یعنی
  // شروعِ دانلودِ صفحه از صفر — و چون هندلر جاوااسکریپتی‌ست، اگر همان
  // لحظه ترد اصلی مشغول باشد (بسته‌شدنِ کشو، انیمیشن‌ها) کلیک عملا گم
  // می‌شود. Link مقصد را از قبل آماده می‌کند و ناوبری‌اش دستِ خودِ Next است.
  //
  // طبق درخواست صریح، منو هیچ‌وقت خودکار یه گروه رو باز/سلکت‌شده نشون نده —
  // حتی وقتی توی زیرصفحه‌ی یه گروهی (مثلا /exercise)، منو همیشه با همه‌چیز
  // بسته باز می‌شه؛ کاربر خودش هرکدوم رو خواست دستی باز می‌کنه.

  return (
    <>
      <div className={`nav-overlay${open ? " open" : ""}`} onClick={onClose} />

      <nav className={`nav-drawer${open ? " open" : ""}`}>
        <div className="nav-drawer-glass">
          <div className="nav-title">
            <button onClick={toggle} className="theme-switch" aria-label="تغییر حالت نمایش">
              <span className="ts-knob">
                <span className="ts-icon ts-sun">
                  <svg viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="4.5" fill="var(--sun)" />
                    <g stroke="var(--sun)" strokeWidth="2" strokeLinecap="round">
                      <line x1="12" y1="1.5" x2="12" y2="4" /><line x1="12" y1="20" x2="12" y2="22.5" />
                      <line x1="1.5" y1="12" x2="4" y2="12" /><line x1="20" y1="12" x2="22.5" y2="12" />
                      <line x1="4.5" y1="4.5" x2="6.2" y2="6.2" /><line x1="17.8" y1="17.8" x2="19.5" y2="19.5" />
                      <line x1="4.5" y1="19.5" x2="6.2" y2="17.8" /><line x1="17.8" y1="6.2" x2="19.5" y2="4.5" />
                    </g>
                  </svg>
                </span>
                <span className="ts-icon ts-moon">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" fill="var(--moon)" />
                  </svg>
                </span>
              </span>
            </button>
            <button onClick={onClose} className="nav-close" aria-label="بستن منو">×</button>
          </div>

          {items.map((item) => {
            if (isGroup(item)) {
              const isExpanded = expandedGroup === item.label;
              const groupLocked = item.children.every((c) => isLocked(c.module));
              return (
                <div key={item.label} className={isExpanded ? "nav-group-expanded" : undefined}>
                  <a
                    onClick={() => setExpandedGroup((g) => (g === item.label ? null : item.label))}
                    className={`nav-link nav-link-icon${isExpanded ? " nav-link-active" : ""}`}
                    style={{ cursor: "pointer" }}
                  >
                    <span className="nav-link-icon-svg">{ICONS[item.icon]}</span>
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {groupLocked && <Lock size={13} className="nav-link-lock" />}
                    <span className={`nav-group-chevron${isExpanded ? " open" : ""}`}>
                      <ChevronDown size={16} />
                    </span>
                  </a>
                  {/* باز/بسته‌شدنِ زیرمنو عمداً CSSیِ خالص است، نه انیمیشنِ
                      ارتفاعِ framer-motion. دلیلش لگی بود که کاربر گزارش کرد:
                      این کشو یک لایه‌ی backdrop-filterِ سنگین است، و
                      انیمیشنِ height توسط JS یعنی هر فریم یک نوشتنِ استایل +
                      layout + رسترِ دوباره‌ی همان بلور. با ترفندِ
                      grid-template-rows: 0fr→1fr هیچ کارِ جاوااسکریپتی در
                      هر فریم نیست، و `contain` هم نمی‌گذارد این تغییر کلِ
                      کشو را باطل کند. */}
                  <div className={`nav-group-sub${isExpanded ? " open" : ""}`}>
                    <div className="nav-group-sub-inner">
                      <div className="nav-group-children">
                        {item.children.map((c) => (
                          <Link
                            key={c.href}
                            href={c.href}
                            prefetch
                            onClick={onClose}
                            className="nav-link-sub-item"
                          >
                            <span style={{ flex: 1 }}>{c.label}</span>
                            {isLocked(c.module) && <Lock size={12} className="nav-link-lock" />}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                onClick={onClose}
                className="nav-link nav-link-icon"
              >
                <span className="nav-link-icon-svg">{ICONS[item.icon]}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {isLocked(item.module) && <Lock size={13} className="nav-link-lock" />}
              </Link>
            );
          })}

          {/* برای کاربر لاگین‌کرده «پنل کاربری» دیگه اینجا نیست — همون گزینه‌ها
              (پنل کاربری/اشتراک/خروج) با کلیک روی آواتار توی هدر باز می‌شن،
              دوباره‌کاری نداره. مهمون هنوز آواتار نداره، پس ورود/ثبت‌نامش می‌مونه. */}
          {status !== "authenticated" && (
            <div style={{ borderTop: "1px solid var(--line)", marginTop: 6, paddingTop: 6 }}>
              <Link href="/auth/login" prefetch onClick={onClose} className="nav-link nav-link-icon">
                <span className="nav-link-icon-svg">{ICONS.login}</span>
                <span>ورود</span>
              </Link>
              <Link href="/auth/signup" prefetch onClick={onClose} className="nav-link nav-link-icon">
                <span className="nav-link-icon-svg">{ICONS.signup}</span>
                <span>ثبت‌نام</span>
              </Link>
            </div>
          )}
          {children}
        </div>
      </nav>
    </>
  );
}
