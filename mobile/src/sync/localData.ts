// پاک‌کردنِ *همه‌ی* داده‌های محلیِ اپ — همه‌ی دیتابیس‌های Dexie (هسته، ورزش،
// ترید، رودمپ، کاتالوگ). جدول‌ها خالی می‌شن (نه حذفِ خودِ دیتابیس)، تا
// نمونه‌های باز (useLiveQuery و …) بدونِ reload به کار ادامه بدن.
import Dexie from "dexie";

export const LOCAL_DB_NAMES = [
  "arion-mobile",
  "arion-fitness",
  "arion-trade",
  "arion-roadmaps",
  "arion-catalog",
  "arion-trade-online",
  "arion-social",
  // کشِ HTTPِ روت‌های CACHED ِ localApi (/api/account، …) — دیتای خصوصیِ کاربر
  "arion-http-cache",
] as const;

export async function wipeAllLocalData(names: readonly string[] = LOCAL_DB_NAMES): Promise<void> {
  for (const name of names) {
    try {
      if (!(await Dexie.exists(name))) continue;
      // حالتِ پویا: بدونِ تعریفِ schema، با schemaِ فعلیِ دیتابیس باز می‌شه
      const d = new Dexie(name);
      await d.open();
      await d.transaction("rw", d.tables, async () => {
        for (const t of d.tables) await t.clear();
      });
      d.close();
    } catch {
      /* دیتابیسی که باز نمی‌شه — ادامه بده */
    }
  }
}
