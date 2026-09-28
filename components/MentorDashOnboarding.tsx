"use client";

import Link from "next/link";
import {
  AlertCircle, BadgeCheck, Ban, Check, ClipboardList, Eye, EyeOff, Hourglass, IdCard, ShieldCheck, UserRound, XCircle,
} from "lucide-react";
import { MI, MI_STROKE, MentorChip, MentorRow, MentorSection } from "./MentorUI";
import { VERIFICATION_LABELS, VERIFICATION_SHORT } from "@/lib/mentorCategories";
import type { VerificationStatus } from "@/lib/mentorTypes";

const ic = (Icon: typeof UserRound, size: number) => <Icon size={size} strokeWidth={MI_STROKE} aria-hidden />;

/** شماره‌ی مرحله یا تیکِ انجام‌شده، جای آیکونِ ردیف */
function StepMark({ n, done }: { n: number; done: boolean }) {
  return (
    <span className={`mentor-step-mark${done ? " is-done" : ""}`} aria-hidden>
      {done ? <Check size={14} strokeWidth={2} /> : n.toLocaleString("fa-IR")}
    </span>
  );
}

function identityChip(status: VerificationStatus) {
  switch (status) {
    case "PENDING": return <MentorChip tone="info" icon={ic(Hourglass, MI.chip)} title={VERIFICATION_LABELS.PENDING}>{VERIFICATION_SHORT.PENDING}</MentorChip>;
    case "VERIFIED": return <MentorChip tone="accent" icon={ic(BadgeCheck, MI.chip)}>{VERIFICATION_SHORT.VERIFIED}</MentorChip>;
    case "REJECTED": return <MentorChip tone="danger" icon={ic(XCircle, MI.chip)}>{VERIFICATION_SHORT.REJECTED}</MentorChip>;
    default: return <MentorChip tone="warn" icon={ic(AlertCircle, MI.chip)}>{VERIFICATION_SHORT.NOT_PROVIDED}</MentorChip>;
  }
}

/**
 * مراحلِ فعال‌شدنِ منتور — احراز هویت اجباری است: تا تأییدِ مدرکِ شناسایی،
 * پروفایل در فهرست منتورها نمایش داده نمی‌شود و درخواستِ شاگرد پذیرفته
 * نمی‌شود (سرور همین را اعمال می‌کند). روی داشبورد تا کامل‌شدن دیده می‌شود.
 */
export function MentorSetupSteps({
  hasProfile, identity, rejectReason, published, suspended,
}: {
  hasProfile: boolean;
  identity: VerificationStatus;
  rejectReason?: string | null;
  published: boolean;
  suspended?: boolean;
}) {
  const verified = identity === "VERIFIED";
  const idSub = !hasProfile
    ? "کارت ملی یا گذرنامه؛ ادمین‌های آریون بررسی می‌کنند"
    : identity === "REJECTED"
      ? rejectReason || "مدرک واضح‌تری بفرست"
      : identity === "PENDING"
        ? "تا تأیید، در فهرست منتورها نمایش داده نمی‌شوی"
        : verified
          ? "هویتت تأیید شده است"
          : "کارت ملی یا گذرنامه؛ پیش از نمایش در فهرست لازم است";
  const idAction = hasProfile && (identity === "NOT_PROVIDED" || identity === "REJECTED")
    ? <Link href="/mentor/profile#verification" className="trade-primary-btn mentor-btn is-sm">{identity === "REJECTED" ? "ارسال دوباره" : "ارسال مدرک"}</Link>
    : hasProfile ? identityChip(identity) : undefined;

  const pubSub = !published
    ? "انتشار را در پروفایل روشن کن"
    : !verified
      ? "منتشر شده؛ پس از تأیید هویت در فهرست دیده می‌شوی"
      : "در فهرست منتورها دیده می‌شوی";
  const pubEnd = !hasProfile
    ? undefined
    : suspended
      ? <MentorChip tone="danger" icon={ic(Ban, MI.chip)}>معلق</MentorChip>
      : published
        ? (verified
          ? <MentorChip tone="accent" icon={ic(Eye, MI.chip)}>در فهرست</MentorChip>
          : <MentorChip tone="info" icon={ic(Hourglass, MI.chip)}>منتظر تأیید هویت</MentorChip>)
        : <Link href="/mentor/profile" className="account-outline-btn mentor-btn is-sm">{ic(EyeOff, MI.btnSm)} انتشار</Link>;

  return (
    <MentorSection title="فعال‌سازی پروفایل" icon={ic(ShieldCheck, MI.section)} flush>
      <MentorRow
        lead={<StepMark n={1} done={hasProfile} />}
        title="ساخت پروفایل"
        sub={<span>{hasProfile ? "ساخته شده است" : "حوزه، بیوگرافی و روش کار"}</span>}
        end={hasProfile ? undefined : <Link href="/mentor/profile" className="trade-primary-btn mentor-btn is-sm">ساخت پروفایل</Link>}
      />
      <MentorRow
        lead={<StepMark n={2} done={verified} />}
        title="احراز هویت"
        sub={<span>{idSub}</span>}
        end={idAction}
      />
      <MentorRow
        lead={<StepMark n={3} done={published && verified && !suspended} />}
        title="نمایش در فهرست منتورها"
        sub={<span>{hasProfile ? pubSub : "پس از تأیید هویت، شاگردها پیدایت می‌کنند و درخواست می‌دهند"}</span>}
        end={pubEnd}
      />
    </MentorSection>
  );
}

/**
 * /mentor برای کاربری که هنوز پروفایل منتوری ندارد: سه مرحله‌ی فعال‌سازی
 * (ساخت پروفایل، احراز هویت، نمایش) و دو نکته‌ی لازم پیش از شروع.
 * نکته‌ی اصلی: آریون واسطه است و مسئولیت محتوای برنامه با منتور است.
 */
export function MentorDashOnboarding() {
  return (
    <>
      <MentorSetupSteps hasProfile={false} identity="NOT_PROVIDED" published={false} />
      <MentorSection title="پیش از شروع" icon={ic(AlertCircle, MI.section)} flush>
        <MentorRow
          lead={ic(ClipboardList, MI.row)}
          title="مسئولیت برنامه‌ها"
          sub={<span>آریون واسطه‌ی ارتباط است و مسئولیت محتوای برنامه با منتور است</span>}
        />
        <MentorRow
          lead={ic(ShieldCheck, MI.row)}
          title="حریم خصوصی شاگرد"
          sub={<span>هر شاگرد تعیین می‌کند چه بخشی از برنامه و پیشرفتش را ببینی</span>}
        />
        <MentorRow
          lead={ic(IdCard, MI.row)}
          title="مدرک شناسایی"
          sub={<span>فقط تو و ادمین‌های آریون آن را می‌بینید؛ مدرک تخصصی اختیاری است</span>}
        />
      </MentorSection>
    </>
  );
}
