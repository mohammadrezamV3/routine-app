"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MentorEmpty } from "@/components/MentorUI";
import { LoadingBlock } from "@/components/Spinner";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { MentorPrivacySettings } from "@/components/MentorPrivacySettings";
import type { MentorshipRow, MentorshipsResponse } from "@/lib/mentorTypes";
import { publicUserName } from "@/lib/mentorTypes";
import { tr } from "@/lib/i18n";

// بخش «دسترسی منتورها» در تنظیمات پنل کاربری — برای هر رابطه‌ی فعال/در
// انتظار من به‌عنوان شاگرد، «برنامه‌های قابل مشاهده» و «جزئیات قابل مشاهده».
// صفحه‌ی خودش: /account/general/mentors
// ?mentorship=<id> همون رابطه رو از اول انتخاب‌شده باز می‌کنه (لینک صفحه‌ی رابطه).
export function MentorPrivacyAccountSection() {
  const searchParams = useSearchParams();
  const wanted = searchParams.get("mentorship");
  const [rows, setRows] = useState<MentorshipRow[] | null>(null);
  const [selected, setSelected] = useState<string>("");

  useEffect(() => {
    let alive = true;
    fetch("/api/mentorships?role=student", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: MentorshipsResponse | null) => {
        if (!alive) return;
        const list = (d?.mentorships ?? []).filter((m) => m.status === "ACTIVE" || m.status === "PENDING");
        setRows(list);
        setSelected((prev) => prev || (list.find((m) => m.id === wanted)?.id ?? list[0]?.id ?? ""));
      })
      .catch(() => { if (alive) setRows([]); });
    return () => { alive = false; };
  }, [wanted]);

  if (!rows) return <LoadingBlock />;
  if (rows.length === 0) return <MentorEmpty>{tr("هنوز مربی‌ای نداری؛ وقتی با یه مربی شروع کنی، این‌جا تنظیم می‌کنی چی ببینه", "You don't have a mentor yet. Once you start with one, you can choose here what they can see")}</MentorEmpty>;
  const current = rows.find((m) => m.id === selected) ?? rows[0];

  return (
    <>
      {/* چند منتور → انتخاب تکی با SegmentedTabs؛ یک منتور → مستقیم تنظیماتش */}
      {rows.length > 1 && (
        <div className="mentor-privacy-picker">
          <SegmentedTabs
            options={rows.map((m) => ({ value: m.id, label: publicUserName(m.counterpart) }))}
            active={current.id}
            onChange={setSelected}
          />
        </div>
      )}
      <MentorPrivacySettings
        key={current.id}
        mentorshipId={current.id}
        mentorName={publicUserName(current.counterpart)}
        active={current.status === "ACTIVE"}
      />
    </>
  );
}
