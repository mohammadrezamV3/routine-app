import { redirect } from "next/navigation";

// صفحه‌ی جدا برای دوستان نداریم؛ مدیریت دوستان از پنجره‌ی کارت دوستان انجام می‌شه.
// لینک‌های قدیمی به داشبورد می‌رن.
export default function FriendsRedirect() {
  redirect("/dashboard");
}
