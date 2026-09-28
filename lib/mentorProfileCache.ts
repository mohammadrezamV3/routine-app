"use client";

// پیش‌گرفتنِ پروفایلِ منتور: با لمس/هاورِ کارت (MentorCard) درخواستِ
// /api/mentors/:id همون لحظه شروع می‌شه، هم‌زمان با ناوبری — نه بعدش.
// صفحه‌ی پروفایل اولین بار همین درخواستِ درحال‌اجرا رو مصرف می‌کنه (یک‌بارمصرف،
// ۳۰ ثانیه اعتبار)؛ بارگیری‌های بعدی (بعد از هر اقدام) همیشه تازه‌ان.

type Result = { status: number; ok: boolean; res: Response };
const TTL_MS = 30_000;
const pending = new Map<string, { at: number; p: Promise<Result> }>();

function doFetch(mentorId: string): Promise<Result> {
  return fetch(`/api/mentors/${mentorId}`, { cache: "no-store" }).then((res) => ({ status: res.status, ok: res.ok, res }));
}

export function prefetchMentorProfile(mentorId: string): void {
  const hit = pending.get(mentorId);
  if (hit && Date.now() - hit.at < TTL_MS) return;
  const p = doFetch(mentorId);
  p.catch(() => pending.delete(mentorId));
  pending.set(mentorId, { at: Date.now(), p });
}

/** پاسخِ پیش‌گرفته (اگه تازه باشه) یا یک درخواستِ تازه. */
export function fetchMentorProfile(mentorId: string): Promise<Response> {
  const hit = pending.get(mentorId);
  pending.delete(mentorId);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.p.then((r) => r.res);
  return doFetch(mentorId).then((r) => r.res);
}
