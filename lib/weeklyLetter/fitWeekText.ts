// متن‌ها و قواعد قطعی «هفته‌ی تمرین و تغذیه» (بخش ورزش): بینش‌ها، بردها و جای
// پیشرفت، مدال‌ها، تیتر و مقدمه، هفته‌ی بعد با هدف عددی، کاشی‌های عددی و خلاصه‌ی
// مربی AI. همه تابع خالص روی خروجی computeFitWeek هستن و فقط چیزی می‌گن که داده
// پشتشه. هر متن با tr() داخل تابع ساخته می‌شه (نه سطح ماژول) تا زبان درست باشه.
import { tr } from "@/lib/i18n";
import { pl } from "@/lib/weeklyAnalysis/plural";
import { isolateAll, isolateNumbers } from "@/lib/weeklyAnalysis/bidi";
import { muscleLabel } from "@/lib/exerciseSplit";
import type { Insight, WeekNumber } from "@/lib/weeklyAnalysis/types";
import type { LetterAchievement, WeeklyLetterData } from "./types";
import { suggestTarget, type NextWeek } from "./text";
import { PROTEIN_HIT, type FitFuel, type FitTraining, type FitWeek } from "./fitWeek";

const abs = Math.abs;
const joinList = (xs: string[]) => xs.join(tr("، ", ", "));
const r0 = (n: number) => Math.round(n);
const round5 = (n: number) => Math.round(n / 5) * 5;
const round50 = (n: number) => Math.round(n / 50) * 50;
const sign = (n: number) => (n > 0 ? "+" : n < 0 ? "-" : "");

type Ranked = Insight & { priority: number };

/** فهرست نام عضله‌ها به زبان جاری */
function muscleList(keys: readonly string[]): string {
  return joinList(keys.map((k) => muscleLabel(k as Parameters<typeof muscleLabel>[0])));
}

/** هدف پروتئین مؤثر روزانه: خود هدف، وگرنه null */
const proteinTarget = (f: FitFuel) => f.macros.protein.target;

// ───────────────────────── بینش‌ها ─────────────────────────

