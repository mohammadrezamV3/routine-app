import { featureBlocked } from "@/lib/featureFlagsServer";
import { NextRequest, NextResponse } from "next/server";
import { ModuleKey } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getNomoFreeUses } from "@/lib/aiQuota";
import { requireModule } from "@/lib/moduleAccess";
import { checkRateLimit } from "@/lib/rateLimit";
import { readJsonBody } from "@/lib/validate";
import { planRoutineChange, type RoutineChatTurn } from "@/lib/aiClient";
import { logError } from "@/lib/errorLog";
import { SETTING_KEYS, ROUTINE_ASSISTANT_USES_KEY } from "@/lib/userSettingKeys";
import { toJalali, faNum, J_MONTHS } from "@/lib/jalali";
import {
  applyOps, describeSchedule, sortOccurrences, stripInventedTimes,
  buildCalendarTable, describeMentions, extractDateMentions, invalidDateMessage, reconcileOpDates,
  DAY_NAME_FA, DEFAULT_AWAKE, type AwakeWindow,
} from "@/lib/routineAssistant";
import { addDaysIso } from "@/lib/schedule";
import type { CustomOccurrence } from "@/lib/storage";
import { tr, isEn } from "@/lib/i18n";
import { publishDataChanged, clientTabId } from "@/lib/realtime";

// دستیار «مدیر برنامه» — تنها نقطه‌ای که مدل زبانی اجازه دارد برنامه‌های
// کاربر را عوض کند.
//
// چیدمان عمدی مسئولیت‌ها:
//   • مدل  → فقط *پیشنهاد* می‌دهد (چه چیزی اضافه/جابه‌جا/حذف شود)
//   • این روت → اعتبارسنجی، اعمال، ذخیره
// یعنی هیچ ادعایی از مدل (ساعت آزاد است، برنامه وجود دارد، روز درست است)
// بدون بررسی دوباره اثر نمی‌کند. `lib/routineAssistant.ts` همان
// اعتبارسنجی‌هایی را می‌کند که فرم‌های دستی می‌کنند، پس نتیجه‌ی دو مسیر یکی است.

export const dynamic = "force-dynamic";

const MAX_MESSAGE_LEN = 500;

/** متن ثابت رد پیام خارج از موضوع — عمدا از خود کد، نه از مدل. */
const offTopicReply = () =>
  tr("من نومو‌ام، مدیر برنامه‌ات — بگو چه برنامه‌ای اضافه/جابه‌جا/حذف کنم.", "I am Nomo, your schedule manager — tell me which plan to add, move or remove.");

/**
 * آیا این کاربر اشتراک فعال دارد؟
 *
 * ثبت‌نام عادی هیچ ردیف Subscription نمی‌سازد (فقط ModuleAccess پایه)، پس
 * «نداشتن ردیف فعال» دقیقا یعنی کاربر رایگان. شرط currentPeriodEnd هم
 * لازم است چون ردیف منقضی ممکن است هنوز status قدیمی داشته باشد — همان
 * باگی که در /api/account هم بود.
 */
async function hasActiveSubscription(userId: string): Promise<boolean> {
  const sub = await prisma.subscription.findFirst({
    where: { userId, status: { in: ["ACTIVE", "TRIAL"] }, currentPeriodEnd: { gt: new Date() } },
    select: { id: true },
  });
  return !!sub;
}

/**
 * «نومو» مثل خود روتین کامل رایگان نیست:
 *   • سوپریوزر یا اشتراک فعال → نامحدود
 *   • بقیه → سهمیه‌ی مادام‌العمر پیام‌های رایگان (getNomoFreeUses، پیش‌فرض
 *     FREE_ASSISTANT_USES = ۱۰، قابل تغییر از پنل ادمین)
 */
async function assistantAccess(userId: string, isSuperAdmin: boolean): Promise<{ unlimited: boolean; freeLimit: number }> {
  if (isSuperAdmin || (await hasActiveSubscription(userId))) return { unlimited: true, freeLimit: 0 };
  return { unlimited: false, freeLimit: await getNomoFreeUses() };
}

