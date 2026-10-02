"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  FIRE_LAYERS,
  FIRE_WISP_PATH,
  FLAME_BOX,
  fireIntensity,
  fireLayerShape,
  fireNoise,
  flamePalette,
  seededRandom,
} from "@/lib/streakFlameShape";
import { isLowPerfDevice } from "@/lib/perfTier";

// شعله‌ی بزرگ و زنده‌ی استریک (پاپ‌آپ جشن، و هر جای دیگه که شعله‌ی بزرگ
// لازمه). پنج لایه‌ی تو‌در‌تو (عمق تیره، بیرونی، میانی، هسته، مرکز سفید-داغ)
// که شکلشون هر فریم از lib/streakFlameShape.ts → fireLayerShape ساخته می‌شه:
// زبانه‌ها با نویز چندسینوسی با دوره‌های نامتوافق کش میان، می‌لرزن و با یک
// باد مشترک خم می‌شن، پس حلقه‌ی دیده‌شدنی نداره. به‌علاوه‌ی تکه‌هایی که از
// نوک زبانه‌ها جدا می‌شن، اخگرهایی که با مسیر شبه‌تصادفی قطعی بالا می‌رن،
// هاله‌ی گرمایی که نفس می‌کشه و بستر روشن پایه.
//
// کارایی: فقط یک حلقه‌ی rAF؛ بیرون از دید (IntersectionObserver) یا تب
// پنهان کاملا متوقف می‌شه؛ دستگاه لمسی (html[data-perf="low"]) با 30 فریم و
// اخگر کمتر؛ «حرکت‌کاهی» سیستم یا lit=false → یک فریم ساکن.
// رندر اول (سرور و کلاینت) فریم ثابت T0ه و اخگرها پنهان‌ان → بدون mismatch.

const T0 = 0.9;
const WISPS = 3;

type Ember = { x0: number; y0: number; rise: number; drift: number; life: number; age: number; r: number; wobF: number; ph: number };
type Wisp = { x: number; y: number; rise: number; drift: number; life: number; age: number; s: number; wait: number };