export function fitInsights(fit: FitWeek): Insight[] {
  const out: Ranked[] = [];
  const t = fit.training;
  const f = fit.fuel;
  const r = fit.recovery;

  if (t) {
    const s = t.sessions;
    if (s.planned >= 2 && s.done >= s.planned) {
      out.push({
        id: "fit_all_sessions", kind: "improvement", icon: "trophy", domain: "fitness", tone: "good", priority: 88,
        title: tr("هیچ جلسه‌ای جا نیفتاد", "Not a single session missed"),
        body: tr(`همه‌ی ${s.planned} جلسه‌ی برنامه رو تمرین کردی${s.extra > 0 ? ` و ${s.extra} جلسه‌ی اضافه هم زدی` : ""}.`, `You trained in all ${pl(s.planned, "planned session")}${s.extra > 0 ? ` and added ${pl(s.extra, "extra session")}` : ""}.`),
      });
    }
    // جلسه‌های جاافتاده: خوشه‌ی آخر هفته یا پشت‌سرهم
    const missedDays = t.days.filter((d) => d.status === "missed");
    if (missedDays.length >= 2) {
      const idx = t.days.map((d, i) => (d.status === "missed" ? i : -1)).filter((i) => i >= 0);
      const late = idx.every((i) => i >= 4);
      const names = joinList(missedDays.map((d) => d.weekday));
      out.push({
        id: "fit_missed_cluster", kind: "decline", icon: "alert", domain: "fitness", tone: "bad", priority: 92,
        title: late ? tr("افت تمرین آخر هفته", "Training slips late in the week") : tr("چند جلسه جا افتاد", "Several sessions slipped"),
        body: late
          ? tr(`${missedDays.length} جلسه‌ی ${names} جا موند؛ آخر هفته زمان تمرینت رو جدی‌تر رزرو کن.`, `Your sessions on ${names} were missed; block out your training time more firmly late in the week.`)
          : tr(`${missedDays.length} جلسه جا موند (${names}). روز و ساعت ثابت برای تمرین کمک می‌کنه.`, `${pl(missedDays.length, "session")} slipped (${names}). A fixed day and time for training helps.`),
      });
    }
    if (t.adherence != null && t.prevAdherence != null && s.planned >= 2 && t.prevSessions && t.prevSessions.planned >= 2) {
      const d = t.adherence - t.prevAdherence;
      if (d >= 20) {
        out.push({
          id: "fit_adherence_up", kind: "improvement", icon: "trend_up", domain: "fitness", tone: "good", priority: 80,
          title: tr("پایبندی به برنامه بهتر شد", "Better plan adherence"),
          body: tr(`پایبندیت به برنامه از ${t.prevAdherence}% به ${t.adherence}% رسید.`, `Your plan adherence went from ${t.prevAdherence}% to ${t.adherence}%.`),
        });
      } else if (d <= -20) {
        out.push({
          id: "fit_adherence_down", kind: "decline", icon: "trend_down", domain: "fitness", tone: "bad", priority: 84,
          title: tr("پایبندی به برنامه افت کرد", "Plan adherence dropped"),
          body: tr(`پایبندیت به برنامه از ${t.prevAdherence}% به ${t.adherence}% افتاد.`, `Your plan adherence fell from ${t.prevAdherence}% to ${t.adherence}%.`),
        });
      }
    }
    if (t.skipped.length > 0) {
      out.push({
        id: "fit_skipped_muscle", kind: "outlier", icon: "zap", domain: "fitness", tone: "bad", priority: 78,
        title: tr("گروه عضلانی جاافتاده", "A muscle group got skipped"),
        body: tr(`${muscleList(t.skipped)} توی برنامه بود ولی این هفته هیچ حرکتی ازش انجام نشد.`, `${muscleList(t.skipped)} was in your plan but no exercise for it was done this week.`),
      });
    }
    const top = t.top[0];
    if (top && top.count >= 3) {
      out.push({
        id: "fit_top_exercise", kind: "streak", icon: "flame", domain: "fitness", tone: "good", priority: 60,
        title: tr("حرکت محبوب هفته", "Exercise of the week"),
        body: tr(`«${top.name}» رو ${top.count} بار انجام دادی؛ بیشترین تکرار این هفته.`, `You did "${top.name}" ${top.count} times, the most of any exercise this week.`),
      });
    }
    if (t.longestStreak >= 3) {
      out.push({
        id: "fit_streak", kind: "streak", icon: "flame", domain: "fitness", tone: "good", priority: 70 + t.longestStreak,
        title: tr(`${t.longestStreak} جلسه‌ی پیاپی`, `${pl(t.longestStreak, "session")} in a row`),
        body: tr(`${t.longestStreak} جلسه‌ی پشت‌سرهم بدون جاافتادن؛ روزهای استراحت زنجیره رو نمی‌شکنن.`, `${pl(t.longestStreak, "session")} back to back with none missed; rest days do not break the chain.`),
      });
    }
    if (t.start && t.sessions.done + t.sessions.extra >= 3) {
      const slots = [
        { n: t.start.morning, fa: "صبح", en: "mornings" },
        { n: t.start.afternoon, fa: "بعدازظهر", en: "afternoons" },
        { n: t.start.evening, fa: "عصر و شب", en: "evenings" },
      ].sort((a, b) => b.n - a.n);
      const total = slots.reduce((a, x) => a + x.n, 0);
      if (slots[0].n >= 3 && slots[0].n / total >= 0.7) {
        out.push({
          id: "fit_start_time", kind: "consistency", icon: "calendar", domain: "fitness", tone: "neutral", priority: 45,
          title: tr("ساعت تمرینت ثابته", "A steady training time"),
          body: tr(`${slots[0].n} از ${total} جلسه‌ات رو ${slots[0].fa} شروع کردی؛ ریتم ثابت کمک می‌کنه جلسه‌ها جا نیفتن.`, `${slots[0].n} of your ${total} sessions started in the ${slots[0].en}; a steady rhythm helps sessions stick.`),
        });
      }
    }
  }

  if (f) {
    const pt = proteinTarget(f);
    const tr_ = f.trainVsRest;
    if (tr_ && tr_.trainProtein != null) {
      if (pt && tr_.trainProtein < pt * 0.85) {
        out.push({
          id: "fit_protein_training_days", kind: "decline", icon: "alert", domain: "nutrition", tone: "bad", priority: 90,
          title: tr("پروتئین روزهای تمرین کم بود", "Protein ran short on training days"),
          body: tr(`روزهای تمرین میانگین پروتئینت ${tr_.trainProtein} گرم بود، زیر هدف ${pt} گرم؛ همون روزهایی که عضله بیشترین نیاز رو داره.`, `On training days your protein averaged ${tr_.trainProtein} g, under the ${pt} g target, exactly when your muscles need it most.`),
        });
      } else if (!pt && tr_.restProtein != null && tr_.trainProtein < tr_.restProtein * 0.9) {
        out.push({
          id: "fit_protein_training_days", kind: "decline", icon: "alert", domain: "nutrition", tone: "bad", priority: 74,
          title: tr("پروتئین روزهای تمرین کمتر بود", "Less protein on training days"),
          body: tr(`روزهای تمرین ${tr_.trainProtein} گرم پروتئین خوردی و روزهای استراحت ${tr_.restProtein} گرم؛ معمولا برعکسش بهتره.`, `You ate ${tr_.trainProtein} g of protein on training days versus ${tr_.restProtein} g on rest days; the reverse is usually better.`),
        });
      }
    }
    if (f.weekend && f.weekend.weekendAvg >= f.weekend.weekdayAvg * 1.15 && f.weekend.weekdayAvg > 0) {
      const pct = r0((f.weekend.weekendAvg / f.weekend.weekdayAvg - 1) * 100);
      out.push({
        id: "fit_weekend_overeat", kind: "outlier", icon: "zap", domain: "nutrition", tone: "bad", priority: 76,
        title: tr("آخر هفته بیشتر خوردی", "You ate more at the weekend"),
        body: tr(`پنجشنبه و جمعه میانگین کالریت ${f.weekend.weekendAvg} بود، ${pct}% بیشتر از روزهای کاری (${f.weekend.weekdayAvg}).`, `Your Thursday and Friday average was ${f.weekend.weekendAvg} kcal, ${pct}% above your weekdays (${f.weekend.weekdayAvg}).`),
      });
    }
    if (pt && f.macros.protein.hitDays >= 5) {
      out.push({
        id: "fit_protein_days", kind: "improvement", icon: "trophy", domain: "nutrition", tone: "good", priority: 72,
        title: tr("پروتئین روی هدف", "Protein on target"),
        body: tr(`${f.macros.protein.hitDays} روز به هدف پروتئین (${pt} گرم) رسیدی.`, `You reached your protein target (${pt} g) on ${pl(f.macros.protein.hitDays, "day")}.`),
      });
    }
    if (f.within.of >= 4) {
      if (f.within.days >= 5) {
        out.push({
          id: "fit_kcal_on_target", kind: "consistency", icon: "calendar", domain: "nutrition", tone: "good", priority: 68,
          title: tr("کالری منظم", "Steady calories"),
          body: tr(`${f.within.days} از ${f.within.of} روز کالریت داخل ±10% هدف بود.`, `Your calories were within ±10% of target on ${f.within.days} of ${f.within.of} days.`),
        });
      } else if (f.within.days * 2 < f.within.of) {
        out.push({
          id: "fit_kcal_off_target", kind: "decline", icon: "alert", domain: "nutrition", tone: "bad", priority: 73,
          title: tr("کالری از هدف دور بود", "Calories drifted from target"),
          body: tr(`فقط ${f.within.days} از ${f.within.of} روز کالریت داخل ±10% هدف بود.`, `Only ${f.within.days} of ${f.within.of} days landed within ±10% of target.`),
        });
      }
    }
    const b = f.balance;
    if (b && b.verdict !== "aligned") {
      const g = f.goal;
      const kg = abs(b.estKg);
      const total = abs(b.totalDelta);
      const over = b.verdict === "over";
      let body: string;
      if (g === "cut" && over) body = tr(`برای کات، این هفته حدود ${total} کالری بالاتر از هدف بودی (برآورد ${kg} کیلو؛ فقط یک تخمین).`, `For your cut, you ran about ${total} kcal over target this week (an estimated ${kg} kg; only an estimate).`);
      else if (g === "gain" && !over) body = tr(`برای حجم، این هفته حدود ${total} کالری زیر هدف بودی (برآورد ${kg} کیلو؛ فقط یک تخمین).`, `For your bulk, you ran about ${total} kcal under target this week (an estimated ${kg} kg; only an estimate).`);
      else if (over) body = tr(`این هفته حدود ${total} کالری بالاتر از هدفت بودی (برآورد ${kg} کیلو؛ فقط یک تخمین).`, `You ran about ${total} kcal over your target this week (an estimated ${kg} kg; only an estimate).`);
      else body = tr(`این هفته حدود ${total} کالری زیر هدفت بودی (برآورد ${kg} کیلو؛ فقط یک تخمین).`, `You ran about ${total} kcal under your target this week (an estimated ${kg} kg; only an estimate).`);
      const bad = (g === "cut" && over) || (g === "gain" && !over) || g === "maintain" || g == null;
      out.push({
        id: "fit_balance", kind: bad ? "decline" : "improvement", icon: bad ? "alert" : "trend_up", domain: "nutrition", tone: bad ? "bad" : "neutral", priority: 82,
        title: over ? tr("تراز انرژی: بالاتر از هدف", "Energy balance: above target") : tr("تراز انرژی: زیر هدف", "Energy balance: below target"),
        body,
      });
    } else if (b && b.verdict === "aligned" && b.days >= 5) {
      out.push({
        id: "fit_balance_ok", kind: "consistency", icon: "calendar", domain: "nutrition", tone: "good", priority: 66,
        title: tr("تراز انرژی هماهنگ با هدف", "Energy balance in line with your goal"),
        body: tr(`مجموع کالری ${b.days} روز ثبت‌شده نزدیک هدفت بود (اختلاف ${abs(b.totalDelta)} کالری).`, `Your total over ${b.days} logged days stayed close to target (${abs(b.totalDelta)} kcal apart).`),
      });
    }
  }

  if (r && r.missedAvg < 7 && r.diff >= 0.5) {
    out.push({
      id: "fit_sleep_missed", kind: "correlation", icon: "link", domain: "sleep", tone: "bad", priority: 86,
      title: tr("خواب کم قبل از جلسه‌های جاافتاده", "Short sleep before skipped sessions"),
      body: tr(`قبل از روزهای تمرین ${r.trainAvg} ساعت خوابیدی، ولی قبل از ${r.missedN > 1 ? "روزهای" : "روز"} جاافتاده فقط ${r.missedAvg} ساعت.`, `You slept ${r.trainAvg} hours before training days but only ${r.missedAvg} before the ${r.missedN > 1 ? "days" : "day"} you missed.`),
    });
  }

  return out.sort((a, b) => b.priority - a.priority).map(({ priority: _p, ...ins }) => ins);
}

