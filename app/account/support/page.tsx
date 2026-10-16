"use client";

import { useCallback, useEffect, useState } from "react";
import { SmartLink as Link } from "@/components/SmartLink";
import { useRouter } from "next/navigation";
import { Plus, MessageCircleQuestion, Inbox } from "lucide-react";
import { SupportTicketModal } from "@/components/SupportTicketModal";
import { AccountPageHead, AccountSkeleton } from "@/components/AccountUI";
import { toJalali, faNum, jMonthName } from "@/lib/jalali";
import { tr } from "@/lib/i18n";

type TicketStatus = "OPEN" | "ANSWERED" | "CLOSED";
type TicketRow = {
  id: string; subject: string; status: TicketStatus; updatedAt: string;
  lastMessage: { body: string; fromAdmin: boolean } | null;
};

const statusLabel = (): Record<TicketStatus, string> => ({
  OPEN: tr("در انتظار پاسخ", "Awaiting reply"),
  ANSWERED: tr("پاسخ داده شد", "Answered"),
  CLOSED: tr("بسته‌شده", "Closed"),
});
const STATUS_CLASS: Record<TicketStatus, string> = { OPEN: "open", ANSWERED: "answered", CLOSED: "closed" };

function formatTicketDate(iso: string): string {
  const d = new Date(iso);
  const [jy, jm, jd] = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  const hh = faNum(String(d.getHours()).padStart(2, "0"));
  const mm = faNum(String(d.getMinutes()).padStart(2, "0"));
  return tr(`${faNum(jd)} ${jMonthName(jm - 1)} ${faNum(jy)}، ${hh}:${mm}`, `${faNum(jd)} ${jMonthName(jm - 1)} ${faNum(jy)}, ${hh}:${mm}`);
}

// پشتیبانی در-سایت — طبق درخواست صریح («راه‌های ارتباطی راه پشتیبانی
// نیست، فقط توی سایت می‌تونه پشتیبانی صورت بگیره») ایمیل/تلگرام/اینستاگرام
// قبلی کامل حذف شد؛ به‌جاش یک سیستم تیکت واقعی: هر کاربر تیکت می‌سازه،
// روی همون تیکت با ادمین گفت‌وگو می‌کنه (SupportTicket/SupportMessage،
// app/api/support/tickets). سمت ادمین: app/admin/support.
export default function SupportPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<TicketRow[] | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => {
    fetch("/api/support/tickets")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setTickets(d?.tickets || []))
      .catch(() => setTickets([]));
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <section>
      {/* تایتل «پشتیبانی» هم‌ردیف دکمه‌ی «ایجاد تیکت» — تنها کار اصلی صفحه، پس
          دکمه‌ی اصلی (btn-primary) با آیکون. */}
      <AccountPageHead
        title={tr("پشتیبانی", "Support")}
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
            <Plus size={17} aria-hidden="true" /> {tr("ایجاد تیکت", "New ticket")}
          </button>
        }
      />

      {tickets === null && <AccountSkeleton blocks={1} />}

      {tickets !== null && !tickets.length && (
        <div className="ap-card account-card">
          <div className="ap-ticket-empty">
            <MessageCircleQuestion size={32} aria-hidden="true" />
            <p>{tr("هنوز تیکتی نساختی", "You have not created any tickets yet")}</p>
          </div>
        </div>
      )}

      {tickets !== null && !!tickets.length && (
        <div className="account-card ap-card is-clip m-rise">
          {tickets.map((t, i) => (
            <div key={t.id} className="ap-row-wrap m-rise" style={{ "--i": Math.min(i, 8) } as React.CSSProperties}>
              <Link href={`/account/support/${t.id}`} className="ap-row">
                <span className="ap-row-icon" aria-hidden="true"><Inbox size={17} /></span>
                <span className="ap-row-body">
                  <span className="ap-row-label">{t.subject}</span>
                  <span className="ap-ticket-sub">
                    {t.lastMessage ? `${t.lastMessage.fromAdmin ? tr("پشتیبانی: ", "Support: ") : ""}${t.lastMessage.body}` : ""}
                  </span>
                  <span className="ap-ticket-time mono" dir="ltr">{formatTicketDate(t.updatedAt)}</span>
                </span>
                <span className={`ap-status is-${STATUS_CLASS[t.status]}`}>{statusLabel()[t.status]}</span>
              </Link>
            </div>
          ))}
        </div>
      )}

      {creating && (
        <SupportTicketModal
          onClose={() => setCreating(false)}
          onCreated={(ticketId) => { setCreating(false); router.push(`/account/support/${ticketId}`); }}
        />
      )}
    </section>
  );
}
