"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, CalendarClock, CheckCircle2, CircleSlash, Pencil, UserPlus, Users } from "lucide-react";
import { ToggleSwitch } from "./ToggleSwitch";
import { JalaliDatePicker } from "./JalaliDatePicker";
import { SegmentedTabs } from "./SegmentedTabs";
import { Spinner } from "./Spinner";
import { fa, mentorApi } from "./MentorDashKit";
import { MI, MI_STROKE, MentorChip, MentorField, MentorSection } from "./MentorUI";
import { MentorSheet, MentorSwap } from "./MentorMotion";
import { fmtDate } from "@/lib/mentorFormat";
import { formatJalali, jalaliToIso, toJalali, type JalaliDate } from "@/lib/jalali";
import { AWAY_MESSAGE_MAX } from "@/lib/mentorAvailability";
import type { MentorSettingsResponse } from "@/lib/mentorTypes";

const ic = (Icon: typeof UserPlus, size: number) => <Icon size={size} strokeWidth={MI_STROKE} aria-hidden />;

type Mode = "open" | "closed" | "away";

function isoToJalali(iso: string | null | undefined): JalaliDate | null {
  const m = iso ? /^(\d{4})-(\d{2})-(\d{2})/.exec(iso) : null;
  return m ? toJalali(+m[1], +m[2], +m[3]) : null;
}

/**
 * «وضعیت پذیرش» — یک کنترل تک‌انتخابی (SegmentedTabs) برای سه حالت:
 * پذیرش باز / پذیرش بسته / در دسترس نیستم. عدم حضور با یک شیت (تاریخ
 * بازگشت، پیام، توقف درخواست‌ها) ثبت می‌شود و تا وقتی برقرار است، تاریخ
 * بازگشت همین‌جا دیده می‌شود و با یک تپ («پایان عدم حضور») تمام می‌شود.
 * هر تغییر فورا با PUT /api/mentor/settings ذخیره می‌شود. روی داشبورد و
 * بالای /mentor/settings استفاده می‌شود؛ `onChange` تنظیمات را به والد می‌دهد.
 */
