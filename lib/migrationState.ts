// وضعیتِ واقعیِ مایگریشن‌های دیتابیس نسبت به کدی که همین الان اجرا می‌شود.
//
// چرا لازم شد: چک قبلی فقط «آیا جدولِ TradeAccount هست؟» را می‌پرسید. این
// فقط حالتِ «دیتابیس چند نسخه عقب است» را می‌گرفت و حالتِ خیلی شایع‌ترِ
// «همه‌ی جدول‌ها هستند ولی چند ستونِ جدید نیستند» (مثلا TradeChecklist.note)
// را سبز گزارش می‌کرد — بعد همان کوئری‌ها با P2022 می‌افتادند و از بیرون
// «دیتابیس آپدیت نمی‌شود» دیده می‌شد بدون اینکه هیچ ابزاری بگوید چرا.
//
// منبعِ حقیقت خودِ Prisma است: پوشه‌ی `prisma/migrations` (که داخل ایمیج
// کپی می‌شود) در برابر جدولِ `_prisma_migrations` روی دیتابیس. اختلافِ این
// دو، دقیقا همان چیزی است که `prisma migrate deploy` اجرا خواهد کرد.

import fs from "fs";
import path from "path";
import { prisma } from "./prisma";

export type MigrationState = {
  ok: boolean;
  note: string;
  /** تعدادِ مایگریشن‌های موجود در کد */
  codeCount: number;
  /** تعدادِ مایگریشن‌های اجراشده و کامل روی دیتابیس */
  appliedCount: number;
  /** نامِ مایگریشن‌هایی که در کد هستند ولی روی دیتابیس اجرا نشده‌اند */
  pending: string[];
  /** مایگریشن‌هایی که شروع شده ولی ناتمام/برگشت‌خورده مانده‌اند */
  failed: string[];
  /** روی دیتابیس هست ولی در این نسخه‌ی کد نیست — یعنی ایمیج از دیتابیس عقب است */
  unknown: string[];
  fix?: string;
};

type MigrationRow = { migration_name: string; finished_at: Date | null; rolled_back_at: Date | null };

const FIX_CMD = "bash deploy/update.sh   # یا: docker compose --profile tools run --build --rm migrate";

/** نامِ پوشه‌های مایگریشن که همراهِ همین بیلد آمده‌اند */
export function codeMigrations(): string[] {
  const dir = path.join(process.cwd(), "prisma", "migrations");
  try {
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort();
  } catch {
    return [];
  }
}

export async function migrationState(): Promise<MigrationState> {
  const code = codeMigrations();

  // بدونِ هیچ ورودیِ کاربری — یک SELECT ثابت روی جدولِ خودِ Prisma. عمدا
  // یک‌خطی نوشته شده تا کامنتِ نگهبان بیرونِ خودِ template literal بماند
  // (اگر داخلش برود، بخشی از متنِ SQL می‌شود و کوئری می‌شکند).
  let rows: MigrationRow[];
  try {
    rows = await prisma.$queryRaw<MigrationRow[]>`SELECT migration_name, finished_at, rolled_back_at FROM "_prisma_migrations"`; // sql-safety-ok: کوئری ثابت، بدونِ هیچ مقدارِ بیرونی
  } catch (e: any) {
    // 42P01 = جدول وجود ندارد → روی این دیتابیس هیچ‌وقت migrate اجرا نشده
    const virgin = e?.code === "P2010" || /_prisma_migrations/.test(String(e?.message || ""));
    return {
      ok: false,
      note: virgin
        ? "روی این دیتابیس هیچ مایگریشنی اجرا نشده — کاملا خام است"
        : `خواندنِ وضعیتِ مایگریشن ممکن نشد: ${String(e?.message || "").slice(0, 160)}`,
      codeCount: code.length,
      appliedCount: 0,
      pending: code,
      failed: [],
      unknown: [],
      fix: FIX_CMD,
    };
  }

  const applied = new Set(rows.filter((r) => r.finished_at && !r.rolled_back_at).map((r) => r.migration_name));
  const failed = rows.filter((r) => !r.finished_at || r.rolled_back_at).map((r) => r.migration_name).sort();
  const pending = code.filter((m) => !applied.has(m));
  const unknown = [...applied].filter((m) => !code.includes(m)).sort();

  if (failed.length) {
    return {
      ok: false,
      note: `${failed.length} مایگریشن ناتمام/برگشت‌خورده روی دیتابیس مانده — تا حل نشود deploy بعدی هم رد می‌شود`,
      codeCount: code.length, appliedCount: applied.size, pending, failed, unknown,
      fix: "prisma migrate resolve --rolled-back <name>  سپس دوباره deploy",
    };
  }

  if (pending.length) {
    return {
      ok: false,
      note: `${pending.length} مایگریشن اجرا نشده — دیتابیس از کد عقب است`,
      codeCount: code.length, appliedCount: applied.size, pending, failed, unknown,
      fix: FIX_CMD,
    };
  }

  if (unknown.length) {
    // دیتابیس جلوتر از کد است: معمولا یعنی ایمیجِ اپ از نسخه‌ی قدیمی build
    // شده (rebuild نشده) — همان اشتباهِ شایعِ `up -d` بدونِ `--build`.
    return {
      ok: false,
      note: `دیتابیس ${unknown.length} مایگریشن دارد که در این بیلدِ کد نیست — احتمالا ایمیجِ اپ قدیمی است و rebuild نشده`,
      codeCount: code.length, appliedCount: applied.size, pending, failed, unknown,
      fix: "docker compose up -d --build app",
    };
  }

  return {
    ok: true,
    note: `اسکیمای دیتابیس با کد هماهنگ است (${code.length} مایگریشن)`,
    codeCount: code.length, appliedCount: applied.size, pending, failed, unknown,
  };
}
