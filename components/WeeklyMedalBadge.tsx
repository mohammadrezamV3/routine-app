"use client";

// مدال سفارشی هفته‌نامه: SVG خالص (بدون ایموجی و بدون فایل تصویر). بدنه‌ی شش‌ضلعی
// فلزی با روبان، و یک آیکون خطی که از روی کلید/دسته‌ی دستاورد انتخاب می‌شه.
// گرادیان‌ها فقط داخل خود SVG و جزو طرح مدال‌ان، نه بک‌گراند عنصر.
import { useId } from "react";
import {
  Award, BookOpen, CalendarCheck, CalendarRange, CheckCheck, Clock, Crown, Dumbbell, Flame, Gem, Moon,
  Salad, Sparkles, Star, Sunrise, Target, TrendingUp, Trophy, Zap, type LucideIcon,
} from "lucide-react";
import { ACHIEVEMENT_BY_ID } from "@/lib/achievements";
import "./wl-medals.css";

export type MedalTier = "gold" | "silver" | "bronze" | "accent";

type Spec = { Icon: LucideIcon; tier: MedalTier; legend?: boolean };

// نشان‌های هفتگی (lib/weeklyAnalysis/achievements.ts)
const WEEKLY: Record<string, Spec> = {
  all_days_active: { Icon: CalendarCheck, tier: "silver" },
  streak_5: { Icon: Flame, tier: "gold" },
  beat_last_week: { Icon: TrendingUp, tier: "silver" },
  grade_a: { Icon: Award, tier: "gold" },
  perfect_day: { Icon: Sparkles, tier: "gold" },
  sleep_7h_5days: { Icon: Moon, tier: "accent" },
  no_overdue: { Icon: Clock, tier: "bronze" },
  fitness_all_sessions: { Icon: Dumbbell, tier: "silver" },
  nutrition_on_target_5: { Icon: Salad, tier: "bronze" },
  trading_checklist_week: { Icon: Target, tier: "accent" },
  learning_active: { Icon: BookOpen, tier: "bronze" },
};

// دسته‌ی اچیومنت دائمی (lib/achievements.ts) به آیکون
const CATEGORY_ICON: Record<string, LucideIcon> = {
  streak: Flame, perfect: Sparkles, ticks: CheckCheck, consistency: CalendarRange,
  sleep: Moon, body: Dumbbell, trade: Target, special: Trophy,
};
// ایموجی ذخیره‌شده در snapshot قدیمی فقط برای تشخیص دسته (چیزی نمایش داده نمی‌شه)
const EMOJI_CATEGORY: Record<string, string> = {
  "🔥": "streak", "✨": "perfect", "✅": "ticks", "📅": "consistency", "😴": "sleep", "💪": "body", "🎯": "trade", "🏆": "special",
};
const RARITY_TIER: Record<number, MedalTier> = { 1: "bronze", 2: "silver", 3: "gold", 4: "gold" };

export function medalSpec(key: string, emoji = "", source: "weekly" | "global" = "global"): Spec {
  const w = WEEKLY[key];
  if (w) return w;
  const def = ACHIEVEMENT_BY_ID[key];
  const cat = def?.category ?? EMOJI_CATEGORY[emoji] ?? "special";
  let Icon = CATEGORY_ICON[cat] ?? Trophy;
  if (key.startsWith("early_")) Icon = Sunrise;
  else if (key.startsWith("comeback")) Icon = Zap;
  else if (key.startsWith("month_")) Icon = Gem;
  else if (key.startsWith("week_")) Icon = Crown;
  else if (key.startsWith("avg")) Icon = Star;
  const rarity = def?.rarity ?? 0;
  const tier: MedalTier = rarity ? RARITY_TIER[rarity] : source === "weekly" ? "silver" : "accent";
  return { Icon, tier, legend: rarity === 4 };
}

const TIERS: Record<MedalTier, { hi: string; mid: string; lo: string; face: string; ink: string; rib: [string, string] }> = {
  gold: { hi: "#FFEFB0", mid: "#E7B53F", lo: "#946510", face: "#F6D77A", ink: "#6B4709", rib: ["#C8483A", "#8E2A22"] },
  silver: { hi: "#FAFBFD", mid: "#B9C1CB", lo: "#656E7B", face: "#DDE2E9", ink: "#444C58", rib: ["#4F7FC4", "#2F5593"] },
  bronze: { hi: "#F6D2AE", mid: "#C98245", lo: "#774018", face: "#E3A670", ink: "#5C300F", rib: ["#4C9A86", "#2D6B5B"] },
  accent: {
    hi: "color-mix(in srgb, var(--accent) 45%, #fff)", mid: "var(--accent)", lo: "color-mix(in srgb, var(--accent) 55%, #000)",
    face: "color-mix(in srgb, var(--accent) 62%, #fff)", ink: "color-mix(in srgb, var(--accent) 38%, #000)",
    rib: ["color-mix(in srgb, var(--accent) 70%, #1b1b2a)", "color-mix(in srgb, var(--accent) 45%, #0b0b14)"],
  },
};

