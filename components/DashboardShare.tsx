"use client";

// «اشتراکِ موفقیت» از داشبورد. کاربر اول انتخاب می‌کنه *چی* رو به اشتراک بذاره
// — حلقه‌های امروز یا نقشه‌ی ثباتِ ماه (هر بار فقط یکی، تا تصویر شلوغ نشه) —
// و بعد هرچی رو نخواد دیده بشه خاموش می‌کنه — حلقه‌ها همیشه روی کارت می‌مونن و
// سوییچ فقط عددِ زیرِ هر حلقه (مثلا کالری، که پیش‌فرض پنهانه) رو پنهان می‌کنه. وسطِ حلقه‌ها تعدادِ روزهای استریک میاد. پیش‌نمایش همون لحظه عوض
// می‌شه؛ انتخاب‌ها فقط روی همین دستگاه یادآوری می‌شن (localStorage) و تصویر فقط
// با زدنِ «اشتراک‌گذاری» از دستگاه بیرون می‌ره — هیچ‌چیز به سرور نمی‌ره.
//
// «بهونه»ی دعوت: کدِ رفرالِ کاربر (اگه روشن باشه) بالای کارت، و متن و لینکِ
// دعوت همراهِ پیامِ اشتراک (lib/invite.ts).

import "@/app/dashboard/dashboard.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Share2, X } from "lucide-react";
import { FA_WEEKDAY, J_MONTHS, faNum, toJalali } from "@/lib/jalali";
import { buildMonth, heatLevel, jalaliOfIso } from "@/lib/dashboardCompute";
import type { DashboardData } from "@/lib/dashboardTypes";
import type { ScheduleOpts } from "@/lib/schedule";
import type { DailyRecord } from "@/lib/storage";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";
import { useMyInvite } from "@/lib/invite";
import { REFERRAL_DISCOUNT_PERCENT } from "@/lib/referral";
import { canvasToBlob, renderShareCard, shareImage, shareText, type ShareCardInput } from "@/lib/shareCard";
import { heroRings, type HeroRing } from "./DashboardHero";
import { SegmentedTabs } from "./SegmentedTabs";
import { ToggleSwitch } from "./ToggleSwitch";
import { Spinner } from "./Spinner";
import { D_EASE } from "./DashboardKit";

type Kind = "rings" | "month";
type Opts = { kind: Kind; routine: boolean; exercise: boolean; calorie: boolean; invite: boolean };
// کالری پیش‌فرض خاموشه — عددِ شخصی‌تریه که خیلی‌ها نمی‌خوان دیده بشه
const DEFAULTS: Opts = { kind: "rings", routine: true, exercise: true, calorie: false, invite: true };
const KEY = "arion:dashShare:v2";

function loadOpts(): Opts {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const v = { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Opts>) };
    return v.kind === "rings" || v.kind === "month" ? v : { ...v, kind: DEFAULTS.kind };
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

/** بخشِ اشتراک هیچ اِعرابی نداره — برچسب‌های مشترک با هیرو (مثلِ «تمرینِ امروز») هم تمیز می‌شن */
const plain = (t: string) => t.replace(/[\u064B-\u0652\u0670]/g, "");

