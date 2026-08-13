"use client";

import { motion } from "framer-motion";
import { MuscleKey } from "@/lib/exerciseCatalog";

// دیاگرامِ بدن (نمای جلو + پشت) — یک سیلوئتِ توپرِ بدن (سر/گردن/تنه/بازو/
// پا، نه فقط طرح‌واره‌ی خط‌دورِ قبلی) به‌عنوانِ زمینه، و روی هر ناحیه یک
// <path>ِ دست‌ساز با منحنی‌های بزیه که شکلِ واقعیِ همون عضله رو دنبال
// می‌کنه. وقتی عضله فعاله با گرادیانِ طلایی روشن می‌شه، وگرنه محو می‌مونه.

type Region = { key: MuscleKey; view: "front" | "back"; d: string };

const REGIONS: Region[] = [
  // ==================== نمای جلو ====================
  // سرشانه (دلتوئیدِ جلویی) — گنبدِ روی مفصلِ شونه
  { key: "shoulders", view: "front", d: "M9,34 Q5,25 14,21 Q23,20 26,28 Q27,36 20,41 Q11,41 9,34 Z" },
  { key: "shoulders", view: "front", d: "M111,34 Q115,25 106,21 Q97,20 94,28 Q93,36 100,41 Q109,41 111,34 Z" },
  // سینه — دو لُبِ قطره‌ای که از استخوانِ جناغ به سمتِ زیربغل خم می‌شن
  { key: "chest", view: "front", d: "M32,30 Q46,24 58,30 Q60,42 56,54 Q46,60 38,54 Q30,44 32,30 Z" },
  { key: "chest", view: "front", d: "M88,30 Q74,24 62,30 Q60,42 64,54 Q74,60 82,54 Q90,44 88,30 Z" },
  // جلوبازو — دوکیِ با پیکِ عضله در میانه
  { key: "biceps", view: "front", d: "M13,44 Q8,54 10,66 Q12,74 18,78 Q24,74 24,64 Q25,52 21,42 Q16,40 13,44 Z" },
  { key: "biceps", view: "front", d: "M107,44 Q112,54 110,66 Q108,74 102,78 Q96,74 96,64 Q95,52 99,42 Q104,40 107,44 Z" },
  // ساعد — باریک‌شونده تا مچ
  { key: "forearms", view: "front", d: "M12,80 Q9,92 12,104 Q15,108 19,106 Q21,94 20,80 Q16,77 12,80 Z" },
  { key: "forearms", view: "front", d: "M108,80 Q111,92 108,104 Q105,108 101,106 Q99,94 100,80 Q104,77 108,80 Z" },
  // شکم — سه ردیف دوتایی (سیکس‌پک) با فاصله‌ی وسط برای خطِ میانی
  { key: "abs", view: "front", d: "M48,58 h9 v11 h-9 Z" },
  { key: "abs", view: "front", d: "M63,58 h9 v11 h-9 Z" },
  { key: "abs", view: "front", d: "M48,71 h9 v11 h-9 Z" },
  { key: "abs", view: "front", d: "M63,71 h9 v11 h-9 Z" },
  { key: "abs", view: "front", d: "M48,84 h9 v10 h-9 Z" },
  { key: "abs", view: "front", d: "M63,84 h9 v10 h-9 Z" },
  // مایل‌های شکم — نوارِ زاویه‌دارِ کنارِ شکم
  { key: "obliques", view: "front", d: "M38,60 Q34,74 37,92 Q41,95 44,91 Q42,75 45,62 Q41,58 38,60 Z" },
  { key: "obliques", view: "front", d: "M82,60 Q86,74 83,92 Q79,95 76,91 Q78,75 75,62 Q79,58 82,60 Z" },
  // چهارسر ران — پهن بالا، باریکِ نزدیکِ زانو
  { key: "quads", view: "front", d: "M35,98 Q29,124 33,150 Q40,157 49,151 Q53,124 50,98 Q42,93 35,98 Z" },
  { key: "quads", view: "front", d: "M85,98 Q91,124 87,150 Q80,157 71,151 Q67,124 70,98 Q78,93 85,98 Z" },
  // ساق پا (جلو/درشت‌نی)
  { key: "calves", view: "front", d: "M37,154 Q33,172 38,190 Q43,194 48,190 Q51,172 47,154 Q42,150 37,154 Z" },
  { key: "calves", view: "front", d: "M83,154 Q87,172 82,190 Q77,194 72,190 Q69,172 73,154 Q78,150 83,154 Z" },

  // ==================== نمای پشت ====================
  // ذوزنقه‌ای (تراپز) — بادکنکِ پهن روی شونه/گردن
  { key: "traps", view: "back", d: "M60,20 Q78,24 84,34 Q70,44 60,46 Q50,44 36,34 Q42,24 60,20 Z" },
  // پشت (لات‌ها/زیربغل) — بالِ V شکل که به کمر باریک می‌شه + میانِ پشت
  { key: "back", view: "back", d: "M42,34 Q28,48 26,70 Q30,86 44,88 Q52,68 50,42 Q46,36 42,34 Z" },
  { key: "back", view: "back", d: "M78,34 Q92,48 94,70 Q90,86 76,88 Q68,68 70,42 Q74,36 78,34 Z" },
  { key: "back", view: "back", d: "M51,40 Q60,38 69,40 L69,84 Q60,88 51,84 Z" },
  // پشتِ بازو — دوکیِ نعل‌اسبی
  { key: "triceps", view: "back", d: "M13,44 Q8,54 10,66 Q12,74 18,78 Q24,74 24,64 Q25,52 21,42 Q16,40 13,44 Z" },
  { key: "triceps", view: "back", d: "M107,44 Q112,54 110,66 Q108,74 102,78 Q96,74 96,64 Q95,52 99,42 Q104,40 107,44 Z" },
  // ساعدِ پشت
  { key: "forearms", view: "back", d: "M12,80 Q9,92 12,104 Q15,108 19,106 Q21,94 20,80 Q16,77 12,80 Z" },
  { key: "forearms", view: "back", d: "M108,80 Q111,92 108,104 Q105,108 101,106 Q99,94 100,80 Q104,77 108,80 Z" },
  // باسن — دو نیم‌کره‌ی گرد و پر
  { key: "glutes", view: "back", d: "M35,90 Q31,104 37,114 Q46,119 53,111 Q54,96 48,88 Q41,85 35,90 Z" },
  { key: "glutes", view: "back", d: "M85,90 Q89,104 83,114 Q74,119 67,111 Q66,96 72,88 Q79,85 85,90 Z" },
  // همسترینگ — قطره‌ی کشیده‌ی پشتِ ران
  { key: "hamstrings", view: "back", d: "M35,116 Q31,132 36,150 Q42,155 49,150 Q52,130 48,116 Q41,112 35,116 Z" },
  { key: "hamstrings", view: "back", d: "M85,116 Q89,132 84,150 Q78,155 71,150 Q68,130 72,116 Q79,112 85,116 Z" },
  // ساق پا (پشت/دوقلو) — برجسته‌ترِ بالا
  { key: "calves", view: "back", d: "M37,154 Q32,170 38,190 Q43,194 48,190 Q52,170 47,154 Q42,149 37,154 Z" },
  { key: "calves", view: "back", d: "M83,154 Q88,170 82,190 Q77,194 72,190 Q68,170 73,154 Q78,149 83,154 Z" },
];

