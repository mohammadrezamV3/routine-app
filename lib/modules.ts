import { ModuleKey } from "@prisma/client";

// ماژول‌هایی که پلن پایه همیشه شامل می‌شود — همون سه‌تای همیشگی
// (روتین/خواب/کار روزمره). این لیست باید با seed.ts هماهنگ بماند.
// هم ثبت‌نام معمولی هم ثبت‌نام با گوگل از همین لیست استفاده می‌کنن تا
// دوره آزمایشیِ کاربر جدید مستقل از روش ورود، یکسان باشه.
export const BASIC_MODULES: ModuleKey[] = [ModuleKey.ROUTINE, ModuleKey.SLEEP, ModuleKey.TASKS];
