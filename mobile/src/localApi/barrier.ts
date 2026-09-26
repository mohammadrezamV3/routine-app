// «سدِ سینک» برای روت‌هایی که سرور خودش دیتای کاربر رو می‌خونه/می‌نویسه
// (دستیارِ روتین، ساختِ برنامه/رودمپ، گزارشِ هفتگی): اول تغییرهای محلیِ
// dirty push می‌شن تا سرور نسخه‌ی تازه رو ببینه، بعد درخواست، و بعد از پاسخِ
// موفق pull تا نوشته‌های سرور همون لحظه در Dexie باشن (نه سینکِ بعدی).
// engine.sync() خودش push+pull و single-flight است؛ آفلاین فوری برمی‌گرده.
import { services } from "./services";

export async function withBarrier(fn: () => Promise<Response>): Promise<Response> {
  const s = services();
  const active = () => s.syncEnabled && s.tokens.isLoggedIn();
  if (active()) await s.engine.sync();
  const res = await fn();
  if (res.ok && active()) await s.engine.sync();
  return res;
}