export function AnimatedStreakFlame({
  days,
  size = 180,
  className,
  lit = true,
  fill = false,
}: {
  days: number;
  size?: number;
  className?: string;
  /** false → شعله‌ی خاموش (خاکستری و ساکن) */
  lit?: boolean;
  /** true → عرض و ارتفاع 100% ظرف (مثلا وسط GradientRing) به‌جای size */
  fill?: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const pal = flamePalette(days);
  const intensity = fireIntensity(days);
  const svgRef = useRef<SVGSVGElement>(null);
  const layerRefs = useRef<(SVGPathElement | null)[]>([]);
  const glowRef = useRef<SVGGElement>(null);
  const baseRef = useRef<SVGEllipseElement>(null);
  const emberRefs = useRef<(SVGCircleElement | null)[]>([]);
  const wispRefs = useRef<(SVGPathElement | null)[]>([]);
  const [reduced, setReduced] = useState(false);
  const [low, setLow] = useState(false);
  const emberCount = low ? 9 : 18;
  const still = reduced || !lit;

  useEffect(() => {
    let mq: MediaQueryList | null = null;
    const on = () => setReduced(!!mq?.matches);
    try {
      mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      on();
      mq.addEventListener?.("change", on);
    } catch { /* مرورگر قدیمی */ }
    setLow(isLowPerfDevice());
    return () => { try { mq?.removeEventListener?.("change", on); } catch { /* */ } };
  }, []);

  const { w, h, cx, by } = FLAME_BOX;

  useEffect(() => {
    if (still) return;
    const svg = svgRef.current;
    if (!svg) return;
    const low = isLowPerfDevice();
    const minDt = low ? 1 / 30 : 0;
    const rnd = seededRandom(0x5eed + days * 977);

    const spawnEmber = (e: Ember | null, fresh: boolean): Ember => {
      const life = 1.5 + rnd() * 1.9;
      const n: Ember = {
        x0: cx + (rnd() - 0.5) * 110,
        y0: by - 18 - rnd() * 70,
        rise: 130 + rnd() * 120,
        drift: (rnd() - 0.5) * 70,
        life,
        age: fresh ? rnd() * life : 0,
        r: 0.9 + rnd() * 1.9,
        wobF: 1.4 + rnd() * 3,
        ph: rnd() * 6.28,
      };
      return e ? Object.assign(e, n) : n;
    };
    const embers: Ember[] = Array.from({ length: emberCount }, () => spawnEmber(null, true));
    const wisps: Wisp[] = Array.from({ length: WISPS }, () => ({ x: 0, y: 0, rise: 0, drift: 0, life: 1, age: 1, s: 1, wait: rnd() * 0.8 }));

    let sim = T0;
    let last = 0;
    let raf = 0;
    let inView = true;
    let visible = typeof document === "undefined" || document.visibilityState !== "hidden";
    let lastTips: [number, number][] = [];

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dtRaw = last ? (now - last) / 1000 : 0;
      if (dtRaw < minDt) return;
      last = now;
      const dt = Math.min(dtRaw, 0.05);
      sim += dt;
      const t = sim;

      FIRE_LAYERS.forEach((l, i) => {
        const el = layerRefs.current[i];
        if (!el) return;
        const shape = fireLayerShape(cx, by, l, t, intensity);
        el.setAttribute("d", shape.d);
        if (l.key === "outer") lastTips = shape.tips;
      });

      // هاله‌ی گرمایی و بستر پایه — نفس نامنظم
      const g = fireNoise(t * 0.7, 21.3);
      glowRef.current?.setAttribute("transform", `translate(${cx} ${by - 96}) scale(${(1 + 0.06 * g).toFixed(3)})`);
      glowRef.current?.setAttribute("opacity", (0.82 + 0.18 * g).toFixed(3));
      const bg = fireNoise(t * 1.3, 33.7);
      baseRef.current?.setAttribute("opacity", (0.62 + 0.3 * bg).toFixed(3));

      // اخگرها
      embers.forEach((e, i) => {
        e.age += dt;
        if (e.age >= e.life) spawnEmber(e, false);
        const el = emberRefs.current[i];
        if (!el) return;
        const p = e.age / e.life;
        const x = e.x0 + e.drift * p + Math.sin(e.age * e.wobF + e.ph) * 7 * p;
        const y = e.y0 - e.rise * (1 - Math.pow(1 - p, 1.5));
        const fade = p < 0.12 ? p / 0.12 : Math.pow(1 - p, 1.3);
        const tw = 0.65 + 0.35 * Math.sin(e.age * 19 + e.ph);
        el.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${((e.r / 1.6) * (1 - 0.55 * p)).toFixed(3)})`);
        el.setAttribute("opacity", (fade * tw).toFixed(3));
      });

      // تکه‌هایی که از نوک زبانه‌های بیرونی جدا می‌شن و محو می‌شن
      wisps.forEach((wp, i) => {
        const el = wispRefs.current[i];
        if (!el) return;
        if (wp.age >= wp.life) {
          wp.wait -= dt;
          el.setAttribute("opacity", "0");
          if (wp.wait > 0 || lastTips.length === 0) return;
          const tip = lastTips[Math.floor(rnd() * lastTips.length)];
          wp.x = tip[0] + (rnd() - 0.5) * 6;
          wp.y = tip[1] + 10;
          wp.rise = 26 + rnd() * 34;
          wp.drift = (rnd() - 0.5) * 16;
          wp.life = 0.38 + rnd() * 0.45;
          wp.s = 0.55 + rnd() * 0.5;
          wp.age = 0;
          wp.wait = 0.15 + rnd() * 1.1;
        }
        wp.age += dt;
        const p = Math.min(1, wp.age / wp.life);
        const s = wp.s * (1 - 0.75 * p);
        el.setAttribute("transform", `translate(${(wp.x + wp.drift * p).toFixed(1)} ${(wp.y - wp.rise * p).toFixed(1)}) scale(${(s * 0.8).toFixed(3)} ${s.toFixed(3)})`);
        el.setAttribute("opacity", (0.95 * (1 - p * p)).toFixed(3));
      });
    };

    const sync = () => {
      const run = inView && visible;
      if (run && !raf) { last = 0; raf = requestAnimationFrame(frame); }
      else if (!run && raf) { cancelAnimationFrame(raf); raf = 0; }
    };
    let io: IntersectionObserver | null = null;
    try {
      io = new IntersectionObserver((ents) => { inView = ents[ents.length - 1]?.isIntersecting ?? true; sync(); }, { rootMargin: "60px" });
      io.observe(svg);
    } catch { /* بدون IO همیشه اجرا */ }
    const onVis = () => { visible = document.visibilityState !== "hidden"; sync(); };
    document.addEventListener("visibilitychange", onVis);
    sync();
    return () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      io?.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [still, days, intensity, emberCount, cx, by]);

  const id = (k: string) => `${uid}-${k}`;
  const initial = FIRE_LAYERS.map((l) => fireLayerShape(cx, by, l, T0, intensity).d);
  const dim = fill ? { width: "100%", height: "100%" } : { width: size, height: (size * h) / w };

  return (
    <svg
      ref={svgRef}
      className={`streak-bigflame${still ? " is-still" : ""}${lit ? "" : " is-unlit"}${className ? ` ${className}` : ""}`}
      viewBox={`0 0 ${w} ${h}`}
      {...dim}
      style={{ ["--sbf-ember-dark" as string]: pal.ember, ["--sbf-ember-light" as string]: pal.outer[1] }}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={id("glow")} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="scale(112 128)">
          <stop offset="0" stopColor={`rgb(${pal.glow})`} stopOpacity=".6" />
          <stop offset=".45" stopColor={`rgb(${pal.glow})`} stopOpacity=".22" />
          <stop offset="1" stopColor={`rgb(${pal.glow})`} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={id("bed")} cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor={pal.core[1]} stopOpacity=".95" />
          <stop offset=".4" stopColor={pal.outer[0]} stopOpacity=".55" />
          <stop offset="1" stopColor={pal.outer[1]} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id("deep")} gradientUnits="userSpaceOnUse" x1="0" y1={by} x2="0" y2={by - 230}>
          <stop offset="0" stopColor={pal.deep} stopOpacity=".9" />
          <stop offset=".5" stopColor={pal.outer[1]} stopOpacity=".6" />
          <stop offset="1" stopColor={pal.outer[1]} stopOpacity="0" />
        </linearGradient>
        <linearGradient id={id("outer")} gradientUnits="userSpaceOnUse" x1="0" y1={by} x2="0" y2={by - 216}>
          <stop offset="0" stopColor={pal.outer[0]} />
          <stop offset=".45" stopColor={pal.outer[0]} />
          <stop offset=".8" stopColor={pal.outer[1]} stopOpacity=".92" />
          <stop offset="1" stopColor={pal.outer[1]} stopOpacity=".35" />
        </linearGradient>
        <linearGradient id={id("mid")} gradientUnits="userSpaceOnUse" x1="0" y1={by} x2="0" y2={by - 172}>
          <stop offset="0" stopColor={pal.mid[0]} />
          <stop offset=".55" stopColor={pal.mid[0]} />
          <stop offset=".85" stopColor={pal.mid[1]} stopOpacity=".75" />
          <stop offset="1" stopColor={pal.mid[1]} stopOpacity=".2" />
        </linearGradient>
        <radialGradient id={id("core")} gradientUnits="userSpaceOnUse" cx={cx} cy={by - 14} r="118">
          <stop offset="0" stopColor={pal.core[0]} />
          <stop offset=".5" stopColor={pal.core[1]} />
          <stop offset="1" stopColor={pal.mid[0]} stopOpacity=".25" />
        </radialGradient>
        <radialGradient id={id("hot")} gradientUnits="userSpaceOnUse" cx={cx} cy={by - 20} r="66">
          <stop offset="0" stopColor={pal.hot} />
          <stop offset=".55" stopColor={pal.hot} stopOpacity=".85" />
          <stop offset="1" stopColor={pal.core[0]} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={id("ember")} cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor={pal.hot} />
          <stop offset=".35" style={{ stopColor: "var(--sbf-ember)" }} />
          <stop offset="1" style={{ stopColor: "var(--sbf-ember)" }} stopOpacity="0" />
        </radialGradient>
        <filter id={id("soft")} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
      </defs>

      <g ref={glowRef} className="streak-bigflame-glow" transform={`translate(${cx} ${by - 96})`}>
        <ellipse cx="0" cy="0" rx="112" ry="128" fill={`url(#${id("glow")})`} />
      </g>
      <ellipse ref={baseRef} className="streak-bigflame-bed" cx={cx} cy={by - 4} rx="74" ry="11" fill={`url(#${id("bed")})`} opacity=".8" />

      {/* هاله‌ی نرم دقیقا هم‌شکل بدنه‌ی بیرونی (use همون مسیر زنده) — دستگاه ضعیف نه */}
      {!low && <use href={`#${id("outer")}-p`} filter={`url(#${id("soft")})`} opacity=".75" />}

      <g className="streak-bigflame-body">
        {FIRE_LAYERS.map((l, i) => (
          <path
            key={l.key}
            ref={(el) => { layerRefs.current[i] = el; }}
            id={`${id(l.key)}-p`}
            className={`streak-bigflame-${l.key}`}
            d={initial[i]}
            fill={`url(#${id(l.key)})`}
          />
        ))}
      </g>

      {!still && (
        <g className="streak-bigflame-wisps">
          {Array.from({ length: WISPS }, (_, i) => (
            <path key={i} ref={(el) => { wispRefs.current[i] = el; }} d={FIRE_WISP_PATH} fill={pal.outer[0]} opacity="0" />
          ))}
        </g>
      )}

      {!still && (
        <g className="streak-bigflame-embers">
          {Array.from({ length: emberCount }, (_, i) => (
            <circle key={i} ref={(el) => { emberRefs.current[i] = el; }} cx="0" cy="0" r={2.4} fill={`url(#${id("ember")})`} opacity="0" />
          ))}
        </g>
      )}
    </svg>
  );
}
