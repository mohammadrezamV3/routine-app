// پیش‌فرض‌های محیط تست — فقط وقتی خود محیط مقدار نداده باشد.
// lib/e2ee/server.ts برای برچسب فرانکینگ و رمزگذاری در حال سکون به یک راز
// نیاز دارد (MENTOR_FRANKING_SECRET / MENTOR_DATA_KEY، یا مشتق از NEXTAUTH_SECRET).
process.env.NEXTAUTH_SECRET ||= "test-nextauth-secret-0123456789abcdef";
process.env.MENTOR_DATA_KEY ||= `t1:${Buffer.alloc(32, 7).toString("base64")}`;

// محافظ درخواست (lib/requestGuard.ts) حالت پروسه‌ای داره (پنجره‌ها، سمافورها،
// قطع‌کننده‌ها)؛ بین تست‌ها صفر می‌شه تا تست‌هایی که پشت‌سرهم یک روت رو صدا می‌زنن
// یا یک منبع بیرونی رو خراب می‌کنن روی هم اثر نذارن.
import { beforeEach } from "vitest";
import { resetGuardStateForTests } from "@/lib/guard/registry";
beforeEach(() => { resetGuardStateForTests(); });
process.env.ARION_GUARD_DISABLED ||= "1";