// ───────────────────────── بردها / جای پیشرفت ─────────────────────────

type Cand = { text: string; priority: number; group: string };

function pick(c: Cand[], n: number): string[] {
  const used = new Set<string>();
  const out: string[] = [];
  for (const x of [...c].sort((a, b) => b.priority - a.priority)) {
    if (used.has(x.group)) continue;
    used.add(x.group);
    out.push(x.text);
    if (out.length >= n) break;
  }
  return out;
}

export function fitWinsImprove(fit: FitWeek): { wins: string[]; improve: string[] } {
  const wins: Cand[] = [];
  const bad: Cand[] = [];
  const t = fit.training;
  const f = fit.fuel;
  const r = fit.recovery;

  if (t) {
    const s = t.sessions;
    if (s.planned > 0 && s.done >= s.planned) wins.push({ text: tr(`همه‌ی ${s.planned} جلسه‌ی برنامه رو انجام دادی.`, `You finished all ${pl(s.planned, "planned session")}.`), priority: 85, group: "sessions" });
    else if (s.planned > 0 && t.adherence != null && t.adherence >= 75) wins.push({ text: tr(`${s.done} از ${s.planned} جلسه‌ی برنامه انجام شد (${t.adherence}%).`, `${s.done} of ${s.planned} planned sessions were done (${t.adherence}%).`), priority: 70, group: "sessions" });
    if (s.extra > 0) wins.push({ text: tr(`${s.extra} جلسه بیشتر از برنامه تمرین کردی.`, `You trained ${pl(s.extra, "session")} beyond the plan.`), priority: 60, group: "extra" });
    const planned = t.muscles.filter((m) => m.planned > 0);
    if (planned.length >= 3 && t.skipped.length === 0 && t.muscles.some((m) => m.count > 0)) wins.push({ text: tr(`هر ${planned.length} گروه عضلانی برنامه رو درگیر کردی.`, `You hit all ${planned.length} muscle groups in your plan.`), priority: 66, group: "muscles" });
    if (t.exercises.pct != null && t.exercises.pct >= 90 && t.exercises.planned >= 6) wins.push({ text: tr(`${t.exercises.done} از ${t.exercises.planned} حرکت برنامه (${t.exercises.pct}%) انجام شد.`, `${t.exercises.done} of ${t.exercises.planned} planned exercises (${t.exercises.pct}%) were done.`), priority: 64, group: "exercises" });
    if (t.prevAdherence != null && t.adherence != null && t.adherence - t.prevAdherence >= 15) wins.push({ text: tr(`پایبندی به برنامه ${t.adherence - t.prevAdherence} واحد از هفته‌ی قبل بهتر شد.`, `Plan adherence improved ${pl(t.adherence - t.prevAdherence, "point")} on last week.`), priority: 62, group: "wow" });
    if (s.missed > 0) bad.push({ text: tr(`${s.missed} جلسه از برنامه جا موند${s.partial > 0 ? ` و ${s.partial} جلسه نیمه‌کاره بود` : ""}.`, `${pl(s.missed, "planned session")} missed${s.partial > 0 ? ` and ${pl(s.partial, "session")} left unfinished` : ""}.`), priority: 80, group: "sessions" });
    else if (s.partial > 0) bad.push({ text: tr(`${s.partial} جلسه نیمه‌کاره موند؛ سعی کن کوتاه‌شده هم شده تمومش کنی.`, `${pl(s.partial, "session")} was left unfinished; even a shortened version is worth finishing.`), priority: 70, group: "sessions" });
    if (t.skipped.length > 0) bad.push({ text: tr(`${muscleList(t.skipped)} این هفته جا موند.`, `${muscleList(t.skipped)} got skipped this week.`), priority: 72, group: "muscles" });
    if (t.exercises.pct != null && t.exercises.pct < 60 && t.exercises.planned >= 6) bad.push({ text: tr(`فقط ${t.exercises.done} از ${t.exercises.planned} حرکت برنامه (${t.exercises.pct}%) انجام شد.`, `Only ${t.exercises.done} of ${t.exercises.planned} planned exercises (${t.exercises.pct}%) were done.`), priority: 68, group: "exercises" });
  }

  if (f) {
    const pt = proteinTarget(f);
    if (pt && f.macros.protein.hitDays >= 5) wins.push({ text: tr(`${f.macros.protein.hitDays} روز به هدف پروتئین رسیدی.`, `You hit your protein target on ${pl(f.macros.protein.hitDays, "day")}.`), priority: 74, group: "protein" });
    if (f.within.of >= 3 && f.within.days >= 5) wins.push({ text: tr(`${f.within.days} روز کالریت داخل ±10% هدف بود.`, `Your calories were within ±10% of target on ${pl(f.within.days, "day")}.`), priority: 73, group: "kcal" });
    if (f.balance && f.balance.verdict === "aligned" && f.balance.days >= 5) wins.push({ text: tr("تراز انرژی هفته با هدفت هماهنگ بود.", "Your weekly energy balance matched your goal."), priority: 61, group: "balance" });
    if (pt && f.macros.protein.avg != null && f.macros.protein.avg < pt * 0.85) bad.push({ text: tr(`میانگین پروتئین ${f.macros.protein.avg} گرم بود، زیر هدف ${pt} گرم.`, `Average protein was ${f.macros.protein.avg} g, under the ${pt} g target.`), priority: 77, group: "protein" });
    if (f.within.of >= 3 && f.within.days * 2 < f.within.of) bad.push({ text: tr(`فقط ${f.within.days} از ${f.within.of} روز کالریت داخل ±10% هدف بود.`, `Only ${f.within.days} of ${f.within.of} days landed within ±10% of target.`), priority: 71, group: "kcal" });
    if (f.balance && f.balance.verdict !== "aligned") {
      const over = f.balance.verdict === "over";
      bad.push({ text: over ? tr(`حدود ${abs(f.balance.totalDelta)} کالری بالاتر از هدف بودی.`, `You ran about ${abs(f.balance.totalDelta)} kcal over target.`) : tr(`حدود ${abs(f.balance.totalDelta)} کالری زیر هدف بودی.`, `You ran about ${abs(f.balance.totalDelta)} kcal under target.`), priority: 69, group: "balance" });
    }
    if (f.loggedDays <= 3 && f.loggedDays > 0) bad.push({ text: tr(`فقط ${f.loggedDays} روز غذات ثبت شد؛ بدون ثبت منظم، تراز انرژی دقیق نیست.`, `You logged food on only ${pl(f.loggedDays, "day")}; without steady logging the energy balance is not reliable.`), priority: 65, group: "logging" });
  }

  if (r && r.missedAvg < 7 && r.diff >= 0.5) bad.push({ text: tr(`قبل از جلسه‌های جاافتاده فقط ${r.missedAvg} ساعت خوابیده بودی.`, `You had only ${r.missedAvg} hours of sleep before the sessions you missed.`), priority: 67, group: "sleep" });

  return { wins: pick(wins, 3), improve: pick(bad, 3) };
}

