import { redirect } from "next/navigation";

// اعلان‌ها دیگر صفحه‌ی جدایی نیست — طبقِ درخواستِ صریح با «تنظیمات» ادغام
// شد. این مسیر فقط برای لینک‌ها و بوکمارک‌های قدیمی مانده.
export default function NotificationsRedirect() {
  redirect("/account/general");
}
