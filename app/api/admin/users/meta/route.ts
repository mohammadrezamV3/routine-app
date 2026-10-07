import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { usersMeta } from "@/lib/adminUsersList";

// پلن‌ها، برچسب‌های موجود و بخش‌های ذخیره‌شده برای فیلترهای لیست
export async function GET() {
  const guard = await requireAdmin("users.view");
  if (!guard.ok) return guard.response;
  return NextResponse.json(await usersMeta());
}