// سیلوئتِ توپرِ بدن (سر، گردن، تنه، بازوها، پاها) — هم‌زمینه‌ی هر دو نما،
// چون طرحِ کلیِ بدن از جلو/پشت تقریباً یکیه؛ فقط ناحیه‌های روش فرق می‌کنن.
// یه خطِ دورِ نازک (هم‌رنگِ بک‌گراندِ کارت) هم داره — دقیقاً مثلِ عکسِ
// آناتومیِ مرجع که هر عضله با یه خطِ باریک از بقیه جدا می‌شه، نه یه سیلوئتِ
// یک‌دستِ بدونِ مرز.
function BodySilhouette() {
  return (
    <g fill="var(--muted)" stroke="var(--bg)" strokeWidth="1" strokeLinejoin="round" opacity=".22">
      <circle cx="60" cy="13" r="11" />
      <path d="M52,22 L52,30 Q60,34 68,30 L68,22 Z" />
      <path d="M18,32 Q60,20 102,32 L96,58 Q91,82 84,100 Q60,112 36,100 Q29,82 24,58 Z" />
      <path d="M12,30 Q3,44 7,66 Q5,88 14,108 Q20,108 18,88 Q23,66 19,44 Q23,32 15,28 Z" />
      <path d="M108,30 Q117,44 113,66 Q115,88 106,108 Q100,108 102,88 Q97,66 101,44 Q97,32 105,28 Z" />
      <circle cx="15" cy="112" r="5" />
      <circle cx="105" cy="112" r="5" />
      <path d="M35,98 Q28,130 33,162 Q31,182 38,198 Q44,200 42,182 Q47,162 44,140 Q49,118 51,100 Q42,94 35,98 Z" />
      <path d="M85,98 Q92,130 87,162 Q89,182 82,198 Q76,200 78,182 Q73,162 76,140 Q71,118 69,100 Q78,94 85,98 Z" />
      <path d="M33,198 L45,198 L48,204 L30,204 Z" />
      <path d="M75,198 L87,198 L90,204 L72,204 Z" />
    </g>
  );
}

