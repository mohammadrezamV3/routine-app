"use client";

import { AgentAvatar } from "./AgentAvatar";

// آواتار کاربر در اکوسیستم منتور — عینا همان الگوی DashFriendsCard: عکس
// واقعی اگر هست، وگرنه همان آواتار پیکسلی پیش‌فرض اپ (AgentAvatar).
export function MentorUserAvatar({
  name,
  avatarUrl,
  size = 40,
}: {
  name: string | null | undefined;
  avatarUrl: string | null | undefined;
  size?: number;
}) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return <AgentAvatar seed={name || "؟"} size={size} className="shrink-0" />;
}