export function MentorAvailabilityQuick({
  initial, onChange, variant = "section",
}: {
  initial?: MentorSettingsResponse;
  onChange?: (d: MentorSettingsResponse) => void;
  /** pill: قرص وضعیت کنار هیرو که همین کنترل را در یک برگه باز می‌کند */
  variant?: "section" | "pill";
}) {
  const [data, setData] = useState<MentorSettingsResponse | null>(initial ?? null);
  const [busy, setBusy] = useState<Mode | "end" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [panel, setPanel] = useState(false);

  const load = useCallback(async () => {
    const r = await mentorApi<MentorSettingsResponse>("/api/mentor/settings");
    if (r.ok) { setData(r.data); setLoadError(false); } else setLoadError(true);
  }, []);
  useEffect(() => { if (!initial) load(); }, [initial, load]);

  const apply = useCallback((d: MentorSettingsResponse) => { setData(d); onChange?.(d); }, [onChange]);

  async function save(key: Mode | "end", body: Record<string, unknown>): Promise<boolean> {
    if (!data || busy) return false;
    setBusy(key);
    setError(null);
    const r = await mentorApi<MentorSettingsResponse>("/api/mentor/settings", { method: "PUT", body });
    setBusy(null);
    if (!r.ok) { setError(r.error); return false; }
    apply(r.data);
    return true;
  }

  if (loadError) return null; // داشبورد بدون این بخش هم کار می‌کند
  const title = "وضعیت پذیرش";
  const icon = ic(UserPlus, MI.section);
  if (!data) {
    if (variant === "pill") return <span className="mv2-today-pill is-loading" aria-hidden><Spinner size={14} /></span>;
    return (
      <MentorSection title={title} icon={icon}>
        <div className="mentor-avail-skeleton" aria-hidden><Spinner size={16} /></div>
      </MentorSection>
    );
  }

  const { settings: s, activeStudents } = data;
  const away = !!s.awayUntil;
  const mode: Mode = away ? "away" : s.acceptingStudents ? "open" : "closed";
  const full = s.maxActiveStudents != null && activeStudents >= s.maxActiveStudents;
  const capacity = s.maxActiveStudents != null
    ? `${fa(activeStudents)} از ${fa(s.maxActiveStudents)} شاگرد فعال`
    : `${fa(activeStudents)} شاگرد فعال؛ بدون سقف`;

  function pick(v: Mode) {
    if (v === mode || busy) return;
    if (v === "away") { setError(null); setPanel(false); setSheet(true); return; }
    save(v, { acceptingStudents: v === "open", awayUntil: null });
  }

  let status: React.ReactNode;
  if (mode === "away") {
    status = (
      <div className="mentor-avail-away">
        <div className="mentor-avail-line">
          {ic(CalendarClock, MI.row)}
          <span>
            <b>تا {fmtDate(s.awayUntil)}</b> در دسترس نیستی
            {s.awayPausesRequests ? "؛ درخواست‌های تازه متوقف است" : "؛ درخواست‌ها باز است"}
          </span>
        </div>
        {s.awayMessage && <p className="mentor-quote">{s.awayMessage}</p>}
        <div className="mentor-btn-group">
          <button
            type="button" className="trade-primary-btn mentor-btn is-sm" disabled={!!busy}
            onClick={() => save("end", { awayUntil: null })}
          >
            {busy === "end" ? <Spinner size={14} /> : <>{ic(CheckCircle2, MI.btnSm)} برگشتم</>}
          </button>
          <button type="button" className="account-outline-btn mentor-btn is-sm" disabled={!!busy} onClick={() => { setPanel(false); setSheet(true); }}>
            {ic(Pencil, MI.btnSm)} ویرایش
          </button>
        </div>
      </div>
    );
  } else if (mode === "closed") {
    status = (
      <div className="mentor-avail-line">
        {ic(CircleSlash, MI.row)}
        <span>درخواست تازه نمی‌رسد؛ شاگردهای فعلی و دعوت‌های تو می‌مانند</span>
      </div>
    );
  } else {
    status = (
      <div className={`mentor-avail-line${full ? " is-warn" : ""}`}>
        {full ? ic(AlertCircle, MI.row) : ic(CheckCircle2, MI.row)}
        <span>{full ? "ظرفیت تکمیل است؛ درخواست تازه‌ای پذیرفته نمی‌شود" : "شاگردها از پروفایلت درخواست می‌دهند"}</span>
      </div>
    );
  }

  const body = (
      <div className="mentor-avail">
        <div className={`mentor-avail-tabs${busy && busy !== "end" ? " is-busy" : ""}`} aria-busy={!!busy}>
          <SegmentedTabs<Mode>
            active={mode}
            onChange={pick}
            options={[
              { value: "open", label: "پذیرش باز" },
              { value: "closed", label: "پذیرش بسته" },
              { value: "away", label: "در دسترس نیستم" },
            ]}
          />
        </div>
        <div aria-live="polite">
          <MentorSwap swapKey={mode}>{status}</MentorSwap>
        </div>
        {error && <div className="form-inline-error" role="alert" style={{ marginTop: 0 }}>{error}</div>}
      </div>
  );

  const awaySheet = (
      <AwaySheet
        open={sheet}
        settings={s}
        onClose={() => setSheet(false)}
        onSave={async (body) => {
          const ok = await save("away", body);
          if (ok) setSheet(false);
          return ok;
        }}
        busy={busy === "away"}
        error={sheet ? error : null}
      />
  );

  if (variant === "pill") {
    const label = mode === "away" ? `در دسترس نیستم تا ${fmtDate(s.awayUntil)}`
      : mode === "closed" ? "فعلا نمی‌پذیرم"
      : full ? "ظرفیت پره" : "درخواست می‌پذیرم";
    const tone = mode === "open" && !full ? "ok" : mode === "closed" ? "neutral" : "warn";
    return (
      <>
        <button
          type="button" className={`mv2-today-pill is-${tone}`} aria-haspopup="dialog"
          aria-label={`وضعیت پذیرش: ${label}؛ برای تغییر بزن`} onClick={() => { setError(null); setPanel(true); }}
        >
          <span className="mv2-today-pill-dot" aria-hidden />
          <span>{label}</span>
        </button>
        <MentorSheet open={panel} onClose={() => setPanel(false)} title="وضعیت پذیرش" size="sm" dismissible={!busy}>
          <div className="mv2-today-avail">
            <p className="mv2-today-avail-cap">{capacity}</p>
            {body}
          </div>
        </MentorSheet>
        {awaySheet}
      </>
    );
  }

  return (
    <MentorSection
      title={title} icon={icon}
      action={
        <MentorChip tone={full ? "warn" : "neutral"} icon={ic(Users, MI.chip)}>{capacity}</MentorChip>
      }
    >
      {body}
      {awaySheet}
    </MentorSection>
  );
}

