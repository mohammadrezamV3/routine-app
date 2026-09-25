import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { WifiOff } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { useNetworkStatus } from "@/lib/useNetworkStatus";
import { tapHaptic } from "@/lib/haptics";
import { useRoadmapApi } from "../api";
import { seedRoadmap } from "../repo";
import { describeRoadmapError, isModuleLocked } from "../errors";
import LockedModuleState from "../components/LockedModuleState";
import { roadmapRoutePaths } from "../routes";

const MAX_TOPIC = 120;
const MAX_GOAL = 300;

const BUILD_LINES = [
  "دارم هدفت رو تحلیل می‌کنم…",
  "دارم تصمیم می‌گیرم چیا باید بخونی…",
  "دارم ترتیبِ درستِ یادگیری رو می‌چینم…",
  "دارم ابزارها و منابع رو انتخاب می‌کنم…",
  "دارم متنِ کاملِ مسیر رو می‌نویسم…",
  "دارم مسیر رو به مرحله‌ها می‌شکنم…",
];

type Status = "idle" | "building" | "error";

export default function RoadmapNew() {
  const navigate = useNavigate();
  const api = useRoadmapApi();
  const online = useNetworkStatus();
  const [topic, setTopic] = useState("");
  const [goal, setGoal] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [buildLine, setBuildLine] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const busy = status === "building";

  useEffect(() => {
    if (!busy) inputRef.current?.focus();
  }, [busy]);

  useEffect(() => {
    if (status !== "building") return;
    setBuildLine(0);
    const t = setInterval(() => setBuildLine((i) => (i + 1) % BUILD_LINES.length), 4200);
    return () => clearInterval(t);
  }, [status]);

  async function build() {
    if (busy) return;
    if (!topic.trim()) {
      setError("بگو چی می‌خوای یاد بگیری");
      return;
    }
    setError(null);
    setStatus("building");
    void tapHaptic();

    try {
      const res = await api.createAi({ topic: topic.trim(), goal: goal.trim() || undefined });
      await seedRoadmap(res.roadmap);
      setStatus("idle");
      navigate(roadmapRoutePaths.detail(res.roadmap.id), { replace: true });
    } catch (err) {
      setStatus("error");
      if (isModuleLocked(err)) setLocked(true);
      else setError(describeRoadmapError(err));
    }
  }

  if (locked) {
    return (
      <div>
        <AppHeader title="رودمپ جدید" showBack />
        <LockedModuleState />
      </div>
    );
  }

  return (
    <div>
      <AppHeader title="رودمپ جدید" showBack />

      <main className="px-4 pt-4 pb-6">
        {!online && (
          <div
            className="mb-4 flex items-center gap-2 rounded-card border px-3 py-2.5 font-vazir text-[13px]"
            style={{ borderColor: "var(--surface-line)", color: "var(--muted)" }}
          >
            <WifiOff size={16} />
            نیاز به اینترنت — برای ساختِ مسیر با هوش مصنوعی باید آنلاین باشی
          </div>
        )}

        {busy ? (
          <div className="flex flex-col items-center justify-center gap-3" style={{ minHeight: "50vh" }}>
            <span
              className="block animate-spin rounded-full"
              style={{ width: 32, height: 32, border: "3px solid var(--surface-line)", borderTopColor: "var(--accent)" }}
            />
            <div className="font-vazir text-[14px] font-semibold" style={{ color: "var(--text)" }}>
              در حال ساختنِ مسیرت…
            </div>
            <div className="font-vazir text-[12.5px]" style={{ color: "var(--muted)" }}>
              {BUILD_LINES[buildLine]}
            </div>
            <div className="font-vazir text-[11.5px]" style={{ color: "var(--muted)" }}>
              ممکنه تا یک دقیقه طول بکشه — صفحه رو نبند.
            </div>
          </div>
        ) : (
          <>
            <label className="block font-vazir text-[13px] font-semibold" style={{ color: "var(--text)" }}>
              چی می‌خوای یاد بگیری؟
            </label>
            <input
              ref={inputRef}
              type="text"
              dir="rtl"
              placeholder="مثلاً امنیت شبکه، ادیت ویدیو، گیتار"
              value={topic}
              maxLength={MAX_TOPIC}
              onChange={(e) => {
                setTopic(e.target.value);
                setError(null);
              }}
              disabled={!online}
              className="mt-2 w-full rounded-card border px-3.5 py-3 font-vazir text-[14px]"
              style={{ borderColor: "var(--surface-line)", background: "var(--surface-1)", color: "var(--text)" }}
            />
            <p className="mt-2 font-vazir text-[12px] leading-6" style={{ color: "var(--muted)" }}>
              لازم نیست بدونی از کجا باید شروع کنی — فقط بگو آخرش می‌خوای به چی برسی.
              خودم تشخیص می‌دم چیا باید بخونی و با چه ترتیبی.
            </p>

            <label className="mt-5 block font-vazir text-[13px] font-semibold" style={{ color: "var(--text)" }}>
              هدفت چیه؟ (اختیاری)
            </label>
            <input
              type="text"
              dir="rtl"
              placeholder="مثلاً استخدام، ارتقا شغلی، پروژه‌ی شخصی"
              value={goal}
              maxLength={MAX_GOAL}
              onChange={(e) => setGoal(e.target.value)}
              disabled={!online}
              className="mt-2 w-full rounded-card border px-3.5 py-3 font-vazir text-[14px]"
              style={{ borderColor: "var(--surface-line)", background: "var(--surface-1)", color: "var(--text)" }}
            />

            {error && (
              <p className="mt-3 font-vazir text-[12.5px]" style={{ color: "var(--pnl-loss)" }}>
                {error}
              </p>
            )}

            <button
              onClick={build}
              disabled={!online || !topic.trim()}
              className="mt-6 w-full rounded-full py-3 font-vazir text-[14.5px] font-semibold transition-opacity"
              style={{
                background: "var(--accent)",
                color: "white",
                opacity: !online || !topic.trim() ? 0.5 : 1,
              }}
            >
              {online ? "بساز" : "نیاز به اینترنت"}
            </button>
          </>
        )}
      </main>
    </div>
  );
}
