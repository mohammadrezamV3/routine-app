import type { NextResponse } from "next/server";
import type { MentorProfile } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireMentorsUser, forbidden } from "@/lib/mentorGuard";

// نگهبانِ مشترکِ روت‌های ابزارِ منتور (/api/mentor/templates|replies|alerts|reports|export).
// کاربرِ لاگین‌کرده + فلگِ mentors (requireMentorsUser) + پروفایلِ منتوری.
// write=true یعنی منتورِ معلق نمی‌تواند چیزی بسازد/تغییر دهد؛ خواندنِ داده‌ی
// خودِ منتور (قالب‌ها، پاسخ‌ها) در تعلیق هم باز است.

export type MentorToolsGuard =
  | { ok: true; userId: string; profile: MentorProfile }
  | { ok: false; response: NextResponse };

export async function requireMentorTools(opts: { write?: boolean } = {}): Promise<MentorToolsGuard> {
  const g = await requireMentorsUser();
  if (!g.ok) return g;
  const profile = await prisma.mentorProfile.findUnique({ where: { userId: g.userId } });
  if (!profile) return { ok: false, response: forbidden("اول پروفایل منتوری بساز") };
  if (opts.write && profile.suspendedAt) return { ok: false, response: forbidden("حساب منتوری تو تعلیق شده") };
  return { ok: true, userId: g.userId, profile };
}

export function validId(id: unknown): id is string {
  return typeof id === "string" && id.length > 0 && id.length <= 64;
}
