import { redirect } from "next/navigation";

// پروفایل حالا شیت داخل «صفحه‌ی من» است
export default function MentorProfileRedirect() {
  redirect("/mentor/settings?open=profile");
}