// ───────────────────────── مدال‌ها ─────────────────────────

/** کلیدهای مدال هفتگی عمومی که این مدال‌های تخصصی جایگزینشون می‌شن */
export const FIT_REPLACED_MEDAL_KEYS = ["fitness_all_sessions", "nutrition_on_target_5"] as const;

export function fitMedals(fit: FitWeek): LetterAchievement[] {
  const out: LetterAchievement[] = [];
  const t = fit.training;
  const f = fit.fuel;
  const add = (key: string, title: string, description: string, emoji: string) =>
    out.push({ key, title, description, emoji, source: "weekly" });

  if (t && t.sessions.planned >= 1 && t.sessions.done >= t.sessions.planned && t.sessions.partial === 0) {
    add("fit_all_sessions", tr("همه‌ی جلسه‌ها", "Every session"), tr(`هر ${t.sessions.planned} جلسه‌ی برنامه رو کامل انجام دادی.`, `You completed all ${pl(t.sessions.planned, "planned session")}.`), "💪");
  }
  if (t) {
    const planned = t.muscles.filter((m) => m.planned > 0);
    if (planned.length >= 3 && t.skipped.length === 0 && planned.every((m) => m.count > 0)) {
      add("fit_all_muscles", tr("همه‌ی گروه‌های عضلانی", "Every muscle group"), tr(`هر ${planned.length} گروه عضلانی برنامه این هفته کار شد.`, `All ${planned.length} muscle groups in your plan were trained this week.`), "🦾");
    }
  }
  if (f && f.macros.protein.target && f.macros.protein.hitDays >= 5) {
    add("fit_protein_5", tr("پروتئین روی هدف", "Protein on target"), tr(`${f.macros.protein.hitDays} روز به هدف پروتئین رسیدی.`, `You reached your protein target on ${pl(f.macros.protein.hitDays, "day")}.`), "🥩");
  }
  if (f && f.within.of >= 6 && f.within.days >= 6) {
    add("fit_kcal_6", tr("کالری روی هدف", "Calories on target"), tr(`${f.within.days} روز کالریت داخل ±10% هدف بود.`, `Your calories were within ±10% of target on ${pl(f.within.days, "day")}.`), "🎯");
  }
  if (f && f.balance && f.balance.days >= 5 && f.balance.verdict === "aligned" && abs(f.balance.avgPct) <= 0.05) {
    add("fit_balance", tr("تراز بی‌نقص", "Perfect balance"), tr("تراز انرژی هفته دقیقا با هدفت هماهنگ بود.", "Your weekly energy balance matched your goal right on."), "⚖️");
  }
  return out;
}

