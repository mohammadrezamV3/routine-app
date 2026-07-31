"use client";

import { useState } from "react";
import { Filter, Calendar } from "lucide-react";
import { DashHeader } from "@/components/DashHeader";
import { DashDateSelector } from "@/components/DashDateSelector";
import { DashFilterButton } from "@/components/DashFilterButton";
import { DashDropdown } from "@/components/DashDropdown";
import { DashTaskList } from "@/components/DashTaskList";
import { DashSidebar } from "@/components/DashSidebar";

const PROGRAM_OPTIONS = [
  { value: "all", label: "همه برنامه‌ها" },
  { value: "mind", label: "سلامت ذهن" },
  { value: "fitness", label: "سلامت جسم" },
  { value: "learning", label: "یادگیری" },
];

// پیش‌نمایشِ پیکسل‌محورِ یک طرحِ داشبورد که کاربر داده — دیتای این صفحه mock
// و مستقل از بقیه‌ی اپه (مدل‌هایی مثل «اعضای تیم»/«حال روزانه» توی اسکیمای
// این پروژه اصلاً وجود ندارن)، فقط برای تأییدِ ظاهر قبل از هر تصمیمِ ادغام.
export default function DashboardPreviewPage() {
  const [activeDay, setActiveDay] = useState("mon");
  const [activeFilter, setActiveFilter] = useState<"today" | "week">("today");
  const [program, setProgram] = useState("all");

  return (
    <div className="dash-breakout dash-scope min-h-screen px-3 pb-[calc(100px+env(safe-area-inset-bottom))] pt-3 text-dash-text sm:px-6 sm:pt-4 lg:px-8 lg:py-8">
      <div className="flex flex-col gap-4 sm:gap-6">
        <DashHeader progress={75} />

        <div className="flex flex-col gap-2.5 sm:gap-3 lg:flex-row lg:items-center lg:gap-4">
          <DashDateSelector activeKey={activeDay} onSelect={setActiveDay} className="lg:order-2" />

          <div className="flex flex-wrap items-center gap-2 lg:order-1 lg:shrink-0 lg:flex-nowrap">
            <DashDropdown label="همه برنامه‌ها" value={program} onChange={setProgram} options={PROGRAM_OPTIONS} />
            <DashFilterButton
              label="این هفته"
              active={activeFilter === "week"}
              onClick={() => setActiveFilter("week")}
            />
            <DashFilterButton
              label="امروز"
              icon={<Calendar size={15} />}
              active={activeFilter === "today"}
              onClick={() => setActiveFilter("today")}
            />
            <DashFilterButton label="فیلتر" icon={<Filter size={15} />} />
          </div>
        </div>

        <div className="flex flex-col gap-4 sm:gap-6 lg:flex-row lg:items-start">
          <DashTaskList delay={0.05} className="order-1 lg:order-1 lg:flex-1" />
          <DashSidebar className="order-2 lg:order-2 lg:w-[320px] lg:shrink-0" />
        </div>
      </div>
    </div>
  );
}
