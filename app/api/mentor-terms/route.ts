import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMentorsUser } from "@/lib/mentorGuard";
import { MENTOR_TERMS_VERSION, hasCurrentMentorTerms } from "@/lib/mentorTerms";

// GET /api/mentor-terms → وضعیتِ پذیرشِ «شرایط منتورها» برای کاربرِ جاری، در هر دو نقش.
// فقط خواندنی است؛ ثبتِ پذیرش همیشه هم‌راه با خودِ عمل انجام می‌شود
// (PUT /api/mentors/me و POST /api/mentorships) تا پذیرشِ بی‌عمل ثبت نشود.
export async function GET() {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  const u = await prisma.user.findUnique({
    where: { id: g.userId },
    select: {
      mentorStudentTermsVersion: true,
      mentorStudentTermsAcceptedAt: true,
      mentorProfile: { select: { mentorTermsVersion: true, acceptedMentorTermsAt: true } },
    },
  });
  return NextResponse.json({
    version: MENTOR_TERMS_VERSION,
    student: {
      accepted: hasCurrentMentorTerms(u?.mentorStudentTermsVersion),
      acceptedAt: u?.mentorStudentTermsAcceptedAt ?? null,
    },
    mentor: {
      hasProfile: !!u?.mentorProfile,
      accepted: hasCurrentMentorTerms(u?.mentorProfile?.mentorTermsVersion),
      acceptedAt: u?.mentorProfile?.acceptedMentorTermsAt ?? null,
    },
  });
}
