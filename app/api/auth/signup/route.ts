import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { Market } from "@prisma/client";
import { getSiteMarket } from "@/lib/market";
import { BASIC_MODULES } from "@/lib/modules";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { isValidIranPhone, isValidUsername, validatePassword, clampText } from "@/lib/validate";

// ثبت‌نام با نام + شماره موبایل + یوزرنیم + رمز انجام می‌شه — این چهارتا
// الزامی‌ان. بعد از این، ورود هم با یوزرنیم و هم با شماره موبایل ممکنه.
export async function POST(req: NextRequest) {
  // حداکثر ۵ تلاش ثبت‌نام در ۱۰ دقیقه به‌ازای هر IP — جلوگیری از ساخت
  // انبوه حساب یا سوءاستفاده خودکار از این فرم.
  const ip = getClientIp(req.headers);
  if (!checkRateLimit(`signup:${ip}`, 5, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "تعداد تلاش‌ها بیش از حد مجازه — چند دقیقه دیگه دوباره امتحان کن" }, { status: 429 });
  }

  const body = await req.json();
  const { phone, username, password, name, birthDate } = body as {
    phone: string;
    username: string;
    password: string;
    name: string;
    birthDate?: string;
  };

  if (!phone || !username || !password || !name || !birthDate) {
    return NextResponse.json({ error: "نام، شماره موبایل، یوزرنیم، تاریخ تولد و رمز عبور الزامی است" }, { status: 400 });
  }
  if (!isValidIranPhone(phone)) {
    return NextResponse.json({ error: "شماره موبایل معتبر نیست (فرمت: 09xxxxxxxxx)" }, { status: 400 });
  }
  if (!isValidUsername(username)) {
    return NextResponse.json({ error: "یوزرنیم باید ۳ تا ۲۰ کاراکتر و فقط شامل حروف انگلیسی/عدد/آندرلاین باشه" }, { status: 400 });
  }
  const passwordError = await validatePassword(password, [username, name, phone]);
  if (passwordError) {
    return NextResponse.json({ error: passwordError }, { status: 400 });
  }
  const dob = new Date(birthDate);
  const ageYears = (Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  if (isNaN(dob.getTime()) || ageYears < 10 || ageYears > 100) {
    return NextResponse.json({ error: "تاریخ تولد معتبر نیست" }, { status: 400 });
  }

  const existing = await prisma.user.findFirst({
    where: { OR: [{ phone }, { username }] },
  });
  if (existing) {
    // پیام عمداً کلیه (نه «شماره موبایل تکراریه» / «یوزرنیم تکراریه» جدا) تا
    // مهاجم نتونه با امتحان‌کردن شماره‌های مختلف بفهمه کدوم شماره ثبت‌نام شده.
    return NextResponse.json({ error: "امکان ثبت‌نام با این اطلاعات وجود ندارد" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  // بازار از env var همین دیپلوی خونده می‌شه (نه از ورودی کاربر) — چون
  // این پروژه به‌صورت دو سایت جدا منتشر می‌شه، نه یک سوییچ داخل یک سایت.
  const siteMarket = getSiteMarket();

  const user = await prisma.user.create({
    data: {
      phone,
      username,
      name: clampText(name.trim(), 80),
      birthDate: dob,
      passwordHash,
      market: siteMarket === "INTERNATIONAL" ? Market.INTERNATIONAL : Market.IRAN,
      locale: siteMarket === "INTERNATIONAL" ? "en" : "fa",
    },
  });

  // دوره آزمایشی: دسترسی موقت به ماژول‌های پایه بدون نیاز به پرداخت
  await prisma.moduleAccess.createMany({
    data: BASIC_MODULES.map((module) => ({
      userId: user.id,
      module,
      active: true,
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // ۱۴ روز
    })),
  });

  // کد رفرال شخصی کاربر — از همون لحظه ثبت‌نام آماده است
  await prisma.referralCode.create({
    data: {
      userId: user.id,
      code: (user.id.slice(0, 6) + Math.random().toString(36).slice(2, 6)).toUpperCase(),
    },
  });

  return NextResponse.json({ ok: true, userId: user.id });
}