async function readUses(userId: string): Promise<number> {
  const row = await prisma.userSetting.findUnique({
    where: { userId_key: { userId, key: ROUTINE_ASSISTANT_USES_KEY } },
    select: { value: true },
  });
  const n = Number(row?.value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

async function writeUses(userId: string, value: number): Promise<void> {
  await prisma.userSetting.upsert({
    where: { userId_key: { userId, key: ROUTINE_ASSISTANT_USES_KEY } },
    create: { userId, key: ROUTINE_ASSISTANT_USES_KEY, value },
    update: { value },
  });
}

async function readOccurrences(userId: string, key: string): Promise<any> {
  const row = await prisma.userSetting.findUnique({
    where: { userId_key: { userId, key } },
    select: { value: true },
  });
  return row?.value ?? null;
}

/**
 * ساعت‌های بیداری کاربر — وقتی خودمان باید برای یک برنامه وقت پیدا کنیم،
 * جست‌وجو باید داخل همین بازه باشد نه کل شبانه‌روز. نبود تنظیم یعنی
 * بازه‌ی پیش‌فرض؛ خواب بعد از نیمه‌شب هم به آخر روز محدود می‌شود چون
 * برنامه‌ها روز هفته‌ای‌اند و از نیمه‌شب به روز بعد سر نمی‌روند.
 */
function awakeWindow(raw: unknown): AwakeWindow {
  const v = raw as { wake?: unknown; sleep?: unknown } | null;
  const toMin = (t: unknown): number | null => {
    if (typeof t !== "string") return null;
    const m = /^(\d{1,2}):(\d{2})$/.exec(t.trim());
    if (!m) return null;
    const h = Number(m[1]), mm = Number(m[2]);
    if (h > 23 || mm > 59) return null;
    return h * 60 + mm;
  };
  const startMin = toMin(v?.wake);
  const rawEnd = toMin(v?.sleep);
  if (startMin === null || rawEnd === null) return DEFAULT_AWAKE;
  const endMin = rawEnd > startMin ? rawEnd : 24 * 60 - 1;
  return { startMin, endMin };
}

/** تاریخچه‌ی گفت‌وگو از کلاینت می‌آید، پس مثل هر ورودی دیگری پاک‌سازی می‌شود */
function parseHistory(raw: unknown): RoutineChatTurn[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((t: any) => t && (t.role === "user" || t.role === "assistant") && typeof t.text === "string")
    .slice(-8)
    .map((t: any) => ({ role: t.role, text: String(t.text).slice(0, 600) }));
}

/** امروز به وقت ایران — سرور (Docker) معمولا UTC است و بین ۰۰:۰۰ تا ۰۳:۳۰
 *  بامداد ایران، `new Date()` سرور هنوز «دیروز» را می‌دهد. */
function tehranTodayIso(): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tehran", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  } catch {
    return new Date(Date.now() + 3.5 * 3600_000).toISOString().slice(0, 10);
  }
}

/**
 * «امروز» کاربر. ریشه‌ی باگ «روز اشتباه»: قبلا سرور با ساعت خودش
 * (UTC) امروز را حساب می‌کرد و «فردا»ی کاربر نیمه‌شب‌ها یک روز عقب ثبت
 * می‌شد. حالا تاریخ محلی دستگاه کاربر ملاک است — ولی چون از کلاینت
 * می‌آید، فقط اگر حداکثر یک روز با تاریخ ایران فاصله داشته باشد پذیرفته
 * می‌شود.
 */