/** شیت ثبت/ویرایش عدم حضور: تاریخ بازگشت، پیام، توقف درخواست‌ها */
function AwaySheet({
  open, settings, onClose, onSave, busy, error,
}: {
  open: boolean;
  settings: MentorSettingsResponse["settings"];
  onClose: () => void;
  onSave: (body: Record<string, unknown>) => Promise<boolean>;
  busy: boolean;
  error: string | null;
}) {
  const [date, setDate] = useState<JalaliDate | null>(null);
  const [message, setMessage] = useState("");
  const [pause, setPause] = useState(true);
  const [picker, setPicker] = useState(false);
  const [err, setErr] = useState<{ date?: string; message?: string }>({});

  // هر بار باز شدن از وضعیت فعلی شروع می‌شود
  useEffect(() => {
    if (!open) return;
    setDate(isoToJalali(settings.awayUntil));
    setMessage(settings.awayMessage ?? "");
    setPause(settings.awayUntil ? settings.awayPausesRequests : true);
    setErr({});
  }, [open, settings.awayUntil, settings.awayMessage, settings.awayPausesRequests]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const iso = date ? jalaliToIso(...date) : null;
    const errs: typeof err = {};
    if (!iso) errs.date = "تاریخ بازگشت را انتخاب کن";
    if (message.trim().length > AWAY_MESSAGE_MAX) errs.message = `حداکثر ${fa(AWAY_MESSAGE_MAX)} حرف`;
    setErr(errs);
    if (Object.keys(errs).length) return;
    await onSave({ awayUntil: iso, awayMessage: message.trim() || null, awayPausesRequests: pause });
  }

  return (
    <>
      <MentorSheet open={open} onClose={onClose} title="در دسترس نیستم" size="sm" dismissible={!busy && !picker}>
        <form className="mentor-form" onSubmit={submit} noValidate>
          <MentorField label="تاریخ بازگشت" error={err.date}>
            <button
              type="button" className={`jdate-btn wsearch-newform-name trade-glass-field mentor-date-btn${date ? "" : " placeholder"}`}
              onClick={() => setPicker(true)}
            >
              {ic(CalendarClock, MI.btnSm)}
              <span>{date ? formatJalali(date) : "روز / ماه / سال"}</span>
            </button>
          </MentorField>
          <MentorField
            label="پیام برای شاگردها" htmlFor="away-msg" optional error={err.message}
            hint={`${fa(message.trim().length)} از ${fa(AWAY_MESSAGE_MAX)} حرف`}
          >
            <textarea
              id="away-msg" className="wsearch-newform-name trade-glass-field" rows={2} maxLength={AWAY_MESSAGE_MAX + 20}
              value={message} placeholder="مثلا «در سفرم؛ پیام‌ها را پس از بازگشت جواب می‌دهم»"
              onChange={(e) => { setMessage(e.target.value); setErr((x) => ({ ...x, message: undefined })); }}
            />
          </MentorField>
          <div className="mentor-toggle-row" style={{ padding: 0 }}>
            <div className="mentor-toggle-text">
              <div className="mentor-toggle-title">توقف درخواست‌های تازه</div>
              <div className="mentor-toggle-desc">تا روز بازگشت، شاگرد جدید درخواست نمی‌دهد</div>
            </div>
            <ToggleSwitch checked={pause} label="توقف درخواست‌های تازه" onChange={setPause} />
          </div>
          {error && <div className="form-inline-error" role="alert" style={{ margin: 0 }}>{error}</div>}
          <div className="mentor-form-actions" style={{ marginTop: 0 }}>
            <button type="button" className="account-outline-btn muted mentor-btn" onClick={onClose} disabled={busy}>انصراف</button>
            <button type="submit" className="trade-primary-btn mentor-btn" disabled={busy}>
              {busy ? <Spinner size={14} /> : settings.awayUntil ? "ذخیره" : "ثبت"}
            </button>
          </div>
        </form>
      </MentorSheet>
      {picker && typeof document !== "undefined" && createPortal(
        <div className="m-date-over">
          <JalaliDatePicker
            initial={date}
            title="تاریخ بازگشت"
            disablePast
            onClose={() => setPicker(false)}
            onPick={(v) => { setDate(v); setPicker(false); setErr((x) => ({ ...x, date: undefined })); }}
          />
        </div>,
        document.body,
      )}
    </>
  );
}
