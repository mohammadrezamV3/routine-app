"use client";

// قطعه‌های کوچک هاب ترید: کارت پایه، کاشی KPI، شمارش معکوس خبر، اسکلت،
// کارت ساعت فارکس و پیش‌نمایش تزئینی کندل. استایل: بلوک th-* در app/_area/trade.css.
// رنگ‌ها فقط توکن‌اند (--accent، --pnl-*، --box-*)، پس با تم‌های رنگی کاربر جور می‌شن.

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, Clock } from "lucide-react";
import { SmartLink as Link } from "@/components/SmartLink";
import { GradientRing, RING_BLUE } from "@/components/GradientRing";
import { countdownParts, sessionTimeline } from "@/lib/tradeHubCompute";
import { isEn, tr } from "@/lib/i18n";

export function Skel({ w = "100%", h = 12, className = "" }: { w?: number | string; h?: number; className?: string }) {
  return <span className={`th-skel ${className}`} style={{ width: w, height: h }} aria-hidden="true" />;
}

/** ساعت زنده (به‌روز هر intervalMs)؛ تا بعد از mount null تا هیدریشن بهم نخوره */
export function useNow(intervalMs: number): Date | null {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

// ── کارت پایه ────────────────────────────────────────────────
// دسکتاپ: کارت با سرتیتر (آیکون، عنوان، توضیح ثابت) + بدنه‌ی غنی.
// موبایل (کمتر از 768): همین کارت یک ردیف لیست می‌شه — آیکون، عنوان، زیرنویس
// زنده‌ی یک‌خطی و شوران (بدنه و توضیح ثابت پنهان‌اند). CSS در trade.css.
export function HubCard({ href, icon, title, desc, sub, end, more, body, span, className = "" }: {
  href: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  /** زیرنویس زنده‌ی موبایل */
  sub: React.ReactNode;
  /** نشانک کنار شوران موبایل (مثلا نقطه‌ی اهمیت رویداد) */
  end?: React.ReactNode;
  /** لینک «باز کردن» دسکتاپ در سرتیتر */
  more?: string;
  body?: React.ReactNode;
  span?: 2 | 3;
  className?: string;
}) {
  return (
    <Link href={href} prefetch className={`th-card trade-surface${span ? ` th-span-${span}` : ""}${className ? ` ${className}` : ""}`}>
      <div className="th-head">
        <span className="th-chip" aria-hidden="true">{icon}</span>
        <span className="th-titles">
          <span className="th-title">{title}</span>
          <span className="th-desc">{desc}</span>
          <span className="th-sub">{sub}</span>
        </span>
        {more && <span className="th-more">{more}<ChevronLeft size={14} className="dir-flip" /></span>}
        <span className="th-end" aria-hidden="true">{end}<ChevronLeft size={16} className="dir-flip" /></span>
      </div>
      {body}
    </Link>
  );
}

// ── KPI ──────────────────────────────────────────────────────
export function Kpi({ label, labelMob, value, valueMob, sub, tone, ring, alert, loading, wide }: {
  label: React.ReactNode;
  /** برچسب کوتاه‌تر موبایل (اختیاری) */
  labelMob?: React.ReactNode;
  value: React.ReactNode;
  valueMob?: React.ReactNode;
  sub?: React.ReactNode;
  tone?: "win" | "loss";
  /** درصد 0..100 → حلقه‌ی کوچک کنار عدد */
  ring?: number | null;
  alert?: boolean;
  loading?: boolean;
  wide?: boolean;
}) {
  return (
    <div className={`th-kpi trade-surface${alert ? " is-alert" : ""}${wide ? " is-wide" : ""}`}>
      {loading ? (
        <>
          <Skel w="55%" h={11} />
          <Skel w="70%" h={26} className="th-skel-kv" />
          <Skel w="45%" h={11} className="th-skel-ks" />
        </>
      ) : (
        <>
          <span className="th-kl">
            {labelMob ? <><span className="th-d">{label}</span><span className="th-m">{labelMob}</span></> : label}
          </span>
          <div className="th-kv-row">
            <span className={`th-kv${tone ? ` is-${tone}` : ""}`}>
              {valueMob !== undefined ? <><span className="th-d">{value}</span><span className="th-m">{valueMob}</span></> : value}
            </span>
            {typeof ring === "number" && (
              <GradientRing value={Math.max(0, Math.min(1, ring / 100))} size={36} stroke={4.5} grad={RING_BLUE} className="th-kring" />
            )}
          </div>
          {sub !== undefined && <span className="th-ks">{sub}</span>}
        </>
      )}
    </div>
  );
}

/** شمارش معکوس زنده (هر ثانیه، فقط همین گره دوباره رندر می‌شه)؛ در صفر onExpire یک بار صدا زده می‌شه */
export function NewsCountdown({ iso, onExpire }: { iso: string; onExpire: () => void }) {
  const [t, setT] = useState<number | null>(null);
  const fired = useRef<string | null>(null);
  useEffect(() => {
    setT(Date.now());
    const id = setInterval(() => setT(Date.now()), 1000);
    return () => clearInterval(id);
  }, [iso]);
  const en = isEn();
  const left = t === null ? null : Date.parse(iso) - t;
  useEffect(() => {
    if (left !== null && left <= 0 && fired.current !== iso) { fired.current = iso; onExpire(); }
  }, [left, iso, onExpire]);
  if (left === null) return <bdi dir="ltr">{"--:--:--"}</bdi>;
  // کمتر از 24 ساعت: ساعت‌شمار چپ‌به‌راست؛ بیشتر: «روز و ساعت» با هر عدد در جزیره‌ی bidi
  // تا ترتیب کلمه و عدد در RTL بهم نخوره
  const render = (compact: boolean) => {
    const p = countdownParts(left, compact);
    if (p.kind === "clock") return <bdi dir="ltr">{p.text}</bdi>;
    return en
      ? <><bdi dir="ltr">{p.days}d</bdi> <bdi dir="ltr">{p.hours}h</bdi></>
      : <><bdi dir="ltr">{p.days}</bdi> {"روز و"} <bdi dir="ltr">{p.hours}</bdi> {"ساعت"}</>;
  };
  return <><span className="th-d">{render(false)}</span><span className="th-m">{render(true)}</span></>;
}

// ── ساعت فارکس ───────────────────────────────────────────────
// نوار هر جلسه روی محور 24 ساعته‌ی وقت محلی کاربر + نشانگر «الان». محاسبه
// با DST درست (lib/forexSessions.ts) و کاملا کلاینتی، بدون درخواست.
export function ClockCard({ now }: { now: Date | null }) {
  const tl = useMemo(() => (now ? sessionTimeline(now) : null), [now]);
  return (
    <Link href="/trade/clock" prefetch className="th-card trade-surface th-clock th-only-desk">
      <div className="th-head">
        <span className="th-chip" aria-hidden="true"><Clock size={18} strokeWidth={1.8} /></span>
        <span className="th-titles">
          <span className="th-title">{tr("ساعت فارکس", "Forex clock")}</span>
          <span className="th-desc">{tr("جلسه‌های معاملاتی امروز به وقت تو", "Today's trading sessions in your local time")}</span>
        </span>
        <span className="th-more">{tr("مشاهده", "View")}<ChevronLeft size={14} className="dir-flip" /></span>
      </div>
      <div className="th-tl" style={{ ["--p" as string]: tl ? (tl.nowPct / 100).toFixed(4) : 0 }}>
        {(tl?.rows ?? [null, null, null, null]).map((r, i) => (
          <div className="th-tl-row" key={r?.key ?? i}>
            <span className={`th-tl-label${r?.open ? " is-open" : ""}`}>{r ? r.label : <Skel w={48} h={10} />}</span>
            <div className="th-tl-track" title={r ? `${r.openLabel} - ${r.closeLabel}` : undefined}>
              {r?.segments.map((s, j) => (
                <span key={j} className={`th-tl-seg${r.open ? " is-open" : ""}`} style={{ insetInlineStart: `${s.start}%`, width: `${s.width}%` }} />
              ))}
            </div>
          </div>
        ))}
        {tl && <span className="th-tl-now" aria-hidden="true" />}
      </div>
    </Link>
  );
}

// ── پیش‌نمایش تزئینی کندل (ثابت، بدون داده‌ی واقعی) ─────────────
// [x مرکز، سر فتیله، ته فتیله، بالای بدنه، ارتفاع بدنه، صعودی؟]
const CANDLES: [number, number, number, number, number, boolean][] = [
  [30, 70, 112, 80, 22, true], [70, 60, 100, 66, 20, true], [110, 55, 96, 62, 24, false],
  [150, 64, 108, 72, 26, false], [190, 52, 96, 58, 28, true], [230, 40, 84, 46, 26, true],
  [270, 36, 74, 42, 20, false], [310, 44, 86, 48, 24, true], [350, 30, 70, 34, 26, true],
  [390, 26, 64, 32, 20, false], [430, 34, 76, 38, 24, true], [470, 22, 60, 26, 24, true],
  [510, 18, 54, 24, 18, false], [550, 20, 58, 24, 24, true], [590, 12, 48, 16, 22, true],
];

export function CandlePreview() {
  return (
    <svg className="th-candles" viewBox="0 0 640 150" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <g className="th-c-grid"><path d="M0 30H640M0 75H640M0 120H640" /></g>
      {CANDLES.map(([x, hi, lo, top, h, up]) => (
        <g key={x} className={up ? "th-c-up" : "th-c-dn"}>
          <path d={`M${x} ${hi}V${lo}`} />
          <rect x={x - 6} y={top} width="12" height={h} />
        </g>
      ))}
      <path className="th-c-line" d="M0 22H640" />
    </svg>
  );
}
