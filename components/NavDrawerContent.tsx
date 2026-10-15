"use client";

// محتوای کشوی همبرگری (لینک‌ها، گروه‌ها، سوییچ تم). این بخش از
// NavDrawer جدا شده و lazy لود می‌شه (بعد از اولین پینت/هاور/لمس دکمه‌ی منو)،
// تا باندل ریشه فقط نوار هدر رو داشته باشه. پوسته‌ی کشو (.nav-drawer) و پرده
// توی NavDrawer می‌مونن، پس انیمیشن باز/بسته‌شدن دقیقا قبلیه.
import { useEffect, useState } from "react";
import { SmartLink as Link } from "./SmartLink";
import { ChevronDown, Lock } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { ICONS } from "./NavIcons";
import { getVisibleLinks, isGroup, isLockedModule, visibleChildren } from "./navLinks";
import type { FeatureKey } from "@/lib/featureFlags";
import { tr } from "@/lib/i18n";

type Props = {
  open: boolean;
  onClose: () => void;
  authed: boolean;
  features: Partial<Record<FeatureKey, boolean>> | null;
  activeModules: Set<string> | null;
};

export default function NavDrawerContent({ open, onClose, authed, features, activeModules }: Props) {
  const { toggle } = useTheme();
  // گروه بازشده‌ی منو (بدنسازی/روتین/منتورها) — با کلیک روی هرکدوم toggle می‌شه؛
  // همیشه با همه‌چیز بسته شروع می‌شه، هیچ‌وقت خودکار باز نمی‌شه.
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  // هر بار منو بسته می‌شه (از هر مسیری)، گروه بازشده هم ریست می‌شه.
  useEffect(() => { if (!open) setExpandedGroup(null); }, [open]);
  const visibleLinks = getVisibleLinks(features);

  return (
    <>
      <div className="nav-title">
        <button onClick={toggle} className="theme-switch" aria-label={tr("تغییر حالت نمایش", "Toggle theme")}>
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
        <button onClick={onClose} className="nav-close" aria-label={tr("بستن منو", "Close menu")}>×</button>
      </div>

      {visibleLinks.map((item) => {
        const isLocked = (m?: string) => isLockedModule(activeModules, m);
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
              {/* باز/بسته‌شدن زیرمنو عمدا CSSی خالص است (grid-template-rows: 0fr→1fr)،
                  نه انیمیشن ارتفاع framer-motion — لگ بلور کشو (globals.css). */}
              <div className={`nav-group-sub${isExpanded ? " open" : ""}`}>
                <div className="nav-group-sub-inner">
                  <div className="nav-group-children">
                    {visibleChildren(item, features).map((c) => (
                      <Link
                        key={c.href}
                        href={c.href}
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
            onClick={onClose}
            className="nav-link nav-link-icon"
          >
            <span className="nav-link-icon-svg">{ICONS[item.icon]}</span>
            <span style={{ flex: 1 }}>{item.label}</span>
            {isLocked(item.module) && <Lock size={13} className="nav-link-lock" />}
          </Link>
        );
      })}

      {/* برای کاربر لاگین‌کرده «پنل کاربری» دیگه اینجا نیست — با کلیک روی آواتار
          توی هدر باز می‌شه. مهمون هنوز آواتار نداره، پس ورود/ثبت‌نامش می‌مونه. */}
      {!authed && (
        <div style={{ borderTop: "1px solid var(--line)", marginTop: 6, paddingTop: 6 }}>
          <Link href="/auth/login" onClick={onClose} className="nav-link nav-link-icon">
            <span className="nav-link-icon-svg">{ICONS.login}</span>
            <span>{tr("ورود", "Log in")}</span>
          </Link>
          <Link href="/auth/signup" onClick={onClose} className="nav-link nav-link-icon">
            <span className="nav-link-icon-svg">{ICONS.signup}</span>
            <span>{tr("ثبت‌نام", "Sign up")}</span>
          </Link>
        </div>
      )}
    </>
  );
}