// ───────────────────────── تیتر و مقدمه ─────────────────────────

function sessionsClause(t: FitTraining): string | null {
  const s = t.sessions;
  if (s.planned > 0) return tr(`${s.done} از ${s.planned} جلسه تمرین کردی`, `you did ${s.done} of ${pl(s.planned, "planned session")}`);
  if (s.extra > 0) return tr(`${s.extra} جلسه تمرین کردی`, `you trained in ${pl(s.extra, "session")}`);
  return null;
}

function fuelClause(f: FitFuel): string | null {
  if (f.within.of >= 3) return tr(`${f.within.days} روز کالریت داخل هدف بود`, `your calories were on target on ${pl(f.within.days, "day")}`);
  if (f.avgKcal != null) return tr(`میانگین کالریت ${f.avgKcal} بود`, `your calories averaged ${f.avgKcal}`);
  return null;
}

const up1 = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** تیتر ورزش: جلسه‌ها + تغذیه. null = داده‌ی کافی نیست (تیتر پایه می‌مونه). */
export function fitHeadline(fit: FitWeek, soFar = false): string | null {
  const a = fit.training ? sessionsClause(fit.training) : null;
  const b = fit.fuel ? fuelClause(fit.fuel) : null;
  const pre = soFar ? tr("تا الان ", "so far ") : "";
  const post = soFar ? " so far" : "";
  if (a && b) {
    const good = fit.training!.adherence != null ? fit.training!.adherence >= 70 : true;
    const fuelGood = fit.fuel!.within.of >= 3 ? fit.fuel!.within.days * 2 >= fit.fuel!.within.of : true;
    return tr(`${pre}${a} ${good === fuelGood ? "و" : "ولی"} ${b}`, `${up1(a)}${post}, ${good === fuelGood ? "and" : "but"} ${b}`);
  }
  if (a) return tr(`${pre}${a}`, `${up1(a)}${post}`);
  if (b) return tr(`${pre}${b}`, `${up1(b)}${post}`);
  return null;
}

