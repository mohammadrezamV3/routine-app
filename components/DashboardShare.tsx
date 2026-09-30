"use client";

// «اشتراکِ موفقیت» از داشبورد — کاربر خودش انتخاب می‌کنه چی توی تصویر بیاد
// (استریک، حلقه‌های روز، نقشه‌ی ثباتِ ماه، اسمش، کدِ دعوت) و هرچی رو نخواد
// دیده بشه (مثلا کالری) خاموش می‌کنه؛ پیش‌نمایش همون لحظه عوض می‌شه. انتخاب‌ها
// فقط روی همین دستگاه یادآوری می‌شن (localStorage) و تصویر فقط وقتی از دستگاه
// بیرون می‌ره که خودِ کاربر «اشتراک» یا «ذخیره» رو بزنه — هیچ‌چیز به سرور نمی‌ره.
//
// «بهونه»ی دعوت: پایینِ کارت کدِ رفرالِ کاربره و دوستش با اون روی اولین
// اشتراک تخفیف می‌گیره (lib/invite.ts).

import "@/app/dashboard/dashboard.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Copy, Download, Share2, X } from "lucide-react";
import { FA_WEEKDAY, J_MONTHS, faNum, toJalali } from "@/lib/jalali";
import { buildMonth, heatLevel, jalaliOfIso } from "@/lib/dashboardCompute";
import type { DashboardData } from "@/lib/dashboardTypes";
import type { ScheduleOpts } from "@/lib/schedule";
import type { DailyRecord } from "@/lib/storage";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";
import { useMyInvite } from "@/lib/invite";
import { REFERRAL_DISCOUNT_PERCENT } from "@/lib/referral";
import { canvasToBlob, downloadBlob, renderShareCard, shareImage, shareText, type ShareCardInput, type ShareFormat } from "@/lib/shareCard";
import { heroRings } from "./DashboardHero";
import { SegmentedTabs } from "./SegmentedTabs";
import { ToggleSwitch } from "./ToggleSwitch";
import { Spinner } from "./Spinner";
import { D_EASE } from "./DashboardKit";

type Opts = { name: boolean; streak: boolean; routine: boolean; exercise: boolean; calorie: boolean; month: boolean; invite: boolean; format: ShareFormat };
// کالری پیش‌فرض خاموشه — عددِ شخصی‌تریه که خیلی‌ها نمی‌خوان دیده بشه
const DEFAULTS: Opts = { name: true, streak: true, routine: true, exercise: true, calorie: false, month: true, invite: true, format: "post" };
const KEY = "arion:dashShare";

function loadOpts(): Opts {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Opts>) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

/** رنگِ حلقه‌ها توکن‌های --ring-* ِ داشبوردن؛ canvas مقدارِ واقعی‌شون رو لازم داره */
function resolveColor(v: string): string {
  const m = v.match(/^var\((--[\w-]+)\)$/);
  if (!m) return v;
  const el = document.querySelector(".db-page") ?? document.body;
  return getComputedStyle(el).getPropertyValue(m[1]).trim() || "#00C98D";
}

