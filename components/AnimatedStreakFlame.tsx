"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  FLAME_BOX,
  SPARKLE_PATH,
  fireIntensity,
  fireNoise,
  flamePalette,
  seededRandom,
  toonFlameShape,
} from "@/lib/streakFlameShape";
import { isLowPerfDevice } from "@/lib/perfTier";

// شعله‌ی بزرگ و زنده‌ی استریک (پاپ‌آپ جشن، /streak). سبک کارتونی و فانتزی
// مثل دوالینگو (درخواست صاحب محصول): بدنه‌ی تخت گرد با دورگیری سفید ضخیم،
// قطره‌ی زرد داخلی، برق براق و جرقه‌های ستاره‌ای که دورش چشمک می‌زنن و بالا
// می‌رن. شکل هر فریم از lib/streakFlameShape.ts → toonFlameShape (کش‌اومدن و
// جمع‌شدن نرم، خم‌شدن، تکون نوک و زبانه‌ی کناری).
//
// کارایی: فقط یک حلقه‌ی rAF؛ بیرون از دید (IntersectionObserver) یا تب
// پنهان کاملا متوقف می‌شه؛ دستگاه ضعیف با 30 فریم و جرقه‌ی کمتر؛ «حرکت‌کاهی»
// سیستم یا lit=false → یک فریم ساکن. رندر اول (سرور و کلاینت) فریم ثابت T0ه
// و جرقه‌ها پنهان‌ان → بدون mismatch.

const T0 = 0.9;
const OUTLINE = 15;

type Spark = { x0: number; y0: number; rise: number; drift: number; life: number; age: number; s: number; rot: number; spin: number };

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
  const outlineRef = useRef<SVGPathElement>(null);
  const bodyRef = useRef<SVGPathElement>(null);
  const innerRef = useRef<SVGPathElement>(null);
  const shineRef = useRef<SVGPathElement>(null);
  const glowRef = useRef<SVGGElement>(null);
  const sparkRefs = useRef<(SVGPathElement | null)[]>([]);
  const [reduced, setReduced] = useState(false);
  const [low, setLow] = useState(false);
  const sparkCount = low ? 5 : 9;
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
    const minDt = isLowPerfDevice() ? 1 / 30 : 0;
    const rnd = seededRandom(0x5eed + days * 977);

    const spawn = (sp: Spark | null, fresh: boolean): Spark => {
      const life = 1.4 + rnd() * 1.6;
      const side = rnd() < 0.5 ? -1 : 1;
      const n: Spark = {
        x0: cx + side * (48 + rnd() * 40),
        y0: by - 40 - rnd() * 120,
        rise: 40 + rnd() * 60,
        drift: side * rnd() * 14,
        life,
        age: fresh ? rnd() * life : 0,
        s: 0.45 + rnd() * 0.55,
        rot: rnd() * 90,
        spin: (rnd() - 0.5) * 120,
      };
      return sp ? Object.assign(sp, n) : n;
    };
    const sparks: Spark[] = Array.from({ length: sparkCount }, () => spawn(null, true));

    let sim = T0;
    let last = 0;
    let raf = 0;
    let inView = true;
    let visible = typeof document === "undefined" || document.visibilityState !== "hidden";

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dtRaw = last ? (now - last) / 1000 : 0;
      if (dtRaw < minDt) return;
      last = now;
      const dt = Math.min(dtRaw, 0.05);
      sim += dt;
      const t = sim;

      const shape = toonFlameShape(cx, by, t, intensity);
      outlineRef.current?.setAttribute("d", shape.body);
      bodyRef.current?.setAttribute("d", shape.body);
      innerRef.current?.setAttribute("d", shape.inner);
      shineRef.current?.setAttribute("d", shape.shine);

      const g = fireNoise(t * 0.7, 21.3);
      glowRef.current?.setAttribute("transform", `translate(${cx} ${by - 96}) scale(${(1 + 0.06 * g).toFixed(3)})`);
      glowRef.current?.setAttribute("opacity", (0.8 + 0.2 * g).toFixed(3));

      sparks.forEach((sp, i) => {
        sp.age += dt;
        if (sp.age >= sp.life) spawn(sp, false);
        const el = sparkRefs.current[i];
        if (!el) return;
        const p = sp.age / sp.life;
        const x = sp.x0 + sp.drift * p;
        const y = sp.y0 - sp.rise * p;
        // چشمک: بزرگ می‌شه، یک لحظه می‌درخشه، کوچیک و محو می‌شه
        const pop = Math.sin(Math.PI * Math.min(1, p * 1.15));
        el.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(sp.rot + sp.spin * sp.age).toFixed(1)}) scale(${(sp.s * pop).toFixed(3)})`);
        el.setAttribute("opacity", (0.95 * pop).toFixed(3));
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
  }, [still, days, intensity, sparkCount, cx, by]);

  const id = (k: string) => `${uid}-${k}`;
  const initial = toonFlameShape(cx, by, T0, intensity);
  const dim = fill ? { width: "100%", height: "100%" } : { width: size, height: (size * (h + 24)) / (w + 24) };
  const tn = pal.toon;

  return (
    <svg
      ref={svgRef}
      className={`streak-bigflame${still ? " is-still" : ""}${lit ? "" : " is-unlit"}${className ? ` ${className}` : ""}`}
      viewBox={`-12 -12 ${w + 24} ${h + 24}`}
      {...dim}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={id("glow")} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="scale(112 128)">
          <stop offset="0" stopColor={`rgb(${pal.glow})`} stopOpacity=".5" />
          <stop offset=".5" stopColor={`rgb(${pal.glow})`} stopOpacity=".16" />
          <stop offset="1" stopColor={`rgb(${pal.glow})`} stopOpacity="0" />
        </radialGradient>
        {/* بدنه تخته؛ فقط سمت راست کمی تیره‌تر تا حجم کارتونی بگیره */}
        <linearGradient id={id("body")} gradientUnits="userSpaceOnUse" x1={cx - 60} y1="0" x2={cx + 75} y2="0">
          <stop offset="0" stopColor={tn.body} />
          <stop offset=".62" stopColor={tn.body} />
          <stop offset="1" stopColor={tn.shade} />
        </linearGradient>
        <linearGradient id={id("inner")} gradientUnits="userSpaceOnUse" x1="0" y1={by - 110} x2="0" y2={by}>
          <stop offset="0" stopColor={tn.innerHi} />
          <stop offset="1" stopColor={tn.inner} />
        </linearGradient>
      </defs>

      <g ref={glowRef} className="streak-bigflame-glow" transform={`translate(${cx} ${by - 96})`}>
        <ellipse cx="0" cy="0" rx="112" ry="128" fill={`url(#${id("glow")})`} />
      </g>

      <g className="streak-bigflame-body">
        <path ref={outlineRef} className="streak-bigflame-outline" d={initial.body} fill="#fff" stroke="#fff" strokeWidth={OUTLINE * 2} strokeLinejoin="round" />
        <path ref={bodyRef} d={initial.body} fill={`url(#${id("body")})`} />
        <path ref={innerRef} d={initial.inner} fill={`url(#${id("inner")})`} />
        <path ref={shineRef} d={initial.shine} fill="#fff" opacity=".55" />
      </g>

      {!still && (
        <g className="streak-bigflame-sparks">
          {Array.from({ length: sparkCount }, (_, i) => (
            <path key={i} ref={(el) => { sparkRefs.current[i] = el; }} d={SPARKLE_PATH} fill={i % 3 === 0 ? "#fff" : tn.innerHi} opacity="0" />
          ))}
        </g>
      )}
    </svg>
  );
}