function isoOf(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function DashboardShare({
  open,
  onClose,
  data,
  routine,
  routineLocked = false,
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
  /** ماژولِ «روتین من» قفله → حلقه‌ی روتین نیست (هم‌رفتار با هیرو) */
  routineLocked?: boolean;
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
  const rings = useMemo(() => heroRings(data, routine.stats, routineLocked), [data, routine.stats, routineLocked]);
  const ringOf = (k: HeroRing["key"]) => rings.find((r) => r.key === k)!;
  const streak = routine.streak ?? 0;
  const [ty, tm] = jalaliOfIso(routine.todayIso);

  const joinIso = useMemo(() => {
    const d = data?.user.memberSince ? new Date(data.user.memberSince) : null;
    return d && !Number.isNaN(d.getTime()) ? isoOf(d) : undefined;
  }, [data?.user.memberSince]);

  // ماهِ جاری فقط وقتی لازمه ساخته می‌شه (حالتِ نقشه)
  const month = useMemo(
    () => (opts.kind === "month" ? buildMonth(ty, tm, routine.todayIso, routine.opts, routine.daily, joinIso) : null),
    [opts.kind, ty, tm, routine.todayIso, routine.opts, routine.daily, joinIso]
  );

  // مقدارِ نمایشیِ هر حلقه روی کارت — کالری با هدفش، نه فقط یه عددِ تنها
  const cardRings = useMemo(() => {
    const cal = data?.calorie;
    return rings
      // حلقه‌ها همیشه روی کارت می‌مونن؛ سوییچ فقط عددِ زیرِ هر حلقه رو پنهان می‌کنه
      .filter((r) => r.show)
      .map((r) => ({
        label: plain(r.label),
        value: r.value,
        display: !opts[r.key] ? null : r.key === "calorie" && cal?.target ? `${faNum(Math.round(cal.today.kcal))}/${faNum(Math.round(cal.target.kcal))}` : r.display,
        colors: [resolveColor(r.grad[0]), resolveColor(r.grad[1])] as [string, string],
      }));
    // rings خودش data رو پوشش می‌ده؛ فقط کالری مستقیم خونده می‌شه
  }, [rings, opts, data?.calorie]);

  const input = useMemo<ShareCardInput | null>(() => {
    const [y, m, d] = routine.todayIso.split("-").map(Number);
    const [jy, jm, jd] = toJalali(y, m, d);
    const weekday = FA_WEEKDAY[new Date(y, m - 1, d).getDay()];
    const base = {
      title: "فعالیت امروز",
      subtitle: `${weekday} ${faNum(jd)} ${J_MONTHS[jm - 1]} ${faNum(jy)}`,
      inviteCode: opts.invite ? invite?.code ?? null : null,
    };
    if (opts.kind === "rings") {
      if (!cardRings.length) return null;
      return { ...base, body: { kind: "rings", streak, items: cardRings } };
    }
    if (!month) return null;
    return {
      ...base,
      body: {
        kind: "month",
        streak,
        title: `نقشه‌ی ثبات ${J_MONTHS[tm - 1]} ${faNum(ty)}`,
        lead: month.lead,
        cells: month.cells.map((c) => ({ jd: c.jd, level: heatLevel(c.pct), today: c.today, future: c.future })),
        stats: [
          { label: "روز کامل", value: faNum(month.perfect) },
          { label: "میانگین ماه", value: month.avg === null ? "—" : `${faNum(month.avg)}%` },
        ],
      },
    };
  }, [opts.kind, opts.invite, invite?.code, routine.todayIso, cardRings, month, streak, ty, tm]);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // پیش‌نمایشِ زنده — کمی تأخیر تا چند تغییرِ پشتِ‌سرهم یک رندر بشن. blob ِ هر
  // رندر با کلیدِ همون ورودی نگه داشته می‌شه تا «اشتراک» هیچ‌وقت تصویرِ کهنه نفرسته.
  const [preview, setPreview] = useState<string | null>(null);
  const previewRef = useRef<string | null>(null);
  const blobRef = useRef<{ input: ShareCardInput; blob: Blob } | null>(null);
  const [rendering, setRendering] = useState(false);
  useEffect(() => {
    if (!open || !input) return;
    let alive = true;
    setRendering(true);
    const t = setTimeout(async () => {
      try {
        const blob = await canvasToBlob(await renderShareCard(input));
        if (!alive) return;
        blobRef.current = { input, blob };
        if (previewRef.current) URL.revokeObjectURL(previewRef.current);
        previewRef.current = URL.createObjectURL(blob);
        setPreview(previewRef.current);
      } catch {
        if (alive) setMsg("ساخت تصویر ممکن نشد");
      } finally {
        if (alive) setRendering(false);
      }
    }, 140);
    return () => { alive = false; clearTimeout(t); };
  }, [open, input]);
  useEffect(() => () => { if (previewRef.current) URL.revokeObjectURL(previewRef.current); }, []);

  useEffect(() => { if (!open) { setMsg(null); setBusy(false); } }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function doShare() {
    if (busy || !input) return;
    setBusy(true);
    setMsg(null);
    try {
      const cached = blobRef.current;
      const blob = cached && cached.input === input ? cached.blob : await canvasToBlob(await renderShareCard(input));
      const lead = streak ? `${faNum(streak)} روز پشت‌سرهم روتینم رو کامل کردم 🔥` : "امروزم توی آریون 💪";
      const inv = invite && opts.invite ? { code: invite.code, url: invite.url, percent: REFERRAL_DISCOUNT_PERCENT } : null;
      const res = await shareImage(blob, `arion-${routine.todayIso}.png`, "فعالیت امروز", shareText(lead, inv));
      if (res === "downloaded") setMsg("تصویر ذخیره شد — حالا برای دوستات بفرستش");
    } catch {
      setMsg("ساخت تصویر ممکن نشد");
    } finally {
      setBusy(false);
    }
  }

  const ringRows = (["routine", "exercise", "calorie"] as const)
    .map((k) => ringOf(k))
    .filter((r) => r.show);

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
            aria-label="اشتراک موفقیت"
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.28, ease: D_EASE }}
          >
            <div className="db-share-head">
              <h2>اشتراک موفقیت</h2>
              <button type="button" className="trade-icon-btn" onClick={onClose} aria-label="بستن"><X size={18} /></button>
            </div>

            <div className="db-share-body thin-scroll">
              <div className="db-share-preview">
                {!input ? (
                  <p className="db-share-empty">هنوز حلقه‌ای برای امروز نیست</p>
                ) : preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt="پیش‌نمایش تصویر اشتراکی" className={rendering ? "is-dim" : undefined} />
                ) : (
                  <Spinner size={22} />
                )}
              </div>

              <div className="db-share-side">
                <SegmentedTabs
                  ariaLabel="چی رو به اشتراک بذاری"
                  className="db-share-kind"
                  options={[{ value: "rings", label: "حلقه‌های امروز" }, { value: "month", label: "نقشه‌ی ثبات" }]}
                  active={opts.kind}
                  onChange={(v) => set("kind", v)}
                />

                {opts.kind === "rings" && (
                  <div className="db-share-group">
                    <p className="db-share-label">عدد زیر کدوم حلقه‌ها دیده بشه؟</p>
                    <ul className="db-share-list">
                      {ringRows.map((r) => (
                        <li key={r.key}>
                          <span className="db-share-dot" style={{ background: `linear-gradient(135deg, ${r.grad[0]}, ${r.grad[1]})` }} aria-hidden="true" />
                          <span className="db-share-row-text">
                            <span>{plain(r.label)}</span>
                            <small dir="ltr">{r.display}</small>
                          </span>
                          <ToggleSwitch checked={opts[r.key]} onChange={(v) => set(r.key, v)} label={`نمایش عدد ${plain(r.label)}`} />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="db-share-group">
                  <p className="db-share-label">روی تصویر</p>
                  <ul className="db-share-list">
                    <li>
                      <span className="db-share-row-text">
                        <span>کد دعوت</span>
                        <small>{faNum(REFERRAL_DISCOUNT_PERCENT)}٪ تخفیف برای دوستت</small>
                      </span>
                      <ToggleSwitch checked={opts.invite && !!invite?.code} onChange={(v) => set("invite", v)} label="کد دعوت" disabled={!invite?.code} />
                    </li>
                  </ul>
                </div>

                <div className="db-share-actions">
                  <button type="button" className="trade-primary-btn" onClick={doShare} disabled={busy || !input}>
                    {busy ? <Spinner size={14} /> : <><Share2 size={16} /> اشتراک‌گذاری</>}
                  </button>
                  {msg && <p className="db-share-msg" role="status">{msg}</p>}
                  <p className="db-share-invite">
                    {invite?.code
                      ? <>هر دوستی که با کد <b dir="ltr">{invite.code}</b> بیاد، روی اولین اشتراکش {faNum(REFERRAL_DISCOUNT_PERCENT)}٪ تخفیف می‌گیره.</>
                      : "دوستات رو بیار و استریک‌هاتون رو با هم مقایسه کنید!"}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
