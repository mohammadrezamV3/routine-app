"use client";

import { useRouter } from "next/navigation";
import { GraduationCap, ShieldCheck, Users, ClipboardList } from "lucide-react";
import { AccountBlock, AccountLine } from "./AccountUI";

/**
 * صفحه‌ی «منتور شو» — برای کاربری که هنوز پروفایلِ منتوری نساخته.
 * نکته‌ی اصلی که باید شفاف گفته بشه: آریون فقط پلتفرمه؛ منتورها مستقل‌اند
 * و آریون هیچ خدماتِ مربیگری/تغذیه‌ای ارائه نمی‌ده.
 */
export function MentorDashOnboarding() {
  const router = useRouter();
  return (
    <>
      <div className="trade-surface rp-empty">
        <span className="rp-empty-icon"><GraduationCap size={26} /></span>
        <h2>منتور شو</h2>
        <p>
          اگه مربی بدنسازی یا متخصص تغذیه هستی، می‌تونی توی آریون پروفایل منتوری بسازی، شاگرد بپذیری،
          براشون برنامه‌ی روتین یا تمرینی بفرستی و پیشرفتشون رو (فقط در حدی که خودشون اجازه بدن) دنبال کنی.
        </p>
        <button type="button" className="account-outline-btn mt-5" onClick={() => router.push("/mentor/profile")}>
          شروع و ساخت پروفایل
        </button>
      </div>

      <div className="mt-5">
        <AccountBlock title="قبل از شروع بدون" icon={<ShieldCheck size={15} />} flush>
          <AccountLine
            icon={<ShieldCheck size={16} />}
            label="آریون فقط پلتفرمه"
            value="منتورها کاربرانِ مستقل‌اند. آریون هیچ خدماتِ مربیگری، تغذیه یا مشاوره‌ای ارائه نمی‌ده و مسئولیتِ محتوای برنامه‌ها با خودِ منتوره."
          />
          <AccountLine
            icon={<Users size={16} />}
            label="حریم خصوصیِ شاگرد با خودِ شاگرده"
            value="هر شاگرد تعیین می‌کنه کدوم برنامه‌ها، زمان‌بندی و پیشرفتش رو ببینی. چیزی که اجازه نده اصلا به تو نمی‌رسه."
          />
          <AccountLine
            icon={<ClipboardList size={16} />}
            label="احراز هویت و مدرک اختیاری ولی مهمه"
            value="با ارسال مدرک شناسایی و مدرک تخصصی، نشانِ «تأییدشده» روی پروفایلت می‌گیری. مدارک فقط برای ادمین‌های آریون قابل مشاهده‌ست."
          />
        </AccountBlock>
      </div>
    </>
  );
}
