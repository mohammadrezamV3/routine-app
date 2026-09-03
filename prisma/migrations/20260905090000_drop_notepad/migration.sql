-- حذفِ کاملِ ماژولِ نوت‌پد (Workspace بلاک‌محور) — طبقِ درخواستِ صریحِ کاربر.
-- ترتیبِ DROP از فرزند به والد تا هیچ‌وقت به مشکلِ FK نخوریم؛ CASCADE هم
-- برای اطمینانِ اضافه (پروپرتی/رکوردهای دیتابیسِ داخلِ بلاک‌ها).
DROP TABLE IF EXISTS "NotepadDatabaseRecord" CASCADE;
DROP TABLE IF EXISTS "NotepadDatabaseProperty" CASCADE;
DROP TABLE IF EXISTS "NotepadDatabase" CASCADE;
DROP TABLE IF EXISTS "NotepadBlock" CASCADE;
DROP TABLE IF EXISTS "NotepadPage" CASCADE;
