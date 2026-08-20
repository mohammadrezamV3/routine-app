import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

// رودمپ و نوت‌پد فعلاً کاملاً غیرفعالن برای همه به‌جز سوپریوزر — نه یه
// ماژولِ خریدنی مثل بقیه (requireModule)، بلکه یه قفلِ کاملِ سطحِ کد که به
// وضعیتِ ModuleAccess/Plan توی دیتابیس اصلاً کاری نداره. همون الگوی
// ModuleGuardResult رو تکرار می‌کنه تا با requireModule یکدست بمونه.
export type SuperAdminGuardResult =
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse };

export async function requireSuperAdmin(): Promise<SuperAdminGuardResult> {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) {
    return { ok: false, response: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  }
  if (!(session!.user as any).isSuperAdmin) {
    return { ok: false, response: NextResponse.json({ error: "این بخش موقتاً غیرفعال است" }, { status: 403 }) };
  }
  return { ok: true, userId };
}
