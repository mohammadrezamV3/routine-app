"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Ban, Map, Phone, Star, User as UserIcon, UserMinus } from "lucide-react";
import { AgentAvatar } from "./AgentAvatar";
import { StreakFlame } from "./StreakFlame";
import { LockBodyScroll } from "./LockBodyScroll";
import { TradeKebabMenu } from "./TradeKebabMenu";
import { faNum } from "@/lib/jalali";
import { GoldenName } from "./GoldenName";
import { Spinner } from "./Spinner";
import { GradientRing } from "./GradientRing";
import { FriendWeekStrip } from "./FriendWeekStrip";
import { fullDays, type WeekPcts } from "@/lib/friendsRank";

type Relation = "none" | "friends" | "pending_sent" | "pending_received";

type Profile = {
  id: string;
  name: string;
  username: string | null;
  avatarUrl: string | null;
  golden?: boolean;
  staff?: boolean;
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
  relation: Relation;
  friendshipId: string | null;
  today: { completed: number; total: number; pct: number } | null;
  week: WeekPcts | null;
};

// پاپ‌آپ پروفایل یک کاربر — با کلیک روی اسم دوست (لیست/پنل دوستان، و
// طبق درخواست صریح، توی نتایج «افزودن دوست» هم) باز می‌شود. طبق
// درخواست صریح: وسط بالای صفحه (نه وسط عمودی معمول بقیه‌ی پاپ‌آپ‌ها).
export function FriendProfileModal({
  userId,
  onClose,
  onBlocked,
  onChanged,
}: {
  userId: string;
  onClose: () => void;
  onBlocked?: () => void;
  /** رابطه عوض شد (درخواست/قبول/لغو/حذف) — والد لیستش رو تازه کنه */
  onChanged?: () => void;
}) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [starBusy, setStarBusy] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [blockBusy, setBlockBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [relBusy, setRelBusy] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  // استار فقط بین دوستان تاییدشده (سرور هم همین رو چک می‌کنه — /api/users/:id/star)
  const canStar = profile?.relation === "friends";

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

  // گوشه‌های بالای بنر طبق شماتیک به ستاره و سه‌نقطه داده شدند، پس دکمه‌ی
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

  // رابطه‌ی دوستی از داخل خود پاپ‌آپ: درخواست، لغو، قبول/رد و حذف. هر حالت
  // بعد از پاسخ دوباره از سرور خونده می‌شه (منبع حقیقت سرور، نه حدس کلاینت).
  async function reload() {
    const r = await fetch(`/api/users/${userId}/profile`, { cache: "no-store" });
    const d = r.ok ? await r.json() : null;
    if (d?.profile) setProfile(d.profile);
  }
  async function relationAction(kind: "add" | "cancel" | "accept" | "decline" | "remove") {
    if (!profile || relBusy) return;
    setRelBusy(true);
    try {
      if (kind === "add") {
        await fetch("/api/friends", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId }) });
      } else if (profile.friendshipId) {
        await fetch(`/api/friends/${profile.friendshipId}`, { method: kind === "accept" ? "PATCH" : "DELETE" });
      }
      await reload();
      onChanged?.();
    } finally {
      setRelBusy(false);
      setConfirmRemove(false);
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
            <Spinner size={18} />
          </div>
        )}

        {notFound && <div className="item-line empty" style={{ marginTop: 10 }}>پروفایل در دسترس نیست</div>}

        {profile && (
          <>
            {/* بنر و عکس پروفایل توی هم‌اند (طبق شماتیک): آواتار روی لبه‌ی
                پایین بنر سمت راست، نام فرد پایین-چپ *داخل* بنر، ستاره
                بالا-چپ و سه‌نقطه‌ی بلاک بالا-راست. */}
            <div className="friend-profile-banner">
              {profile.bannerUrl && <img src={profile.bannerUrl} alt="" className="friend-profile-banner-img" />}

              {/* ستاره و سه‌نقطه یک نوار مشترک دارن (flex، یک خط مرکز، یک اندازه
                  و هر دو بی‌بک‌گراند). قبلا هرکدوم جدا absolute بودن: ستاره 28px با
                  دایره‌ی تیره و سه‌نقطه 24px بی‌دایره (قانون بک‌گراندش به ریست
                  سراسری button باخته بود) — یعنی نه هم‌اندازه، نه هم‌خط. */}
              <div className="friend-profile-banner-bar">
                <div className="friend-profile-banner-kebab">
                  <TradeKebabMenu
                    label={`گزینه‌های ${profile.name}`}
                    actions={[
                      ...(profile.relation === "friends" && profile.friendshipId
                        ? [{ label: "حذف از دوستان", icon: <UserMinus size={14} />, danger: true, onClick: () => setConfirmRemove(true) }]
                        : []),
                      { label: "بلاک کردن", icon: <Ban size={14} />, danger: true, onClick: () => setConfirmBlock(true) },
                    ]}
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
                  <Star size={17} fill={profile.starredByMe ? "currentColor" : "none"} />
                </button>
              </div>

              <div className="friend-profile-banner-name"><GoldenName golden={profile.golden} staff={profile.staff}>{profile.name}</GoldenName></div>

              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="" className="friend-profile-avatar" />
              ) : (
                <AgentAvatar seed={profile.name || "؟"} size={72} className="friend-profile-avatar" />
              )}
            </div>

            <div className="friend-profile-body">
              {profile.planName && (
                <div className="friend-profile-plan-row">
                  <div className="friend-profile-plan">{profile.planName}</div>
                </div>
              )}

              {/* هرکدام از بیو/آیدی/شماره جعبه‌ی خودش را دارد و اگر آن فیلد
                  خالی باشد، کل جعبه‌اش (نه فقط متنش) حذف می‌شود — طبق
                  درخواست صریح. */}
              {profile.bio && (
                <div className="friend-profile-section">
                  <div className="friend-profile-section-label">بیو</div>
                  <p className="friend-profile-bio">{profile.bio}</p>
                </div>
              )}

              {profile.username && (
                <div className="friend-profile-section">
                  <div className="friend-profile-section-label">
                    {copied ? "کپی شد" : "آیدی"}
                  </div>
                  <button
                    type="button"
                    className="friend-profile-username mono"
                    onClick={copyUsername}
                    title="برای کپی‌کردن بزن"
                  >
                    @{profile.username}
                  </button>
                </div>
              )}

              {profile.phone && (
                <div className="friend-profile-section">
                  <div className="friend-profile-section-label">شماره تماس</div>
                  <div className="friend-profile-username mono" dir="ltr" style={{ cursor: "default" }}>
                    <Phone size={12} /> {profile.phone}
                  </div>
                </div>
              )}
            </div>

            {/* پیشرفت امروز و 7 روز اخیر — فقط دوست تاییدشده (سرور برای بقیه null می‌ده) */}
            {profile.today && (
              <div className="friend-profile-today">
                <GradientRing value={profile.today.pct / 100} size={58} stroke={5}>
                  <b className="mono">{faNum(profile.today.pct)}<small>%</small></b>
                </GradientRing>
                <div className="friend-profile-today-text">
                  <span className="friend-profile-section-label">امروز</span>
                  <span className="friend-profile-today-line">
                    {profile.today.total > 0
                      ? profile.today.pct >= 100
                        ? "همه‌ی برنامه‌های امروز انجام شد"
                        : `${faNum(profile.today.completed)} از ${faNum(profile.today.total)} برنامه`
                      : "امروز برنامه‌ای نداره"}
                  </span>
                  {profile.week && (
                    <span className="friend-profile-week">
                      <FriendWeekStrip week={profile.week} size={16} labels />
                      <span className="friend-profile-week-count">{faNum(fullDays(profile.week))} روز کامل</span>
                    </span>
                  )}
                </div>
              </div>
            )}

            {profile.relation !== "friends" && (
              <div className="friend-profile-relation">
                {profile.relation === "none" && (
                  <button type="button" className="trade-primary-btn" onClick={() => relationAction("add")} disabled={relBusy}>
                    {relBusy ? <Spinner size={13} /> : "افزودن دوست"}
                  </button>
                )}
                {profile.relation === "pending_sent" && (
                  <>
                    <span className="friend-profile-relation-note">درخواست دوستی فرستادی</span>
                    <button type="button" className="account-outline-btn" onClick={() => relationAction("cancel")} disabled={relBusy}>
                      {relBusy ? <Spinner size={13} /> : "لغو درخواست"}
                    </button>
                  </>
                )}
                {profile.relation === "pending_received" && (
                  <>
                    <button type="button" className="account-outline-btn" onClick={() => relationAction("decline")} disabled={relBusy}>رد</button>
                    <button type="button" className="trade-primary-btn" onClick={() => relationAction("accept")} disabled={relBusy}>
                      {relBusy ? <Spinner size={13} /> : "قبول درخواست"}
                    </button>
                  </>
                )}
              </div>
            )}

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

      {confirmRemove && (
        <>
          <div className="modal-overlay open" onClick={() => !relBusy && setConfirmRemove(false)} style={{ zIndex: 90 }} />
          <div className="modal-panel open" role="dialog" aria-modal="true" style={{ zIndex: 91, maxWidth: 340 }}>
            <div className="modal-body" style={{ paddingTop: 4, textAlign: "center" }}>
              <div className="text-[13px] font-bold" style={{ color: "var(--text)" }}>
                «{profile?.name}» از دوستات حذف بشه؟
              </div>
              <div className="trade-modal-actions">
                <button type="button" className="account-outline-btn" onClick={() => setConfirmRemove(false)} disabled={relBusy}>
                  انصراف
                </button>
                <button type="button" className="trade-danger-btn" onClick={() => relationAction("remove")} disabled={relBusy}>
                  {relBusy ? <Spinner size={13} /> : "حذف کن"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

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
                  {blockBusy ? <Spinner size={13} /> : "بلاک کن"}
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
