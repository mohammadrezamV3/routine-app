import { NextRequest, NextResponse } from "next/server";
import { ModuleKey } from "@prisma/client";
import { promises as fs } from "fs";
import path from "path";
import { requireModule } from "@/lib/moduleAccess";
import { sessionFeatureBlocked } from "@/lib/featureFlagsServer";
import { tr } from "@/lib/i18n";

// دانلود اکسپرت مستقل مدیریت سرمایه (MT4/MT5). فایل‌ها توی public نیستن تا گیت بشن
// (ea-src/ + outputFileTracingIncludes در next.config.js). فقط خواندن؛ بدون دیتابیس.

export const dynamic = "force-dynamic";

const FILES = {
  MT5: "Arion-MoneyManager-MT5.mq5",
  MT4: "Arion-MoneyManager-MT4.mq4",
} as const;

// GET /api/trade/money/ea?platform=MT4|MT5
export async function GET(req: NextRequest) {
  { const off = await sessionFeatureBlocked("tradeMoneyMgmt"); if (off) return off; }
  const guard = await requireModule(ModuleKey.TRADE);
  if (!guard.ok) return guard.response;

  const platform = (req.nextUrl.searchParams.get("platform") || "").toUpperCase();
  if (platform !== "MT4" && platform !== "MT5") {
    return NextResponse.json({ error: tr(tr("پلتفرم نامعتبر است", "Invalid platform"), "Invalid platform") }, { status: 400 });
  }
  const name = FILES[platform];
  try {
    const body = await fs.readFile(path.join(process.cwd(), "ea-src", name));
    return new NextResponse(new Uint8Array(body), {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${name}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: tr(tr("فایل اکسپرت پیدا نشد", "Expert file not found"), "Expert file not found") }, { status: 404 });
  }
}
