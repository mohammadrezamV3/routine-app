import { ErrorSeverity } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// ثبتِ رخدادهای خطای واقعیِ سیستم برای بخشِ «خطاها»ی پنلِ Owner — فقط از
// جاهایی صدا زده می‌شه که واقعاً یک catch رخ داده، هیچ‌وقت داده‌ی ساختگی.
// هیچ‌وقت نباید خودش پرتاب کنه — ثبتِ لاگ نباید جلوی مسیرِ اصلیِ درخواست رو بگیره.
export function logError(service: string, message: string, opts?: { severity?: ErrorSeverity; context?: Record<string, unknown> }) {
  prisma.errorLog
    .create({
      data: {
        service,
        message: message.slice(0, 2000),
        severity: opts?.severity || ErrorSeverity.ERROR,
        context: opts?.context as any,
      },
    })
    .catch(() => {});
}
