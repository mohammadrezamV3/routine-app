"use client";

import { useTheme } from "@/components/ThemeProvider";

export default function AppearanceSettingsPage() {
  const { toggle } = useTheme();

  return (
    <section>
      <h1>ظاهر و تم</h1>
      <div className="account-content-hint">حالتِ نمایشِ اپلیکیشن رو انتخاب کن</div>

      <div className="about-row" style={{ borderBottom: "none" }}>
        <span className="about-label">حالت روشن / تاریک</span>
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
      </div>
    </section>
  );
}
