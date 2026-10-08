// تایپ‌های سمت کلاینت ابزارهای منتور (قالب، پاسخ آماده، گزارش هفتگی،
// هشدار) — آینه‌ی شکل پاسخ روت‌های /api/mentor/templates|replies|reports|alerts.
// بدون import سروری؛ تاریخ‌ها رشته‌ی ISO‌اند.

import type { ProgramType } from "@/lib/mentorTypes";

export type TemplateRow = {
  id: string;
  name: string;
  type: ProgramType;
  title: string;
  itemCount: number;
  durationDays: number | null;
  usedCount: number;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TemplateItem = {
  order: number;
  title: string;
  details: string | null;
  repeat: "DAILY" | "WEEKLY";
  days: number[];
  startTime: string | null;
  durationMin: number | null;
  sets: number | null;
  reps: string | null;
  weightKg: number | null;
  restSec: number | null;
};

export type TemplateDetail = TemplateRow & { description: string | null; note: string | null; items: TemplateItem[] };

export type TemplatesResponse = { templates: TemplateRow[] };
export type TemplateResponse = { template: TemplateDetail };

export type SavedReply = { id: string; title: string; body: string; createdAt: string; updatedAt: string };
export type SavedRepliesResponse = { replies: SavedReply[] };

export type WeeklyStudentReport = {
  studentId: string;
  mentorshipId: string;
  name: string;
  avatarUrl: string | null;
  paused: boolean;
  progressHidden: boolean;
  from: string;
  to: string;
  scheduled: number;
  completed: number;
  partial: number;
  missed: number;
  unlogged: number;
  rate: number;
  streak: number;
  idleDays: number;
  lastDoneDate: string | null;
  lastMessageAt: string | null;
  missedItems: { title: string; count: number }[];
  activePrograms: number;
  scheduledPrograms: { id: string; title: string; startDate: string }[];
};

export type WeeklyReport = { offset: number; generatedAt: string; students: WeeklyStudentReport[] };

export type AlertsResponse = { alertMissedDays: number | null };

/** لینک دریافت CSV پیشرفت یک شاگرد (۳۰ روز اخیر یا بازه‌ی داده‌شده) */
export function exportCsvUrl(studentId: string, range?: { from: string; to: string }): string {
  const q = new URLSearchParams({ studentId });
  if (range) { q.set("from", range.from); q.set("to", range.to); }
  return `/api/mentor/export?${q.toString()}`;
}
