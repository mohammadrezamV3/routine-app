"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Ban, Loader2, Map, Star, User as UserIcon, X } from "lucide-react";
import { AgentAvatar } from "./AgentAvatar";
import { StreakFlame } from "./StreakFlame";
import { LockBodyScroll } from "./LockBodyScroll";
import { faNum } from "@/lib/jalali";

type Profile = {
  id: string;
  name: string;
  username: string | null;
  avatarUrl: string | null;
  streak: number;
  bestStreak: number;
  starsCount: number;
  starredByMe: boolean;
  roadmapsCompleted: number;
  plansCompleted: number;
  planName: string | null;
};

// پاپ‌آپِ پروفایلِ یک کاربر — با کلیک روی اسمِ دوست (لیست/پنل دوستان، و
// طبقِ درخواستِ صریح، توی نتایجِ «افزودن دوست» هم) باز می‌شود. طبقِ
// درخواستِ صریح: وسطِ بالای صفحه (نه وسطِ عمودیِ معمولِ بقیه‌ی پاپ‌آپ‌ها).
export function FriendProfileModal({
  userId,
  canStar = true,
  onClose,
  onBlocked,
}: {
  userId: string;
  /** دکمه‌ی استار فقط بینِ دوستانِ تأییدشده معنا دارد؛ بلاک همیشه ممکن است (مستقل از دوستی). */
  canStar?: boolean;
  onClose: () => void;
  onBlocked?: () => void;
}) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [starBusy, setStarBusy] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [blockBusy, setBlockBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/users/${userId}/profile`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled) return;
        if (!d?.profile) { setNotFound(true); return; }
        setProfile(d.profile);
      })
      .catch(() => { if (!cancelled) setNotFound(true); });
    return () => { cancelled = true; };
  }, [userId]);

  async function toggleStar() {
    if (!profile || starBusy) return;
    const next = !profile.starredByMe;
    setStarBusy(true);
    setProfile((p) => (p ? { ...p, starredByMe: next, starsCount: p.starsCount + (next ? 1 : -1) } : p));
    try {
      const res = await fetch(`/api/users/${userId}/star`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ starred: next }),
      });
      if (res.ok) {
        const data = await res.json();
        setProfile((p) => (p ? { ...p, starredByMe: data.starred, starsCount: data.starsCount } : p));
      }
    } finally {
      setStarBusy(false);
    }
  }

  async function block() {
    if (blockBusy) return;
    setBlockBusy(true);
    await fetch(`/api/users/${userId}/block`, { method: "POST" });
    setBlockBusy(false);
    onBlocked?.();
    onClose();
  }

  return createPortal(
    <>
      <LockBodyScroll />
      <div className="modal-overlay open" onClick={onClose} />
      <div className="friend-profile-panel" role="dialog" aria-modal="true">
        <button type="button" className="trade-icon-btn friend-profile-close" onClick={onClose} aria-label="بستن">
          <X size={16} />
        </button>

        {!profile && !notFound && (
          <div className="friend-profile-loading">
            <Loader2 size={20} className="trade-spin" />
          </div>
        )}

        {notFound && <div className="item-line empty" style={{ marginTop: 10 }}>پروفایل در دسترس نیست</div>}

        {profile && (
          <>
            <div className="friend-profile-head">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="" className="friend-profile-avatar" />
              ) : (
                <AgentAvatar seed={profile.name || "؟"} size={72} className="friend-profile-avatar" />
              )}
              <div className="friend-profile-name">{profile.name}</div>
              {profile.username && <div className="friend-profile-username mono">@{profile.username}</div>}
              {profile.planName && <div className="friend-profile-plan">{profile.planName}</div>}
            </div>

            <div className="friend-profile-stats">
              <div className="friend-profile-stat">
                <StreakFlame streak={profile.streak} />
                <span>استریک فعلی</span>
              </div>
              <div className="friend-profile-stat">
                <StreakFlame streak={profile.bestStreak} />
                <span>بیشترین استریک</span>
              </div>
              <div className="friend-profile-stat">
                <span className="friend-profile-stat-star">
                  <Star size={16} style={{ color: "#F5C518" }} fill="#F5C518" />
                  <b className="mono">{faNum(profile.starsCount)}</b>
                </span>
                <span>استار</span>
              </div>
            </div>

            <div className="friend-profile-stats cols-2">
              <div className="friend-profile-stat">
                <Map size={16} className="friend-profile-stat-icon" />
                <b className="mono">{faNum(profile.roadmapsCompleted)}</b>
                <span>رودمپ تمام‌شده</span>
              </div>
              <div className="friend-profile-stat">
                <UserIcon size={16} className="friend-profile-stat-icon" />
                <b className="mono">{faNum(profile.plansCompleted)}</b>
                <span>برنامه تمام‌شده</span>
              </div>
            </div>

            <div className="friend-profile-actions">
              {canStar && (
                <button
                  type="button"
                  className={`account-outline-btn${profile.starredByMe ? " active" : ""}`}
                  onClick={toggleStar}
                  disabled={starBusy}
                  style={profile.starredByMe ? { borderColor: "#F5C518", color: "#F5C518" } : undefined}
                >
                  <Star size={14} fill={profile.starredByMe ? "currentColor" : "none"} />
                  {profile.starredByMe ? "استار داده شد" : "دادن استار"}
                </button>
              )}
              <button type="button" className="trade-danger-btn" onClick={() => setConfirmBlock(true)}>
                <Ban size={14} /> بلاک کردن
              </button>
            </div>
          </>
        )}
      </div>

      {confirmBlock && (
        <>
          <div className="modal-overlay open" onClick={() => !blockBusy && setConfirmBlock(false)} style={{ zIndex: 90 }} />
          <div className="modal-panel open" role="dialog" aria-modal="true" style={{ zIndex: 91, maxWidth: 340 }}>
            <div className="modal-body" style={{ paddingTop: 4, textAlign: "center" }}>
              <div className="text-[13px] font-bold" style={{ color: "var(--text)" }}>
                «{profile?.name}» بلاک بشه؟ دیگه توی جست‌وجوی دوستان دیده نمی‌شه.
              </div>
              <div className="trade-modal-actions">
                <button type="button" className="account-outline-btn" onClick={() => setConfirmBlock(false)} disabled={blockBusy}>
                  انصراف
                </button>
                <button type="button" className="trade-danger-btn" onClick={block} disabled={blockBusy}>
                  {blockBusy ? <Loader2 size={14} className="trade-spin" /> : "بلاک کن"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>,
    document.body
  );
}
