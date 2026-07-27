"use client";

import { useState } from "react";
import { useTheme } from "./ThemeProvider";
import { useRouter, usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { AccountPanel } from "./AccountPanel";

// آیکون‌های خطی ساده برای هر آیتم منو — یک svg مجموعه یکدست برای همه.
const ICONS: Record<string, JSX.Element> = {
  home: (
    <svg viewBox="0 0 24 24" fill="none"><path d="M4 11.5 12 4l8 7.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/><path d="M6 10v9a1 1 0 0 0 1 1h3v-5.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V20h3a1 1 0 0 0 1-1v-9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  weekly: (
    <svg viewBox="0 0 24 24" fill="none"><rect x="3.5" y="5" width="17" height="15" rx="2.2" stroke="currentColor" strokeWidth="1.7"/><path d="M3.5 9.5h17M8 3v3.4M16 3v3.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
  ),
  roadmaps: (
    <svg viewBox="0 0 24 24" fill="none"><path d="M4 20 9 4l4 12 3-6 4 10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  exercise: (
    <svg viewBox="0 0 24 24" fill="none"><path d="M6.5 8v8M17.5 8v8M3 10v4M21 10v4M6.5 12h11" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  trade: (
    <svg viewBox="0 0 24 24" fill="none"><path d="M4 17 9.5 11l3.5 3 6-7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/><path d="M15 6.5h4.5V11" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  ideas: (
    <svg viewBox="0 0 24 24" fill="none"><path d="M9 18h6M10 21h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.6.45.9 1.02.9 1.7V16h5.4v-.5c0-.68.3-1.25.9-1.7A6 6 0 0 0 12 3Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  about: (
    <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8.2" stroke="currentColor" strokeWidth="1.7"/><path d="M12 11v5.2M12 8.3v.1" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"/></svg>
  ),
  account: (
    <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="3.3" stroke="currentColor" strokeWidth="1.7"/><path d="M5 19.5c1.3-3.3 4-5 7-5s5.7 1.7 7 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
  ),
  subscription: (
    <svg viewBox="0 0 24 24" fill="none"><rect x="3.5" y="5.5" width="17" height="13" rx="2" stroke="currentColor" strokeWidth="1.7"/><path d="M3.5 9.5h17" stroke="currentColor" strokeWidth="1.7"/><path d="M7 14h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
  ),
  logout: (
    <svg viewBox="0 0 24 24" fill="none"><path d="M15 4H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/><path d="M10 12h10m0 0-3-3m3 3-3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  login: (
    <svg viewBox="0 0 24 24" fill="none"><path d="M9 4h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/><path d="M14 12H4m0 0 3-3m-3 3 3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  signup: (
    <svg viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8" r="3.3" stroke="currentColor" strokeWidth="1.7"/><path d="M2.5 19c1.2-3.2 3.7-4.9 6.5-4.9s5.3 1.7 6.5 4.9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/><path d="M18.5 8v5.5M15.8 10.75h5.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
  ),
};

const LINKS = [
  { href: "/", label: "صفحه اصلی", icon: "home" },
  { href: "/weekly", label: "برنامه هفتگی", icon: "weekly" },
  { href: "/roadmaps", label: "رودمپ‌ها", icon: "roadmaps" },
  { href: "/exercise", label: "ورزش و کالری", icon: "exercise" },
  { href: "/trade", label: "ترید", icon: "trade" },
  { href: "/ideas", label: "ایده‌ها", icon: "ideas" },
  { href: "/about", label: "درباره من", icon: "about" },
];

export function NavDrawer() {
  const [open, setOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const { theme, toggle } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const { status } = useSession();

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <>
      <header className="app-topbar">
        <div className="topbar-actions">
          <button
            id="menuBtn"
            className={`hamburger${open ? " active" : ""}`}
            aria-label="باز کردن منو"
            onClick={() => setOpen(true)}
          >
            <span></span><span></span><span></span>
          </button>
          <button
            className="profile-btn"
            aria-label="پروفایل"
            onClick={() => setAccountOpen(true)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="3.5" />
              <path d="M4.5 20c1.4-3.6 4.4-5.5 7.5-5.5s6.1 1.9 7.5 5.5" />
            </svg>
          </button>
        </div>
      </header>

      <div className={`nav-overlay${open ? " open" : ""}`} onClick={() => setOpen(false)} />

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
            <button onClick={() => setOpen(false)} className="nav-close" aria-label="بستن منو">×</button>
          </div>

          {LINKS.map((l) => (
            <a
              key={l.href}
              onClick={() => go(l.href)}
              className={`nav-link nav-link-icon${pathname === l.href ? " active" : ""}`}
            >
              <span className="nav-link-icon-svg">{ICONS[l.icon]}</span>
              <span>{l.label}</span>
            </a>
          ))}

          <div style={{ borderTop: "1px solid var(--line)", marginTop: 6, paddingTop: 6 }}>
            <a
              onClick={() => setAccountMenuOpen((v) => !v)}
              className={`nav-link nav-link-icon${accountMenuOpen ? " active" : ""}`}
              style={{ cursor: "pointer" }}
            >
              <span className="nav-link-icon-svg">{ICONS.account}</span>
              <span>پنل کاربری</span>
            </a>

            {accountMenuOpen && (
              <div style={{ borderRight: "2px solid var(--line)", marginRight: 16, paddingRight: 4 }}>
                {status === "authenticated" ? (
                  <>
                    <a onClick={() => { setOpen(false); setAccountOpen(true); }} className="nav-link nav-link-icon" style={{ cursor: "pointer" }}>
                      <span className="nav-link-icon-svg">{ICONS.account}</span>
                      <span>پنل کاربری</span>
                    </a>
                    <a onClick={() => { setOpen(false); setAccountOpen(true); }} className="nav-link nav-link-icon" style={{ cursor: "pointer" }}>
                      <span className="nav-link-icon-svg">{ICONS.subscription}</span>
                      <span>اشتراک</span>
                    </a>
                    <a
                      onClick={() => { setOpen(false); signOut({ callbackUrl: "/" }); }}
                      className="nav-link nav-link-icon"
                      style={{ cursor: "pointer", color: "#E05252" }}
                    >
                      <span className="nav-link-icon-svg">{ICONS.logout}</span>
                      <span>خروج از حساب</span>
                    </a>
                  </>
                ) : (
                  <>
                    <a onClick={() => go("/auth/login")} className="nav-link nav-link-icon" style={{ cursor: "pointer" }}>
                      <span className="nav-link-icon-svg">{ICONS.login}</span>
                      <span>ورود</span>
                    </a>
                    <a onClick={() => go("/auth/signup")} className="nav-link nav-link-icon" style={{ cursor: "pointer" }}>
                      <span className="nav-link-icon-svg">{ICONS.signup}</span>
                      <span>ثبت‌نام</span>
                    </a>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>

      {accountOpen && <AccountPanel onClose={() => setAccountOpen(false)} />}
    </>
  );
}