export function fitIntro(
  fit: FitWeek,
  i: { weekLabel: string; score: number | null; grade: string | null; prevScore: number | null },
): string {
  if (i.score == null) return "";
  const d = i.prevScore != null ? i.score - i.prevScore : null;
  const dTail = d == null ? "."
    : d >= 3 ? tr(`، ${d} امتیاز بالاتر از هفته‌ی قبل.`, `, ${pl(d, "point")} higher than last week.`)
    : d <= -3 ? tr(`، ${abs(d)} امتیاز پایین‌تر از هفته‌ی قبل.`, `, ${pl(abs(d), "point")} lower than last week.`)
    : tr("، تقریبا هم‌سطح هفته‌ی قبل.", ", about level with last week.");
  const s1 = tr(`هفته‌ی ${i.weekLabel} رو با امتیاز ${i.score} از 100 و نمره‌ی ${i.grade ?? "-"} بستی${dTail}`, `You closed the week of ${i.weekLabel} with a score of ${i.score} out of 100 and a grade of ${i.grade ?? "-"}${dTail}`);
  const parts: string[] = [];
  const t = fit.training;
  if (t) {
    const s = t.sessions;
    const hit = t.muscles.filter((m) => m.count > 0).length;
    if (s.planned > 0) {
      parts.push(tr(
        `${s.done} از ${s.planned} جلسه‌ی برنامه رو تمرین کردی${s.extra > 0 ? ` و ${s.extra} جلسه‌ی اضافه زدی` : ""}${hit >= 2 ? ` و ${hit} گروه عضلانی رو کار کردی` : ""}.`,
        `You did ${s.done} of ${pl(s.planned, "planned session")}${s.extra > 0 ? `, added ${pl(s.extra, "extra session")}` : ""}${hit >= 2 ? ` and trained ${hit} muscle groups` : ""}.`,
      ));
    } else if (s.extra > 0) {
      parts.push(tr(`${s.extra} جلسه تمرین ثبت کردی${hit >= 2 ? ` و ${hit} گروه عضلانی رو کار کردی` : ""}.`, `You logged ${pl(s.extra, "workout")}${hit >= 2 ? ` and trained ${hit} muscle groups` : ""}.`));
    }
  }
  const f = fit.fuel;
  if (f && f.avgKcal != null) {
    const tgt = f.target ? tr(` (هدف ${f.target})`, ` (target ${f.target})`) : "";
    const prot = f.macros.protein.avg != null ? tr(` و ${f.macros.protein.avg} گرم پروتئین`, ` and ${f.macros.protein.avg} g of protein`) : "";
    const on = f.within.of >= 3 ? tr(`؛ ${f.within.days} از ${f.within.of} روز داخل ±10% هدف`, `; ${f.within.days} of ${f.within.of} days within ±10% of target`) : "";
    parts.push(tr(`میانگین روزانه‌ات ${f.avgKcal} کالری${tgt}${prot} بود${on}.`, `Your daily average was ${f.avgKcal} kcal${tgt}${prot}${on}.`));
  }
  return [s1, ...parts].join(" ");
}

// ───────────────────────── هفته‌ی بعد ─────────────────────────

/** هدف‌های عددی هفته‌ی بعد؛ هر کدوم null اگه داده‌ی کافی نیست */
export function fitNextTargets(fit: FitWeek): { sessions: number | null; proteinG: number | null; kcalMin: number | null; kcalMax: number | null } {
  const t = fit.training;
  const f = fit.fuel;
  const sessions = t ? (t.sessions.planned > 0 ? t.sessions.planned : t.sessions.done + t.sessions.extra > 0 ? t.sessions.done + t.sessions.extra : null) : null;
  let proteinG: number | null = null;
  if (f) {
    const pt = f.macros.protein.target;
    proteinG = pt ?? (f.macros.protein.avg != null ? round5(f.macros.protein.avg * 1.1) : null);
  }
  const k = f?.target ?? null;
  return { sessions, proteinG, kcalMin: k ? round50(k * 0.9) : null, kcalMax: k ? round50(k * 1.1) : null };
}

