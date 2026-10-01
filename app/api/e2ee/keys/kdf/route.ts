import crypto from "crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";
import { KDF_SALT_BYTES, PASSWORD_KDF_ITERATIONS } from "@/lib/e2ee/core";

// GET /api/e2ee/keys/kdf → { userId, salt, iterations }
//
// پارامترهای KEK مشتق از رمز عبور — درست بعد از ورود، روی دستگاه. خود رمز این‌جا
// نمی‌آید (فقط به /api/auth/callback که به‌هرحال می‌رفت). نمک تصادفی و اختصاصی هر
// کاربر است و بار اول ساخته می‌شود. فقط حساب رمزدار؛ به فلگ منتور وابسته نیست تا
// KEK از همان ورود آماده باشد.
export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await checkRateLimit(`e2ee-kdf:${userId}`, 30, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "تعداد درخواست‌ها زیاد بوده" }, { status: 429 });
  }
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true, deletedAt: true } });
  if (!user || user.deletedAt || !user.passwordHash) return NextResponse.json({ error: "این حساب رمز عبور ندارد" }, { status: 404 });
  let kdf = await prisma.userE2EKdf.findUnique({ where: { userId } });
  if (!kdf) {
    kdf = await prisma.userE2EKdf
      .create({ data: { userId, salt: crypto.randomBytes(KDF_SALT_BYTES).toString("base64"), iterations: PASSWORD_KDF_ITERATIONS } })
      .catch(async () => prisma.userE2EKdf.findUniqueOrThrow({ where: { userId } })); // دو ورود هم‌زمان → همان نمک
  }
  return NextResponse.json({ userId, salt: kdf.salt, iterations: kdf.iterations });
}
