import { accountUserSelect, toAccountUser } from "@/lib/accountPayload";
import { NextRequest, NextResponse } from "next/server";
import { getSessionFast } from "@/lib/serverSession";
import { prisma } from "@/lib/prisma";
import { clampText, isValidPersianName, parseIsoDate } from "@/lib/validate";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { withLiveSync } from "@/lib/realtime";

const GENDER_VALUES = new Set(["male", "female"]);

export async function GET() {
  const session = await getSessionFast();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: accountUserSelect() });
  if (!user) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ user: toAccountUser(user) });
}

// PATCH /api/account  { name?, lastName?, birthDate?, gender?, discoverable?, sharePhone? }
// فقط فیلدهای «امن» پروفایل از همین‌جا قابل تغییرن — ایمیل/شماره موبایل عمدا
// این‌جا نیستن (نیاز به فلوی تایید جدا دارن، مثل signup/forgot-password؛
// بدون اون تاییدیه، اجازه‌ی تغییر مستقیم یعنی هرکسی با یه سشن سرقتی می‌تونه
// شماره‌ی بازیابی حساب رو عوض کنه). یوزرنیم هم روت اختصاصی خودش رو داره.
async function handlePATCH(req: NextRequest) {
  const session = await getSessionFast();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const ip = getClientIp(req.headers);
  const isSuperAdmin = !!(session!.user as any).isSuperAdmin;
  if (!isSuperAdmin && (!(await checkRateLimit(`profile-edit:${userId}`, 20, 60 * 60 * 1000)) || !(await checkRateLimit(`profile-edit-ip:${ip}`, 40, 60 * 60 * 1000)))) {
    return NextResponse.json({ error: "درخواست‌های زیاد — کمی بعد دوباره امتحان کن" }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};

  // نام/نام خانوادگی فقط فارسی — چک سمت کلاینت قابل دور زدن است، پس این‌جا
  // هم بررسی می‌شود (همان قاعده‌ی بقیه‌ی ورودی‌های این اپ).
  if (body.name !== undefined) {
    const v = clampText(String(body.name || "").trim(), 60);
    if (v && !isValidPersianName(v)) {
      return NextResponse.json({ error: "نام باید فقط با حروف فارسی نوشته شود" }, { status: 400 });
    }
    data.name = v || null;
  }
  if (body.lastName !== undefined) {
    const v = clampText(String(body.lastName || "").trim(), 60);
    if (v && !isValidPersianName(v)) {
      return NextResponse.json({ error: "نام خانوادگی باید فقط با حروف فارسی نوشته شود" }, { status: 400 });
    }
    data.lastName = v || null;
  }
  // بیوگرافی: متن آزاد ولی کوتاه — هم توی پروفایل خود کاربر ویرایش
  // می‌شه هم توی پاپ‌آپ پروفایل دوستان نشون داده می‌شه.
  if (body.bio !== undefined) {
    data.bio = clampText(String(body.bio || "").trim(), 200) || null;
  }
  if (body.gender !== undefined) {
    const v = body.gender === null ? null : String(body.gender);
    if (v !== null && !GENDER_VALUES.has(v)) {
      return NextResponse.json({ error: "جنسیت نامعتبر است" }, { status: 400 });
    }
    data.gender = v;
  }
  if (body.birthDate !== undefined) {
    if (body.birthDate === null) {
      data.birthDate = null;
    } else {
      const d = parseIsoDate(body.birthDate);
      if (!d) return NextResponse.json({ error: "تاریخ تولد نامعتبر است" }, { status: 400 });
      data.birthDate = d;
    }
  }
  if (body.discoverable !== undefined) {
    data.discoverable = !!body.discoverable;
  }
  if (body.sharePhone !== undefined) {
    data.sharePhone = !!body.sharePhone;
  }
  if (body.heightCm !== undefined) {
    if (body.heightCm === null) {
      data.heightCm = null;
    } else {
      const v = Number(body.heightCm);
      if (!Number.isFinite(v) || v < 100 || v > 250) {
        return NextResponse.json({ error: "قد نامعتبر است" }, { status: 400 });
      }
      data.heightCm = Math.round(v);
    }
  }
  if (body.weightKg !== undefined) {
    if (body.weightKg === null) {
      data.weightKg = null;
    } else {
      const v = Number(body.weightKg);
      if (!Number.isFinite(v) || v < 20 || v > 300) {
        return NextResponse.json({ error: "وزن نامعتبر است" }, { status: 400 });
      }
      data.weightKg = Math.round(v * 10) / 10;
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "هیچ فیلدی برای ذخیره ارسال نشده" }, { status: 400 });
  }

  await prisma.user.update({ where: { id: userId }, data });

  return NextResponse.json({ ok: true });
}

// حساب/پروفایل روی بقیه‌ی دستگاه‌های همین کاربر همون لحظه (lib/realtime.ts)
export const PATCH = withLiveSync(["account"], handlePATCH);
