import { NextResponse } from "next/server";
import { AiFeatureKey } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireMentorsUser, getActiveMentorProfile } from "@/lib/mentorGuard";
import { callAiChat, parseJsonResponse, recordAiUsage } from "@/lib/aiClient";
import { checkRateLimit } from "@/lib/rateLimit";
import { readJsonBody } from "@/lib/validate";
import { logError } from "@/lib/errorLog";
import type { CoachNomoQuota } from "@/lib/coachTypes";
import { COACH_NOMO_DAILY_LIMIT } from "@/lib/coachNomo";
import { loadActiveMentorshipFor, makeWeekCtx, type WeekCtx } from "@/lib/coachWeekServer";
import { tr } from "@/lib/i18n";

const DAY_MS = 86_400_000;

export type NomoAccess = { userId: string; unlimited: boolean; used: number; ctx: WeekCtx; body: Record<string, unknown> };

export function quotaOf(unlimited: boolean, used: number): CoachNomoQuota {
  return unlimited
    ? { unlimited: true, used: 0, limit: 0, remaining: 0 }
    : { unlimited: false, used, limit: COACH_NOMO_DAILY_LIMIT, remaining: Math.max(0, COACH_NOMO_DAILY_LIMIT - used) };
}

/** مصرف 24 ساعت اخیر = فراخوانی‌های موفق (شکست هیچ‌وقت حساب نمی‌شه، پس نیازی به پس‌دادن نیست) */
export async function usedLast24h(userId: string): Promise<number> {
  return prisma.aiUsageRecord.count({ where: { userId, feature: AiFeatureKey.COACH_NOMO, success: true, createdAt: { gte: new Date(Date.now() - DAY_MS) } } });
}

/** نگهبان مشترک سه روت نومو: ویژگی منتورها، پروفایل فعال، همکاری ACTIVE همین مربی، سقف نرخ و سهمیه */
export async function guardNomo(req: Request): Promise<{ ok: true; a: NomoAccess } | { ok: false; response: NextResponse }> {
  const g = await requireMentorsUser();
  if (!g.ok) return g;
  const prof = await getActiveMentorProfile(g.userId);
  if (!prof.ok) return prof;

  const parsed = await readJsonBody(req, 8 * 1024);
  if (!parsed.ok) return { ok: false, response: NextResponse.json({ error: parsed.error }, { status: parsed.status }) };
  const body = (parsed.body && typeof parsed.body === "object" ? parsed.body : {}) as Record<string, unknown>;

  const mid = typeof body.mentorshipId === "string" ? body.mentorshipId : "";
  const found = await loadActiveMentorshipFor(mid, g.userId);
  if (!found || found.role !== "MENTOR") return { ok: false, response: NextResponse.json({ error: "not found" }, { status: 404 }) };

  // سقف انفجاری (مستقل از سهمیه‌ی روزانه) تا درخواست هم‌زمان سهمیه رو دور نزنه
  if (!(await checkRateLimit(`coach-nomo:${g.userId}`, 6, 60_000))) {
    return { ok: false, response: NextResponse.json({ error: tr("خیلی سریع پشت هم درخواست دادی. یک دقیقه صبر کن.", "You are sending requests too quickly. Wait a minute.") }, { status: 429 }) };
  }
  const unlimited = g.isSuperAdmin;
  const used = unlimited ? 0 : await usedLast24h(g.userId);
  if (!unlimited && used >= COACH_NOMO_DAILY_LIMIT) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: tr(`سهمیه‌ی امروز نومو (${COACH_NOMO_DAILY_LIMIT} بار) تموم شد. فردا دوباره امتحان کن.`, `Today's Nomo quota (${COACH_NOMO_DAILY_LIMIT} uses) is used up. Try again tomorrow.`), quotaExhausted: true, quota: quotaOf(false, used) },
        { status: 429 },
      ),
    };
  }
  return { ok: true, a: { userId: g.userId, unlimited, used, ctx: await makeWeekCtx(found.m), body } };
}

/** فراخوانی مدل + ثبت مصرف؛ خطا = null (سهمیه مصرف نمی‌شه چون فقط موفق‌ها شمرده می‌شن) */
export async function runNomo(userId: string, system: string, userContent: string, maxTokens: number, tag: string, valid?: (json: unknown) => boolean): Promise<unknown | null> {
  try {
    const { text, usage, durationMs, truncated } = await callAiChat(system, userContent, maxTokens, undefined, undefined, 0.6);
    let json: unknown = null;
    if (!truncated) {
      try {
        json = parseJsonResponse(text);
      } catch {
        json = null;
      }
    }
    // پاسخ JSON که بعد از اعتبارسنجی قابل‌استفاده نیست هم شکست حساب می‌شه (روت 503 می‌ده، پس نباید از سهمیه کم بشه)
    const usable = json !== null && (valid ? valid(json) : true);
    // هزینه‌ی واقعی ثبت می‌شه؛ فقط پاسخ قابل‌استفاده از سهمیه شمرده می‌شه (success)
    await recordAiUsage(userId, AiFeatureKey.COACH_NOMO, usage, durationMs, usable);
    return usable ? json : null;
  } catch (err: any) {
    logError("ai-gateway", `نومو مربی (${tag}) شکست خورد: ${err?.message || err}`, { context: { feature: "COACH_NOMO" } });
    return null;
  }
}

export const nomoUnavailable = () =>
  NextResponse.json({ error: tr("الان نتونستم به نومو وصل شم. کمی بعد دوباره امتحان کن — این بار از سهمیه‌ات کم نشد.", "I could not reach Nomo right now. Try again shortly — this did not use your quota.") }, { status: 503 });
