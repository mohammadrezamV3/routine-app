import { redirect } from "next/navigation";

// /admin/system پیوند داشبورد و هشدارهاست ولی صفحه‌ی ریشه نداشت (۴۰۴)؛ به خطاها می‌ره
export default function AdminSystemIndex() {
  redirect("/admin/system/errors");
}
