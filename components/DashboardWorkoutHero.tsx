"use client";

// هیروی داشبورد بخش ورزش: فقط دو حلقه، تمرین و کالری. هر حلقه لینک به بخش خودشه
// (?tab=exercise|calorie) و بدون بارگذاری مجدد به همون بخش اسکرول می‌کنه.
// رنگ حلقه‌ها همون توکن‌های --ring-* ـه که heroRings (و کارت اشتراکی) می‌خونن.

import { useEffect, useRef } from "react";
import { SmartLink as Link } from "@/components/SmartLink";
import { faNum } from "@/lib/jalali";
import type { DashboardData } from "@/lib/dashboardTypes";
import { scrollToWorkoutSection, type WorkoutPart } from "@/lib/workoutAnchor";
import { DashIcon } from "./DashboardIcons";
import { GradientRing } from "./GradientRing";
import { Skel } from "./DashboardKit";
import { heroRings } from "./DashboardHero";
import { tr } from "@/lib/i18n";

type RingView = { part: WorkoutPart; label: string; big: string; sub: string; value: number; grad: [string, string]; over: boolean; small?: boolean };

function buildRings(data: DashboardData): RingView[] {
  const rings = heroRings(data, { completed: 0, total: 0 }, true, "workout");
  const ex = data.exercise;
  const cal = data.calorie;
  const exRing = rings.find((r) => r.key === "exercise")!;
  const calRing = rings.find((r) => r.key === "calorie")!;

  let exBig = "—", exSub = tr("بدون برنامه", "No plan"), exSmall = false;
  if (ex?.hasPlan) {
    if (!ex.today.isGymDay) { exBig = tr("استراحت", "Rest"); exSub = tr("امروز تمرین نداری", "No workout today"); exSmall = true; }
    else {
      exBig = `${faNum(Math.round(exRing.value * 100))}%`;
      exSub = tr(`${faNum(ex.today.doneItems)} از ${faNum(ex.today.itemCount)}`, `${ex.today.doneItems} of ${ex.today.itemCount}`);
    }
  }

  let calBig = "—", calSub = tr("هدف تنظیم نشده", "No goal set"), over = false;
  if (cal?.target) {
    const k = Math.round(cal.today.kcal);
    const t = Math.round(cal.target.kcal);
    over = k > t;
    calBig = `${faNum(t ? Math.round((k / t) * 100) : 0)}%`;
    calSub = tr(`${faNum(k)} از ${faNum(t)}`, `${k} of ${t}`);
  }

  return [
    { part: "exercise", label: tr("تمرین", "Workout"), big: exBig, sub: exSub, value: exRing.value, grad: exRing.grad, over: false, small: exSmall },
    { part: "calorie", label: tr("کالری", "Calories"), big: calBig, sub: calSub, value: calRing.value, grad: calRing.grad, over },
  ];
}

export function DashboardWorkoutHero({ data, onShare }: { data: DashboardData | null; onShare?: () => void }) {
  const heroRef = useRef<HTMLElement>(null);
  // همان نور دنبال‌کننده‌ی موس هیروی دیگر بخش‌ها
  useEffect(() => {
    const el = heroRef.current;
    if (!el || typeof window === "undefined") return;
    if (!window.matchMedia("(hover:hover) and (pointer:fine)").matches) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${e.clientX - r.left}px`);
        el.style.setProperty("--my", `${e.clientY - r.top}px`);
      });
    };
    el.addEventListener("pointermove", onMove, { passive: true });
    return () => { el.removeEventListener("pointermove", onMove); if (raf) cancelAnimationFrame(raf); };
  }, []);

  const rings = data ? buildRings(data) : null;
  const placeholders: { part: WorkoutPart; label: string; grad: [string, string] }[] = [
    { part: "exercise", label: tr("تمرین", "Workout"), grad: ["var(--ring-2a)", "var(--ring-2b)"] },
    { part: "calorie", label: tr("کالری", "Calories"), grad: ["var(--ring-3a)", "var(--ring-3b)"] },
  ];

  const go = (e: React.MouseEvent, part: WorkoutPart) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (!scrollToWorkoutSection(part)) return; // بخش خاموش/نبود: ناوبری عادی
    e.preventDefault();
    try { window.history.replaceState(window.history.state, "", `/dashboard?tab=${part}`); } catch {}
  };

  return (
    <section ref={heroRef as any} className="db-hero db-wk-hero m-rise" aria-label={tr("پیشرفت امروز", "Today's progress")}>
      {onShare && (
        <button
          type="button"
          className="db-hero-share"
          onClick={onShare}
          disabled={!data}
          aria-haspopup="dialog"
          aria-label={tr("اشتراک موفقیت امروز با دوستات", "Share today's progress with friends")}
          title={tr("اشتراک موفقیت", "Share progress")}
        >
          <DashIcon name="share" />
        </button>
      )}
      <div className="db-wk-rings">
        {(rings ?? placeholders).map((r) => {
          const view = rings ? (r as RingView) : null;
          return (
            <Link key={r.part} href={`/dashboard?tab=${r.part}`} prefetch={false} className="db-wk-ring" onClick={(e) => go(e, r.part)}>
              <span className="db-wk-ringbox">
                <GradientRing
                  value={view ? view.value : 0}
                  size={150}
                  stroke={13}
                  grad={view && view.over ? ["var(--ring-3b)", "var(--ring-over)"] : r.grad}
                  delay={r.part === "calorie" ? 0.2 : 0.1}
                >
                  {view ? (
                    <b className={`db-wk-big${view.small ? " is-small" : ""}`}><bdi dir="ltr">{view.big}</bdi></b>
                  ) : (
                    <Skel w={46} h={20} />
                  )}
                </GradientRing>
              </span>
              <span className="db-wk-label">{r.label}</span>
              <span className={`db-wk-sub${view?.over ? " is-over" : ""}`}>{view ? view.sub : <Skel w={64} h={11} />}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
