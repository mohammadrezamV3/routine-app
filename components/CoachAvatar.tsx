"use client";

import "./coach.css";
import type { PublicUser } from "@/lib/mentorTypes";
import { avatarPair } from "@/lib/avatarGradient";
import { GradientRing } from "./GradientRing";

/** حرف اول نام (یا نام کاربری) برای آواتار بدون عکس */
function initialOf(u: Pick<PublicUser, "name" | "username" | "lastName">): string {
  const s = (u.name || u.lastName || u.username || "?").trim();
  return Array.from(s)[0]?.toUpperCase() ?? "?";
}

/**
 * آواتار مربی/شاگرد. عکس اگه هست، وگرنه حرف اول روی گرادیان پایدار از روی id.
 * ring (0..100) یک GradientRing دور آواتار می‌کشه؛ golden حلقه‌ی طلایی ثابت.
 */
export function CoachAvatar({ user, size = 44, ring, golden }: { user: Pick<PublicUser, "id" | "name" | "lastName" | "username" | "avatarUrl"> & { golden?: boolean }; size?: number; ring?: number | null; golden?: boolean }) {
  const [a, b] = avatarPair(user.id);
  const isGolden = golden ?? user.golden ?? false;
  const face = (
    <span
      className={`ch-avatar${isGolden ? " is-golden" : ""}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4), background: user.avatarUrl ? undefined : `linear-gradient(135deg, ${a}, ${b})` }}
    >
      {user.avatarUrl ? <img src={user.avatarUrl} alt="" width={size} height={size} loading="lazy" decoding="async" /> : <span aria-hidden="true">{initialOf(user)}</span>}
    </span>
  );
  if (ring == null) return face;
  const stroke = size >= 56 ? 4 : 3;
  const outer = size + (stroke + 3) * 2;
  return (
    <GradientRing value={ring / 100} size={outer} stroke={stroke} className="ch-avatar-ring">
      {face}
    </GradientRing>
  );
}
