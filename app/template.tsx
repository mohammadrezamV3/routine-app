// ورودِ نرمِ هر صفحه بعد از ناوبری (template برخلافِ layout با هر مسیر دوباره
// mount می‌شه). عمدا فقط opacity: transform/filter روی این wrapper برای
// عناصرِ position:fixed داخلِ صفحه (مودال‌ها، دکمه‌های شناور) containing block
// می‌ساخت و حینِ انیمیشن جابه‌جاشون می‌کرد.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
