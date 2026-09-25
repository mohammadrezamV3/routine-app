import { ModuleKey } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { checkModuleForUser } from "@/lib/moduleAccess";

// دسترسیِ رودمپ برای مسیرهای Bearer (اپ موبایل).
//
// روت‌های وبِ رودمپ (/api/roadmaps/*) الان با requireSuperAdmin قفلِ کاملِ
// سطحِ کدن — «موقتا برای همه به‌جز سوپریوزر غیرفعال» (lib/requireSuperAdmin.ts)،
// مستقل از ModuleAccess. موبایل نباید دری باز کنه که وب بسته؛ پس تا وقتی این
// ثابت true است، همون قفل این‌جا هم هست. وقتی رودمپ عمومی شد، این رو false
// کن *و* روت‌های وب رو هم از requireSuperAdmin به requireModule(ROADMAP) ببر —
// از اون به بعد گیتِ واقعی ماژولِ ROADMAP است (که همین الان هم چک می‌شه).
export const ROADMAP_SUPERADMIN_ONLY = true;

export async function checkRoadmapForUser(userId: string): Promise<{ ok: true; isSuperAdmin: boolean } | { ok: false }> {
  if (ROADMAP_SUPERADMIN_ONLY) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isSuperAdmin: true, isBlocked: true, deletedAt: true },
    });
    if (!user || user.isBlocked || user.deletedAt || !user.isSuperAdmin) return { ok: false };
  }
  const r = await checkModuleForUser(userId, ModuleKey.ROADMAP);
  return r.ok ? { ok: true, isSuperAdmin: r.isSuperAdmin } : { ok: false };
}