function DiagramView({ view, active }: { view: "front" | "back"; active: Set<MuscleKey> }) {
  return (
    <svg viewBox="0 0 120 210" width="100%" height="100%" className="max-w-[100px] sm:max-w-[124px]">
      <BodySilhouette />
      {REGIONS.filter((r) => r.view === view).map((r, i) => {
        const isActive = active.has(r.key);
        return (
          <motion.path
            key={`${view}-${r.key}-${i}`}
            d={r.d}
            stroke="var(--bg)"
            strokeWidth="1"
            strokeLinejoin="round"
            initial={false}
            animate={{ opacity: isActive ? 1 : 0.38 }}
            transition={{ duration: 0.25 }}
            fill={isActive ? "url(#muscle-diagram-grad)" : "var(--muted)"}
            style={isActive ? { filter: "drop-shadow(0 0 4px rgba(255,196,60,.7))" } : undefined}
          />
        );
      })}
    </svg>
  );
}

export function MuscleDiagram({ keys }: { keys: MuscleKey[] }) {
  const active = new Set(keys);
  const hasFront = keys.some((k) => REGIONS.some((r) => r.key === k && r.view === "front"));
  const hasBack = keys.some((k) => REGIONS.some((r) => r.key === k && r.view === "back"));

  if (!hasFront && !hasBack) return null;

  return (
    <div className="flex items-center justify-center gap-4">
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          <linearGradient id="muscle-diagram-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFE68A" />
            <stop offset="100%" stopColor="#F5A623" />
          </linearGradient>
        </defs>
      </svg>
      {hasFront && (
        <div className="flex flex-col items-center gap-1.5">
          <DiagramView view="front" active={active} />
          <span className="text-[9px] text-dash-muted sm:text-[10px]">نمای جلو</span>
        </div>
      )}
      {hasBack && (
        <div className="flex flex-col items-center gap-1.5">
          <DiagramView view="back" active={active} />
          <span className="text-[9px] text-dash-muted sm:text-[10px]">نمای پشت</span>
        </div>
      )}
    </div>
  );
}
