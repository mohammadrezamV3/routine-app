"use client";

// محتوای کشوی همبرگری (لینک‌ها، گروه‌ها، سوییچ تم). این بخش از
// NavDrawer جدا شده و lazy لود می‌شه (بعد از اولین پینت/هاور/لمس دکمه‌ی منو)،
// تا باندل ریشه فقط نوار هدر رو داشته باشه. پوسته‌ی کشو (.nav-drawer) و پرده
// توی NavDrawer می‌مونن، پس انیمیشن باز/بسته‌شدن دقیقا قبلیه.
import { useEffect, useState } from "react";
import { SmartLink as Link } from "./SmartLink";
import { ChevronDown, Lock } from "lucide-react";
import ThemeSwitch from "./ThemeSwitch";
import { ICONS } from "./NavIcons";
import { useSection } from "./SectionProvider";
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
  // گروه‌های منو (مربی‌ها/بیشتر) از اول باز هستن (درخواست صریح)؛ کاربر با کلیک
  // روی هر گروه می‌تونه جمعش کنه و هر بار منو بسته می‌شه دوباره همه باز می‌شن.
  const [collapsed, setCollapsed] = useState<string[]>([]);
  useEffect(() => { if (!open) setCollapsed([]); }, [open]);
  const section = useSection();
  const visibleLinks = getVisibleLinks(features, section);

  return (
    <>
      <div className="nav-title">
        <ThemeSwitch />
        <button onClick={onClose} className="nav-close" aria-label={tr("بستن منو", "Close menu")}>×</button>
      </div>

      {visibleLinks.map((item) => {
        const isLocked = (m?: string) => isLockedModule(activeModules, m);
        if (isGroup(item)) {
          const isExpanded = !collapsed.includes(item.label);
          const groupLocked = item.children.every((c) => isLocked(c.module));
          return (
            <div key={item.label} className={isExpanded ? "nav-group-expanded" : undefined}>
              <a
                onClick={() => setCollapsed((c) => (c.includes(item.label) ? c.filter((x) => x !== item.label) : [...c, item.label]))}
                className="nav-link nav-link-icon"
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
