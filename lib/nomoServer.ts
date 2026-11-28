// سمت سرور «نومو» (گفت‌وگو + عملیات چندبخشی): ساخت زمینه‌ی حداقلی برای مدل و
// اعمال عملیات تاییدشده. هر عملیات دقیقا از همان توابع مشترکی می‌گذرد که روت‌های
// خود هر بخش استفاده می‌کنند (sleepWrite، foodLogWrite، dailyTasksWrite،
// exerciseLogWrite، tradeCreate) و برای هر عملیات جدا، ماژول و فلگ ادمین سنجیده
// می‌شود. هیچ متنی از پیام کاربر یا پاسخ مدل لاگ نمی‌شود.

import { ModuleKey } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/moduleAccess";
import { featureBlocked, resolveFeaturesFor } from "@/lib/featureFlagsServer";
import { SETTING_KEYS } from "@/lib/userSettingKeys";
import { tasksForDate } from "@/lib/schedule";
import { checklistOf, isOccDone, toggleTask, type TaskMap } from "@/lib/routineChecklist";
import { parseIsoDate } from "@/lib/validate";
import { saveSleepEntry } from "@/lib/sleepWrite";
import { createFoodLog, parseFoodLogInput } from "@/lib/foodLogWrite";
import { saveDailyTasks, sanitizeTaskMap } from "@/lib/dailyTasksWrite";
import { setDayDone } from "@/lib/exerciseLogWrite";
import { createTradeEntryFromBody } from "@/lib/tradeCreate";
import { tr } from "@/lib/i18n";
import {
  OP_GATES, buildLocalIso, NOMO_MODULES, buildSleepTimes, matchOccurrence, noAccessText, sanitizeUserText, summarizeOp,
  type NomoModuleName, type NomoOp,
} from "@/lib/nomoAgent";
import type { CustomOccurrence } from "@/lib/storage";

async function readSetting(userId: string, key: string): Promise<unknown> {
  const row = await prisma.userSetting.findUnique({ where: { userId_key: { userId, key } }, select: { value: true } });
  return row?.value ?? null;
}

type DayPlan = { occ: CustomOccurrence; done: boolean };

/** برنامه‌های روتین یک روز + وضعیت انجام (همان منطق تیک «روتین من») */
export async function plansForDate(userId: string, iso: string): Promise<{ plans: DayPlan[]; tasks: TaskMap; wakeUpAt: Date | null }> {
  const date = parseIsoDate(iso);
  const [rawOcc, rawRemoved, entry] = await Promise.all([
    readSetting(userId, SETTING_KEYS.customOccurrences),
    readSetting(userId, SETTING_KEYS.removedOccurrences),
    date ? prisma.dailyEntry.findUnique({ where: { userId_date: { userId, date } }, select: { completedItems: true, wakeUpAt: true } }) : null,
  ]);
  const occurrences = Array.isArray(rawOcc) ? (rawOcc as CustomOccurrence[]) : [];
  const removed = new Set(Array.isArray(rawRemoved) ? (rawRemoved as unknown[]).filter((x): x is string => typeof x === "string") : []);
  const tasks = sanitizeTaskMap(entry?.completedItems);
  const dayTasks = tasksForDate(new Date(iso + "T00:00:00"), { removedOccurrences: removed, customOccurrences: occurrences });
  const byId = new Map(occurrences.map((o) => [o.id, o]));
  const plans: DayPlan[] = [];
  for (const t of dayTasks) {
    const occ = byId.get(t.id);
    if (occ) plans.push({ occ, done: isOccDone(tasks, occ.id, checklistOf(occ)) });
  }
  return { plans, tasks, wakeUpAt: entry?.wakeUpAt ?? null };
}

/** ماژول‌هایی که کاربر الان می‌تواند استفاده کند (دسترسی فعال + فلگ ادمین). فقط راهنمای مدل است؛ اعمال دوباره سنجیده می‌شود. */
export async function accessibleModules(userId: string, isSuperAdmin: boolean): Promise<Set<NomoModuleName>> {
  const [rows, features] = await Promise.all([
    isSuperAdmin ? Promise.resolve(null) : prisma.moduleAccess.findMany({ where: { userId, active: true }, select: { module: true, expiresAt: true } }),
    resolveFeaturesFor(userId),
  ]);
  const now = Date.now();
  const has = (m: NomoModuleName) =>
    isSuperAdmin || !!rows?.some((r) => r.module === m && (!r.expiresAt || r.expiresAt.getTime() > now));
  const out = new Set<NomoModuleName>();
  for (const m of NOMO_MODULES) {
    const flag = Object.values(OP_GATES).find((g) => g.module === m)!.flag;
    if (has(m) && features[flag] !== false) out.add(m);
  }
  return out;
}

