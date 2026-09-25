import { useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Map as MapIcon, Dumbbell, Phone, Star, UserX } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import BottomSheet from "@/components/BottomSheet";
import StreakFlame from "@/components/StreakFlame";
import { faNum } from "@/lib/jalali";
import type { SocialProfileResponse } from "@/lib/social-contract";
import { useSocialApi } from "../api";
import { cacheKeys, deleteCache } from "../db";
import { describeSocialError, NEED_INTERNET } from "../errors";
import { useCachedResource } from "../hooks";
import { socialRoutePaths } from "../paths";
import { ActionButton, Avatar, EmptyState, ErrorNotice, Loading, StaleNotice } from "../components/SocialUi";

/** پروفایلِ یک کاربر — همون پاپ‌آپِ FriendProfileModalِ وب. شماره فقط اگه خودش sharePhone رو روشن کرده باشه از سرور میاد. */
export default function FriendProfileScreen() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const friendshipId = (location.state as { friendshipId?: string } | null)?.friendshipId;
  const api = useSocialApi();
  const res = useCachedResource<SocialProfileResponse>(id ? cacheKeys.profile(id) : null, () => api.profile(id));
  const [busy, setBusy] = useState<"star" | "block" | "remove" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<"block" | "remove" | null>(null);
  const profile = res.data?.profile;

  async function toggleStar() {
    if (!profile || busy) return;
    setBusy("star");
    setActionError(null);
    try {
      const r = await api.star(profile.id, !profile.starredByMe);
      res.mutate((prev) => (prev ? { profile: { ...prev.profile, starredByMe: r.starred, starsCount: r.starsCount } } : prev));
    } catch (err) {
      setActionError(describeSocialError(err));
    } finally {
      setBusy(null);
    }
  }

  async function doConfirm() {
    if (!profile || !confirm || busy) return;
    const action = confirm;
    setBusy(action);
    setActionError(null);
    try {
      if (action === "block") await api.block(profile.id, true);
      else if (friendshipId) await api.remove(friendshipId);
      await deleteCache(cacheKeys.profile(profile.id));
      setConfirm(null);
      navigate(socialRoutePaths.home, { replace: true });
    } catch (err) {
      setActionError(describeSocialError(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <AppHeader title={profile?.name ?? "پروفایل"} showBack />
      <main className="px-4 pt-4 pb-8">
        <StaleNotice online={res.online} staleSince={res.staleSince} />
        <ErrorNotice message={res.error || actionError} />
        {res.loading && !profile ? (
          <Loading />
        ) : !profile ? (
          <EmptyState text="این پروفایل در دسترس نیست" />
        ) : (
          <>
            <section className="flex flex-col items-center gap-2 rounded-card border p-5" style={{ borderColor: "var(--surface-line)" }}>
              <Avatar name={profile.name} url={profile.avatarUrl} size={72} />
              <h2 className="font-vazir text-[17px] font-bold" style={{ color: "var(--text)" }}>
                {profile.name}
              </h2>
              {profile.username && (
                <span className="font-latin text-[12.5px]" dir="ltr" style={{ color: "var(--muted)" }}>
                  @{profile.username}
                </span>
              )}
              {profile.planName && (
                <span className="rounded-full border px-2.5 py-0.5 font-vazir text-[11px]" style={{ borderColor: "var(--accent)", color: "var(--accent)" }}>
                  {profile.planName}
                </span>
              )}
              {profile.bio && (
                <p className="mt-1 text-center font-vazir text-[13px] leading-6" style={{ color: "var(--text)" }}>
                  {profile.bio}
                </p>
              )}
              {profile.phone && (
                <a href={`tel:${profile.phone}`} className="flex items-center gap-1 font-latin text-[12.5px]" dir="ltr" style={{ color: "var(--muted)" }}>
                  <Phone size={12} /> {profile.phone}
                </a>
              )}
              <button
                type="button"
                onClick={toggleStar}
                disabled={!res.online || busy === "star"}
                title={!res.online ? NEED_INTERNET : undefined}
                aria-label={profile.starredByMe ? "برداشتن استار" : "دادن استار"}
                className="mt-2 flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-vazir text-[13px] disabled:opacity-50"
                style={{ borderColor: "var(--surface-line)", color: "var(--text)" }}
              >
                <Star size={16} color="var(--sun)" fill={profile.starredByMe ? "var(--sun)" : "none"} />
                {faNum(profile.starsCount)}
                {!res.online && <span style={{ color: "var(--muted)" }}> · {NEED_INTERNET}</span>}
              </button>
            </section>

            <section className="mt-3 grid grid-cols-2 gap-2.5">
              <Stat label="استریک فعلی">
                <StreakFlame streak={profile.streak} />
              </Stat>
              <Stat label="بهترین استریک">
                <StreakFlame streak={profile.bestStreak} />
              </Stat>
              <Stat label="مسیرهای تمام‌شده">
                <span className="flex items-center gap-1 font-vazir text-[14px] font-bold" style={{ color: "var(--text)" }}>
                  <MapIcon size={14} color="var(--muted)" /> {faNum(profile.roadmapsCompleted)}
                </span>
              </Stat>
              <Stat label="برنامه‌های تمرینیِ گذشته">
                <span className="flex items-center gap-1 font-vazir text-[14px] font-bold" style={{ color: "var(--text)" }}>
                  <Dumbbell size={14} color="var(--muted)" /> {faNum(profile.plansCompleted)}
                </span>
              </Stat>
            </section>

            <section className="mt-5 flex flex-wrap justify-center gap-2">
              {friendshipId && (
                <ActionButton online={res.online} tone="ghost" onClick={() => setConfirm("remove")}>
                  حذف از دوستان
                </ActionButton>
              )}
              <ActionButton online={res.online} tone="danger" onClick={() => setConfirm("block")}>
                <span className="inline-flex items-center gap-1">
                  <UserX size={14} /> بلاک
                </span>
              </ActionButton>
            </section>
          </>
        )}
      </main>

      <BottomSheet open={!!confirm} onClose={() => !busy && setConfirm(null)} title={confirm === "block" ? "بلاک کاربر" : "حذف دوست"}>
        <p className="font-vazir text-[13.5px] leading-7" style={{ color: "var(--text)" }}>
          {confirm === "block"
            ? "بعد از بلاک، دیگر در جست‌وجوی هم دیده نمی‌شوید و پروفایلِ هم را نمی‌بینید. از «تنظیمات › افراد بلاک‌شده» در وب می‌توانی برگردانی."
            : "این دوستی حذف می‌شود؛ برای دوستیِ دوباره باید از نو درخواست بدهید."}
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <ActionButton online={res.online} tone="ghost" onClick={() => setConfirm(null)}>
            انصراف
          </ActionButton>
          <ActionButton online={res.online} busy={!!busy} tone="danger" onClick={doConfirm}>
            {confirm === "block" ? "بلاک کن" : "حذف کن"}
          </ActionButton>
        </div>
      </BottomSheet>
    </div>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-card border p-3" style={{ borderColor: "var(--surface-line)" }}>
      {children}
      <span className="font-vazir text-[11.5px]" style={{ color: "var(--muted)" }}>
        {label}
      </span>
    </div>
  );
}
