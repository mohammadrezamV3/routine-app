"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { SlidersHorizontal, UserPlus } from "lucide-react";
import { ToggleSwitch } from "./ToggleSwitch";
import { JalaliDatePicker } from "./JalaliDatePicker";
import { fa, mentorApi } from "./MentorDashKit";
import { MI, MI_STROKE, MentorSection } from "./MentorUI";
import { LoadingBlock } from "./Spinner";
import { fmtDate } from "@/lib/mentorFormat";
import { jalaliToIso } from "@/lib/jalali";
import type { MentorSettingsResponse } from "@/lib/mentorTypes";

const ic = (Icon: typeof UserPlus, size: number) => <Icon size={size} strokeWidth={MI_STROKE} aria-hidden />;

/**
 * کنترلِ سریعِ پذیرش روی داشبوردِ منتور: یک سوییچ برای «پذیرش شاگرد جدید»،
 * ظرفیتِ «n از m» و سوییچِ «در دسترس نیستم». هر تغییر فوراً با
 * PUT /api/mentor/settings ذخیره می‌شود و سرور همان را اعمال می‌کند.
 * تنظیمِ کامل (سقف، پیام عدم حضور، سؤال‌های پذیرش) در /mentor/settings است.
 */
export function MentorAvailabilityQuick() {
  const [data, setData] = useState<MentorSettingsResponse | null>(null);
  const [busy, setBusy] = useState<"accept" | "away" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [picker, setPicker] = useState(false);

  const load = useCallback(async () => {
    const r = await mentorApi<MentorSettingsResponse>("/api/mentor/settings");
    if (r.ok) { setData(r.data); setLoadError(false); } else setLoadError(true);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function save(key: "accept" | "away", body: Record<string, unknown>, optimistic?: (d: MentorSettingsResponse) => MentorSettingsResponse) {
    if (!data || busy) return;
    const prev = data;
    if (optimistic) setData(optimistic(data));
    setBusy(key);
    setError(null);
    const r = await mentorApi<MentorSettingsResponse>("/api/mentor/settings", { method: "PUT", body });
    setBusy(null);
    if (!r.ok) { setData(prev); setError(r.error); return; }
    setData(r.data);
  }

  if (loadError) return null; // داشبورد بدون این بخش هم کار می‌کند؛ خطای کلی را داشبورد نشان می‌دهد
  if (!data) {
    return (
      <MentorSection title="پذیرش شاگرد" icon={ic(UserPlus, MI.section)}>
        <LoadingBlock />
      </MentorSection>
    );
  }

  const { settings: s, availability: a, activeStudents } = data;
  const acceptDesc = !s.acceptingStudents
    ? "بسته است؛ درخواست تازه‌ای نمی‌رسد و دعوت‌های تو برقرار است"
    : a.state === "AWAY"
      ? "باز است، ولی تا پایان عدم حضور درخواست تازه‌ای پذیرفته نمی‌شود"
      : a.full
        ? "باز است، ولی ظرفیت تکمیل است و درخواست تازه‌ای پذیرفته نمی‌شود"
        : "باز است؛ شاگردها از پروفایلت درخواست می‌دهند";
  const capacityText = s.maxActiveStudents != null
    ? `${fa(activeStudents)} از ${fa(s.maxActiveStudents)} شاگرد فعال`
    : `${fa(activeStudents)} شاگرد فعال؛ بدون سقف`;
  const away = !!s.awayUntil;
  const awayDesc = away
    ? `تا ${fmtDate(s.awayUntil)}${s.awayPausesRequests ? "؛ درخواست‌های تازه متوقف است" : "؛ درخواست‌ها باز است"}`
    : "روی پروفایل و صفحه‌ی شاگردها تاریخ بازگشتت نمایش داده می‌شود";

  return (
    <MentorSection
      title="پذیرش شاگرد" icon={ic(UserPlus, MI.section)}
      action={<Link href="/mentor/settings" className="mentor-link">{ic(SlidersHorizontal, MI.btnSm)} تنظیمات</Link>}
    >
      <div className="mentor-toggle-row">
        <div className="mentor-toggle-text">
          <div className="mentor-toggle-title">پذیرش شاگرد جدید</div>
          <div className="mentor-toggle-desc" aria-live="polite">{acceptDesc}</div>
        </div>
        <ToggleSwitch
          checked={s.acceptingStudents} label="پذیرش شاگرد جدید" disabled={!!busy}
          onChange={(v) => save("accept", { acceptingStudents: v }, (d) => ({ ...d, settings: { ...d.settings, acceptingStudents: v } }))}
        />
      </div>
      <div className="mentor-toggle-row">
        <div className="mentor-toggle-text">
          <div className="mentor-toggle-title">در دسترس نیستم</div>
          <div className="mentor-toggle-desc" aria-live="polite">{awayDesc}</div>
        </div>
        <ToggleSwitch
          checked={away} label="در دسترس نیستم" disabled={!!busy}
          onChange={(v) => {
            if (v) { setError(null); setPicker(true); return; }
            save("away", { awayUntil: null }, (d) => ({ ...d, settings: { ...d.settings, awayUntil: null, awayMessage: null } }));
          }}
        />
      </div>
      <div className="mentor-toggle-row">
        <div className="mentor-toggle-text">
          <div className="mentor-toggle-title">ظرفیت</div>
          <div className="mentor-toggle-desc">{capacityText}</div>
        </div>
      </div>
      {error && <div className="form-inline-error" role="alert">{error}</div>}

      {picker && (
        <JalaliDatePicker
          initial={null}
          title="تاریخ بازگشت"
          disablePast
          onClose={() => setPicker(false)}
          onPick={(v) => {
            setPicker(false);
            const iso = jalaliToIso(...v);
            if (!iso) { setError("تاریخ معتبر نیست"); return; }
            save("away", { awayUntil: iso });
          }}
        />
      )}
    </MentorSection>
  );
}
