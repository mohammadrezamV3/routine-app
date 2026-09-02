import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/webPush";
import { tasksForDate, timeStartMinutes } from "@/lib/schedule";
import { FA_WEEKDAY, isoLocal } from "@/lib/jalali";
import { DEFAULT_NOTIF_PREFS, NotifPrefs } from "@/lib/notifPrefs";
import { isValidCronRequest } from "@/lib/cronAuth";

// POST /api/push/send-reminders — نه یه چیزیه که خود کاربر/کلاینت صداش بزنه،
// یه cron بیرونی (مثلا crontab خود VPS، طبق راهنمای دیپلوی) هر چند
// دقیقه یک‌بار این‌جا رو می‌زنه. همون منطق «یادآوری برنامه/تمرین» که
// NotificationPanel.tsx سمت کلاینت (فقط وقتی تب بازه) حساب می‌کرد، این‌جا
// سمت سرور برای هر کاربر سابسکرایب‌شده تکرار می‌شه و به‌جای نمایش توی پنل،
// با Web Push واقعا فرستاده می‌شه (حتی وقتی اپ بسته‌ست).
//
// جلوگیری از ارسال تکراری: چون این روت هر چند دقیقه صدا زده می‌شه ولی هر
// یادآوری فقط باید یک‌بار در روز فرستاده بشه، یک رد کوچیک روی همون
// UserSetting (کلید "pushSentLog") نگه می‌داریم: { [key]: "YYYY-MM-DD" }.

const EXERCISE_REMINDER_HOUR = 17;

function todayKey(d: Date): string {
  return isoLocal(d);
}

export async function POST(req: NextRequest) {
  if (!isValidCronRequest(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const today = todayKey(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  // فقط کاربرهایی که حداقل یک دستگاه سابسکرایب‌شده دارن — بقیه رو حتی
  // بررسی هم نمی‌کنیم، هزینه‌ای نداره.
  const userIds = await prisma.pushSubscription.findMany({ distinct: ["userId"], select: { userId: true } });

  let checked = 0;
  let pushed = 0;

  for (const { userId } of userIds) {
    checked++;
    // همه‌ی تنظیمات لازم این کاربر با یک کوئری خونده می‌شن. قبلا هر کلید
    // یک findUnique جدا بود (notifPrefs + removedOccurrences +
    // customOccurrences + pushSentLog…) یعنی به‌ازای هر کاربر سابسکرایب‌شده
    // ۴ تا ۶ رفت‌وبرگشت به دیتابیس — با چند هزار کاربر، هر اجرای کران
    // ده‌ها هزار کوئری می‌شد.
    const settingRows = await prisma.userSetting.findMany({
      where: { userId, key: { in: ["notifPrefs", "removedOccurrences", "customOccurrences", "pushSentLog"] } },
    });
    const settings = new Map(settingRows.map((r) => [r.key, r.value]));
    const prefs: NotifPrefs = { ...DEFAULT_NOTIF_PREFS, ...((settings.get("notifPrefs") as Partial<NotifPrefs>) || {}) };
    // رد «امروز فرستاده شد» یک‌بار خونده و در حافظه نگه داشته می‌شه، و فقط
    // اگه واقعا چیزی فرستاده شد یک‌بار در انتها نوشته می‌شه.
    const sentLog: Record<string, string> = { ...((settings.get("pushSentLog") as Record<string, string>) || {}) };
    let sentLogDirty = false;
    const wasSent = (key: string) => sentLog[key] === today;
    const markSentLocal = (key: string) => { sentLog[key] = today; sentLogDirty = true; };

    if (prefs.taskReminders) {
      const removedOccurrences = new Set<string>((settings.get("removedOccurrences") as string[]) || []);
      const customOccurrences = (settings.get("customOccurrences") as { id: string; name: string; jsDay: number; time: string }[]) || [];
      const dailyEntry = await prisma.dailyEntry.findUnique({ where: { userId_date: { userId, date: new Date(today) } } });
      const completedItems = (dailyEntry?.completedItems as Record<string, boolean>) || {};

      const tasks = tasksForDate(now, { removedOccurrences, customOccurrences });
      for (const t of tasks) {
        const startMinutes = timeStartMinutes(t.time);
        if (startMinutes === null || completedItems[t.id]) continue;
        if (nowMinutes >= startMinutes - 30 && nowMinutes < startMinutes) {
          const key = `soon:${t.id}:${today}`;
          if (!wasSent(key)) {
            await sendPushToUser(userId, { title: "یادآوری برنامه", body: `تا ۳۰ دقیقه دیگه وقت «${t.name}» می‌رسه.`, url: "/weekly" });
            markSentLocal(key);
            pushed++;
          }
        }
      }
    }

    if (prefs.exerciseReminders && now.getHours() >= EXERCISE_REMINDER_HOUR) {
      const key = `exercise:${today}`;
      if (!wasSent(key)) {
        const plan = await prisma.exercisePlan.findFirst({ where: { userId, isActive: true }, orderBy: { createdAt: "desc" } });
        if (plan) {
          const todayName = FA_WEEKDAY[now.getDay()];
          const planData = plan.planData as { day: string; focus: string }[];
          const todayPlan = planData.find((d) => d.day === todayName);
          if (todayPlan) {
            const log = await prisma.exerciseLog.findFirst({ where: { planId: plan.id, userId, date: new Date(today) } });
            if (!log?.completed) {
              await sendPushToUser(userId, { title: "یادآوری تمرین", body: `برنامه‌ی ورزشی امروز (${todayPlan.focus}) هنوز ثبت نشده.`, url: "/exercise" });
              markSentLocal(key);
              pushed++;
            }
          }
        }
      }
    }

    // یک نوشتن به‌ازای هر کاربر (فقط اگه چیزی فرستاده شده)، نه یکی به‌ازای هر
    // یادآوری. کلیدهای مال روزهای قبل هم همین‌جا دور ریخته می‌شن.
    if (sentLogDirty) {
      const cleaned: Record<string, string> = {};
      for (const [k, v] of Object.entries(sentLog)) if (v === today) cleaned[k] = v;
      await prisma.userSetting.upsert({
        where: { userId_key: { userId, key: "pushSentLog" } },
        create: { userId, key: "pushSentLog", value: cleaned },
        update: { value: cleaned },
      });
    }
  }

  return NextResponse.json({ ok: true, checked, pushed });
}