function resolveToday(raw: unknown): string {
  const tehran = tehranTodayIso();
  if (typeof raw !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return tehran;
  const ok = [addDaysIso(tehran, -1), tehran, addDaysIso(tehran, 1)].includes(raw);
  return ok ? raw : tehran;
}

function jalaliLabel(iso: string, withWeekday = true): string {
  const d = new Date(iso + "T00:00:00");
  const j = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  const text = `${faNum(j[2])} ${J_MONTHS[j[1] - 1]} ${faNum(j[0])}`;
  return withWeekday ? `${DAY_NAME_FA[d.getDay()]} ${text}` : text;
}

export async function POST(req: NextRequest) {
  // ROUTINE ماژول پایه و همیشه رایگان است؛ این نگهبان این‌جا برای دسترسی
  // نیست، برای همان سه کار دیگری است که می‌کند: ۴۰۱ برای مهمان، بلاک
  // کاربر مسدودشده، و بیرون‌دادن userId/isSuperAdmin. خود «نومو» جزو
  // رایگان نیست — پایین‌تر با assistantAccess (سهمیه‌ی پیام رایگان) سنجیده می‌شود.
  const guard = await requireModule(ModuleKey.ROUTINE);
  if (!guard.ok) return guard.response;
  { const off = await featureBlocked("routineAssistant", guard.userId); if (off) return off; }
  const { userId, isSuperAdmin } = guard;

  // سقف نرخ مستقل از سهمیه است: سهمیه محدودیت محصولی است، این جلوی
  // هزینه‌ی گیت‌وی را می‌گیرد — از جمله برای مشترکی که سهمیه‌اش نامحدود است
  // و برای پیام‌های خارج از موضوع که سهمیه مصرف نمی‌کنند.
  if (!(await checkRateLimit(`routine-assistant:${userId}`, 15, 10 * 60 * 1000))) {
    return NextResponse.json(
      { error: tr("پیام‌ها را خیلی سریع پشت هم فرستادی. چند دقیقه صبر کن و دوباره امتحان کن.", "You are sending messages too quickly. Wait a few minutes and try again.") },
      { status: 429 }
    );
  }

  const parsed = await readJsonBody<{ message?: unknown; history?: unknown; today?: unknown }>(req, 16 * 1024);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });

  const message = typeof parsed.body?.message === "string" ? parsed.body.message.trim() : "";
  if (!message) {
    return NextResponse.json({ error: tr("چیزی ننوشتی. بگو با برنامه‌ات چه کار کنم.", "You did not write anything. Tell me what to do with your schedule.") }, { status: 400 });
  }
  if (message.length > MAX_MESSAGE_LEN) {
    return NextResponse.json(
      { error: tr(`پیامت خیلی بلند است (حداکثر ${MAX_MESSAGE_LEN} کاراکتر). کوتاه‌تر و مشخص‌تر بنویس.`, `Your message is too long (max ${MAX_MESSAGE_LEN} characters). Make it shorter and more specific.`) },
      { status: 400 }
    );
  }

  // ---------- تاریخ‌های پیام کاربر ----------
  // تاریخ‌ها سمت سرور حل می‌شوند، نه با حساب ذهنی مدل (باگ «30 مهر → 8
  // آبان»). جواب کوتاه به سوال قبلی دستیار («آره همون») تاریخ ندارد، پس
  // آن‌وقت تاریخ‌های آخرین پیام قبلی کاربر ملاک‌اند.
  const history = parseHistory(parsed.body?.history);
  const todayIso = resolveToday(parsed.body?.today);
  let mentions = extractDateMentions(message, todayIso);
  if (!mentions.length) {
    const prevUser = history.filter((t) => t.role === "user").slice(-1)[0];
    if (prevUser) mentions = extractDateMentions(prevUser.text, todayIso);
  }
  // تاریخی که وجود ندارد («31 مهر») قبل از مصرف سهمیه و بدون حدس جواب می‌گیرد
  const badMention = extractDateMentions(message, todayIso).find((m) => !m.iso);
  if (badMention) {
    return NextResponse.json({
      reply: invalidDateMessage(badMention),
      applied: [],
      problems: [invalidDateMessage(badMention)],
      options: [],
      changed: false,
    });
  }

  // ---------- دسترسی و سهمیه ----------
  const { unlimited, freeLimit } = await assistantAccess(userId, isSuperAdmin);
  let usesBefore = 0;
  if (!unlimited) {
    usesBefore = await readUses(userId);
    if (usesBefore >= freeLimit) {
      return NextResponse.json(
        {
          error: tr(
            `${freeLimit} پیام رایگان نومو تمام شده. با فعال‌کردن اشتراک، ` +
            `بدون محدودیت می‌توانی برنامه‌هایت را با گفت‌وگو بچینی.`,
            `Your ${freeLimit} free Nomo messages are used up. Activate a subscription to organise your schedule by chat without limits.`
          ),
          quotaExhausted: true,
          quota: { unlimited: false, used: usesBefore, limit: freeLimit, remaining: 0 },
        },
        { status: 403 }
      );
    }
    // *قبل* از فراخوانی مصرف می‌شود، نه بعدش: دو درخواست هم‌زمان نباید هر
    // دو یک سهمیه را ببینند. اگر پیام خارج از موضوع بود یا گیت‌وی خطا داد،
    // پایین‌تر پس داده می‌شود.
    await writeUses(userId, usesBefore + 1);
  }

  async function refundQuota() {
    if (!unlimited) await writeUses(userId, usesBefore).catch(() => {});
  }

  // ---------- وضعیت فعلی برنامه‌ها ----------
  const rawOcc = await readOccurrences(userId, SETTING_KEYS.customOccurrences);
  const occurrences: CustomOccurrence[] = Array.isArray(rawOcc) ? (rawOcc as CustomOccurrence[]) : [];
  const rawRemoved = await readOccurrences(userId, SETTING_KEYS.removedOccurrences);
  const removed: string[] = Array.isArray(rawRemoved) ? (rawRemoved as string[]).filter((x) => typeof x === "string") : [];
  const awake = awakeWindow(await readOccurrences(userId, SETTING_KEYS.wakeSleepTimes));

  const ordered = sortOccurrences(occurrences);
  const mentionText = describeMentions(mentions);

  // ---------- فراخوانی مدل ----------
  let plan;
  try {
    plan = await planRoutineChange(
      message,
      describeSchedule(ordered, { todayIso, removed: new Set(removed) }),
      jalaliLabel(todayIso),
      userId,
      history,
      (mentionText ? `تاریخ‌هایی که کاربر گفته (سیستم دقیق حساب کرده — همین‌ها را بنویس):\n${mentionText}\n\n` : "") +
        `جدول تاریخ‌ها (میلادی | روز هفته و تاریخ جلالی):\n${buildCalendarTable(todayIso)}` +
        (isEn() ? "\n\nReply to the user in English; keep JSON keys and Persian day names as they are." : "")
    );
  } catch (err: any) {
    await refundQuota();
    logError("ai-gateway", `دستیار روتین شکست خورد: ${err?.message || err}`, {
      context: { feature: "ROUTINE_ASSISTANT" },
    });
    return NextResponse.json(
      { error: tr("الان نتوانستم به دستیار وصل شوم. یک دقیقه‌ی دیگر دوباره بفرست — این پیام سهمیه‌ات را مصرف نکرد.", "I could not reach the assistant right now. Send it again in a minute — this message did not use your quota.") },
      { status: 503 }
    );
  }

  const quotaAfter = (used: number) => ({
    unlimited,
    used,
    limit: unlimited ? null : freeLimit,
    remaining: unlimited ? null : Math.max(0, freeLimit - used),
  });

  // ---------- خارج از موضوع ----------
  if (plan.offTopic) {
    await refundQuota();
    return NextResponse.json({
      reply: offTopicReply(),
      offTopic: true,
      applied: [],
      problems: [],
      options: [tr("برنامه‌های امروزم را نشانم بده", "Show me today's plans"), tr("یک برنامه‌ی جدید اضافه کن", "Add a new plan")],
      changed: false,
      quota: quotaAfter(usesBefore),
    });
  }

  // ---------- مدل خودش سوال دارد ----------
  if (plan.ask) {
    return NextResponse.json({
      reply: plan.ask.question,
      applied: [],
      problems: [],
      options: plan.ask.options,
      asking: true,
      changed: false,
      quota: quotaAfter(unlimited ? 0 : usesBefore + 1),
    });
  }

  // ---------- فقط سوال، بدون تغییر ----------
  if (!plan.ops.length) {
    return NextResponse.json({
      reply: plan.reply || tr("چیزی برای تغییر پیدا نکردم. دقیق‌تر بگو با کدام برنامه چه کار کنم.", "I did not find anything to change. Be more specific about which plan and what to do."),
      applied: [],
      problems: [],
      options: [],
      changed: false,
      quota: quotaAfter(unlimited ? 0 : usesBefore + 1),
    });
  }

  // ---------- اعمال ----------
  // ساعتی که کاربر اصلا نگفته، دور ریخته می‌شود — آخرین پیام کاربر و دو
  // پیام قبلی‌اش (برای جواب‌های کوتاه به سوال دستیار) ملاک‌اند.
  const userTexts = [message, ...history.filter((t) => t.role === "user").slice(-2).map((t) => t.text)];
  const { ops: timedOps } = stripInventedTimes(plan.ops, userTexts);
  // تاریخی که مدل نوشته ولی با گفته‌ی کاربر نمی‌خواند، با تاریخ واقعی عوض می‌شود
  const { ops } = reconcileOpDates(timedOps, mentions, todayIso);
  const outcome = applyOps(ordered, removed, ops, todayIso, awake);

  if (outcome.changed) {
    const next = sortOccurrences(outcome.occurrences);
    await prisma.userSetting.upsert({
      where: { userId_key: { userId, key: SETTING_KEYS.customOccurrences } },
      create: { userId, key: SETTING_KEYS.customOccurrences, value: next as any },
      update: { value: next as any },
    });
    // فهرست حذف‌شده‌ها فقط وقتی نوشته می‌شود که واقعا فرق کرده باشد —
    // یک upsert اضافه برای هر پیام بی‌دلیل است.
    if (outcome.removed.length !== removed.length) {
      await prisma.userSetting.upsert({
        where: { userId_key: { userId, key: SETTING_KEYS.removedOccurrences } },
        create: { userId, key: SETTING_KEYS.removedOccurrences, value: outcome.removed as any },
        update: { value: outcome.removed as any },
      });
    }
    // برنامه‌ی باز روی بقیه‌ی دستگاه‌ها/تب‌های کاربر همون لحظه عوض می‌شه
    void publishDataChanged(userId, [SETTING_KEYS.customOccurrences, SETTING_KEYS.removedOccurrences], clientTabId(req));
  }

  // متن نهایی از نتیجه‌ی *واقعی* ساخته می‌شود، نه از حرف مدل. اگر مدل
  // گفته باشد «انجام شد» ولی تداخل مانع شده باشد، کاربر نباید آن را ببیند.
  const lines: string[] = [];
  if (outcome.applied.length) lines.push(...outcome.applied);
  if (outcome.problems.length) lines.push(...outcome.problems);
  if (!lines.length) lines.push(plan.reply || tr("تغییری لازم نبود.", "No change was needed."));

  return NextResponse.json({
    reply: lines.join("\n"),
    applied: outcome.applied,
    problems: outcome.problems,
    options: outcome.options,
    changed: outcome.changed,
    occurrences: outcome.changed ? sortOccurrences(outcome.occurrences) : null,
    removed: outcome.changed ? outcome.removed : null,
    quota: quotaAfter(unlimited ? 0 : usesBefore + 1),
  });
}

// GET — فقط وضعیت سهمیه، برای این‌که UI بتواند قبل از تایپ‌کردن بگوید
// چند بار مانده (و دکمه را برای کاربر تمام‌شده غیرفعال کند).
export async function GET() {
  const guard = await requireModule(ModuleKey.ROUTINE);
  if (!guard.ok) return guard.response;
  { const off = await featureBlocked("routineAssistant", guard.userId); if (off) return off; }
  const { userId, isSuperAdmin } = guard;

  const { unlimited, freeLimit } = await assistantAccess(userId, isSuperAdmin);
  const used = unlimited ? 0 : await readUses(userId);
  return NextResponse.json({
    unlimited,
    used,
    limit: unlimited ? null : freeLimit,
    remaining: unlimited ? null : Math.max(0, freeLimit - used),
  });
}
