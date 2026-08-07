// آیکونِ «ساخت با هوش مصنوعی» — دو ستاره‌ی چهارپَره‌ی توخالی (بدونِ پرشدن)
// شبیهِ لوگوی جمنای: یکی بزرگ (اصلی، پایین‌راست) و یکی کوچیک (بالا‌چپ)،
// طلایی‌رنگ با گرادیانت. بدونِ انیمیشنِ داخلی — فقط با هاور/فشارِ دکمه‌ی
// والد (motion.button توی AddExerciseProgramForm) ری‌اکتیو می‌شه.
const STAR_PATH = "M12 0C12 6.6 6.6 12 0 12C6.6 12 12 17.4 12 24C12 17.4 17.4 12 24 12C17.4 12 12 6.6 12 0Z";

export function AiSparkleIcon({ size = 22 }: { size?: number }) {
  const gradId = "ai-sparkle-grad";
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      fill="none"
      className="ai-sparkle-icon"
      style={{ filter: "drop-shadow(0 0 5px rgba(255,196,60,.55))" }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFE68A" />
          <stop offset="45%" stopColor="#FFC93C" />
          <stop offset="100%" stopColor="#F5A623" />
        </linearGradient>
      </defs>
      <path d={STAR_PATH} transform="translate(8,8) scale(0.9167)" fill="none" stroke={`url(#${gradId})`} strokeWidth="1.4" strokeLinejoin="round" />
      <path d={STAR_PATH} transform="translate(-1,-1) scale(0.4583)" fill="none" stroke={`url(#${gradId})`} strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}
