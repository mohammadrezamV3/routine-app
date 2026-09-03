"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { SuperAdminGate } from "@/components/SuperAdminGate";
import { AuthGate } from "@/components/AuthGate";

const SUGGESTIONS = [
  "طراحی UI/UX",
  "گیتار",
  "زبان اسپانیایی",
  "مدیریت زمان",
  "عکاسی",
  "برنامه‌نویسی پایتون",
  "سرمایه‌گذاری در بورس",
  "نویسندگی خلاق",
];

const LOADING_STEPS = [
  "در حال تحلیل موضوع…",
  "در حال طراحی مراحل یادگیری…",
  "در حال جمع‌آوری نکات کلیدی و منابع…",
  "چند لحظه دیگه تمومه…",
];

const MAX_LEN = 120;

export default function NewRoadmapPage() {
  const { status } = useSession();
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // پیام لودینگ هر چند ثانیه عوض می‌شه تا انتظار (که واقعا چند ثانیه طول
  // می‌کشه چون یک فراخوانی واقعی به گیت‌وی AIـه) بی‌هدف به‌نظر نرسه.
  useEffect(() => {
    if (!loading) { setStepIdx(0); return; }
    const id = setInterval(() => {
      setStepIdx((i) => Math.min(i + 1, LOADING_STEPS.length - 1));
    }, 2200);
    return () => clearInterval(id);
  }, [loading]);

  if (status === "unauthenticated") {
    return (
      <section>
        <h1>رودمپ جدید</h1>
        <AuthGate message="برای استفاده از این سرویس وارد شوید" />
      </section>
    );
  }

  async function submit(chosenTopic?: string) {
    const t = (chosenTopic ?? topic).trim();
    if (!t || loading) return;
    setError(null);
    setLoading(true);
    setStepIdx(0);

    const res = await fetch("/api/roadmaps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic: t }),
    });
    const data = await res.json();

    if (!res.ok) {
      setLoading(false);
      setError(data.error || "خطایی پیش آمد — دوباره امتحان کن");
      return;
    }
    router.push(`/roadmaps/custom/${data.roadmap.id}`);
  }

  return (
    <section>
      <h1>رودمپ جدید</h1>
      <div className="section-note" style={{ marginTop: 10 }}>
        بگو می‌خوای چی یاد بگیری، یه مسیر یادگیری کامل باهات می‌سازیم
      </div>

      <SuperAdminGate>
      <div style={{ position: "relative", marginTop: 16 }}>
        <input
          ref={inputRef}
          type="text"
          className="wsearch-newform-name"
          placeholder="مثلا: طراحی UI/UX، زبان اسپانیایی، گیتار..."
          value={topic}
          maxLength={MAX_LEN}
          disabled={loading}
          onChange={(e) => setTopic(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
        />
        <div
          className="mono"
          style={{
            position: "absolute", left: 10, bottom: -18, fontSize: 10.5,
            color: topic.length >= MAX_LEN ? "#E05252" : "var(--muted2)",
          }}
        >
          {topic.length}/{MAX_LEN}
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 26 }}>
        {SUGGESTIONS.map((s) => (
          <span
            key={s}
            onClick={() => { if (!loading) { setTopic(s); submit(s); } }}
            className="day-pill"
            style={{ flex: "0 0 auto", opacity: loading ? 0.5 : 1, cursor: loading ? "default" : "pointer" }}
          >
            {s}
          </span>
        ))}
      </div>

      {error && (
        <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div className="field-error-msg" style={{ display: "block" }}>{error}</div>
          <button onClick={() => submit()} className="small">امتحان دوباره</button>
        </div>
      )}

      <button
        onClick={() => submit()}
        disabled={loading || !topic.trim()}
        style={{ marginTop: 20, borderColor: "var(--accent)", color: "var(--accent)", minWidth: 160 }}
      >
        {loading ? "در حال ساخت…" : "بساز"}
      </button>

      {loading && (
        <div className="glass-box" style={{ marginTop: 16, padding: "14px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                width: 16, height: 16, borderRadius: "50%",
                border: "2px solid var(--line)", borderTopColor: "var(--accent)",
                animation: "wnsSpin .8s linear infinite", display: "inline-block",
              }}
            />
            <span className="item-line" style={{ padding: 0 }}>{LOADING_STEPS[stepIdx]}</span>
          </div>
          <div className="mono" style={{ fontSize: 10.5, color: "var(--muted2)", marginTop: 8 }}>
            معمولاً ۱۰ تا ۲۰ ثانیه طول می‌کشه — گاهی (اگه بارِ اول جواب درست نگیره و دوباره تلاش کنه) تا یک دقیقه
          </div>
        </div>
      )}
      </SuperAdminGate>
    </section>
  );
}
