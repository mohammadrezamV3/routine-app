"use client";

import { ClipboardList, Plus } from "lucide-react";
import { DashCard } from "./DashCard";
import { DashTaskRow, DashTaskItem } from "./DashTaskRow";

export function DashTaskList({
  tasks,
  editable,
  onToggle,
  onAddProgram,
  onOpenProgram,
  onEditTask,
  onDeleteTask,
  onMoveTask,
  className,
  delay,
}: {
  tasks: DashTaskItem[];
  editable: boolean;
  onToggle: (id: string) => void;
  onAddProgram: () => void;
  onOpenProgram: (name: string) => void;
  onEditTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onMoveTask: (id: string) => void;
  className?: string;
  delay?: number;
}) {
  return (
    <DashCard delay={delay} className={className}>
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-bold text-dash-text sm:text-[22px]">برنامه‌های امروز</h2>
        <button
          type="button"
          onClick={onAddProgram}
          className="flex items-center gap-1 text-[11.5px] font-semibold text-dash-green transition hover:brightness-110 sm:gap-1.5 sm:text-[13.5px]"
        >
          <Plus className="h-[15px] w-[15px] sm:h-[17px] sm:w-[17px]" />
          افزودن برنامه
        </button>
      </div>

      <div className="mt-4 flex flex-col divide-y divide-dash-border">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center gap-2.5 py-7 text-center sm:py-8">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-dash-surface2 text-dash-muted">
              <ClipboardList className="h-4 w-4" />
            </div>
            <div className="text-[12.5px] font-medium text-dash-text sm:text-[13.5px]">برنامه‌ای برای این روز ثبت نشده</div>
            <button
              type="button"
              onClick={onAddProgram}
              className="mt-0.5 flex items-center gap-1 rounded-full border border-[rgba(var(--accent-rgb),.3)] bg-[rgba(var(--accent-rgb),.1)] px-3 py-1.5 text-[11.5px] font-semibold text-dash-green transition hover:bg-[rgba(var(--accent-rgb),.15)]"
            >
              <Plus className="h-3.5 w-3.5" />
              افزودن برنامه
            </button>
          </div>
        ) : (
          tasks.map((t) => (
            <DashTaskRow
              key={t.id}
              task={t}
              editable={editable}
              onToggle={onToggle}
              onOpen={onOpenProgram}
              onEdit={onEditTask}
              onDelete={onDeleteTask}
              onMove={onMoveTask}
            />
          ))
        )}
      </div>
    </DashCard>
  );
}
