// احرازِ هویت و گیتِ ماژولِ روت‌های /api/mobile/social/* — Bearer از
// lib/mobileAuth.ts، و isSuperAdmin/اسم/دسترسیِ ماژول مستقیم از دیتابیس
// (هیچ ادعای کلاینتی قبول نمی‌شه). هم‌معنای requireModuleِ وب.
import { NextResponse } from "next/server";
import { ModuleKey } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getMobileUserId } from "@/lib/mobileAuth";
import { checkModuleForUser } from "@/lib/moduleAccess";
import { SOCIAL_ERROR_MODULE_LOCKED } from "@/lib/mobileSocialContract";
import type { CoreResult } from "@/lib/mobileSocialFriends";

export type SocialViewer = { userId: string; isSuperAdmin: boolean; name: string | null };
export type SocialGuard = { ok: true; viewer: SocialViewer } | { ok: false; response: NextResponse };

const unauthorized = () => NextResponse.json({ error: "unauthorized" }, { status: 401 });

export async function requireMobileSocialUser(req: Request, module?: ModuleKey): Promise<SocialGuard> {
  const userId = await getMobileUserId(req);
  if (!userId) return { ok: false, response: unauthorized() };

  if (module) {
    const check = await checkModuleForUser(userId, module);
    if (!check.ok) {
      return check.reason === "blocked"
        ? { ok: false, response: unauthorized() }
        : { ok: false, response: NextResponse.json({ error: SOCIAL_ERROR_MODULE_LOCKED }, { status: 403 }) };
    }
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isSuperAdmin: true, name: true, isBlocked: true, deletedAt: true },
  });
  if (!user || user.isBlocked || user.deletedAt) return { ok: false, response: unauthorized() };
  return { ok: true, viewer: { userId, isSuperAdmin: user.isSuperAdmin, name: user.name } };
}

export function socialJson(r: CoreResult): NextResponse {
  return NextResponse.json(r.body, { status: r.status, headers: { "Cache-Control": "private, no-store" } });
}

/** بدنه‌ی JSON با سقفِ حجم — بدنه‌ی بزرگ/بدشکل = {} (مثلِ `req.json().catch(()=>({}))`ِ وب) */
export async function readSocialBody(req: Request, maxBytes = 8 * 1024): Promise<Record<string, unknown>> {
  const len = Number(req.headers.get("content-length") || "0");
  if (len > maxBytes) return {};
  try {
    const text = await req.text();
    if (text.length > maxBytes) return {};
    const v = JSON.parse(text);
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}
