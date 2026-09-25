"use client";

export function displayName(u: { name?: string | null; lastName?: string | null; username?: string | null }) {
  return [u.name, u.lastName].filter(Boolean).join(" ") || (u.username ? `@${u.username}` : "بدون نام");
}

export function UserAvatar({ user, size = 34 }: { user: { name?: string | null; username?: string | null; avatarUrl?: string | null }; size?: number }) {
  const initials = (user.name?.[0] || user.username?.[0] || "?").toUpperCase();
  if (user.avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={user.avatarUrl} alt="" className="admin-avatar-img" style={{ width: size, height: size }} />;
  }
  return <span className="admin-avatar-fallback" style={{ width: size, height: size, fontSize: size * 0.4 }}>{initials}</span>;
}
