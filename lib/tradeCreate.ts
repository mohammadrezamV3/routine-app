import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { tr } from "@/lib/i18n";
import { parseTradeInput, ENTRY_SELECT, serializeEntry } from "@/lib/tradeServer";

/** حسابی که به کاربر تعلق دارد — هر روت معامله اول از این رد می‌شود */
export async function ownedAccount(userId: string, accountId: string) {
  if (!accountId) return null;
  return prisma.tradeAccount.findFirst({ where: { id: accountId, userId }, select: { id: true } });
}

/**
 * اسنپ‌شات چک‌لیست در لحظه‌ی ثبت.
 * متن آیتم‌ها کپی می‌شود نه ارجاع داده — اگر کاربر فردا یک آیتم را عوض یا
 * حذف کند، آمار معاملات دیروز نباید بی‌صدا معنی دیگری پیدا کند.
 */
export async function buildChecklistSnapshot(userId: string, checklistId: string | null, state: Record<string, boolean>) {
  if (!checklistId) {
    return { checklistId: null, checklistName: null, checklistDone: null, checklistTotal: null, checklistSnapshot: Prisma.DbNull };
  }
  const checklist = await prisma.tradeChecklist.findFirst({
    where: { id: checklistId, userId },
    select: { id: true, name: true, items: { select: { id: true, text: true }, orderBy: { order: "asc" } } },
  });
  if (!checklist) {
    return { checklistId: null, checklistName: null, checklistDone: null, checklistTotal: null, checklistSnapshot: Prisma.DbNull };
  }
  const snapshot = checklist.items.map((i) => ({ text: i.text, checked: !!state[i.id] }));
  return {
    checklistId: checklist.id,
    checklistName: checklist.name,
    checklistDone: snapshot.filter((i) => i.checked).length,
    checklistTotal: snapshot.length,
    checklistSnapshot: snapshot as unknown as Prisma.InputJsonValue,
  };
}


/**
 * ثبت یک معامله‌ی تازه برای کاربر — تک‌منبع مشترک بین POST /api/trade/entries
 * و دستیار نومو. نتیجه: { error, status } یا { entry }.
 */
export async function createTradeEntryFromBody(userId: string, body: any): Promise<{ error: string; status: number } | { entry: ReturnType<typeof serializeEntry> }> {
  const parsed = parseTradeInput(body);
  if (typeof parsed === "string") return { error: parsed, status: 400 };

  if (!(await ownedAccount(userId, parsed.data.accountId))) {
    return { error: tr("حساب پیدا نشد", "Account not found"), status: 404 };
  }

  const checklist = await buildChecklistSnapshot(userId, body?.checklistId ?? null, parsed.checklistState);
  const ownedTags = parsed.tagIds.length
    ? await prisma.tradeTag.findMany({ where: { id: { in: parsed.tagIds }, userId }, select: { id: true } })
    : [];

  const entry = await prisma.tradeEntry.create({
    data: {
      ...parsed.data,
      ...checklist,
      userId,
      tags: { connect: ownedTags.map((t) => ({ id: t.id })) },
      images: { create: parsed.images.map((img, i) => ({ dataUrl: img.dataUrl, caption: img.caption, order: i })) },
    },
    select: ENTRY_SELECT,
  });
  return { entry: serializeEntry(entry) };
}
