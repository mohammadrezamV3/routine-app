"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { DashCard } from "./DashCard";
import { DashTaskRow } from "./DashTaskRow";
import { DASH_TASKS } from "@/lib/dashboardMockData";

export function DashTaskList({ className, delay }: { className?: string; delay?: number }) {
  const [tasks, setTasks] = useState(DASH_TASKS);

  function toggle(id: string) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  }

  return (
    <DashCard delay={delay} className={className}>
      <div className="flex items-center justify-between">
        <button type="button" className="flex items-center gap-1.5 text-[13.5px] font-semibold text-dash-green transition hover:brightness-110">
          <Plus size={17} />
          افزودن برنامه
        </button>
        <h2 className="text-[22px] font-bold text-dash-text">برنامه‌های امروز</h2>
      </div>

      <div className="mt-4 flex flex-col divide-y divide-dash-border">
        {tasks.map((t) => (
          <DashTaskRow key={t.id} task={t} onToggle={toggle} />
        ))}
      </div>
    </DashCard>
  );
}
