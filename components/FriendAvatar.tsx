"use client";

import { AgentAvatar } from "./AgentAvatar";
import { GradientRing } from "./GradientRing";

// آواتار دوست — اگه عکس واقعی نداره، دقیقا همون آواتار پیکسلی پیش‌فرض خود
// کاربر (AgentAvatar)، نه حرف اول با رنگ تصادفی، تا با بقیه‌ی اپ یکدست بمونه.
export function FriendAvatar({ name, avatarUrl, size = 40, className }: { name: string; avatarUrl: string | null; size?: number; className?: string }) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        className={`fr-avatar-img${className ? ` ${className}` : ""}`}
        style={{ width: size, height: size }}
      />
    );
  }
  return <AgentAvatar seed={name || "؟"} size={size} className={`fr-avatar-img${className ? ` ${className}` : ""}`} />;
}

/**
 * آواتار داخل حلقه‌ی پیشرفت امروز (GradientRing — همون حلقه‌ی داشبورد). پر
 * شدن حلقه یعنی همه‌ی برنامه‌های امروز انجام شده؛ `pct` null یعنی داده‌ای
 * برای حلقه نیست (مثلا نتیجه‌ی جست‌وجو) و فقط خود آواتار می‌آد.
 */
export function FriendRingAvatar({
  name,
  avatarUrl,
  pct,
  size = 44,
  stroke = 3,
  delay = 0,
}: {
  name: string;
  avatarUrl: string | null;
  pct: number | null;
  size?: number;
  stroke?: number;
  delay?: number;
}) {
  const inner = size - stroke * 2 - 6;
  if (pct === null) {
    return (
      <span className="fr-ring-avatar" style={{ width: size, height: size }}>
        <FriendAvatar name={name} avatarUrl={avatarUrl} size={size - 4} />
      </span>
    );
  }
  return (
    <GradientRing value={pct / 100} size={size} stroke={stroke} delay={delay} className="fr-ring-avatar">
      <FriendAvatar name={name} avatarUrl={avatarUrl} size={inner} />
    </GradientRing>
  );
}
