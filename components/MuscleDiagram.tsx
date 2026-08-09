"use client";

import { motion } from "framer-motion";
import { MuscleKey } from "@/lib/exerciseCatalog";

// دیاگرامِ بدن (نمای جلو + پشت) — عضله‌های درگیر با گرادیانِ طلایی روشن
// می‌شن، بقیه‌ی بدن فقط طرح‌واره‌ی خاکستریه. برخلافِ نسخه‌ی قبلی (که هر
// عضله فقط یه rect/circle/ellipseِ خام بود)، اینجا هر ناحیه یک <path>ِ
// دست‌ساز با منحنی‌های بزیه که واقعاً شکلِ تشریحیِ همون عضله رو دنبال
// می‌کنه (سینه‌ی قطره‌ای، شکمِ ۳×۲ خط‌دار، جلوبازوی دوکی، ذوزنقه‌ای
// لوزی‌شکل، باسنِ گرد، همسترینگِ کشیده، ...).

type Region = { key: MuscleKey; view: "front" | "back"; d: string };

const REGIONS: Region[] = [
  // ==================== نمای جلو ====================
  // سرشانه (دلتوئیدِ جلویی) — دو گنبدِ روی سرِ بازو
  { key: "shoulders", view: "front", d: "M14,32 Q12,20 26,18 Q34,19 34,30 Q30,40 20,40 Q13,38 14,32 Z" },
  { key: "shoulders", view: "front", d: "M106,32 Q108,20 94,18 Q86,19 86,30 Q90,40 100,40 Q107,38 106,32 Z" },
  // سینه — دو قطره‌ی خمیده به سمتِ زیربغل
  { key: "chest", view: "front", d: "M34,32 Q52,26 58,34 L58,58 Q46,64 36,56 Q30,46 34,32 Z" },
  { key: "chest", view: "front", d: "M86,32 Q68,26 62,34 L62,58 Q74,64 84,56 Q90,46 86,32 Z" },
  // جلوبازو — دوکیِ باریک‌شونده به سمتِ آرنج
  { key: "biceps", view: "front", d: "M15,42 Q13,58 17,72 Q22,76 27,72 Q29,58 27,42 Q21,38 15,42 Z" },
  { key: "biceps", view: "front", d: "M105,42 Q107,58 103,72 Q98,76 93,72 Q91,58 93,42 Q99,38 105,42 Z" },
  // ساعد — دوکیِ باریک‌تر تا مچ
  { key: "forearms", view: "front", d: "M16,74 Q14,90 17,104 Q20,107 24,104 Q26,90 25,74 Q20,71 16,74 Z" },
  { key: "forearms", view: "front", d: "M104,74 Q106,90 103,104 Q100,107 96,104 Q94,90 95,74 Q100,71 104,74 Z" },
  // شکم — سه ردیف دو‌تایی (سیکس‌پک) به‌جای یک بلوکِ خام
  { key: "abs", view: "front", d: "M49,60 h9 v11 h-9 Z" },
  { key: "abs", view: "front", d: "M62,60 h9 v11 h-9 Z" },
  { key: "abs", view: "front", d: "M49,73 h9 v11 h-9 Z" },
  { key: "abs", view: "front", d: "M62,73 h9 v11 h-9 Z" },
  { key: "abs", view: "front", d: "M49,86 h9 v10 h-9 Z" },
  { key: "abs", view: "front", d: "M62,86 h9 v10 h-9 Z" },
  // مایل‌های شکم — نواری زاویه‌دارِ کنارِ شکم
  { key: "obliques", view: "front", d: "M38,62 Q34,76 38,94 Q42,96 45,92 Q42,76 44,64 Q41,60 38,62 Z" },
  { key: "obliques", view: "front", d: "M82,62 Q86,76 82,94 Q78,96 75,92 Q78,76 76,64 Q79,60 82,62 Z" },
  // چهارسر ران — قطره‌ی پهن بالا، باریک نزدیکِ زانو
  { key: "quads", view: "front", d: "M36,100 Q32,124 36,146 Q44,152 52,146 Q55,122 52,100 Q44,96 36,100 Z" },
  { key: "quads", view: "front", d: "M84,100 Q88,124 84,146 Q76,152 68,146 Q65,122 68,100 Q76,96 84,100 Z" },
  // ساق پا (جلو/درشت‌نی) — دوکیِ بلند
  { key: "calves", view: "front", d: "M38,150 Q35,168 39,186 Q44,190 49,186 Q51,168 49,150 Q44,146 38,150 Z" },
  { key: "calves", view: "front", d: "M82,150 Q85,168 81,186 Q76,190 71,186 Q69,168 71,150 Q76,146 82,150 Z" },

  // ==================== نمای پشت ====================
  // ذوزنقه‌ای (تراپز) — لوزیِ پهن روی شونه/گردن
  { key: "traps", view: "back", d: "M60,18 L82,32 L60,50 L38,32 Z" },
  // پشت (لات‌ها) — بالِ V شکل + میانِ پشت
  { key: "back", view: "back", d: "M46,34 Q34,50 32,72 Q40,86 52,80 Q56,58 54,36 Q50,33 46,34 Z" },
  { key: "back", view: "back", d: "M74,34 Q86,50 88,72 Q80,86 68,80 Q64,58 66,36 Q70,33 74,34 Z" },
  { key: "back", view: "back", d: "M52,38 h16 v42 h-16 Z" },
  // پشتِ بازو — دوکیِ پشتِ بازو، مشابهِ جلوبازو ولی کمی متفاوت
  { key: "triceps", view: "back", d: "M15,42 Q13,58 17,72 Q22,76 27,72 Q29,58 27,42 Q21,38 15,42 Z" },
  { key: "triceps", view: "back", d: "M105,42 Q107,58 103,72 Q98,76 93,72 Q91,58 93,42 Q99,38 105,42 Z" },
  // ساعد پشت
  { key: "forearms", view: "back", d: "M16,74 Q14,90 17,104 Q20,107 24,104 Q26,90 25,74 Q20,71 16,74 Z" },
  { key: "forearms", view: "back", d: "M104,74 Q106,90 103,104 Q100,107 96,104 Q94,90 95,74 Q100,71 104,74 Z" },
  // باسن — دو نیم‌دایره‌ی گرد
  { key: "glutes", view: "back", d: "M38,96 Q36,112 44,118 Q52,120 54,110 Q54,98 48,94 Q42,92 38,96 Z" },
  { key: "glutes", view: "back", d: "M82,96 Q84,112 76,118 Q68,120 66,110 Q66,98 72,94 Q78,92 82,96 Z" },
  // همسترینگ — قطره‌ی کشیده‌ی پشتِ ران
  { key: "hamstrings", view: "back", d: "M37,120 Q34,136 38,152 Q44,156 51,152 Q53,134 50,120 Q44,116 37,120 Z" },
  { key: "hamstrings", view: "back", d: "M83,120 Q86,136 82,152 Q76,156 69,152 Q67,134 70,120 Q76,116 83,120 Z" },
  // ساق پا (پشت/دوقلو) — برجسته‌ترِ وسط
  { key: "calves", view: "back", d: "M38,154 Q34,172 39,188 Q44,192 49,188 Q52,170 49,154 Q44,150 38,154 Z" },
  { key: "calves", view: "back", d: "M82,154 Q86,172 81,188 Q76,192 71,188 Q68,170 71,154 Q76,150 82,154 Z" },
];