/**
 * زمینه‌ی حداقلی برای مدل: فقط داده‌ی خود کاربر و فقط آنچه برای پاسخ لازم است.
 * هیچ ایمیل/تلفن/شناسه/توکن/محتوای منتور یا داده‌ی کاربر دیگر نمی‌آید.
 */
export async function buildNomoContext(userId: string, todayIso: string, allowed: ReadonlySet<NomoModuleName>): Promise<string> {
  const lines: string[] = [];
  lines.push(`access: ${NOMO_MODULES.map((m) => `${m}=${allowed.has(m) ? "yes" : "no"}`).join(", ")}`);
  const date = parseIsoDate(todayIso);

  if (allowed.has("ROUTINE")) {
    const { plans } = await plansForDate(userId, todayIso);
    lines.push("today_plans:");
    if (!plans.length) lines.push("- (none)");
    for (const p of plans.slice(0, 25)) {
      lines.push(`- ${sanitizeUserText(p.occ.name, 60)}${p.occ.time ? ` @ ${sanitizeUserText(p.occ.time, 20)}` : ""} [${p.done ? "done" : "todo"}]`);
    }
  }
  if (allowed.has("SLEEP") && date) {
    const from = new Date(date.getTime() - 3 * 86_400_000);
    const rows = await prisma.sleepEntry.findMany({
      where: { userId, date: { gte: from, lte: date } }, orderBy: { date: "desc" }, take: 3,
      select: { date: true, sleptAt: true, wokeAt: true, quality: true },
    });
    lines.push("recent_sleep:");
    if (!rows.length) lines.push("- (none)");
    for (const r of rows) {
      const mins = r.sleptAt && r.wokeAt ? Math.round((r.wokeAt.getTime() - r.sleptAt.getTime()) / 60000) : null;
      lines.push(`- ${r.date.toISOString().slice(0, 10)}: ${mins ? `${(mins / 60).toFixed(1)}h` : "?"}${r.quality ? `, quality ${r.quality}/5` : ""}`);
    }
  }
  if (allowed.has("CALORIE") && date) {
    const [sum, target] = await Promise.all([
      prisma.foodLogEntry.aggregate({ where: { userId, date }, _sum: { customCalories: true }, _count: true }),
      prisma.calorieTarget.findFirst({ where: { userId }, orderBy: { createdAt: "desc" }, select: { dailyTargetKcal: true } }),
    ]);
    lines.push(`calories_today: ${Math.round(sum._sum.customCalories ?? 0)} kcal in ${sum._count} entries${target ? `, daily target ${target.dailyTargetKcal}` : ""}`);
  }
  if (allowed.has("EXERCISE") && date) {
    const plan = await prisma.exercisePlan.findFirst({ where: { userId, isActive: true }, orderBy: { updatedAt: "desc" }, select: { id: true } });
    // چند جلسه در روز: انجام‌شده = هر جلسه‌ای پایان خورده باشد
    const log = plan ? await prisma.exerciseLog.findFirst({ where: { userId, planId: plan.id, date, completed: true }, select: { completed: true } }) : null;
    lines.push(`workout_today: ${plan ? (log?.completed ? "done" : "not done") : "no active plan"}`);
  }
  if (allowed.has("TRADE")) {
    const accounts = await prisma.tradeAccount.findMany({ where: { userId, archived: false }, orderBy: { order: "asc" }, take: 6, select: { name: true } });
    lines.push(`trade_accounts: ${accounts.length ? accounts.map((a) => sanitizeUserText(a.name, 40)).join(" | ") : "(none)"}`);
  }
  return lines.join("\n");
}

// ───────────────────────── اعمال ─────────────────────────

export type ApplyResult = { type: NomoOp["type"]; ok: boolean; summary: string; error?: string };

const MODULE_KEYS: Record<NomoModuleName, ModuleKey> = {
  ROUTINE: ModuleKey.ROUTINE, SLEEP: ModuleKey.SLEEP, CALORIE: ModuleKey.CALORIE, EXERCISE: ModuleKey.EXERCISE, TRADE: ModuleKey.TRADE,
};

