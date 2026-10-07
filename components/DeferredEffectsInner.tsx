"use client";

// افکت‌های پس‌زمینه‌ی بدون UI اولیه (یادآور، realtime، اطلاعیه، تبریک مناسبت)
// که نباید روی باندل بحرانی لود بشن — فقط از DeferredEffects بارگذاری می‌شه.
import { NotificationEngine } from "./NotificationEngine";
import { RealtimeProvider } from "./RealtimeProvider";
import { AnnouncementDelivery } from "./AnnouncementDelivery";
import { EventThemeGreeting } from "./EventThemeGreeting";

export default function DeferredEffectsInner() {
  return (
    <>
      <NotificationEngine />
      {/* WebSocket `/ws` برای کاربر لاگین‌کرده — تغییرات همون لحظه روی همه‌ی دستگاه‌ها */}
      <RealtimeProvider />
      {/* پاپ‌آپ/بنر اطلاعیه‌ها — lib/announcements.ts */}
      <AnnouncementDelivery />
      <EventThemeGreeting />
    </>
  );
}
