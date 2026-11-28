import "./sleep-sky.css";

// آسمان رصدخانه‌ی کل صفحه‌ی /sleep (لایه‌ی ثابت پشت همه‌چیز؛ بدون JS و بدون state)
export function SleepSky() {
  return (
    <div className="slsky" aria-hidden="true">
      <div className="slsky-haze" />
      <div className="slsky-aur" />
      <div className="slsky-st s1" />
      <div className="slsky-st s2" />
      <div className="slsky-st s3" />
      <div className="slsky-glow" />
      <div className="slsky-sun" />
      <div className="slsky-shoot" />
      <div className="slsky-shoot b" />
    </div>
  );
}
