import { redirect } from "next/navigation";

// آدرس موقت قبلی خواب. خواب صفحه و سیستم خودش رو داره (/sleep).
export default function WeeklySleepRedirect() {
  redirect("/sleep");
}
