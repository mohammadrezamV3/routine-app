import { NextRequest, NextResponse } from "next/server";
import { readJsonBody } from "@/lib/validate";
import { getMobileAuth, revokeMobileSession } from "@/lib/mobileAuth";
import type { MobileLogoutResponse } from "@/lib/mobileApiContract";

// POST /api/mobile/auth/logout { refreshToken? }  (+ Bearer اختیاری)
// همیشه ۲۰۰ — خروج نباید به‌خاطر توکنِ منقضی/نامعتبر شکست بخوره، و پاسخ هم
// نباید بگه توکن معتبر بوده یا نه.
export async function POST(req: NextRequest) {
  const auth = await getMobileAuth(req);
  const parsed = await readJsonBody<{ refreshToken?: unknown }>(req, 4 * 1024);
  await revokeMobileSession({ auth, refreshToken: parsed.ok ? parsed.body.refreshToken : undefined });
  const body: MobileLogoutResponse = { ok: true };
  return NextResponse.json(body);
}
