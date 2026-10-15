"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { adminFetch, useAdminToast } from "@/components/admin/useAdminToast";
import { ConfirmModal } from "@/components/admin/AdminModal";
import { EventThemeIcon } from "@/components/EventThemeGreeting";
import { Spinner } from "@/components/Spinner";
import { TickOption } from "@/components/TickOption";
import { formatJalali, jMonthName, toJalali } from "@/lib/jalali";
import { EVENT_PREVIEW_KEY, type EventThemeState, type TimelineItem } from "@/lib/eventThemeState";
import { eventOccurrenceNote, eventThemeName, type EventOccurrence, type EventTheme } from "@/lib/eventThemes";
import { tr } from "@/lib/i18n";

type DiscountStatus = "pending" | "active" | "stopped" | "expired" | "deleted";
type DiscountItem = {
  themeId: string; occurrence: EventOccurrence; key: string; code: string; percent: number;
  live: boolean; generatedCode: string | null; status: DiscountStatus;
};

type Payload = {
  state: EventThemeState;
  activeId: string | null;
  catalog: EventTheme[];
  timeline: TimelineItem[];
  discount: { enabled: boolean; percent: number; schedule: DiscountItem[] };
};

// توابع، نه ثابت سطح ماژول: برچسب‌ها موقع رندر به زبان جاری وابسته‌ان.
const discountBadge = (): Record<DiscountStatus, { label: string; cls: string }> => ({
  pending: { label: tr("ساخته نشده", "Not created"), cls: "amber" },
  active: { label: tr("فعال", "Active"), cls: "green" },
  stopped: { label: tr("قطع‌شده", "Stopped"), cls: "gray" },
  expired: { label: tr("منقضی‌شده", "Expired"), cls: "gray" },
  deleted: { label: tr("حذف‌شده", "Deleted"), cls: "gray" },
});

const statusBadge = (): Record<TimelineItem["status"], { label: string; cls: string }> => ({
  "live-window": { label: tr("در بازه‌ی خودش", "In its window"), cls: "green" },
  upcoming: { label: tr("به‌زودی", "Upcoming"), cls: "amber" },
  past: { label: tr("گذشته", "Past"), cls: "gray" },
});

function isoToJalali(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return formatJalali(toJalali(y, m, d));
}

function jalaliMonthKey(iso: string): { key: string; label: string } {
  const [y, m, d] = iso.split("-").map(Number);
  const [jy, jm] = toJalali(y, m, d);
  return { key: `${jy}-${String(jm).padStart(2, "0")}`, label: `${jMonthName(jm - 1)} ${jy}` };
}

function readPreview(): string | null {
  try { return localStorage.getItem(EVENT_PREVIEW_KEY) || null; } catch { return null; }
}

// اعمال پیش‌نمایش روی همین صفحه: شناسه = همون تم، "none" = بدون تم، null = برگشت به تم زنده
function applyPreview(value: string | null, liveId: string | null) {
  try {
    if (value) localStorage.setItem(EVENT_PREVIEW_KEY, value);
    else localStorage.removeItem(EVENT_PREVIEW_KEY);
  } catch { /* بدون localStorage فقط اعمال لحظه‌ای */ }
  const el = document.documentElement;
  const id = value === "none" ? null : value ?? liveId;
  if (id) el.setAttribute("data-event-theme", id);
  else el.removeAttribute("data-event-theme");
}

