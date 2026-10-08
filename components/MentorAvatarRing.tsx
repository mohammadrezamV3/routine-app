"use client";

import "./mentor.css";
import { GradientRing, type RingGrad } from "./GradientRing";
import { MentorUserAvatar } from "./MentorUserAvatar";

export type MentorAvatarRingSize = 40 | 56 | 64 | 96;
const STROKE: Record<MentorAvatarRingSize, number> = { 40: 3, 56: 4, 64: 4, 96: 6 };
const GAP = 3;

/**
 * آواتار با حلقه‌ی پیشرفت (GradientRing) دورش، مثل کارت دوستان.
 * progress: 0..1؛ null = بدون حلقه (دایره‌ی خط‌چین کم‌رنگ). size = قطر کل.
 * label: متن برای صفحه‌خوان (مثلا «پیشرفت این هفته 70 درصد»)؛ بدون آن
 * حلقه تزئینی است (aria-hidden).
 */
export function MentorAvatarRing({
  name, avatarUrl, progress, size = 56, label, grad, className,
}: {
  name: string | null | undefined;
  avatarUrl?: string | null;
  progress: number | null | undefined;
  size?: MentorAvatarRingSize;
  label?: string;
  grad?: RingGrad;
  className?: string;
}) {
  const stroke = STROKE[size];
  const inner = size - 2 * (stroke + GAP);
  const has = typeof progress === "number" && Number.isFinite(progress);
  const aria = label ? { role: "img", "aria-label": label } : { "aria-hidden": true as const };
  return (
    <span className={`mv2-ring${className ? ` ${className}` : ""}`} style={{ width: size, height: size }} {...aria}>
      {has ? (
        <GradientRing value={progress as number} size={size} stroke={stroke} grad={grad}>
          <MentorUserAvatar name={name} avatarUrl={avatarUrl} size={inner} />
        </GradientRing>
      ) : (
        <span className="mv2-ring-empty" style={{ width: size, height: size }}>
          <MentorUserAvatar name={name} avatarUrl={avatarUrl} size={inner} />
        </span>
      )}
    </span>
  );
}
