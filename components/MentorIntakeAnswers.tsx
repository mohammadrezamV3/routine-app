"use client";

import type { IntakeAnswer } from "@/lib/mentorTypes";

/**
 * جواب‌های شاگرد به سؤال‌های پذیرش منتور — سؤال کم‌رنگ، جواب زیرش.
 * همه‌جا (ردیف درخواست، صفحه‌ی شاگرد) همین نمایش استفاده می‌شود.
 */
export function MentorIntakeAnswers({ answers }: { answers: IntakeAnswer[] | null | undefined }) {
  if (!answers || answers.length === 0) return null;
  return (
    <dl className="mentor-intake">
      {answers.map((a, i) => (
        <div key={i} className="mentor-intake-item">
          <dt>{a.question}</dt>
          <dd>{a.answer}</dd>
        </div>
      ))}
    </dl>
  );
}