// شش‌ضلعی به مرکز (32,30) و شعاع 25 (با stroke گرد، گوشه‌ها نرم می‌شن)
const HEX = "32,5 53.7,17.5 53.7,42.5 32,55 10.3,42.5 10.3,17.5";

export function WeeklyMedalBadge({
  achievementKey, emoji, source = "global", size = 56, className, tier, animate = false,
}: {
  achievementKey: string;
  /** فقط برای تشخیص دسته در داده‌ی قدیمی؛ نمایش داده نمی‌شه */
  emoji?: string;
  source?: "weekly" | "global";
  size?: number;
  className?: string;
  tier?: MedalTier;
  animate?: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const spec = medalSpec(achievementKey, emoji, source);
  const t = TIERS[tier ?? spec.tier];
  const { Icon } = spec;
  const h = Math.round((size * 76) / 64);
  return (
    <svg
      className={`wlm${animate ? " wlm-shine" : ""}${className ? ` ${className}` : ""}`}
      width={size} height={h} viewBox="0 0 64 76" aria-hidden="true" focusable="false"
      style={{ overflow: "visible" }}
    >
      <defs>
        <linearGradient id={`b${uid}`} x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0" stopColor={t.hi} /><stop offset="0.5" stopColor={t.mid} /><stop offset="1" stopColor={t.lo} />
        </linearGradient>
        <linearGradient id={`r${uid}`} x1="0.85" y1="1" x2="0.15" y2="0">
          <stop offset="0" stopColor={t.hi} /><stop offset="0.55" stopColor={t.mid} /><stop offset="1" stopColor={t.lo} />
        </linearGradient>
        <linearGradient id={`f${uid}`} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor={t.face} /><stop offset="1" stopColor={t.mid} />
        </linearGradient>
        <linearGradient id={`k${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={t.rib[0]} /><stop offset="1" stopColor={t.rib[1]} />
        </linearGradient>
        <linearGradient id={`s${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.75" /><stop offset="0.45" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* روبان */}
      <path d="M17 40 L31 46 L25.5 72 L20 63.5 L11.5 67 Z" fill={`url(#k${uid})`} />
      <path d="M47 40 L33 46 L38.5 72 L44 63.5 L52.5 67 Z" fill={`url(#k${uid})`} />
      <path d="M31 46 L25.5 72 L28.5 70 L33 46 Z" fill="#000" opacity="0.14" />
      {/* بدنه */}
      <polygon points={HEX} fill={`url(#b${uid})`} stroke={`url(#b${uid})`} strokeWidth="5" strokeLinejoin="round" />
      <polygon points={HEX} fill="none" stroke={`url(#r${uid})`} strokeWidth="1.6" strokeLinejoin="round" transform="translate(32 30) scale(0.9) translate(-32 -30)" />
      <circle cx="32" cy="30" r="18.5" fill={`url(#f${uid})`} />
      <circle cx="32" cy="30" r="18.5" fill="none" stroke={t.lo} strokeOpacity="0.45" strokeWidth="1" />
      <circle cx="32" cy="30" r="17.5" fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="0.8" />
      {/* آیکون: یک سایه‌ی روشن زیرش برای حالت برجسته */}
      <g color="#fff" opacity="0.55"><Icon x={19.6} y={17.4} width={26} height={26} strokeWidth={2} /></g>
      <g color={t.ink}><Icon x={19} y={16.6} width={26} height={26} strokeWidth={2} /></g>
      {/* برق */}
      <path d="M16 14 Q32 2 48 14" fill="none" stroke={`url(#s${uid})`} strokeWidth="2.2" strokeLinecap="round" opacity="0.8" />
      {spec.legend && (
        <g fill={t.hi} stroke={t.lo} strokeWidth="0.5">
          <path d="M32 -3 l1.6 3.6 3.6 1.6 -3.6 1.6 -1.6 3.6 -1.6 -3.6 -3.6 -1.6 3.6 -1.6z" transform="translate(0 1)" />
        </g>
      )}
    </svg>
  );
}
