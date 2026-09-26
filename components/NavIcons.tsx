// آیکون‌های خطی ساده برای هر آیتم منو — یک svg مجموعه یکدست برای همه.
// LandingPage/PlanShowcase/صفحه‌ها هم همین ست رو استفاده می‌کنن؛ NavDrawer
// برای سازگاری همچنان re-exportش می‌کنه. عمدا بدون "use client": دیتای خالص JSX.
export const ICONS: Record<string, JSX.Element> = {
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
  // آیکون اختصاصی «گزارش هفتگی» — سه میله‌ی صعودی، تا از آیکون خطی trade جدا باشه
  weeklyReport: (
    <svg viewBox="0 0 24 24" fill="none"><path d="M5 20V13M12 20V8M19 20v-6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  trade: (
    <svg viewBox="0 0 24 24" fill="none"><path d="M4 17 9.5 11l3.5 3 6-7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/><path d="M15 6.5h4.5V11" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  // آیکون اختصاصی «برنامه غذایی» (زیرمجموعه‌ی بدنسازی) — سیب، تا از
  // آیکون دمبل «برنامه تمرینی» واضح جدا باشه
  food: (
    <svg viewBox="0 0 24 24" fill="none"><path d="M12 8.3c-2.7-2.5-6.4-1.5-7.7 1.1-1.7 3.3-.4 8.3 2.5 10.4 1.3 1 2.7 1 3.9.3.6-.3 1.1-.3 1.7 0 1.2.7 2.6.7 3.9-.3 2.9-2.1 4.2-7.1 2.5-10.4-1.3-2.6-5-3.6-7.7-1.1Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M12 8.3c0-1.9.8-3.4 2.2-4.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
  ),
  // آیکون اختصاصی «ژورنال» (زیرمجموعه‌ی ترید) — دفترچه
  journal: (
    <svg viewBox="0 0 24 24" fill="none"><rect x="5" y="3.5" width="14" height="17" rx="2" stroke="currentColor" strokeWidth="1.7"/><path d="M9 8h6M9 12h6M9 16h3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
  ),
  // آیکون اختصاصی «چک‌لیست» (زیرمجموعه‌ی ترید) — چک‌باکس‌های ردیفی
  checklist: (
    <svg viewBox="0 0 24 24" fill="none"><rect x="3.5" y="4.5" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.6"/><path d="M4.3 6.5 5.2 7.4 6.8 5.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><rect x="3.5" y="14" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.6"/><path d="M4.3 16 5.2 16.9 6.8 15.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M11 6.5h9.5M11 16h9.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
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
  admin: (
    <svg viewBox="0 0 24 24" fill="none"><path d="M12 3.5 5 6.3v5.4c0 4.4 3 8.3 7 9.3 4-1 7-4.9 7-9.3V6.3l-7-2.8Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="M9 12.2 11.2 14.4 15.3 10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
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
