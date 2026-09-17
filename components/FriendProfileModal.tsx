"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Ban, Check, Copy, Loader2, Map, Phone, Star, User as UserIcon } from "lucide-react";
import { AgentAvatar } from "./AgentAvatar";
import { StreakFlame } from "./StreakFlame";
import { LockBodyScroll } from "./LockBodyScroll";
import { TradeKebabMenu } from "./TradeKebabMenu";
import { faNum } from "@/lib/jalali";

type Profile = {
  id: string;
  name: string;
  username: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  bio: string | null;
  phone: string | null;
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
  const [copied, setCopied] = useState(false);

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

  // گوشه‌های بالای بنر طبقِ شماتیک به ستاره و سه‌نقطه داده شدند، پس دکمه‌ی
  // ضربدر حذف شد — بستن با کلیک روی پس‌زمینه یا Escape انجام می‌شود.
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

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

  async function copyUsername() {
    if (!profile?.username || copied) return;
    try {
      await navigator.clipboard.writeText(profile.username);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // کلیپ‌بورد روی بعضی مرورگرهای بدون HTTPS/اجازه در دسترس نیست — بی‌صدا نادیده می‌گیریم
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
        {!profile && !notFound && (
          <div className="friend-profile-loading">
            <Loader2 size={20} className="trade-spin" />
          </div>
        )}

        {notFound && <div className="item-line empty" style={{ marginTop: 10 }}>پروفایل در دسترس نیست</div>}

        {profile && (
          <>
            {/* بنر و عکسِ پروفایل توی هم‌اند (طبقِ شماتیک): آواتار روی لبه‌ی
                پایینِ بنر سمتِ راست، نامِ فرد پایین-چپِ *داخلِ* بنر، ستاره
                بالا-چپ و سه‌نقطه‌ی بلاک بالا-راست. */}
            <div className="friend-profile-banner">
              {profile.bannerUrl && <img src={profile.bannerUrl} alt="" className="friend-profile-banner-img" />}

              <div className="friend-profile-banner-kebab">
                <TradeKebabMenu
                  label={`گزینه‌های ${profile.name}`}
                  actions={[{ label: "بلاک کردن", icon: <Ban size={14} />, danger: true, onClick: () => setConfirmBlock(true) }]}
                />
              </div>

              <button
                type="button"
                className={`friend-profile-star-btn${profile.starredByMe ? " on" : ""}`}
                onClick={toggleStar}
                disabled={starBusy || !canStar}
                title={canStar ? (profile.starredByMe ? "استار داده شد" : "دادن استار") : "بعد از دوست‌شدن می‌توانی استار بدهی"}
                aria-label={profile.starredByMe ? "برداشتن استار" : "دادن استار"}
              >
                <Star size={16} fill={profile.starredByMe ? "currentColor" : "none"} />
              </button>

              <div className="friend-profile-banner-name">{profile.name}</div>

              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="" className="friend-profile-avatar" />
              ) : (
                <AgentAvatar seed={profile.name || "؟"} size={72} className="friend-profile-avatar" />
              )}
            </div>

            <div className="friend-profile-id">
              {profile.username && (
                <button
                  type="button"
                  className="friend-profile-username mono"
                  onClick={copyUsername}
                  title="کپیِ آیدی"
                >
                  @{profile.username}
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                </button>
              )}
              {profile.phone && (
                <div className="friend-profile-username mono" dir="ltr" style={{ cursor: "default" }}>
                  <Phone size={12} /> {profile.phone}
                </div>
              )}
              {profile.planName && <div className="friend-profile-plan">{profile.planName}</div>}
              {profile.bio && <p className="friend-profile-bio">{profile.bio}</p>}
            </div>

            {/* از راست به چپ: استارها · استریک فعلی · بیشترین استریک */}
            <div className="friend-profile-stats">
              <div className="friend-profile-stat">
                <span className="friend-profile-stat-star">
                  <Star size={16} style={{ color: "#F5C518" }} fill="#F5C518" />
                  <b className="mono">{faNum(profile.starsCount)}</b>
                </span>
                <span>استار</span>
              </div>
              <div className="friend-profile-stat">
                <StreakFlame streak={profile.streak} />
                <span>استریک فعلی</span>
              </div>
              <div className="friend-profile-stat">
                <StreakFlame streak={profile.bestStreak} />
                <span>بیشترین استریک</span>
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
