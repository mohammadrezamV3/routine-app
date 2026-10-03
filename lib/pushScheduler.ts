import { isPushConfigured } from "@/lib/webPush";
import { pruneReminderLog, runDueReminders, runEconomicAlerts } from "@/lib/pushReminders";
import { sweepWaitlists } from "@/lib/mentorWaitlistServer";
import { runWeeklyLetters } from "@/lib/weeklyLetter/dispatch";

// زمان‌بند داخلی یادآوری‌ها — از instrumentation.ts یک‌بار موقع بالا
// آمدن هر پروسه‌ی سرور (next dev / next start / هر worker cluster.js) شروع
// می‌شه. قبلا ارسال پوش فقط با یک crontab بیرونی (deploy/cron.example، هر
// ۵ دقیقه) اتفاق می‌افتاد که روی دیپلوی داکر اصلا تنظیم نشده بود — یعنی وقتی
// مرورگر بسته بود *هیچ* یادآوری‌ای نمی‌رفت، و اگه هم تنظیم می‌شد تا ۵ دقیقه
// دیر. حالا هر ۳۰ ثانیه (هم‌تراز با ثانیه‌ی ~۱ و ~۳۱ هر دقیقه، چون بازه‌ها
// سر دقیقه باز می‌شن) خود سرور چک می‌کنه.
//
// چند worker هم‌زمان این رو اجرا می‌کنن؛ تکراری فرستاده نمی‌شه چون هر ارسال
// اول کلید یکتای PushReminderLog رو ادعا می‌کنه (lib/pushReminders.ts).

const TICK_MS = 30_000;
const PRUNE_EVERY_MS = 60 * 60 * 1000;
// صف انتظار منتورها (lib/mentorWaitlistServer.ts): انقضای نوبت‌ها و صندلی‌هایی
// که بدون مسیر خواندن آزاد شده‌اند (حذف حساب، اقدام ادمین). مستقل از VAPID —
// اعلان درون‌برنامه‌ای بدون پوش هم ارزش دارد. چند worker هم‌زمان امن است.
const WAITLIST_EVERY_MS = 5 * 60 * 1000;
// «هفته‌نامه» (lib/weeklyLetter/dispatch.ts): هر شنبه صبح برای هفته‌ی تموم‌شده.
// اعلان درون‌برنامه‌ای VAPID لازم نداره، پس مثل waitlist قبل از چک
// isPushConfigured اجرا می‌شه. ضدتکرار با ردیف PENDING یکتاست، چند worker امنه.
const LETTERS_EVERY_MS = 10 * 60 * 1000;

export function startPushScheduler(): void {
  const g = globalThis as unknown as { __arionPushScheduler?: boolean };
  if (g.__arionPushScheduler) return; // HMR dev یا import دوباره
  g.__arionPushScheduler = true;
  if (process.env.PUSH_SCHEDULER === "off") {
    console.log("[push] زمان‌بند داخلی با PUSH_SCHEDULER=off خاموشه");
    return;
  }
  if (!isPushConfigured()) {
    console.warn("[push] کلیدهای VAPID ست نشده — یادآوری‌ها با Web Push فرستاده نمی‌شن (NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT)");
  }

  let running = false;
  let lastPrune = 0;
  let lastWaitlist = 0;
  let lastLetters = 0;
  let lettersRunning = false;
  // هر worker کمی جابه‌جا تا همه دقیقا هم‌زمان به دیتابیس نخورن
  const jitterMs = 1000 + Math.floor(Math.random() * 1500);

  async function tick() {
    if (running) return; // تیک قبلی هنوز تموم نشده
    running = true;
    try {
      const now = new Date();
      if (now.getTime() - lastWaitlist > WAITLIST_EVERY_MS) {
        lastWaitlist = now.getTime();
        await sweepWaitlists(now).catch((err: any) => console.error(`[waitlist] sweep failed: ${err?.message || err}`));
      }
      // بدون await: مربی AI هر کاربر تا ~۵۵ ثانیه می‌تونه طول بکشه و نباید یادآوری‌ها
      // رو عقب بندازه. فقط یک اجرا هم‌زمان (lettersRunning).
      if (!lettersRunning && now.getTime() - lastLetters > LETTERS_EVERY_MS) {
        lastLetters = now.getTime();
        lettersRunning = true;
        void runWeeklyLetters(now)
          .catch((err: any) => console.error(`[letters] run failed: ${err?.message || err}`))
          .finally(() => {
            lettersRunning = false;
          });
      }
      if (!isPushConfigured()) return;
      await runDueReminders(now);
      await runEconomicAlerts(now);
      if (now.getTime() - lastPrune > PRUNE_EVERY_MS) {
        lastPrune = now.getTime();
        await pruneReminderLog(now);
      }
    } catch (err: any) {
      console.error(`[push] tick failed: ${err?.message || err}`);
    } finally {
      running = false;
    }
  }

  function scheduleNext() {
    const now = Date.now();
    const delay = TICK_MS - (now % TICK_MS) + jitterMs;
    setTimeout(() => {
      void tick().finally(scheduleNext);
    }, delay).unref?.();
  }

  scheduleNext();
}
