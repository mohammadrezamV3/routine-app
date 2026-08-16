// آواتارِ پیش‌فرضِ پروفایل — جای‏گزینِ آیکونِ آدمکِ قبلی. یه گرادیانِ زنده و
// درحال‌چرخش (الهام‌گرفته از آواتارهای انیمیت‌شده‌ی هوش‌مصنوعی) با حرفِ اولِ
// اسمِ کاربر روش. تا وقتی کاربر عکسِ واقعی آپلود نکرده همین نشون داده می‌شه —
// با آپلودِ عکس (AccountPanel) این آواتار به‌طور کامل جایگزین می‌شه.
export function AgentAvatar({ name, size = 40, className = "" }: { name: string; size?: number; className?: string }) {
  const letter = (name || "").trim().charAt(0) || "؟";
  return (
    <span
      className={`agent-avatar ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <span className="agent-avatar-letter" style={{ fontSize: size * 0.4 }}>{letter}</span>
    </span>
  );
}
