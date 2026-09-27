"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { AccountBlock } from "@/components/AccountUI";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { MentorPrivacySettings } from "@/components/MentorPrivacySettings";
import type { MentorshipRow, MentorshipsResponse } from "@/lib/mentorTypes";
import { publicUserName } from "@/lib/mentorTypes";

// بخشِ «دسترسیِ منتورها» در تنظیماتِ پنلِ کاربری — برای هر رابطه‌ی فعال/در
// انتظارِ من به‌عنوانِ شاگرد، «برنامه‌های قابل مشاهده» و «جزئیات قابل مشاهده».
// اگه منتوری ندارم (یا بخشِ منتورها برام بسته‌ست) کلا چیزی رندر نمی‌شه.
// ?mentorship=<id> همون رابطه رو از اول انتخاب‌شده باز می‌کنه (لینکِ صفحه‌ی رابطه).
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

  // لینکِ #mentor-privacy: بخش بعد از رسیدنِ داده ساخته می‌شه، پس اسکرولِ خودِ
  // مرورگر به هدف نمی‌رسه — بعد از رندر دستی اسکرول می‌کنیم.
  useEffect(() => {
    if (!rows?.length || window.location.hash !== "#mentor-privacy") return;
    document.getElementById("mentor-privacy")?.scrollIntoView({ block: "start" });
  }, [rows]);

  if (!rows || rows.length === 0) return null;
  const current = rows.find((m) => m.id === selected) ?? rows[0];

  return (
    <div id="mentor-privacy">
      <AccountBlock
        title="دسترسی منتورها"
        desc="هر منتور فقط بخش‌هایی از روتینت را می‌بیند که این‌جا اجازه بدهی"
        icon={<GraduationCap size={15} />}
        index={2}
      >
        {rows.length > 1 ? (
          <SegmentedTabs
            options={rows.map((m) => ({ value: m.id, label: publicUserName(m.counterpart) }))}
            active={current.id}
            onChange={setSelected}
          />
        ) : (
          <p className="mentor-muted">منتور: {publicUserName(current.counterpart)}</p>
        )}
      </AccountBlock>
      <MentorPrivacySettings
        key={current.id}
        mentorshipId={current.id}
        mentorName={publicUserName(current.counterpart)}
        active={current.status === "ACTIVE"}
      />
    </div>
  );
}
