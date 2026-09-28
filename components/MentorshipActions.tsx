"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, Flag, LogOut, X } from "lucide-react";
import { MentorConfirmDialog } from "./MentorConfirmDialog";
import type { MentorMenuAction } from "./MentorKebabMenu";
import type { Relation } from "./useMentorshipRelation";
import { useAsyncAction } from "@/lib/useAsyncAction";
import type { MentorshipAction } from "@/lib/mentorTypes";
import { publicUserName } from "@/lib/mentorTypes";

const MENU_ICON = { size: 15, strokeWidth: 1.75, "aria-hidden": true } as const;

type Confirm = "end" | "block" | "cancel";

/**
 * اقدام‌های رابطه (پایان، لغوِ درخواست، مسدودی، گزارشِ گفت‌وگو) برای منوی
 * سه‌نقطه‌ی سرِ صفحه‌ی رابطه و سرِ گفت‌وگو. هر اقدامِ مخرب پیش از اجرا
 * MentorConfirmDialog می‌گیرد. خروجی: آیتم‌های منو + دیالوگ‌ها (برای رندر).
 */
export function useMentorshipActions({
  rel, onChanged, onReportConversation,
}: {
  rel: Relation | null;
  onChanged: () => void;
  /** وقتی داده شود، آیتمِ «گزارش گفت‌وگو» در منو می‌آید */
  onReportConversation?: (() => void) | null;
}) {
  const router = useRouter();
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const { pendingKey, error, run, clearError } = useAsyncAction();

  if (!rel) return { actions: [] as MentorMenuAction[], dialogs: null };
  const { row, role } = rel;
  const name = publicUserName(row.counterpart);
  const isPending = row.status === "PENDING";
  const iMustAnswer = isPending && ((role === "student" && row.initiatedBy === "MENTOR") || (role === "mentor" && row.initiatedBy === "STUDENT"));
  const iInitiated = isPending && !iMustAnswer;
  const chatOpen = row.status === "ACTIVE" || row.status === "ENDED";

  const open = (c: Confirm) => { clearError(); setConfirm(c); };
  const actions: MentorMenuAction[] = [];
  if (chatOpen && onReportConversation) actions.push({ label: "گزارش گفت‌وگو", icon: <Flag {...MENU_ICON} />, onClick: onReportConversation });
  if (row.status === "ACTIVE") actions.push({ label: "پایان رابطه", icon: <LogOut {...MENU_ICON} />, onClick: () => open("end") });
  if (iInitiated) actions.push({ label: "لغو درخواست", icon: <X {...MENU_ICON} />, onClick: () => open("cancel") });
  if (row.status === "ACTIVE" || isPending || row.status === "ENDED") {
    actions.push({ label: "مسدود کردن", icon: <Ban {...MENU_ICON} />, onClick: () => open("block"), danger: true });
  }

  async function act(action: MentorshipAction) {
    const ok = await run(action, () =>
      fetch(`/api/mentorships/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
    );
    if (!ok) return;
    setConfirm(null);
    if (action === "block" || action === "cancel") {
      router.push(role === "mentor" ? "/mentor" : "/mentorship");
      return;
    }
    onChanged();
  }

  const dialogs = confirm ? (
    <MentorConfirmDialog
      message={confirm === "end" ? `رابطه با ${name} پایان یابد؟` : confirm === "cancel" ? `درخواست به ${name} لغو شود؟` : `${name} مسدود شود؟`}
      hint={
        confirm === "end" ? "برنامه‌های در جریان لغو می‌شوند؛ گفت‌وگو فقط‌خواندنی می‌ماند."
          : confirm === "cancel" ? "بعداً می‌توانی دوباره درخواست بدهی."
          : "رابطه قطع و برنامه‌های در جریان لغو می‌شوند؛ دیگر درخواست یا پیامی از او نمی‌رسد."
      }
      confirmLabel={confirm === "end" ? "پایان رابطه" : confirm === "cancel" ? "لغو درخواست" : "مسدود کردن"}
      busy={pendingKey === confirm}
      error={error}
      onConfirm={() => act(confirm)}
      onCancel={() => { setConfirm(null); clearError(); }}
    />
  ) : null;

  return { actions, dialogs };
}