function BodyOutline() {
  return (
    <g fill="none" stroke="var(--line)" strokeWidth="1.5" strokeLinejoin="round">
      {/* سر */}
      <circle cx="60" cy="12" r="10" />
      {/* گردن */}
      <path d="M53,20 L53,28 M67,20 L67,28" />
      {/* تنه — شونه‌ی پهن، کمرِ باریک‌تر، لگنِ کمی پهن‌تر */}
      <path d="M28,34 Q60,24 92,34 L86,98 Q60,106 34,98 Z" />
      {/* بازو تا مچ */}
      <path d="M24,36 Q10,60 16,106" />
      <path d="M96,36 Q110,60 104,106" />
      {/* دست (کف) */}
      <circle cx="15" cy="112" r="5" />
      <circle cx="105" cy="112" r="5" />
      {/* پا — از لگن تا مچِ پا */}
      <path d="M40,100 Q33,148 39,192" />
      <path d="M52,100 Q48,148 49,192" />
      <path d="M68,100 Q72,148 71,192" />
      <path d="M80,100 Q87,148 81,192" />
      {/* پا (کف) */}
      <path d="M35,192 L44,192 L44,197 L33,197 Z" />
      <path d="M76,192 L85,192 L85,197 L74,197 Z" />
    </g>
  );
}

function DiagramView({ view, active }: { view: "front" | "back"; active: Set<MuscleKey> }) {
  return (
    <svg viewBox="0 0 120 205" width="100%" height="100%" className="max-w-[92px] sm:max-w-[110px]">
      <BodyOutline />
      {REGIONS.filter((r) => r.view === view).map((r, i) => {
        const isActive = active.has(r.key);
        return (
          <motion.path
            key={`${view}-${r.key}-${i}`}
            d={r.d}
            initial={false}
            animate={{ opacity: isActive ? 1 : 0.16 }}
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
