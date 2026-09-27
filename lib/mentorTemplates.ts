import type { MentorProgramTemplate, Prisma } from "@prisma/client";
import { validateProgramInput, type ItemData } from "@/lib/mentorValidate";
import { rangeDuration } from "@/lib/mentorProgramCopy";
import { isoDate } from "@/lib/mentorServer";

// قالبِ برنامه‌ی منتور — اعتبارسنجی و شکلِ پاسخ. محتوای قالب از همان
// validateProgramInputِ برنامه رد می‌شود، پس قالب هرگز چیزی نگه نمی‌دارد که
// برنامه‌ی واقعی نتواند بپذیرد.

export const TEMPLATE_NAME_MAX = 80;
export const MAX_TEMPLATES_PER_MENTOR = 100;

export type TemplateRow = {
  id: string;
  name: string;
  type: "ROUTINE" | "WORKOUT";
  title: string;
  itemCount: number;
  durationDays: number | null;
  usedCount: number;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type TemplateDetail = TemplateRow & { description: string | null; note: string | null; items: ItemData[] };

export function validateTemplateName(v: unknown): { ok: true; name: string } | { ok: false; error: string } {
  if (typeof v !== "string") return { ok: false, error: "نام قالب لازم است" };
  const name = v.replace(/\s+/g, " ").trim();
  if (!name) return { ok: false, error: "نام قالب لازم است" };
  if (name.length > TEMPLATE_NAME_MAX) return { ok: false, error: `نام قالب حداکثر ${TEMPLATE_NAME_MAX} نویسه است` };
  return { ok: true, name };
}

/** محتوای برنامه (همان بدنه‌ی POST برنامه) → داده‌ی ساختِ قالب */
export function templateDataFromBody(body: unknown): { ok: true; data: Omit<Prisma.MentorProgramTemplateUncheckedCreateInput, "profileId" | "name"> } | { ok: false; error: string } {
  const v = validateProgramInput(body);
  if (!v.ok) return v;
  if (v.data.items.length === 0) return { ok: false, error: "قالب حداقل یک آیتم لازم دارد" };
  const start = v.data.startDate ? isoDate(v.data.startDate) : null;
  const end = v.data.endDate ? isoDate(v.data.endDate) : null;
  return {
    ok: true,
    data: {
      type: v.data.type,
      title: v.data.title,
      description: v.data.description,
      note: v.data.note,
      durationDays: rangeDuration(start, end),
      items: v.data.items as unknown as Prisma.InputJsonValue,
      itemCount: v.data.items.length,
    },
  };
}

export function toTemplateRow(t: MentorProgramTemplate): TemplateRow {
  return {
    id: t.id,
    name: t.name,
    type: t.type,
    title: t.title,
    itemCount: t.itemCount,
    durationDays: t.durationDays,
    usedCount: t.usedCount,
    lastUsedAt: t.lastUsedAt,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

/** آیتم‌های ذخیره‌شده دوباره اعتبارسنجی می‌شوند؛ ردیفِ خراب نادیده گرفته می‌شود */
export function templateItems(t: MentorProgramTemplate): ItemData[] {
  const raw = Array.isArray(t.items) ? t.items : [];
  const v = validateProgramInput({ type: t.type, title: t.title || "قالب", items: raw });
  return v.ok ? v.data.items : [];
}

export function toTemplateDetail(t: MentorProgramTemplate): TemplateDetail {
  return { ...toTemplateRow(t), description: t.description, note: t.note, items: templateItems(t) };
}
