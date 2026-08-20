import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/webPush";
import { tasksForDate, timeStartMinutes } from "@/lib/schedule";
import { FA_WEEKDAY, isoLocal } from "@/lib/jalali";
import { DEFAULT_NOTIF_PREFS, NotifPrefs } from "@/lib/notifPrefs";

// POST /api/push/send-reminders — نه یه چیزیه که خودِ کاربر/کلاینت صداش بزنه،
// یه cronِ بیرونی (مثلاً crontabِ خودِ VPS، طبقِ راهنمای دیپلوی) هر چند
// دقیقه یک‌بار این‌جا رو می‌زنه. همون منطقِ «یادآوریِ برنامه/تمرین» که
// NotificationPanel.tsx سمتِ کلاینت (فقط وقتی تب بازه) حساب می‌کرد، این‌جا
// سمتِ سرور برای هر کاربرِ سابسکرایب‌شده تکرار می‌شه و به‌جای نمایشِ توی پنل،
// با Web Push واقعاً فرستاده می‌شه (حتی وقتی اپ بسته‌ست).
//
// جلوگیری از ارسالِ تکراری: چون این روت هر چند دقیقه صدا زده می‌شه ولی هر
// یادآوری فقط باید یک‌بار در روز فرستاده بشه، یک ردِ کوچیک روی همون
// UserSetting (کلیدِ "pushSentLog") نگه می‌داریم: { [key]: "YYYY-MM-DD" }.

const EXERCISE_REMINDER_HOUR = 17;

function todayKey(d: Date): string {
  return isoLocal(d);
}

async function alreadySent(userId: string, key: string, today: string): Promise<boolean> {
  const row = await prisma.userSetting.findUnique({ where: { userId_key: { userId, key: "pushSentLog" } } });
  const log = (row?.value as Record<string, string>) || {};
  return log[key] === today;
}

async function markSent(userId: string, key: string, today: string): Promise<void> {
  const row = await prisma.userSetting.findUnique({ where: { userId_key: { userId, key: "pushSentLog" } } });
  const log = (row?.value as Record<string, string>) || {};
  // پاک‌سازی: کلیدهای مالِ روزهای قبل نگه داشته نمی‌شن، وگرنه این آبجکت بی‌نهایت بزرگ می‌شد.
  const cleaned: Record<string, string> = {};
  for (const [k, v] of Object.entries(log)) if (v === today) cleaned[k] = v;
  cleaned[key] = today;
  await prisma.userSetting.upsert({
    where: { userId_key: { userId, key: "pushSentLog" } },
    create: { userId, key: "pushSentLog", value: cleaned },
    update: { value: cleaned },
  });
}

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const provided = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || req.nextUrl.searchParams.get("secret");
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const today = todayKey(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  // فقط کاربرهایی که حداقل یک دستگاهِ سابسکرایب‌شده دارن — بقیه رو حتی
  // بررسی هم نمی‌کنیم، هزینه‌ای نداره.
  const userIds = await prisma.pushSubscription.findMany({ distinct: ["userId"], select: { userId: true } });

  let checked = 0;
  let pushed = 0;

  for (const { userId } of userIds) {
    checked++;
    const prefsRow = await prisma.userSetting.findUnique({ where: { userId_key: { userId, key: "notifPrefs" } } });
    const prefs: NotifPrefs = { ...DEFAULT_NOTIF_PREFS, ...((prefsRow?.value as Partial<NotifPrefs>) || {}) };

    if (prefs.taskReminders) {
      const removedRow = await prisma.userSetting.findUnique({ where: { userId_key: { userId, key: "removedOccurrences" } } });
      const customRow = await prisma.userSetting.findUnique({ where: { userId_key: { userId, key: "customOccurrences" } } });
      const removedOccurrences = new Set<string>((removedRow?.value as string[]) || []);
      const customOccurrences = (customRow?.value as { id: string; name: string; jsDay: number; time: string }[]) || [];
      const dailyEntry = await prisma.dailyEntry.findUnique({ where: { userId_date: { userId, date: new Date(today) } } });
      const completedItems = (dailyEntry?.completedItems as Record<string, boolean>) || {};

      const tasks = tasksForDate(now, { removedOccurrences, customOccurrences });
      for (const t of tasks) {
        const startMinutes = timeStartMinutes(t.time);
        if (startMinutes === null || completedItems[t.id]) continue;
        if (nowMinutes >= startMinutes - 30 && nowMinutes < startMinutes) {
          const key = `soon:${t.id}:${today}`;
          if (!(await alreadySent(userId, key, today))) {
            await sendPushToUser(userId, { title: "یادآوری برنامه", body: `تا ۳۰ دقیقه دیگه وقت «${t.name}» می‌رسه.`, url: "/weekly" });
            await markSent(userId, key, today);
            pushed++;
          }
        }
      }
    }

    if (prefs.exerciseReminders && now.getHours() >= EXERCISE_REMINDER_HOUR) {
      const key = `exercise:${today}`;
      if (!(await alreadySent(userId, key, today))) {
        const plan = await prisma.exercisePlan.findFirst({ where: { userId, isActive: true }, orderBy: { createdAt: "desc" } });
        if (plan) {
          const todayName = FA_WEEKDAY[now.getDay()];
          const planData = plan.planData as { day: string; focus: string }[];
          const todayPlan = planData.find((d) => d.day === todayName);
          if (todayPlan) {
            const log = await prisma.exerciseLog.findFirst({ where: { planId: plan.id, userId, date: new Date(today) } });
            if (!log?.completed) {
              await sendPushToUser(userId, { title: "یادآوری تمرین", body: `برنامه‌ی ورزشی امروز (${todayPlan.focus}) هنوز ثبت نشده.`, url: "/exercise" });
              await markSent(userId, key, today);
              pushed++;
            }
          }
        }
      }
    }
  }

  return NextResponse.json({ ok: true, checked, pushed });
}
