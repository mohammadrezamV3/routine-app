// اعتبارسنجی ورودی ابزارهای رایگان عمومی (ماشین‌حساب‌های سئو) با جدول حد اعداد.
import { checkNumber, type LimitSpec } from "./numberLimits";

/** متن ورودی را با حد جدول می‌سنجد؛ null یعنی درست و عدد در `value` نیست — برای مقدار از toolNum استفاده کن */
export function numErr(text: string, spec: LimitSpec): string | null {
  const r = checkNumber(text, spec, { coerceString: true });
  return r.ok ? null : r.error;
}

/** متن ورودی (لاتین، اعشار با نقطه) به عدد؛ فقط بعد از موفقیت numErr */
export function toolNum(text: string): number {
  return Number(text.trim().replace(/[٫،]/g, "."));
}
