"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { MentorDashShell } from "@/components/MentorDashKit";
import { MentorProgramsSent } from "@/components/MentorProgramsSent";
import { MentorTemplatesList } from "@/components/MentorTemplatesList";
import { MentorSavedRepliesManager } from "@/components/MentorSavedReplies";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { MentorSwap } from "@/components/MentorMotion";

type Tab = "sent" | "templates" | "replies";

function tabFromUrl(): Tab {
  const t = new URLSearchParams(window.location.search).get("tab");
  if (t === "replies") return "replies";
  // لینک‌های قدیمی (?tab=programs) = قالب‌ها
  if (t === "templates" || t === "programs") return "templates";
  return "sent";
}

/** /mentor/templates — تب «برنامه‌ها»: فرستاده‌شده، قالب‌ها، پیام‌های آماده */
export default function MentorProgramsPage() {
  const [tab, setTab] = useState<Tab>("sent");

  useEffect(() => { setTab(tabFromUrl()); }, []);

  function change(v: Tab) {
    setTab(v);
    window.history.replaceState(null, "", v === "sent" ? window.location.pathname : `${window.location.pathname}?tab=${v}`);
  }

  return (
    <MentorDashShell
      title="برنامه‌ها"
      titleAction={
        <Link href="/mentor/programs/new" className="trade-primary-btn mentor-btn is-sm">
          <Plus size={15} strokeWidth={2} aria-hidden /> برنامه‌ی تازه
        </Link>
      }
    >
      <div className="mentor-tabs">
        <SegmentedTabs<Tab>
          active={tab}
          onChange={change}
          ariaLabel="بخش‌های برنامه‌ها"
          options={[
            { value: "sent", label: "فرستاده‌شده" },
            { value: "templates", label: "قالب‌ها" },
            { value: "replies", label: "پیام‌های آماده" },
          ]}
        />
      </div>
      <MentorSwap swapKey={tab}>
        {tab === "sent" ? <MentorProgramsSent /> : tab === "templates" ? <MentorTemplatesList /> : <MentorSavedRepliesManager />}
      </MentorSwap>
    </MentorDashShell>
  );
}
