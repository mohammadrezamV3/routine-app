import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/requestAuth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await getRequestUser();
  const userId = auth?.userId;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const rows = await prisma.dailyEntry.findMany({
    where: { userId },
    select: { date: true },
  });

  const keys = rows.map((r) => {
    const d = r.date;
    const pad = (n: number) => (n < 10 ? "0" + n : "" + n);
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  });

  return NextResponse.json({ keys });
}