export default function AdminEventThemesPage() {
  const toast = useAdminToast();
  const [data, setData] = useState<Payload | null>(null);
  const [failed, setFailed] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<null | { kind: "release"; theme: EventTheme; windowed: boolean } | { kind: "reset" } | { kind: "discount_delete"; item: DiscountItem }>(null);

  const load = useCallback(() => {
    setFailed(false);
    adminFetch<Payload>("/api/admin/event-theme")
      .then(setData)
      .catch((e) => { setFailed(true); toast(e.message, "err"); });
  }, [toast]);
  useEffect(load, [load]);
  useEffect(() => { setPreview(readPreview()); }, []);

  const liveId = data?.activeId ?? null;
  const liveTheme = useMemo(() => data?.catalog.find((t) => t.id === liveId) ?? null, [data, liveId]);
  const byId = useMemo(() => new Map((data?.catalog ?? []).map((t) => [t.id, t])), [data]);

  function setPreviewValue(v: string | null) {
    applyPreview(v, liveId);
    setPreview(v);
  }

  async function post(body: { action: "release"; id: string } | { action: "reset" }) {
    const d = await adminFetch<Payload>("/api/admin/event-theme", { method: "POST", json: body });
    setData(d);
    // اگه پیش‌نمایشی نیست، همین صفحه هم تم زنده‌ی جدید رو نشون بده
    if (!readPreview()) applyPreview(null, d.activeId);
    toast(body.action === "reset" ? tr("به حالت عادی برگشت", "Back to normal") : tr("تم برای همه منتشر شد", "Theme published to everyone"));
  }

  async function postDiscount(body: { action: "discount_enabled"; enabled: boolean } | { action: "discount_set_active"; key: string; active: boolean } | { action: "discount_delete"; key: string }, okMsg: string) {
    try {
      const d = await adminFetch<Payload>("/api/admin/event-theme", { method: "POST", json: body });
      setData(d);
      toast(okMsg);
    } catch (e: any) {
      toast(e.message, "err");
    }
  }

  const groups = useMemo(() => {
    const out: { key: string; label: string; items: TimelineItem[] }[] = [];
    for (const it of data?.timeline ?? []) {
      const g = jalaliMonthKey(it.occurrence.start);
      let grp = out.find((x) => x.key === g.key);
      if (!grp) { grp = { key: g.key, label: g.label, items: [] }; out.push(grp); }
      grp.items.push(it);
    }
    return out;
  }, [data]);

  const previewTheme = preview && preview !== "none" ? byId.get(preview) : null;
  const rowStyle = { display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" as const };
  const discountLabels = discountBadge();
  const timelineLabels = statusBadge();

  return (
    <section>
      <div className="admin-page-head">
        <div>
          <div className="admin-page-kicker">{tr("تم‌های مناسبتی", "Event themes")}</div>
          <div className="admin-section-hint admin-page-sub">
            {tr(
              "هر مناسبت رو اول فقط روی همین دستگاه تست کن، بعد برای همه منتشر کن. تم منتشرشده داخل بازه‌ی مناسبت خودش تموم می‌شه، وگرنه تا ریست دستی می‌مونه.",
              "Test each event on this device first, then publish it to everyone. A published theme ends within its event's window; otherwise it stays until you reset it manually.",
            )}
          </div>
        </div>
      </div>

      {!data ? (
        failed ? (
          <div className="admin-empty">
            <span>{tr("خطا در دریافت اطلاعات", "Couldn't load the data")}</span>
            <button type="button" className="admin-btn sm" onClick={load}>{tr("تلاش دوباره", "Try again")}</button>
          </div>
        ) : <div className="admin-empty"><Spinner size={22} /></div>
      ) : (
        <>
          <div className="admin-chart-card">
            <div className="admin-perm-label" style={{ marginBottom: 10 }}>{tr("وضعیت فعلی", "Current status")}</div>
            <div style={rowStyle}>
              {liveTheme && data.state.active ? (
                <>
                  <span style={{ display: "inline-flex", color: liveTheme.swatch[0] }}><EventThemeIcon name={liveTheme.icon} size={20} /></span>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div className="admin-perm-label">{tr(`${eventThemeName(liveTheme)} برای همه فعاله`, `${eventThemeName(liveTheme)} is live for everyone`)}</div>
                    <div className="admin-perm-hint">
                      {data.state.active.endsAt
                        ? tr(`تا ${isoToJalali(data.state.active.endsAt)}`, `until ${isoToJalali(data.state.active.endsAt)}`)
                        : tr("تا ریست دستی", "until manual reset")}
                      {" · "}{tr("منتشرشده در ", "published on ")}{isoToJalali(data.state.active.releasedAt.slice(0, 10))}
                    </div>
                  </div>
                  <button type="button" className="admin-btn danger sm" onClick={() => setConfirm({ kind: "reset" })}>{tr("ریست به حالت عادی", "Reset to normal")}</button>
                </>
              ) : (
                <div className="admin-perm-label">{tr("حالت عادی", "Normal mode")}</div>
              )}
            </div>
            {preview && (
              <div style={{ ...rowStyle, marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--adm-border)" }}>
                <div className="admin-perm-hint" style={{ flex: 1, minWidth: 180 }}>
                  {tr("پیش‌نمایش روی این دستگاه: ", "Preview on this device: ")}{preview === "none" ? tr("بدون تم", "No theme") : previewTheme ? eventThemeName(previewTheme) : preview}
                </div>
                <button type="button" className="admin-btn sm" onClick={() => setPreviewValue(null)}>{tr("پایان پیش‌نمایش", "End preview")}</button>
              </div>
            )}
            {preview !== "none" && (
              <div style={{ marginTop: 12 }}>
                <button type="button" className="admin-btn sm" onClick={() => setPreviewValue("none")}>{tr("پیش‌نمایش بدون تم", "Preview without a theme")}</button>
              </div>
            )}
          </div>

          <div className="admin-chart-card">
            <div className="admin-perm-label" style={{ marginBottom: 6 }}>{tr("تخفیف خودکار مناسبت‌ها", "Automatic event discounts")}</div>
            <TickOption
              checked={data.discount.enabled}
              onChange={(v) => postDiscount({ action: "discount_enabled", enabled: v }, v ? tr("ساخت خودکار کد روشن شد", "Automatic code creation turned on") : tr("ساخت خودکار کد خاموش شد", "Automatic code creation turned off"))}
            >
              {tr(`ساخت خودکار کد ${data.discount.percent}٪ برای هر مناسبت`, `Automatically create a ${data.discount.percent}% code for each event`)}
            </TickOption>
            <div className="admin-perm-group" style={{ marginTop: 10 }}>
              {data.discount.schedule.map((it) => {
                const t = byId.get(it.themeId);
                const st = discountLabels[it.status];
                const manageable = it.status === "active" || it.status === "stopped";
                return (
                  <div key={it.key} className="admin-perm-row" style={{ flexWrap: "wrap" }}>
                    <div style={{ minWidth: 200, flex: 1 }}>
                      <div style={{ ...rowStyle, gap: 8 }}>
                        <span className="admin-perm-label">{t ? eventThemeName(t) : it.themeId}</span>
                        <span className={`admin-badge ${st.cls}`}>{st.label}</span>
                      </div>
                      <div className="admin-perm-hint">
                        {isoToJalali(it.occurrence.start)} {tr("تا", "to")} {isoToJalali(it.occurrence.end)}
                      </div>
                    </div>
                    {it.generatedCode ? (
                      <div style={{ ...rowStyle, gap: 8 }}>
                        <span className="mono admin-ltr" dir="ltr">{it.generatedCode}</span>
                        <span className="admin-ltr">{it.percent}%</span>
                        {manageable && (
                          <>
                            <button
                              type="button"
                              className="admin-btn sm"
                              onClick={() => postDiscount(
                                { action: "discount_set_active", key: it.key, active: it.status === "stopped" },
                                it.status === "stopped" ? tr("کد وصل شد", "Code turned on") : tr("کد قطع شد", "Code stopped"),
                              )}
                            >
                              {it.status === "stopped" ? tr("وصل", "On") : tr("قطع", "Stop")}
                            </button>
                            <button type="button" className="admin-btn danger sm" onClick={() => setConfirm({ kind: "discount_delete", item: it })}>{tr("حذف", "Delete")}</button>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="admin-perm-hint">
                        <span className="mono admin-ltr" dir="ltr">{it.code}</span>
                        {" · "}{tr("از شروع مناسبت ساخته می‌شه", "Created when the event starts")}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {groups.length === 0 ? (
            <div className="admin-empty">{tr("مناسبتی در کاتالوگ نیست", "No events in the catalog")}</div>
          ) : groups.map((g) => (
            <div key={g.key} className="admin-chart-card">
              <div className="admin-perm-label" style={{ marginBottom: 6 }}>{g.label}</div>
              <div className="admin-perm-group">
                {g.items.map((it) => {
                  const t = it.theme;
                  const st = timelineLabels[it.status];
                  const testing = preview === t.id;
                  const isLive = liveId === t.id;
                  return (
                    <div key={`${t.id}-${it.occurrence.start}`} className="admin-perm-row" style={{ flexWrap: "wrap" }}>
                      <div style={{ ...rowStyle, flex: 1, minWidth: 220 }}>
                        <span style={{ display: "inline-flex", color: t.swatch[0] }}><EventThemeIcon name={t.icon} size={20} /></span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ ...rowStyle, gap: 8 }}>
                            <span className="admin-perm-label">{eventThemeName(t)}</span>
                            <span style={{ display: "inline-flex", gap: 4 }} aria-hidden>
                              {t.swatch.map((c, i) => (
                                <span key={i} style={{ width: 10, height: 10, borderRadius: 999, background: c, border: "1px solid var(--adm-border)" }} />
                              ))}
                            </span>
                            <span className={`admin-badge ${st.cls}`}>{st.label}</span>
                            {isLive && <span className="admin-badge green">{tr("منتشرشده", "Published")}</span>}
                          </div>
                          <div className="admin-perm-hint">
                            {isoToJalali(it.occurrence.start)} {tr("تا", "to")} {isoToJalali(it.occurrence.end)}
                            {it.occurrence.note ? ` · ${eventOccurrenceNote(it.occurrence.note)}` : ""}
                          </div>
                        </div>
                      </div>
                      <div style={{ ...rowStyle, gap: 8 }}>
                        <button
                          type="button"
                          className="admin-btn sm"
                          onClick={() => setPreviewValue(testing ? null : t.id)}
                        >
                          {testing ? tr("پایان تست", "End test") : tr("تست برای من", "Test for me")}
                        </button>
                        <button
                          type="button"
                          className="admin-btn sm"
                          disabled={isLive}
                          onClick={() => setConfirm({ kind: "release", theme: t, windowed: it.status === "live-window" })}
                        >
                          {tr("انتشار برای همه", "Publish to everyone")}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </>
      )}

      {confirm?.kind === "release" && (
        <ConfirmModal
          title={tr(`انتشار «${eventThemeName(confirm.theme)}»`, `Publish "${eventThemeName(confirm.theme)}"`)}
          danger={false}
          confirmLabel={tr("انتشار برای همه", "Publish to everyone")}
          message={
            confirm.windowed
              ? tr(
                "این تم همین الان برای همه‌ی کاربرها فعال می‌شه و خودکار در پایان بازه‌ی همین مناسبت تموم می‌شه. هر وقت خواستی با ریست برش می‌گردونی.",
                "This theme turns on for all users right now and ends automatically at the end of this event's window. You can reset it at any time.",
              )
              : tr(
                "این تم همین الان برای همه‌ی کاربرها فعال می‌شه. چون الان داخل بازه‌ی مناسبت نیستیم، تا وقتی دستی ریست نکنی می‌مونه.",
                "This theme turns on for all users right now. We're not inside the event's window, so it stays on until you reset it manually.",
              )
          }
          onClose={() => setConfirm(null)}
          onConfirm={async () => { await post({ action: "release", id: confirm.theme.id }); setConfirm(null); }}
        />
      )}
      {confirm?.kind === "discount_delete" && (
        <ConfirmModal
          title={tr("حذف کد مناسبت", "Delete event code")}
          confirmLabel={tr("حذف کد", "Delete code")}
          message={<>{tr("کد", "Code")} <b className="mono">{confirm.item.generatedCode}</b> {tr("برای همیشه حذف می‌شه و برای این وقوع دوباره ساخته نمی‌شه.", "will be deleted permanently and won't be created again for this occurrence.")}</>}
          onClose={() => setConfirm(null)}
          onConfirm={async () => { await postDiscount({ action: "discount_delete", key: confirm.item.key }, tr("کد حذف شد", "Code deleted")); setConfirm(null); }}
        />
      )}
      {confirm?.kind === "reset" && (
        <ConfirmModal
          title={tr("ریست به حالت عادی", "Reset to normal")}
          confirmLabel={tr("ریست", "Reset")}
          message={tr("تم مناسبتی فعال برای همه‌ی کاربرها برداشته می‌شه و ظاهر عادی برمی‌گرده.", "The active event theme is removed for all users and the normal look comes back.")}
          onClose={() => setConfirm(null)}
          onConfirm={async () => {
            await post({ action: "reset" });
            setConfirm(null);
          }}
        />
      )}
    </section>
  );
}
