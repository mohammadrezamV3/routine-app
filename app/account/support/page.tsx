"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Plus, MessageCircleQuestion, Inbox } from "lucide-react";
import { AccountBackButton } from "@/components/AccountBackButton";
import { SupportTicketModal } from "@/components/SupportTicketModal";
import { PanelSkeleton } from "@/components/PanelSkeleton";
import { toJalali, faNum, J_MONTHS } from "@/lib/jalali";

type TicketStatus = "OPEN" | "ANSWERED" | "CLOSED";
type TicketRow = {
  id: string; subject: string; status: TicketStatus; updatedAt: string;
  lastMessage: { body: string; fromAdmin: boolean } | null;
};

const STATUS_LABEL: Record<TicketStatus, string> = {
  OPEN: "در انتظار پاسخ",
  ANSWERED: "پاسخ داده شد",
  CLOSED: "بسته‌شده",
};
const STATUS_CLASS: Record<TicketStatus, string> = { OPEN: "open", ANSWERED: "answered", CLOSED: "closed" };

function formatTicketDate(iso: string): string {
  const d = new Date(iso);
  const [jy, jm, jd] = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  const hh = faNum(String(d.getHours()).padStart(2, "0"));
  const mm = faNum(String(d.getMinutes()).padStart(2, "0"));
  return `${faNum(jd)} ${J_MONTHS[jm - 1]} ${faNum(jy)}، ${hh}:${mm}`;
}

// پشتیبانیِ در-سایت — طبق درخواستِ صریح («راه‌های ارتباطی راهِ پشتیبانی
// نیست، فقط توی سایت می‌تونه پشتیبانی صورت بگیره») ایمیل/تلگرام/اینستاگرام
// قبلی کامل حذف شد؛ به‌جاش یک سیستمِ تیکتِ واقعی: هر کاربر تیکت می‌سازه،
// روی همون تیکت با ادمین گفت‌وگو می‌کنه (SupportTicket/SupportMessage،
// app/api/support/tickets). سمتِ ادمین: app/admin/support.
export default function SupportPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<TicketRow[] | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => {
    fetch("/api/support/tickets")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setTickets(d?.tickets || []));
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <section>
      <div className="acc-head">
        <AccountBackButton />
        {/* طبقِ درخواستِ صریح: تایتل «پشتیبانی» هم‌ردیفِ دکمه‌ی «ایجاد تیکت»
            (سمتِ چپ) — نه زیرِ هم مثلِ بقیه‌ی صفحه‌ها. */}
        <div className="support-head-row">
          <h1>پشتیبانی</h1>
          <button type="button" className="account-outline-btn support-new-btn" onClick={() => setCreating(true)}>
            <Plus size={15} /> ایجاد تیکت
          </button>
        </div>
      </div>

      {tickets === null && <PanelSkeleton />}

      {tickets !== null && !tickets.length && (
        <div className="trade-empty-state">
          <MessageCircleQuestion size={32} />
          <p>هنوز تیکتی نساختی</p>
        </div>
      )}

      {tickets !== null && !!tickets.length && (
        <div className="account-card">
          {tickets.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: Math.min(i, 8) * 0.035, ease: [0.22, 1, 0.36, 1] }}
            >
              <Link href={`/account/support/${t.id}`} className="account-row2">
                <span className="account-row2-icon"><Inbox size={16} /></span>
                <span className="account-row2-body">
                  <span className="account-row2-label">{t.subject}</span>
                  <span className="account-row2-desc">
                    {t.lastMessage ? `${t.lastMessage.fromAdmin ? "پشتیبانی: " : ""}${t.lastMessage.body}` : ""}
                  </span>
                  <span className="support-ticket-time mono" dir="ltr">{formatTicketDate(t.updatedAt)}</span>
                </span>
                <span className={`support-status ${STATUS_CLASS[t.status]}`}>{STATUS_LABEL[t.status]}</span>
              </Link>
            </motion.div>
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
