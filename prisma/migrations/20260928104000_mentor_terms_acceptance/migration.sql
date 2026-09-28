-- پذیرشِ «شرایط استفاده از بخش منتورها» (lib/mentorTerms.ts، app/terms/mentors)
-- منتور: هنگامِ ساخت/ذخیره‌ی پروفایل؛ شاگرد: هنگامِ اولین درخواستِ شاگردی.
-- عمداً backfill نمی‌شود: پذیرشِ فرضی ارزشِ اثباتی ندارد؛ کاربرانِ قبلی در ذخیره/درخواستِ بعدی می‌پذیرند.

ALTER TABLE "MentorProfile" ADD COLUMN "acceptedMentorTermsAt" TIMESTAMP(3);
ALTER TABLE "MentorProfile" ADD COLUMN "mentorTermsVersion" TEXT;

ALTER TABLE "User" ADD COLUMN "mentorStudentTermsAcceptedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "mentorStudentTermsVersion" TEXT;

ALTER TABLE "Mentorship" ADD COLUMN "studentTermsVersion" TEXT;
