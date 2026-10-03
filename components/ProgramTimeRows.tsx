"use client";

import type { ProgramKind, TimeRow } from "@/lib/programForm";

// [قرارداد — پیاده‌سازی با ایجنت B] کارت‌های ردیف ساعت فرم «افزودن برنامه».
export type RowError = { days?: boolean; start?: boolean; end?: boolean; order?: boolean };

export type ProgramTimeRowsProps = {
  kind: ProgramKind;
  rows: TimeRow[];
  onChange: (rows: TimeRow[]) => void;
  /** خطاهای اعتبارسنجی به ازای id ردیف */
  errors: Record<string, RowError>;
  /** اسم برنامه‌ای که با این ردیف تداخل داره (به ازای id ردیف)، یا null */
  conflicts: Record<string, string | null>;
  /** کاربر روی یک ردیف دست برد → خطای همون ردیف پاک بشه */
  onClearError: (rowId: string) => void;
};

export function ProgramTimeRows(_props: ProgramTimeRowsProps) {
  return null;
}
