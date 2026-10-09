import "./mentor.css";
import Link from "next/link";
import { MENTOR_TERMS_PATH } from "@/lib/mentorTerms";
import { tr } from "@/lib/i18n";

// یک خط ثابت و همیشه‌پیدا زیر پروفایل عمومی منتور و فهرست پیدا کردن منتور:
// نقش آریون (فقط بستر) و استقلال منتورها. متن عمدا کوتاه و بدون لحن تهدید است؛
// جزئیات در /terms/mentors. بدون پس‌زمینه — فقط متن کم‌رنگ.
export function MentorPlatformNotice({ className }: { className?: string }) {
  return (
    <p className={`mentor-platform-notice${className ? ` ${className}` : ""}`}>
      {tr("آریون فقط بستر ارتباط است؛ مربی‌ها مستقل‌اند و مسئولیت خدماتشان با خودشان است.", "Arion is only a platform for connecting. Mentors are independent and responsible for their own services.")}{" "}
      <Link href={MENTOR_TERMS_PATH} className="mentor-terms-link">
        {tr("شرایط", "Terms")}
      </Link>
    </p>
  );
}

export default MentorPlatformNotice;
