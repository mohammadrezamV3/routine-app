import { redirect } from "next/navigation";

// قالب‌ها حالا شیت داخل «صفحه‌ی من» هستند
export default function MentorTemplatesRedirect() {
  redirect("/mentor/settings?open=templates");
}
