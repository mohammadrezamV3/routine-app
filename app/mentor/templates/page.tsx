"use client";

import { useEffect, useState } from "react";
import { MentorDashShell } from "@/components/MentorDashKit";
import { MentorTemplatesList } from "@/components/MentorTemplatesList";
import { MentorSavedRepliesManager } from "@/components/MentorSavedReplies";
import { SegmentedTabs } from "@/components/SegmentedTabs";

type Tab = "programs" | "replies";

/** /mentor/templates — قالب‌های برنامه و پاسخ‌های آماده‌ی گفت‌وگو */
export default function MentorTemplatesPage() {
  const [tab, setTab] = useState<Tab>("programs");

  // ?tab=replies (مثلاً از فهرستِ خالیِ پاسخ‌ها در گفت‌وگو)
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("tab") === "replies") setTab("replies");
  }, []);

  function change(v: Tab) {
    setTab(v);
    const url = v === "replies" ? `${window.location.pathname}?tab=replies` : window.location.pathname;
    window.history.replaceState(null, "", url);
  }

  return (
    <MentorDashShell title="قالب‌ها" back={{ href: "/mentor", label: "پنل منتور" }}>
      <div className="mentor-tabs">
        <SegmentedTabs<Tab>
          active={tab}
          onChange={change}
          options={[
            { value: "programs", label: "قالب برنامه" },
            { value: "replies", label: "پاسخ آماده" },
          ]}
        />
      </div>
      {tab === "programs" ? <MentorTemplatesList /> : <MentorSavedRepliesManager />}
    </MentorDashShell>
  );
}
