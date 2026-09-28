-- رد ضدتکرارِ یادآوری‌های Web Push (lib/pushScheduler.ts). جایگزینِ JSONِ
-- UserSetting.pushSentLog/tradeNewsAlertLog که read-modify-write بود و با چند
-- workerِ هم‌زمان دوبار می‌فرستاد.

CREATE TABLE "PushReminderLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "deadline" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushReminderLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PushReminderLog_userId_key_key" ON "PushReminderLog"("userId", "key");

CREATE INDEX "PushReminderLog_deadline_idx" ON "PushReminderLog"("deadline");

ALTER TABLE "PushReminderLog" ADD CONSTRAINT "PushReminderLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
