// بخش درخواست جاری سمت سرور (هدر x-arion-section که middleware از روی میزبان می‌ذاره). فقط سرور.
// هدر ورودی کاربر هیچ‌وقت مستقیم اعتماد نمی‌شه: middleware همیشه پاکش می‌کنه و از میزبان دوباره می‌سازه،
// و اینجا هم مقدار با میزبان واقعی دوباره چک می‌شه.
import { headers } from "next/headers";
import { SECTION_HEADER, isSectionKey, sectionFromHost, type SectionKey } from "@/lib/sections";

export function getSection(): SectionKey | null {
  try {
    const h = headers();
    const v = h.get(SECTION_HEADER);
    if (isSectionKey(v)) return v;
    // بدون middleware (مثلا تست) — مستقیم از میزبان
    return sectionFromHost(h.get("x-forwarded-host") || h.get("host"));
  } catch {
    // بیرون از درخواست (build، زمان‌بند): دامنه‌ی اصلی
    return null;
  }
}
