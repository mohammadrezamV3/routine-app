import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCircle2, Clock, LifeBuoy, Sparkles } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import type { MobileNotice, MobileNoticeKind } from "@/lib/account-contract";
import { describeAccountError } from "../api";
import { formatIsoJalali } from "../logic";
import { useNotices } from "../useNotices";
import { Empty, ErrorBox, Loading } from "../components/Ui";

const ICONS: Record<MobileNoticeKind, typeof Bell> = {
  welcome: Sparkles,
  ticket_answered: LifeBuoy,
  expiring: Clock,
  payment: CheckCircle2,
};

export default function NoticesScreen() {
  const navigate = useNavigate();
  const { data, unreadCount, refresh, markRead } = useNotices();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    refresh(true).catch((e) => setError(describeAccountError(e)));
  }, [refresh]);

  function open(n: MobileNotice) {
    if (!n.read) markRead({ ids: [n.id] }).catch(() => {});
    // فقط مسیرهای داخلیِ خودِ اپ — href از سرور میاد ولی هیچ‌وقت آدرسِ خارجی باز نمی‌شه
    if (n.href && n.href.startsWith("/account/")) navigate(n.href);
  }

  const readAll =
    unreadCount > 0 ? (
      <button
        type="button"
        onClick={() => markRead({ all: true }).catch((e) => setError(describeAccountError(e)))}
        className="font-vazir text-[12.5px]"
        style={{ color: "var(--accent)", minHeight: 40 }}
      >
        خواندنِ همه
      </button>
    ) : undefined;

  return (
    <div>
      <AppHeader title="اطلاعیه‌ها" showBack right={readAll} />
      <main className="pb-6 pt-2">
        {error && <ErrorBox message={error} onRetry={() => refresh(true).then(() => setError(null), (e) => setError(describeAccountError(e)))} />}
        {!data && !error && <Loading />}
        {data?.notices.length === 0 && <Empty icon={<Bell size={40} color="var(--muted)" />} text="اطلاعیه‌ای نداری" />}
        {data?.notices.map((n) => {
          const Icon = ICONS[n.kind] ?? Bell;
          return (
            <button
              key={n.id}
              type="button"
              onClick={() => open(n)}
              className="flex w-full items-start gap-3 border-b px-4 py-3 text-start font-vazir"
              style={{ borderColor: "var(--surface-line)", opacity: n.read ? 0.65 : 1 }}
            >
              <Icon size={20} color={n.read ? "var(--muted)" : "var(--accent)"} style={{ marginTop: 2, flexShrink: 0 }} />
              <span className="flex-1">
                <span className="flex items-center gap-2">
                  <span className="flex-1 text-[14px] font-semibold" style={{ color: "var(--text)" }}>
                    {n.title}
                  </span>
                  {!n.read && <span aria-label="نخوانده" className="rounded-full" style={{ width: 8, height: 8, background: "var(--accent)" }} />}
                </span>
                <span className="mt-0.5 block text-[12.5px] leading-6" style={{ color: "var(--muted)" }}>
                  {n.body}
                </span>
                <span className="block text-[11px] tabular-nums" style={{ color: "var(--muted)" }}>
                  {formatIsoJalali(n.createdAt)}
                </span>
              </span>
            </button>
          );
        })}
      </main>
    </div>
  );
}
