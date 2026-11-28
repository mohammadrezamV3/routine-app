import { NextRequest, NextResponse } from "next/server";
import { ModuleKey } from "@prisma/client";
import { requireModule } from "@/lib/moduleAccess";
import { featureBlocked } from "@/lib/featureFlagsServer";
import { checkRateLimit } from "@/lib/rateLimit";
import { readJsonBody } from "@/lib/validate";
import { runNomoAgent } from "@/lib/aiClient";
import { logError } from "@/lib/errorLog";
import { tr } from "@/lib/i18n";
import { assistantAccess, readUses, writeUses, resolveToday, jalaliLabel } from "@/lib/nomoShared";
import { accessibleModules, buildNomoContext } from "@/lib/nomoServer";
import {
  NOMO_MAX_MESSAGE, NOMO_SYSTEM_PROMPT, buildUserContent, detectBlockedRequest, identityText, offTopicText,
  parseAgentOutput, sanitizeHistory, sanitizeUserText, summarizeOp,
} from "@/lib/nomoAgent";
import { withGuard } from "@/lib/requestGuard";

// «نومو» حالت گفت‌وگو + عملیات چندبخشی. این روت هیچ‌چیز *نمی‌نویسد*:
//   • گفت‌وگو → متن ساده‌ی فیلترشده
//   • عملیات (ثبت خواب/تیک/غذا/تمرین/معامله) → فقط پیشنهاد؛ نوشتن بعد از تایید
//     کاربر در /api/nomo/agent/apply با همان اعتبارسنجی روت‌های هر بخش انجام می‌شود
//   • تغییر برنامه‌ی روتین → intent "program": کلاینت همان پیام را به
//     /api/routine/assistant می‌دهد (سهمیه این‌جا پس داده می‌شود تا دوبار نشمارد)
// متن پیام و پاسخ هرگز لاگ نمی‌شود؛ خطاها عمومی‌اند.

export const dynamic = "force-dynamic";

const quotaOf = (unlimited: boolean, freeLimit: number, used: number) => ({
  unlimited, used, limit: unlimited ? null : freeLimit, remaining: unlimited ? null : Math.max(0, freeLimit - used),
});

async function handlePOST(req: NextRequest) {
  const guard = await requireModule(ModuleKey.ROUTINE);
  if (!guard.ok) return guard.response;
  { const off = await featureBlocked("routineAssistant", guard.userId); if (off) return off; }
  const { userId, isSuperAdmin } = guard;

  if (!(await checkRateLimit(`nomo-agent:${userId}`, 20, 10 * 60 * 1000))) {
    return NextResponse.json(
      { error: tr("پیام‌ها را خیلی سریع پشت هم فرستادی. چند دقیقه صبر کن و دوباره امتحان کن.", "You are sending messages too quickly. Wait a few minutes and try again.") },
      { status: 429 }
    );
  }

  const parsed = await readJsonBody<{ message?: unknown; history?: unknown; today?: unknown }>(req, 16 * 1024);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });

  const rawMessage = typeof parsed.body?.message === "string" ? parsed.body.message : "";
  if (rawMessage.length > NOMO_MAX_MESSAGE * 3) {
    return NextResponse.json({ error: tr(`پیامت خیلی بلند است (حداکثر ${NOMO_MAX_MESSAGE} کاراکتر).`, `Your message is too long (max ${NOMO_MAX_MESSAGE} characters).`) }, { status: 400 });
  }
  const message = sanitizeUserText(rawMessage, NOMO_MAX_MESSAGE + 1);
  if (!message) {
    return NextResponse.json({ error: tr("چیزی ننوشتی.", "You did not write anything.") }, { status: 400 });
  }
  if (message.length > NOMO_MAX_MESSAGE) {
    return NextResponse.json({ error: tr(`پیامت خیلی بلند است (حداکثر ${NOMO_MAX_MESSAGE} کاراکتر).`, `Your message is too long (max ${NOMO_MAX_MESSAGE} characters).`) }, { status: 400 });
  }

  // درخواست استخراج پرامپت/راز/هویت مدل: جواب ثابت از کد، بدون فراخوانی مدل و بدون مصرف سهمیه
  const blocked = detectBlockedRequest(message);
  if (blocked) {
    return NextResponse.json({ kind: "reply", reply: blocked === "identity" ? identityText() : offTopicText() });
  }

  const history = sanitizeHistory(parsed.body?.history);
  const todayIso = resolveToday(parsed.body?.today);

  // ---------- سهمیه (مثل /api/routine/assistant: قبل از فراخوانی مصرف، در خطا برگشت) ----------
  const { unlimited, freeLimit } = await assistantAccess(userId, isSuperAdmin);
  let usesBefore = 0;
  if (!unlimited) {
    usesBefore = await readUses(userId);
    if (usesBefore >= freeLimit) {
      return NextResponse.json(
        {
          error: tr(
            `${freeLimit} پیام رایگان نومو تمام شده. با فعال‌کردن پلن «روتین من» یا مکس، بدون محدودیت از نومو استفاده کن.`,
            `Your ${freeLimit} free Nomo messages are used up. Activate the My Routine or Max plan to use Nomo without limits.`
          ),
          quotaExhausted: true,
          quota: quotaOf(false, freeLimit, usesBefore),
        },
        { status: 403 }
      );
    }
    await writeUses(userId, usesBefore + 1);
  }
  const refund = async () => { if (!unlimited) await writeUses(userId, usesBefore).catch(() => {}); };

  const allowed = await accessibleModules(userId, isSuperAdmin);
  let raw: unknown;
  try {
    const context = await buildNomoContext(userId, todayIso, allowed);
    raw = await runNomoAgent(
      NOMO_SYSTEM_PROMPT,
      buildUserContent({ todayLabel: jalaliLabel(todayIso), todayIso, context, history, message }),
      userId
    );
  } catch (err: any) {
    await refund();
    // فقط نوع خطا، نه متن پیام کاربر
    logError("ai-gateway", `نومو (گفت‌وگو) شکست خورد: ${String(err?.message || err).slice(0, 200)}`, { context: { feature: "NOMO_AGENT" } });
    return NextResponse.json(
      { error: tr("الان نتوانستم به نومو وصل شوم. یک دقیقه‌ی دیگر دوباره بفرست — این پیام سهمیه‌ات را مصرف نکرد.", "I could not reach Nomo right now. Send it again in a minute — this message did not use your quota.") },
      { status: 503 }
    );
  }

  const out = parseAgentOutput(raw, { todayIso }, allowed);

  if (out.intent === "program") {
    await refund(); // /api/routine/assistant خودش سهمیه را می‌شمارد
    return NextResponse.json({ kind: "delegate" });
  }
  if (out.intent === "refuse") {
    await refund();
    return NextResponse.json({ kind: "reply", reply: out.reply || offTopicText(), quota: quotaOf(unlimited, freeLimit, usesBefore) });
  }

  const quota = quotaOf(unlimited, freeLimit, unlimited ? 0 : usesBefore + 1);
  if (out.intent === "action" && out.ops.length) {
    return NextResponse.json({
      kind: "proposal",
      reply: out.reply,
      ops: out.ops,
      summaries: out.ops.map(summarizeOp),
      quota,
    });
  }
  return NextResponse.json({ kind: "reply", reply: out.reply, quota });
}

export const POST = withGuard({ policy: "ai", scope: "nomoAgent", gate: "ai" }, handlePOST);
