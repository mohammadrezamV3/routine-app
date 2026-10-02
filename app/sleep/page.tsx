import { redirect } from "next/navigation";

// آدرس قدیمی: خواب حالا بخشی از «روتین من»ه (/weekly/sleep). لینک‌های قدیمی،
// اعلان‌ها و نشانک‌ها همچنان کار می‌کنن.
export default function SleepRedirect() {
  redirect("/weekly/sleep");
}
