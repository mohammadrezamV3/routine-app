import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ModuleKey } from "@prisma/client";
import { clampText, parseIsoDate } from "@/lib/validate";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

const GENDER_VALUES = new Set(["male", "female"]);

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      username: true,
      phone: true,
      name: true,
      lastName: true,
      birthDate: true,
      gender: true,
      discoverable: true,
      market: true,
      createdAt: true,
      isSuperAdmin: true,
      referralCode: { select: { code: true } },
      moduleAccess: { select: { module: true, active: true, expiresAt: true } },
      subscriptions: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { status: true, currentPeriodEnd: true, plan: { select: { nameFa: true, key: true } } },
      },
    },
  });

  if (!user) return NextResponse.json({ error: "not found" }, { status: 404 });

  // سوپریوزر همیشه به همه ماژول‌ها دسترسی نامحدود داره — صرف‌نظر از این‌که
  // جدول ModuleAccess چی می‌گه (که معمولاً seed هم شده، ولی این تضمین اضافه‌ست)
  const moduleAccess = user.isSuperAdmin
    ? Object.values(ModuleKey).map((m) => ({ module: m, active: true, expiresAt: null }))
    : user.moduleAccess;

  const fullName = [user.name, user.lastName].filter(Boolean).join(" ") || null;

  return NextResponse.json({ user: { ...user, firstName: user.name, name: fullName, moduleAccess } });
}

// PATCH /api/account  { name?, lastName?, birthDate?, gender?, discoverable? }
// فقط فیلدهای «امن»ِ پروفایل از همین‌جا قابل تغییرن — ایمیل/شماره موبایل عمداً
// این‌جا نیستن (نیاز به فلوی تاییدِ جدا دارن، مثلِ signup/forgot-password؛
// بدونِ اون تاییدیه، اجازه‌ی تغییرِ مستقیم یعنی هرکسی با یه سشنِ سرقتی می‌تونه
// شماره‌ی بازیابیِ حساب رو عوض کنه). یوزرنیم هم روتِ اختصاصیِ خودش رو داره.
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const ip = getClientIp(req.headers);
  const isSuperAdmin = !!(session!.user as any).isSuperAdmin;
  if (!isSuperAdmin && (!checkRateLimit(`profile-edit:${userId}`, 20, 60 * 60 * 1000) || !checkRateLimit(`profile-edit-ip:${ip}`, 40, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "درخواست‌های زیاد — کمی بعد دوباره امتحان کن" }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};

  if (body.name !== undefined) {
    const v = clampText(String(body.name || "").trim(), 60);
    data.name = v || null;
  }
  if (body.lastName !== undefined) {
    const v = clampText(String(body.lastName || "").trim(), 60);
    data.lastName = v || null;
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

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "هیچ فیلدی برای ذخیره ارسال نشده" }, { status: 400 });
  }

  await prisma.user.update({ where: { id: userId }, data });

  return NextResponse.json({ ok: true });
}
