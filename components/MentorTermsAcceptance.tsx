"use client";

import "./mentor.css";
import Link from "next/link";
import { useEffect, useState } from "react";
import { MENTOR_TERMS_PATH, MENTOR_TERMS_VERSION, type MentorTermsRole } from "@/lib/mentorTerms";

// چک‌باکسِ پذیرشِ «شرایط استفاده از بخش منتورها». سرور بدونِ پذیرشِ نسخه‌ی جاری
// ۴۰۰ با code: "MENTOR_TERMS_REQUIRED" می‌دهد (lib/mentorTerms.ts)؛ این جزء فقط
// رابطِ کاربری است و جایگزینِ آن بررسی نیست.
//
// استفاده (فرمِ پروفایلِ منتور):
//   const [accepted, setAccepted] = useState(false);
//   const needs = profile?.mentorTermsVersion !== MENTOR_TERMS_VERSION;
//   {needs && <MentorTermsAcceptance role="mentor" checked={accepted} onChange={setAccepted} />}
//   body: { ...fields, ...mentorTermsPayload(needs && accepted) }
//
// استفاده (درخواستِ شاگردی): وضعیت را با useMentorTermsStatus() بگیر؛ اگر
// student.accepted نبود چک‌باکس را نشان بده و ارسال را تا تیک‌خوردن غیرفعال کن.

const LABEL: Record<MentorTermsRole, [string, string]> = {
  mentor: ["شرایط منتوری", "را خوانده‌ام و می‌پذیرم"],
  student: ["شرایط استفاده از بخش منتورها", "را خوانده‌ام و می‌پذیرم"],
};

export function MentorTermsAcceptance({
  role,
  checked,
  onChange,
  error,
  disabled,
}: {
  role: MentorTermsRole;
  checked: boolean;
  onChange: (v: boolean) => void;
  error?: string | null;
  disabled?: boolean;
}) {
  const [link, rest] = LABEL[role];
  return (
    <div className="mentor-terms-accept">
      <label className={`mentor-check${disabled ? " is-disabled" : ""}`}>
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={error ? true : undefined}
        />
        <span className="mentor-check-label">
          <Link href={MENTOR_TERMS_PATH} target="_blank" rel="noopener" className="mentor-terms-link" onClick={(e) => e.stopPropagation()}>
            {link}
          </Link>{" "}
          {rest}
        </span>
      </label>
      {error && <div className="field-error-msg" style={{ display: "block" }}>{error}</div>}
    </div>
  );
}

/** بخشِ بدنه‌ی درخواست؛ فقط وقتی کاربر همین حالا تیک زده */
export function mentorTermsPayload(accepted: boolean): { acceptMentorTerms?: string } {
  return accepted ? { acceptMentorTerms: MENTOR_TERMS_VERSION } : {};
}

export type MentorTermsStatus = {
  loading: boolean;
  version: string;
  studentAccepted: boolean;
  mentorAccepted: boolean;
};

/** وضعیتِ پذیرشِ کاربرِ جاری از GET /api/mentor-terms. تا بارگذاری، «نپذیرفته» فرض می‌شود */
export function useMentorTermsStatus(): MentorTermsStatus & { refresh: () => void } {
  const [tick, setTick] = useState(0);
  const [s, setS] = useState<MentorTermsStatus>({ loading: true, version: MENTOR_TERMS_VERSION, studentAccepted: false, mentorAccepted: false });
  useEffect(() => {
    const ac = new AbortController();
    fetch("/api/mentor-terms", { cache: "no-store", signal: ac.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!j) return setS((p) => ({ ...p, loading: false }));
        setS({ loading: false, version: j.version, studentAccepted: !!j.student?.accepted, mentorAccepted: !!j.mentor?.accepted });
      })
      .catch((e) => {
        if (!(e instanceof DOMException && e.name === "AbortError")) setS((p) => ({ ...p, loading: false }));
      });
    return () => ac.abort();
  }, [tick]);
  return { ...s, refresh: () => setTick((t) => t + 1) };
}

/** آیا پاسخِ خطای سرور به‌خاطرِ نپذیرفتنِ شرایط است (برای نشان‌دادنِ دوباره‌ی چک‌باکس) */
export function isMentorTermsError(json: unknown): boolean {
  return !!json && typeof json === "object" && (json as { code?: unknown }).code === "MENTOR_TERMS_REQUIRED";
}