export function fitNextWeek(fit: FitWeek, base: NextWeek, scores: { fitness: number | null; nutrition: number | null }): NextWeek {
  const t = fit.training;
  const f = fit.fuel;
  const nt = fitNextTargets(fit);
  const proteinShort = !!(f && f.macros.protein.target && f.macros.protein.avg != null && f.macros.protein.avg < f.macros.protein.target * PROTEIN_HIT);
  const trainWeak = !!(t && t.sessions.planned > 0 && t.adherence != null && t.adherence < 80);
  const kcalWeak = !!(f && f.within.of >= 3 && f.within.days * 2 < f.within.of);

  const bits: string[] = [];
  if (nt.sessions != null) bits.push(tr(`${nt.sessions} جلسه تمرین`, pl(nt.sessions, "training session")));
  if (nt.proteinG != null) bits.push(tr(`حداقل ${nt.proteinG} گرم پروتئین در روز`, `at least ${nt.proteinG} g of protein a day`));
  if (nt.kcalMin != null && nt.kcalMax != null) bits.push(tr(`کالری بین ${nt.kcalMin} تا ${nt.kcalMax}`, `calories between ${nt.kcalMin} and ${nt.kcalMax}`));
  if (!bits.length) return base;

  let domain: "fitness" | "nutrition" | null;
  let tip: string;
  if (trainWeak) {
    domain = "fitness";
    tip = t!.skipped.length > 0
      ? tr(`اول جلسه‌ی ${muscleList(t!.skipped)} رو سر جاش بذار و برای هر جلسه یک ساعت ثابت تعیین کن.`, `Put the ${muscleList(t!.skipped)} session back first and fix a set time for each session.`)
      : tr("هر جلسه رو یک ساعت ثابت بذار و شب قبلش وسایلت رو آماده کن؛ جلسه‌ی کوتاه هم حساب می‌شه.", "Give every session a fixed time and prep your gear the night before; a short session still counts.");
  } else if (proteinShort) {
    domain = "nutrition";
    tip = tr("پروتئین رو بین وعده‌ها پخش کن و روزهای تمرین اولویتش بده.", "Spread protein across meals and prioritize it on training days.");
  } else if (kcalWeak) {
    domain = "nutrition";
    tip = tr("غذاهات رو همون موقع ثبت کن تا ببینی کالری کجا از هدف فاصله می‌گیره.", "Log meals as you eat them to see where calories drift from target.");
  } else if (t || f) {
    domain = t ? "fitness" : "nutrition";
    tip = tr("این هفته خوب بود؛ همین ریتم رو نگه دار.", "This week went well; keep the same rhythm.");
  } else {
    return base;
  }

  const sc = domain === "fitness" ? scores.fitness : scores.nutrition;
  const label = domain === "fitness" ? tr("تمرین", "training") : tr("تغذیه", "nutrition");
  const target = sc != null && sc < 85 ? suggestTarget(sc) : base.suggestedTarget;
  return {
    focusDomain: domain,
    focusTitle: tr(`تمرکز هفته‌ی بعد: ${label}`, `Next week's focus: ${label}`),
    focusText: tr(`هدف هفته‌ی بعد: ${joinList(bits)}. ${tip}`, `Next week's target: ${joinList(bits)}. ${tip}`),
    suggestedTarget: target,
  };
}

// ───────────────────────── کاشی‌های عددی ─────────────────────────

/** کاشی‌های مخصوص ورزش؛ عمدا با domain=null تا با آمار کارت بخش‌ها یکی حساب نشن */
export function fitNumbers(fit: FitWeek): WeekNumber[] {
  const out: WeekNumber[] = [];
  const t = fit.training;
  const f = fit.fuel;

  if (t && t.exercises.planned > 0 && t.exercises.pct != null) {
    out.push({
      key: "fit_exercises", label: tr("حرکت‌های انجام‌شده", "Exercises done"), value: `${t.exercises.done}/${t.exercises.planned}`, domain: null,
      tone: t.exercises.pct >= 80 ? "good" : t.exercises.pct < 50 ? "bad" : "neutral",
      hint: tr(`${t.exercises.pct}% حرکت‌های برنامه`, `${t.exercises.pct}% of planned exercises`),
    });
  }
  if (t) {
    const hit = t.muscles.filter((m) => m.count > 0).length;
    const planned = t.muscles.filter((m) => m.planned > 0).length;
    if (hit > 0) {
      out.push({
        key: "fit_muscles", label: tr("گروه‌های عضلانی کارشده", "Muscle groups trained"), value: planned >= 3 ? `${t.muscles.filter((m) => m.planned > 0 && m.count > 0).length}/${planned}` : `${hit}`, domain: null,
        tone: t.skipped.length === 0 ? "good" : "neutral",
        hint: t.skipped.length ? tr(`جاافتاده: ${muscleList(t.skipped)}`, `Skipped: ${muscleList(t.skipped)}`) : undefined,
      });
    }
    if (t.longestStreak >= 2) {
      out.push({ key: "fit_streak", label: tr("بلندترین زنجیره", "Longest chain"), value: `${t.longestStreak}`, unit: tr("جلسه", "sessions"), domain: null, tone: "good", hint: tr("روز استراحت زنجیره رو نمی‌شکنه", "Rest days do not break it") });
    }
  }
  if (f) {
    if (f.macros.protein.target && f.macros.protein.loggedDays > 0) {
      out.push({
        key: "fit_protein_days", label: tr("روزهای هدف پروتئین", "Protein target days"), value: `${f.macros.protein.hitDays}/${f.macros.protein.loggedDays}`, domain: null,
        tone: f.macros.protein.hitDays * 2 >= f.macros.protein.loggedDays ? "good" : "bad",
        hint: tr(`هدف ${f.macros.protein.target} گرم`, `target ${f.macros.protein.target} g`),
      });
    }
    if (f.balance) {
      const b = f.balance;
      out.push({
        key: "fit_balance", label: tr("تراز انرژی نسبت به هدف", "Energy balance vs target"), value: `${sign(b.totalDelta)}${abs(b.totalDelta)}`, unit: "kcal", domain: null,
        tone: b.verdict === "aligned" ? "good" : "neutral",
        hint: abs(b.estKg) < 0.1
          ? tr("برآورد: تقریبا بدون تغییر وزن (فقط تخمین)", "estimate: about no weight change (estimate only)")
          : tr(`برآورد ${abs(b.estKg)} کیلو ${b.estKg >= 0 ? "افزایش" : "کاهش"} (فقط تخمین)`, `about ${abs(b.estKg)} kg ${b.estKg >= 0 ? "gained" : "lost"} (estimate only)`),
      });
    }
  }
  return out;
}

// ───────────────────────── خلاصه‌ی مربی AI ─────────────────────────

export type FitAiSummary = ReturnType<typeof fitAiSummary>;

