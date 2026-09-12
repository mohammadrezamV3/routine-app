import { redirect } from "next/navigation";

// پروفایلِ ورزشی دیگر صفحه‌ی جدایی نیست — طبقِ درخواستِ صریح، به‌صورتِ
// تایتلِ دومِ خودِ صفحه‌ی پروفایل درآمد. این مسیر فقط برای لینک‌ها و
// بوکمارک‌های قدیمی مانده و ریدایرکت می‌کند.
export default function SportProfileRedirect() {
  redirect("/account/profile");
}