/** اعمال عملیات‌های تاییدشده یکی‌یکی؛ شکست یکی جلوی بقیه را نمی‌گیرد. `ops` باید قبلا با parseOps رد شده باشد. */
export async function applyNomoOps(
  userId: string, ops: NomoOp[], opts: { todayIso: string; tzOffsetMin: number },
): Promise<{ results: ApplyResult[]; changedKeys: string[] }> {
  const results: ApplyResult[] = [];
  const changed = new Set<string>();
  const gateCache = new Map<NomoModuleName, boolean>();

  async function allowedOp(op: NomoOp): Promise<boolean> {
    const g = OP_GATES[op.type];
    let ok = gateCache.get(g.module);
    if (ok === undefined) {
      const m = await requireModule(MODULE_KEYS[g.module]);
      // مالک دسترسی باید همان کاربر درخواست باشد (نه شناسه‌ی ارسالی کلاینت)
      ok = m.ok && m.userId === userId && !(await featureBlocked(g.flag, userId));
      gateCache.set(g.module, ok);
    }
    return ok;
  }

  for (const op of ops) {
    const summary = summarizeOp(op);
    const fail = (error: string) => results.push({ type: op.type, ok: false, summary, error });
    try {
      if (!(await allowedOp(op))) { fail(noAccessText()); continue; }

      if (op.type === "sleep.log") {
        const t = buildSleepTimes(op.date, op.bed, op.wake, opts.tzOffsetMin);
        const r = await saveSleepEntry(userId, { date: op.date, sleptAt: t.sleptAt, wokeAt: t.wokeAt, quality: op.quality, note: op.note });
        if (typeof r === "string") { fail(r); continue; }
        changed.add("sleep");
      } else if (op.type === "task.set") {
        const day = await plansForDate(userId, op.date);
        const m = matchOccurrence(op.name, day.plans.map((p) => ({ name: p.occ.name, p })));
        if ("none" in m) { fail(tr("برنامه‌ای با این اسم برای آن روز پیدا نشد.", "No plan with that name for that day.")); continue; }
        if ("ambiguous" in m) { fail(tr("چند برنامه با این اسم هست؛ دقیق‌تر بگو.", "Several plans match; be more specific.")); continue; }
        const { occ, done } = m.match.p;
        const date = parseIsoDate(op.date);
        if (!date) { fail(tr("تاریخ نامعتبر است", "Invalid date")); continue; }
        if (done !== op.done) {
          const next = toggleTask(day.tasks, occ.id, checklistOf(occ));
          await saveDailyTasks(userId, date, next, day.wakeUpAt);
        }
        changed.add("daily");
      } else if (op.type === "food.log") {
        const data = parseFoodLogInput({ date: op.date, customName: op.name, customCalories: op.calories, grams: op.grams, mealType: op.meal ?? undefined });
        if (typeof data === "string") { fail(data); continue; }
        await createFoodLog(userId, data);
        changed.add("calorie");
      } else if (op.type === "workout.set") {
        const date = parseIsoDate(op.date);
        const plan = await prisma.exercisePlan.findFirst({ where: { userId, isActive: true }, orderBy: { updatedAt: "desc" }, select: { id: true } });
        if (!date || !plan) { fail(tr("برنامه‌ی تمرینی فعالی نداری.", "You have no active workout plan.")); continue; }
        await setDayDone(userId, plan.id, date, op.done);
        changed.add("exercise");
      } else if (op.type === "trade.add") {
        const accounts = await prisma.tradeAccount.findMany({ where: { userId, archived: false }, orderBy: { order: "asc" }, take: 20, select: { id: true, name: true } });
        let accountId: string | null = null;
        if (op.account) {
          const m = matchOccurrence(op.account, accounts);
          if ("match" in m) accountId = m.match.id;
        } else if (accounts.length === 1) accountId = accounts[0].id;
        if (!accountId) { fail(tr("حساب معاملاتی مشخص نیست؛ اسم حساب را بگو.", "Trading account is unclear; tell me the account name.")); continue; }
        const now = new Date();
        const openedAt = op.time
          ? buildLocalIso(op.date, op.time, opts.tzOffsetMin)
          : op.date === opts.todayIso ? new Date(now.getTime() - 60_000).toISOString() : buildLocalIso(op.date, "12:00", opts.tzOffsetMin);
        const created = await createTradeEntryFromBody(userId, {
          accountId, symbol: op.symbol, direction: op.direction, result: op.result, status: "CLOSED",
          openedAt, closedAt: openedAt, volume: op.volume, volumeUnit: "LOT", pnl: op.pnl,
        });
        if ("error" in created) { fail(created.error); continue; }
        changed.add("trade");
      }
      results.push({ type: op.type, ok: true, summary });
    } catch {
      // پیام خطای داخلی هیچ‌وقت به کاربر نمی‌رسد
      fail(tr("ثبت نشد. دوباره امتحان کن.", "Could not save. Please try again."));
    }
  }
  return { results, changedKeys: Array.from(changed) };
}
