"use client";

// پرچمِ دایره‌ایِ کشورها، به‌صورتِ SVG.
//
// چرا SVG و نه ایموجی: ایموجیِ پرچم روی ویندوز اصلاً رندر نمی‌شود و
// به‌جای پرچم، دو حرفِ کشور («GB») نشان داده می‌شود — یعنی برای بخشِ
// بزرگی از کاربران، کارت‌ها بی‌پرچم می‌ماندند. ضمناً ایموجی مستطیل است و
// بریدنِ دایره‌ایِ تمیز از آن ممکن نیست.
//
// طرح‌ها عمداً ساده‌شده‌اند (ستاره‌های پرچمِ آمریکا نمادین‌اند نه ۵۰تا):
// در قطرِ ۴۶ پیکسل، جزئیاتِ بیشتر فقط لکه می‌شود.

type FlagCode = "AU" | "JP" | "DE" | "GB" | "US";

/** صلیبِ بریتانیا — هم برای خودِ انگلیس و هم گوشه‌ی پرچمِ استرالیا */
function UnionJack({ w, h }: { w: number; h: number }) {
  const sx = w / 60;
  const sy = h / 40;
  return (
    <g transform={`scale(${sx} ${sy})`}>
      <rect width="60" height="40" fill="#012169" />
      {/* قطرهای سفید */}
      <path d="M0,0 L60,40 M60,0 L0,40" stroke="#FFF" strokeWidth="9" />
      {/* قطرهای قرمز، با شکستگیِ واقعیِ پرچم */}
      <path d="M0,0 L60,40" stroke="#C8102E" strokeWidth="4" />
      <path d="M60,0 L0,40" stroke="#C8102E" strokeWidth="4" />
      {/* صلیبِ عمودی/افقی */}
      <path d="M30,0 V40 M0,20 H60" stroke="#FFF" strokeWidth="14" />
      <path d="M30,0 V40 M0,20 H60" stroke="#C8102E" strokeWidth="8" />
    </g>
  );
}

const STAR = "M0,-5 L1.4,-1.6 L5,-1.5 L2.2,0.8 L3.2,4.4 L0,2.4 L-3.2,4.4 L-2.2,0.8 L-5,-1.5 L-1.4,-1.6 Z";

export function FlagCircle({ code, size = 46 }: { code: FlagCode; size?: number }) {
  const id = `flagclip-${code}`;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className="fx-flag-svg" aria-hidden="true">
      <defs>
        <clipPath id={id}><circle cx="32" cy="32" r="32" /></clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>
        {code === "JP" && (
          <>
            <rect width="64" height="64" fill="#FFFFFF" />
            <circle cx="32" cy="32" r="14" fill="#BC002D" />
          </>
        )}

        {code === "DE" && (
          <>
            <rect width="64" height="21.4" fill="#000000" />
            <rect y="21.4" width="64" height="21.2" fill="#DD0000" />
            <rect y="42.6" width="64" height="21.4" fill="#FFCE00" />
          </>
        )}

        {code === "GB" && (
          <g transform="translate(-8, 6)">
            <UnionJack w={80} h={52} />
          </g>
        )}

        {code === "US" && (
          <>
            <rect width="64" height="64" fill="#FFFFFF" />
            {Array.from({ length: 7 }, (_, i) => (
              <rect key={i} y={i * 9.14} width="64" height="4.57" fill="#B22234" />
            ))}
            <rect width="34" height="32" fill="#3C3B6E" />
            {[0, 1, 2, 3].map((row) =>
              [0, 1, 2, 3, 4].map((col) => (
                <circle key={`${row}-${col}`} r="1.5" fill="#FFFFFF"
                        cx={4 + col * 6.5 + (row % 2 ? 3.2 : 0)} cy={5 + row * 7.5} />
              ))
            )}
          </>
        )}

        {code === "AU" && (
          <>
            <rect width="64" height="64" fill="#012169" />
            <g transform="translate(0, 4)"><UnionJack w={32} h={22} /></g>
            {/* ستاره‌ی هفت‌پرِ فدرال */}
            <g transform="translate(16, 44) scale(1.5)" fill="#FFFFFF"><path d={STAR} /></g>
            {/* صلیبِ جنوبی */}
            <g fill="#FFFFFF">
              <g transform="translate(48, 14) scale(1.05)"><path d={STAR} /></g>
              <g transform="translate(41, 30) scale(1.05)"><path d={STAR} /></g>
              <g transform="translate(52, 34) scale(1.05)"><path d={STAR} /></g>
              <g transform="translate(47, 50) scale(1.05)"><path d={STAR} /></g>
              <g transform="translate(55, 24) scale(.6)"><path d={STAR} /></g>
            </g>
          </>
        )}
      </g>
    </svg>
  );
}
