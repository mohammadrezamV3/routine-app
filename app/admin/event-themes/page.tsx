"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { adminFetch, useAdminToast } from "@/components/admin/useAdminToast";
import { ConfirmModal } from "@/components/admin/AdminModal";
import { EventThemeIcon } from "@/components/EventThemeGreeting";
import { Spinner } from "@/components/Spinner";
import { TickOption } from "@/components/TickOption";
import { J_MONTHS, formatJalali, toJalali } from "@/lib/jalali";
import { EVENT_PREVIEW_KEY, type EventThemeState, type TimelineItem } from "@/lib/eventThemeState";
import type { EventOccurrence, EventTheme } from "@/lib/eventThemes";

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

const DISCOUNT_BADGE: Record<DiscountStatus, { label: string; cls: string }> = {
  pending: { label: "ساخته نشده", cls: "amber" },
  active: { label: "فعال", cls: "green" },
  stopped: { label: "قطع‌شده", cls: "gray" },
  expired: { label: "منقضی‌شده", cls: "gray" },
  deleted: { label: "حذف‌شده", cls: "gray" },
};

const STATUS_BADGE: Record<TimelineItem["status"], { label: string; cls: string }> = {
  "live-window": { label: "در بازه‌ی خودش", cls: "green" },
  upcoming: { label: "به‌زودی", cls: "amber" },
  past: { label: "گذشته", cls: "gray" },
};

function isoToJalali(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return formatJalali(toJalali(y, m, d));
}

