"use client";

import { useCallback, useEffect, useState } from "react";
import { Hourglass, ListOrdered, PartyPopper, UserMinus } from "lucide-react";
import { MentorList, MentorListItem } from "./MentorMotion";
import { MI, MI_STROKE, MentorChip, MentorRow, MentorSection } from "./MentorUI";
import { MentorUserAvatar } from "./MentorUserAvatar";
import { MentorConfirmDialog } from "./MentorConfirmDialog";
import { fa, mentorApi } from "./MentorDashKit";
import { fmtRelative } from "@/lib/mentorFormat";
import { useLiveRefresh } from "@/lib/liveSync";
import { offerRemainingLabel, positionLabel } from "@/lib/mentorWaitlist";
import { publicUserName } from "@/lib/mentorTypes";
import type { MentorWaitlistResponse, MentorWaitlistRow } from "@/lib/mentorTypes";
import { GoldenName } from "@/components/GoldenName";

const ic = (Icon: typeof Hourglass, size: number) => <Icon size={size} strokeWidth={MI_STROKE} aria-hidden />;

/**
 * صفِ انتظارِ مربی (GET /api/mentor/waitlist) — زیرِ فهرستِ شاگردها. نوبت‌دارها
 * اول، بعد به ترتیبِ ورود. فقط اسم و زمان؛ جواب‌های پذیرش با درخواستِ عادی می‌رسند.
 * وقتی صف خالی است چیزی نشان نمی‌دهد.
 */
export function MentorWaitlistSection() {
  const [data, setData] = useState<MentorWaitlistResponse | null>(null);
  const [remove, setRemove] = useState<MentorWaitlistRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await mentorApi<MentorWaitlistResponse>("/api/mentor/waitlist");
    if (r.ok) setData(r.data);
  }, []);
  useEffect(() => { load(); }, [load]);
  useLiveRefresh("mentor:mentorship", () => { load(); });

  async function confirmRemove() {
    if (!remove) return;
    setBusy(true);
    setError(null);
    const r = await mentorApi<{ ok: true }>(`/api/mentor/waitlist/${remove.id}`, { method: "DELETE" });
    setBusy(false);
    if (!r.ok && r.status !== 404) { setError(r.error); return; }
    setRemove(null);
    load();
  }

  if (!data || data.entries.length === 0) return null;
  const waiting = data.entries.filter((e) => e.status === "WAITING").length;

  return (
    <>
      <MentorSection title="صف انتظار" icon={ic(ListOrdered, MI.section)} count={fa(waiting)} flush>
        <MentorList>
          {data.entries.map((e) => {
            const name = publicUserName(e.user);
            return (
              <MentorListItem key={e.id}>
                <MentorRow
                  lead={<MentorUserAvatar avatarUrl={e.user.avatarUrl} name={name} size={36} />}
                  title={<GoldenName golden={e.user.golden}>{name}</GoldenName>}
                  sub={
                    e.status === "OFFERED" && e.offerExpiresAt ? (
                      <span>نوبتش رسیده · {offerRemainingLabel(e.offerExpiresAt, new Date(), true)}</span>
                    ) : (
                      <>
                        {e.position && <span>{positionLabel(e.position)}</span>}
                        <span>از {fmtRelative(e.joinedAt)}</span>
                      </>
                    )
                  }
                  end={
                    <>
                      {e.status === "OFFERED" && <MentorChip tone="ok" icon={ic(PartyPopper, MI.chip)}>نوبت داده شد</MentorChip>}
                      <button
                        type="button"
                        className="trade-icon-btn"
                        onClick={() => { setError(null); setRemove(e); }}
                        aria-label={`خارج کردن ${name} از صف`}
                        title="خارج کردن از صف"
                      >
                        {ic(UserMinus, MI.btnSm)}
                      </button>
                    </>
                  }
                />
              </MentorListItem>
            );
          })}
        </MentorList>
      </MentorSection>
      {remove && (
        <MentorConfirmDialog
          message={`${publicUserName(remove.user)} از صف خارج بشه؟`}
          hint={remove.status === "OFFERED" ? "نوبتش به نفر بعدی صف می‌رسه." : "بهش خبر می‌دیم که فعلاً جایی براش نیست."}
          confirmLabel="خارج کردن"
          busy={busy}
          error={error}
          onConfirm={confirmRemove}
          onCancel={() => { setRemove(null); setError(null); }}
        />
      )}
    </>
  );
}
