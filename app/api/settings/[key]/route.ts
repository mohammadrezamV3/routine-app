import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readJsonBody } from "@/lib/validate";
import { isUserSettingKey, MAX_SETTING_VALUE_BYTES } from "@/lib/userSettingKeys";

// این روت یک فروشگاه کلید/مقدار عمومی نیست — فقط کلیدهای شناخته‌شده‌ی
// تنظیمات کاربر (lib/userSettingKeys.ts) از این‌جا رد می‌شن. دلیلش اون‌جا
// کامل توضیح داده شده.
function rejectUnknownKey(key: string) {
  return NextResponse.json({ error: "کلید تنظیمات نامعتبر است" }, { status: 400 });
}

// GET /api/settings/theme  →  { value: ... }  (یا null اگه ذخیره نشده)
export async function GET(req: NextRequest, { params }: { params: { key: string } }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isUserSettingKey(params.key)) return rejectUnknownKey(params.key);

  const row = await prisma.userSetting.findUnique({
    where: { userId_key: { userId, key: params.key } },
  });
  return NextResponse.json({ value: row?.value ?? null, updatedAt: row?.updatedAt ?? null });
}

// POST /api/settings/theme  { value }
export async function POST(req: NextRequest, { params }: { params: { key: string } }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isUserSettingKey(params.key)) return rejectUnknownKey(params.key);

  const parsed = await readJsonBody<{ value?: unknown }>(req, MAX_SETTING_VALUE_BYTES);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });

  const value = parsed.body?.value ?? null;
  // حتی بعد از سقف بدنه، خود مقدار هم جدا سنجیده می‌شه — بدنه ممکنه فیلدهای
  // دیگه هم داشته باشه و فقط همینه که ذخیره می‌شه.
  if (new TextEncoder().encode(JSON.stringify(value ?? null)).length > MAX_SETTING_VALUE_BYTES) {
    return NextResponse.json({ error: "حجم مقدار بیش از حد مجاز است" }, { status: 413 });
  }

  await prisma.userSetting.upsert({
    where: { userId_key: { userId, key: params.key } },
    create: { userId, key: params.key, value: value as any },
    update: { value: value as any },
  });

  return NextResponse.json({ ok: true });
}
