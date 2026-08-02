"use client";

import { Plus } from "lucide-react";
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
          <div className="py-6 text-center text-[11.5px] text-dash-muted sm:text-[12.5px]">برنامه‌ای برای این روز ثبت نشده</div>
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