function jalaliMonthKey(iso: string): { key: string; label: string } {
  const [y, m, d] = iso.split("-").map(Number);
  const [jy, jm] = toJalali(y, m, d);
  return { key: `${jy}-${String(jm).padStart(2, "0")}`, label: `${J_MONTHS[jm - 1]} ${jy}` };
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
    toast(body.action === "reset" ? "به حالت عادی برگشت" : "تم برای همه منتشر شد");
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

  return (
    <section>
      <div className="admin-page-head">
        <div>
          <div className="admin-page-kicker">تم‌های مناسبتی</div>
          <div className="admin-section-hint admin-page-sub">
            هر مناسبت رو اول فقط روی همین دستگاه تست کن، بعد برای همه منتشر کن. تم منتشرشده داخل بازه‌ی مناسبت خودش تموم می‌شه، وگرنه تا ریست دستی می‌مونه.
          </div>
        </div>
      </div>

      {!data ? (
        failed ? (
          <div className="admin-empty">
            <span>خطا در دریافت اطلاعات</span>
            <button type="button" className="admin-btn sm" onClick={load}>تلاش دوباره</button>
          </div>
        ) : <div className="admin-empty"><Spinner size={22} /></div>
      ) : (
        <>
          <div className="admin-chart-card">
            <div className="admin-perm-label" style={{ marginBottom: 10 }}>وضعیت فعلی</div>
            <div style={rowStyle}>
              {liveTheme && data.state.active ? (
                <>
                  <span style={{ display: "inline-flex", color: liveTheme.swatch[0] }}><EventThemeIcon name={liveTheme.icon} size={20} /></span>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div className="admin-perm-label">{liveTheme.name} برای همه فعاله</div>
                    <div className="admin-perm-hint">
                      {data.state.active.endsAt ? `تا ${isoToJalali(data.state.active.endsAt)}` : "تا ریست دستی"}
                      {" · "}منتشرشده در {isoToJalali(data.state.active.releasedAt.slice(0, 10))}
                    </div>
                  </div>
                  <button type="button" className="admin-btn danger sm" onClick={() => setConfirm({ kind: "reset" })}>ریست به حالت عادی</button>
                </>
              ) : (
                <div className="admin-perm-label">حالت عادی</div>
              )}
            </div>
            {preview && (
              <div style={{ ...rowStyle, marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--adm-border)" }}>
                <div className="admin-perm-hint" style={{ flex: 1, minWidth: 180 }}>
                  پیش‌نمایش روی این دستگاه: {preview === "none" ? "بدون تم" : previewTheme?.name ?? preview}
                </div>
                <button type="button" className="admin-btn sm" onClick={() => setPreviewValue(null)}>پایان پیش‌نمایش</button>
              </div>
            )}
            {preview !== "none" && (
              <div style={{ marginTop: 12 }}>
                <button type="button" className="admin-btn sm" onClick={() => setPreviewValue("none")}>پیش‌نمایش بدون تم</button>
              </div>
            )}
          </div>

          <div className="admin-chart-card">
            <div className="admin-perm-label" style={{ marginBottom: 6 }}>تخفیف خودکار مناسبت‌ها</div>
            <TickOption
              checked={data.discount.enabled}
              onChange={(v) => postDiscount({ action: "discount_enabled", enabled: v }, v ? "ساخت خودکار کد روشن شد" : "ساخت خودکار کد خاموش شد")}
            >
              ساخت خودکار کد {data.discount.percent}٪ برای هر مناسبت
            </TickOption>
            <div className="admin-perm-group" style={{ marginTop: 10 }}>
              {data.discount.schedule.map((it) => {
                const t = byId.get(it.themeId);
                const st = DISCOUNT_BADGE[it.status];
                const manageable = it.status === "active" || it.status === "stopped";
                return (
                  <div key={it.key} className="admin-perm-row" style={{ flexWrap: "wrap" }}>
                    <div style={{ minWidth: 200, flex: 1 }}>
                      <div style={{ ...rowStyle, gap: 8 }}>
                        <span className="admin-perm-label">{t?.name ?? it.themeId}</span>
                        <span className={`admin-badge ${st.cls}`}>{st.label}</span>
                      </div>
                      <div className="admin-perm-hint">
                        {isoToJalali(it.occurrence.start)} تا {isoToJalali(it.occurrence.end)}
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
                                it.status === "stopped" ? "کد وصل شد" : "کد قطع شد",
                              )}
                            >
                              {it.status === "stopped" ? "وصل" : "قطع"}
                            </button>
                            <button type="button" className="admin-btn danger sm" onClick={() => setConfirm({ kind: "discount_delete", item: it })}>حذف</button>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="admin-perm-hint">
                        <span className="mono admin-ltr" dir="ltr">{it.code}</span>
                        {" · "}از شروع مناسبت ساخته می‌شه
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {groups.length === 0 ? (
            <div className="admin-empty">مناسبتی در کاتالوگ نیست</div>
          ) : groups.map((g) => (
            <div key={g.key} className="admin-chart-card">
              <div className="admin-perm-label" style={{ marginBottom: 6 }}>{g.label}</div>
              <div className="admin-perm-group">
                {g.items.map((it) => {
                  const t = it.theme;
                  const st = STATUS_BADGE[it.status];
                  const testing = preview === t.id;
                  const isLive = liveId === t.id;
                  return (
                    <div key={`${t.id}-${it.occurrence.start}`} className="admin-perm-row" style={{ flexWrap: "wrap" }}>
                      <div style={{ ...rowStyle, flex: 1, minWidth: 220 }}>
                        <span style={{ display: "inline-flex", color: t.swatch[0] }}><EventThemeIcon name={t.icon} size={20} /></span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ ...rowStyle, gap: 8 }}>
                            <span className="admin-perm-label">{t.name}</span>
                            <span style={{ display: "inline-flex", gap: 4 }} aria-hidden>
                              {t.swatch.map((c, i) => (
                                <span key={i} style={{ width: 10, height: 10, borderRadius: 999, background: c, border: "1px solid var(--adm-border)" }} />
                              ))}
                            </span>
                            <span className={`admin-badge ${st.cls}`}>{st.label}</span>
                            {isLive && <span className="admin-badge green">منتشرشده</span>}
                          </div>
                          <div className="admin-perm-hint">
                            {isoToJalali(it.occurrence.start)} تا {isoToJalali(it.occurrence.end)}
                            {it.occurrence.note ? ` · ${it.occurrence.note}` : ""}
                          </div>
                        </div>
                      </div>
                      <div style={{ ...rowStyle, gap: 8 }}>
                        <button
                          type="button"
                          className="admin-btn sm"
                          onClick={() => setPreviewValue(testing ? null : t.id)}
                        >
                          {testing ? "پایان تست" : "تست برای من"}
                        </button>
                        <button
                          type="button"
                          className="admin-btn sm"
                          disabled={isLive}
                          onClick={() => setConfirm({ kind: "release", theme: t, windowed: it.status === "live-window" })}
                        >
                          انتشار برای همه
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
          title={`انتشار «${confirm.theme.name}»`}
          danger={false}
          confirmLabel="انتشار برای همه"
          message={
            confirm.windowed
              ? "این تم همین الان برای همه‌ی کاربرها فعال می‌شه و خودکار در پایان بازه‌ی همین مناسبت تموم می‌شه. هر وقت خواستی با ریست برش می‌گردونی."
              : "این تم همین الان برای همه‌ی کاربرها فعال می‌شه. چون الان داخل بازه‌ی مناسبت نیستیم، تا وقتی دستی ریست نکنی می‌مونه."
          }
          onClose={() => setConfirm(null)}
          onConfirm={async () => { await post({ action: "release", id: confirm.theme.id }); setConfirm(null); }}
        />
      )}
      {confirm?.kind === "discount_delete" && (
        <ConfirmModal
          title="حذف کد مناسبت"
          confirmLabel="حذف کد"
          message={<>کد <b className="mono">{confirm.item.generatedCode}</b> برای همیشه حذف می‌شه و برای این وقوع دوباره ساخته نمی‌شه.</>}
          onClose={() => setConfirm(null)}
          onConfirm={async () => { await postDiscount({ action: "discount_delete", key: confirm.item.key }, "کد حذف شد"); setConfirm(null); }}
        />
      )}
      {confirm?.kind === "reset" && (
        <ConfirmModal
          title="ریست به حالت عادی"
          confirmLabel="ریست"
          message="تم مناسبتی فعال برای همه‌ی کاربرها برداشته می‌شه و ظاهر عادی برمی‌گرده."
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