export function DashboardShare({
  open,
  onClose,
  data,
  routine,
}: {
  open: boolean;
  onClose: () => void;
  data: DashboardData | null;
  routine: {
    stats: { completed: number; total: number; pct: number };
    streak: number | null;
    opts: ScheduleOpts;
    daily: Record<string, DailyRecord>;
    todayIso: string;
  };
}) {
  useLockBodyScroll(open);
  const [opts, setOpts] = useState<Opts>(DEFAULTS);
  useEffect(() => { if (open) setOpts(loadOpts()); }, [open]);
  function set<K extends keyof Opts>(k: K, v: Opts[K]) {
    setOpts((o) => {
      const next = { ...o, [k]: v };
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* فقط برای همین بار */ }
      return next;
    });
  }

  const invite = useMyInvite();
  const rings = useMemo(() => heroRings(data, routine.stats), [data, routine.stats]);
  const hasEx = rings.find((r) => r.key === "exercise")?.show ?? false;
  const hasCal = rings.find((r) => r.key === "calorie")?.show ?? false;
  const [ty, tm] = jalaliOfIso(routine.todayIso);

  const joinIso = useMemo(() => {
    const d = data?.user.memberSince ? new Date(data.user.memberSince) : null;
    if (!d || Number.isNaN(d.getTime())) return undefined;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, [data?.user.memberSince]);

  const input: ShareCardInput = useMemo(() => {
    const [y, m, d] = routine.todayIso.split("-").map(Number);
    const now = new Date(y, m - 1, d);
    const [jy, jm, jd] = toJalali(y, m, d);
    const picked = rings.filter((r) => r.show && ((r.key === "routine" && opts.routine) || (r.key === "exercise" && opts.exercise) || (r.key === "calorie" && opts.calorie)));
    const month = opts.month ? buildMonth(ty, tm, routine.todayIso, routine.opts, routine.daily, joinIso) : null;
    const firstName = data?.user.name.split(" ")[0] || null;
    return {
      format: opts.format,
      title: "امروزِ من",
      subtitle: `${FA_WEEKDAY[now.getDay()]} ${faNum(jd)} ${J_MONTHS[jm - 1]} ${faNum(jy)}`,
      name: opts.name ? firstName : null,
      streak: opts.streak && routine.streak !== null ? { days: routine.streak, label: "روزِ پشتِ‌سرهم" } : null,
      rings: picked.length
        ? {
            centerPct: Math.round(Math.min(1, picked[0].value) * 100),
            items: picked.map((r) => ({ label: r.label, value: r.value, display: r.display, colors: [resolveColor(r.grad[0]), resolveColor(r.grad[1])] as [string, string] })),
          }
        : null,
      month: month
        ? {
            title: `نقشه‌ی ثباتِ ${J_MONTHS[tm - 1]}`,
            lead: month.lead,
            cells: month.cells.map((c) => ({ jd: c.jd, level: heatLevel(c.pct), today: c.today, future: c.future })),
            stats: [
              { label: "میانگین", value: month.avg === null ? "—" : `${faNum(month.avg)}%` },
              { label: "روزِ کامل", value: faNum(month.perfect) },
            ],
          }
        : null,
      invite: opts.invite && invite ? { code: invite.code, url: invite.url, percent: REFERRAL_DISCOUNT_PERCENT } : null,
    };
    // ring colors از DOM خونده می‌شن؛ فقط وقتی ورودی‌ها عوض بشن دوباره
  }, [opts, rings, routine.todayIso, routine.opts, routine.daily, routine.streak, ty, tm, joinIso, data?.user.name, invite]);

  const empty = !input.streak && !input.rings && !input.month;

  const [busy, setBusy] = useState<"share" | "save" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // پیش‌نمایشِ زنده — کمی تأخیر تا چند تغییرِ پشتِ‌سرهم یک رندر بشن
  const [preview, setPreview] = useState<string | null>(null);
  const previewRef = useRef<string | null>(null);
  const blobRef = useRef<Blob | null>(null);
  const [rendering, setRendering] = useState(false);
  useEffect(() => {
    if (!open || empty) return;
    let alive = true;
    setRendering(true);
    const t = setTimeout(async () => {
      try {
        const blob = await canvasToBlob(await renderShareCard(input));
        if (!alive) return;
        blobRef.current = blob;
        if (previewRef.current) URL.revokeObjectURL(previewRef.current);
        previewRef.current = URL.createObjectURL(blob);
        setPreview(previewRef.current);
      } catch {
        if (alive) setMsg("ساختِ تصویر ممکن نشد");
      } finally {
        if (alive) setRendering(false);
      }
    }, 160);
    return () => { alive = false; clearTimeout(t); };
  }, [open, input, empty]);
  useEffect(() => () => { if (previewRef.current) URL.revokeObjectURL(previewRef.current); }, []);

  useEffect(() => { if (!open) setMsg(null); }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function currentBlob() {
    if (blobRef.current && !rendering) return blobRef.current;
    return canvasToBlob(await renderShareCard(input));
  }
  const fileName = `arion-${routine.todayIso}.png`;
  const lead = routine.streak ? `${faNum(routine.streak)} روزِ پشتِ‌سرهم روتینم رو کامل کردم 🔥` : "امروزم توی آریون 💪";

  async function doShare() {
    if (busy || empty) return;
    setBusy("share");
    setMsg(null);
    try {
      const res = await shareImage(await currentBlob(), fileName, "امروزِ من", shareText(lead, input.invite));
      if (res === "downloaded") setMsg("مرورگرت اشتراکِ مستقیم نداره — تصویر ذخیره شد");
    } catch {
      setMsg("ساختِ تصویر ممکن نشد");
    } finally {
      setBusy(null);
    }
  }
  async function doSave() {
    if (busy || empty) return;
    setBusy("save");
    setMsg(null);
    try {
      downloadBlob(await currentBlob(), fileName);
      setMsg("تصویر ذخیره شد");
    } catch {
      setMsg("ساختِ تصویر ممکن نشد");
    } finally {
      setBusy(null);
    }
  }
  async function copyInvite() {
    if (!invite) return;
    const txt = shareText(lead, { code: invite.code, url: invite.url, percent: REFERRAL_DISCOUNT_PERCENT });
    try {
      await navigator.clipboard.writeText(txt);
      setMsg("متن و لینکِ دعوت کپی شد");
    } catch {
      setMsg(invite.url);
    }
  }

  const rows: { k: keyof Opts; label: string; hint?: string; show: boolean }[] = [
    { k: "name", label: "اسمم", show: !!data?.user.name },
    { k: "streak", label: "استریک", hint: routine.streak !== null ? `${faNum(routine.streak)} روز` : undefined, show: true },
    { k: "routine", label: "حلقه‌ی روتین", hint: rings[0].display, show: true },
    { k: "exercise", label: "تمرین", hint: rings[1].display, show: hasEx },
    { k: "calorie", label: "کالری", hint: rings[2].display, show: hasCal },
    { k: "month", label: `نقشه‌ی ثباتِ ${J_MONTHS[tm - 1]}`, show: true },
    { k: "invite", label: "کدِ دعوت", hint: `${faNum(REFERRAL_DISCOUNT_PERCENT)}٪ تخفیف برای دوستت`, show: true },
  ];

  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="db-share-root"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            className="db-share"
            role="dialog"
            aria-modal="true"
            aria-label="اشتراکِ موفقیت"
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.28, ease: D_EASE }}
          >
            <div className="db-share-head">
              <h2>اشتراکِ موفقیت</h2>
              <button type="button" className="trade-icon-btn" onClick={onClose} aria-label="بستن"><X size={17} /></button>
            </div>

            <div className="db-share-body thin-scroll">
              <div className={`db-share-preview is-${opts.format}`}>
                {empty ? (
                  <p className="db-share-empty">حداقل یکی از استریک، حلقه‌ها یا نقشه‌ی ثبات رو روشن کن</p>
                ) : preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt="پیش‌نمایشِ تصویرِ اشتراکی" className={rendering ? "is-dim" : undefined} />
                ) : (
                  <Spinner size={22} />
                )}
              </div>

              <div className="db-share-side">
                <SegmentedTabs
                  ariaLabel="قالبِ تصویر"
                  options={[{ value: "post", label: "پست" }, { value: "story", label: "استوری" }]}
                  active={opts.format}
                  onChange={(v) => set("format", v)}
                />

                <p className="db-share-label">چی دیده بشه؟</p>
                <ul className="db-share-list">
                  {rows.filter((r) => r.show).map((r) => (
                    <li key={r.k}>
                      <span className="db-share-row-text">
                        <span>{r.label}</span>
                        {r.hint && <small>{r.hint}</small>}
                      </span>
                      <ToggleSwitch checked={opts[r.k] as boolean} onChange={(v) => set(r.k, v as never)} label={r.label} />
                    </li>
                  ))}
                </ul>

                <p className="db-share-invite">
                  {invite?.code
                    ? <>هر دوستی که با کدِ <b dir="ltr">{invite.code}</b> بیاد، روی اولین اشتراکش {faNum(REFERRAL_DISCOUNT_PERCENT)}٪ تخفیف می‌گیره. دوستات رو بیار و استریک‌هاتون رو با هم مقایسه کنید!</>
                    : "دوستات رو بیار و استریک‌هاتون رو با هم مقایسه کنید!"}
                </p>

                <div className="db-share-actions">
                  <button type="button" className="trade-primary-btn" onClick={doShare} disabled={!!busy || empty}>
                    {busy === "share" ? <Spinner size={14} /> : <><Share2 size={15} /> اشتراک‌گذاری</>}
                  </button>
                  <button type="button" className="account-outline-btn" onClick={doSave} disabled={!!busy || empty}>
                    {busy === "save" ? <Spinner size={14} /> : <><Download size={15} /> ذخیره‌ی تصویر</>}
                  </button>
                  <button type="button" className="account-outline-btn" onClick={copyInvite} disabled={!invite}>
                    <Copy size={15} /> کپیِ لینکِ دعوت
                  </button>
                </div>
                {msg && <p className="db-share-msg" role="status">{msg}</p>}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
