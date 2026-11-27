"use client";

import "./coach.css";
import type { PublicUser } from "@/lib/mentorTypes";
import { AgentAvatar } from "./AgentAvatar";
import { GradientRing } from "./GradientRing";

/**
 * آواتار مربی/شاگرد. عکس اگه هست، وگرنه آواتار پیکسلی پیش‌فرض اپ (AgentAvatar).
 * ring (0..100) یک GradientRing دور آواتار می‌کشه؛ golden حلقه‌ی طلایی ثابت.
 */
export function CoachAvatar({ user, size = 44, ring, golden }: { user: Pick<PublicUser, "id" | "name" | "lastName" | "username" | "avatarUrl"> & { golden?: boolean }; size?: number; ring?: number | null; golden?: boolean }) {
  const seed = user.name || user.username || user.lastName || user.id || "?";
  const isGolden = golden ?? user.golden ?? false;
  const face = (
    <span
      className={`ch-avatar${isGolden ? " is-golden" : ""}`}
      style={{ width: size, height: size }}
    >
      {user.avatarUrl ? <img src={user.avatarUrl} alt="" width={size} height={size} loading="lazy" decoding="async" /> : <AgentAvatar seed={seed} size={size} />}
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
