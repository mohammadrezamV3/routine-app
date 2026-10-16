import { NextRequest, NextResponse } from "next/server";
import { getSessionFast } from "@/lib/serverSession";
import { prisma } from "@/lib/prisma";
import { readJsonBody } from "@/lib/validate";
import { isLocale } from "@/lib/i18n";
import { LANG_SETTING_KEY } from "@/lib/i18nServer";

// ذخیره‌ی زبان کاربر سمت سرور (UserSetting کلید "lang") تا اعلان‌ها و پوش‌هایی که سرور برای اون
// می‌سازه به زبان خودش برسن. کلاینت فقط وقتی زبان عوض می‌شه (و یک بار برای هر دستگاه) صداش می‌زنه.
// این روت ثابت جلوتر از [key] می‌شینه، پس لازم نبود کلید به allowlist عمومی اضافه بشه.
export async function POST(req: NextRequest) {
  const session = await getSessionFast();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = await readJsonBody<{ locale?: unknown }>(req, 1024);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const locale = parsed.body?.locale;
  if (!isLocale(locale)) return NextResponse.json({ error: "invalid locale" }, { status: 400 });

  await prisma.userSetting.upsert({
    where: { userId_key: { userId, key: LANG_SETTING_KEY } },
    create: { userId, key: LANG_SETTING_KEY, value: locale },
    update: { value: locale },
  });
  return NextResponse.json({ ok: true });
}