/** خلاصه‌ی عددی و کوچیک برای مربی AI — فقط اعداد، هیچ متن خام کاربر */
export function fitAiSummary(fit: FitWeek) {
  const t = fit.training;
  const f = fit.fuel;
  return {
    training: t && {
      sessionsDone: t.sessions.done, sessionsPlanned: t.sessions.planned, extraSessions: t.sessions.extra, missedSessions: t.sessions.missed, partialSessions: t.sessions.partial,
      adherencePct: t.adherence, prevAdherencePct: t.prevAdherence,
      plannedExercisesDone: t.exercises.done, plannedExercises: t.exercises.planned,
      musclesTrained: t.muscles.filter((m) => m.count > 0).map((m) => m.key),
      musclesSkipped: t.skipped,
      longestSessionChain: t.longestStreak,
    },
    nutrition: f && {
      goal: f.goal, targetKcal: f.target, avgKcal: f.avgKcal, daysWithinTen: f.within.days, daysCompared: f.within.of, loggedDays: f.loggedDays,
      avgProteinG: f.macros.protein.avg, proteinTargetG: f.macros.protein.target, proteinTargetDays: f.macros.protein.hitDays,
      avgCarbsG: f.macros.carbs.avg, carbsTargetG: f.macros.carbs.target, avgFatG: f.macros.fat.avg, fatTargetG: f.macros.fat.target,
      energyBalanceKcal: f.balance?.totalDelta ?? null, balanceVerdict: f.balance?.verdict ?? null,
      trainingDayKcal: f.trainVsRest?.trainKcal ?? null, restDayKcal: f.trainVsRest?.restKcal ?? null,
      trainingDayProteinG: f.trainVsRest?.trainProtein ?? null, restDayProteinG: f.trainVsRest?.restProtein ?? null,
    },
    recovery: fit.recovery && { sleepBeforeTrainingH: fit.recovery.trainAvg, sleepBeforeMissedH: fit.recovery.missedAvg },
  };
}

// ───────────────────────── ترکیب روی هفته‌نامه ─────────────────────────

const MAX_INSIGHTS = 6;
const MAX_NUMBERS = 12;
const MAX_FIT_INSIGHTS = 4;

/**
 * متن‌های مخصوص ورزش رو روی هفته‌نامه‌ی ساخته‌شده می‌نشونه (تیتر، مقدمه،
 * بینش‌ها، بردها، مدال‌ها، عددها، هفته‌ی بعد) و بلوک fit رو بهش می‌چسبونه.
 * هفته‌ی جاری که هنوز دو روز نگذشته تیتر و مقدمه‌ی پایه رو نگه می‌داره.
 */
export function applyFitToLetter(letter: WeeklyLetterData, fit: FitWeek): WeeklyLetterData {
  const elapsed = letter.days.filter((d) => !d.isFuture).length;
  const partialWeek = letter.days.some((d) => d.isFuture);
  const early = partialWeek && elapsed <= 2;
  const hasScore = letter.overall.score != null && letter.overall.activeDays > 0;

  const headline = !early && hasScore ? fitHeadline(fit, partialWeek) : null;
  const intro = !early && hasScore
    ? fitIntro(fit, { weekLabel: letter.weekLabel, score: letter.overall.score, grade: letter.overall.grade, prevScore: letter.overall.prevScore })
    : "";

  const fitInsightList = fitInsights(fit).slice(0, MAX_FIT_INSIGHTS);
  const fitIds = new Set(fitInsightList.map((x) => x.id));
  const insights = [...fitInsightList, ...letter.insights.filter((x) => !fitIds.has(x.id))].slice(0, MAX_INSIGHTS);

  const wi = fitWinsImprove(fit);
  const wins = [...wi.wins, ...letter.wins.filter((w) => !wi.wins.includes(w))].slice(0, 3);
  const improve = [...wi.improve, ...letter.improve.filter((w) => !wi.improve.includes(w))].slice(0, 3);

  const medalList = fitMedals(fit);
  const replaced = new Set<string>([...FIT_REPLACED_MEDAL_KEYS, ...medalList.map((m) => m.key)]);
  const achievements = [...medalList, ...letter.achievements.filter((a) => !replaced.has(a.key))];

  const fitNums = fitNumbers(fit);
  const numbers = [...fitNums, ...letter.numbers.filter((n) => !fitNums.some((x) => x.key === n.key))].slice(0, MAX_NUMBERS);

  const sc = (d: "fitness" | "nutrition") => letter.domains.find((x) => x.domain === d)?.score ?? null;
  const nextWeek = letter.overall.score != null ? fitNextWeek(fit, letter.nextWeek, { fitness: sc("fitness"), nutrition: sc("nutrition") }) : letter.nextWeek;

  return {
    ...letter,
    fit,
    headline: headline ? isolateNumbers(headline) : letter.headline,
    intro: intro ? isolateNumbers(intro) : letter.intro,
    insights: insights.map((it) => ({ ...it, title: isolateNumbers(it.title), body: isolateNumbers(it.body) })),
    wins: isolateAll(wins),
    improve: isolateAll(improve),
    achievements,
    numbers: numbers.map((n) => ({ ...n, value: isolateNumbers(n.value), hint: n.hint ? isolateNumbers(n.hint) : n.hint })),
    nextWeek: { ...nextWeek, focusText: isolateNumbers(nextWeek.focusText) },
  };
}
