"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { faNum } from "@/lib/jalali";
import { getSetting, setSetting } from "@/lib/storage";

// لینک‌کردنِ منابع/کارهای رودمپ به یه جست‌وجوی واقعی — نه یه URL ساختگی
// (که معلوم نیست واقعاً درست باشه)، بلکه یه جست‌وجوی گوگل برای همون عنوان،
// همراه با موضوعِ رودمپ برای دقیق‌تر بودنِ نتیجه؛ این یعنی هر آیتم واقعاً
// «قابلِ‌اجرا»ست، نه فقط یه متنِ ایستا.
function searchUrl(query: string, topic: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(`${query} ${topic}`)}`;
}

type Roadmap = {
  id: string;
  title: string;
  topic: string;
  note: string;
  stations: { t: string; items: string[] }[];
  tips: string[];
  proTips: string[];
  books: string[];
};

const TM_BACK_SVG = (
  <svg viewBox="0 0 24 24" fill="none">
    <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function CustomRoadmapDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<Roadmap | null | undefined>(undefined);
  const [done, setDone] = useState<Record<number, boolean>>({});
  const [squashIdx, setSquashIdx] = useState<number | null>(null);

  const settingKey = `roadmapDone:custom-${params.id}`;

  useEffect(() => {
    fetch(`/api/roadmaps/${params.id}`).then((r) => r.json()).then((res) => setData(res.roadmap || null));
    getSetting<Record<number, boolean>>(settingKey, {}).then(setDone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  function toggle(idx: number) {
    const next = { ...done, [idx]: !done[idx] };
    setDone(next);
    setSetting(settingKey, next);
    setSquashIdx(idx);
    setTimeout(() => setSquashIdx(null), 450);
  }

  async function removeRoadmap() {
    await fetch(`/api/roadmaps/${params.id}`, { method: "DELETE" });
    router.push("/roadmaps");
  }

  if (data === undefined) {
    return (
      <section style={{ borderTop: "none" }}>
        <div className="tm-head-row">
          <button className="tm-back-btn" onClick={() => router.push("/roadmaps")}>{TM_BACK_SVG}</button>
          <h1>در حال بارگذاری…</h1>
        </div>
      </section>
    );
  }

  if (!data) {
    return (
      <section style={{ borderTop: "none" }}>
        <div className="tm-head-row">
          <button className="tm-back-btn" onClick={() => router.push("/roadmaps")}>{TM_BACK_SVG}</button>
          <h1>رودمپ پیدا نشد</h1>
        </div>
      </section>
    );
  }

  const stations = data.stations || [];
  const doneCount = stations.reduce((s, _st, i) => s + (done[i] ? 1 : 0), 0);
  const pct = stations.length ? Math.round((doneCount / stations.length) * 100) : 0;
  const railPct = stations.length > 1 ? (doneCount / (stations.length - 1)) * 100 : doneCount ? 100 : 0;

  return (
    <section style={{ borderTop: "none" }}>
      <div className="tm-head-row" style={{ justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button className="tm-back-btn" onClick={() => router.push("/roadmaps")}>{TM_BACK_SVG}</button>
          <h1>{data.title}</h1>
        </div>
        <button onClick={removeRoadmap} style={{ borderColor: "#E05252", color: "#E05252" }}>حذف</button>
      </div>
      <div className="section-note">{data.note}</div>

      {!!stations.length && (
        <div className="tm-progress-summary">
          <div className="mono">
            {faNum(doneCount)}<span className="mx-1">/</span>{faNum(stations.length)}<span> ایستگاه تکمیل‌شده</span>
          </div>
          <div className="mono" style={{ color: "var(--muted)", fontSize: 12 }}>{faNum(pct)}٪</div>
        </div>
      )}
      {!!stations.length && (
        <div className="tm-progress-bar"><div className="tm-progress-bar-fill" style={{ width: `${pct}%` }} /></div>
      )}

      <div className="treasure-map">
        {!!stations.length && (
          <div className="tm-rail"><div className="tm-rail-fill" style={{ height: `${railPct}%` }} /></div>
        )}
        {stations.map((s, i) => {
          const isDone = !!done[i];
          return (
            <div key={i} className={`tm-station clickable ${isDone ? "past" : ""}`}>
              <div className={`tm-marker mono${squashIdx === i ? " squash" : ""}`} onClick={() => toggle(i)}>
                <span className="tmm-num">{faNum(i + 1)}</span>
                <svg className="tmm-check" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12.5l4.5 4.5L19 7.5" stroke="var(--bg)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="tm-title">{s.t}</div>
              {!!s.items?.length && (
                <ul className="tm-item-list">
                  {s.items.map((it, ii) => (
                    <li key={ii}>
                      <a href={searchUrl(it, data.topic)} target="_blank" rel="noopener noreferrer">
                        {it}
                        <ExternalLink size={11} />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      <div className="tm-extra">
        <div className="domain-sub">نکات کلیدی</div>
        <ul>{(data.tips || []).map((t, i) => <li key={i}>{t}</li>)}</ul>
      </div>
      {!!data.proTips?.length && (
        <div className="tm-extra">
          <div className="domain-sub">مسیر حرفه‌ای‌شدن</div>
          <ul>{data.proTips.map((t, i) => <li key={i}>{t}</li>)}</ul>
        </div>
      )}
      {!!data.books?.length && (
        <div className="tm-extra">
          <div className="domain-sub">منابع پیشنهادی</div>
          <ul>
            {data.books.map((t, i) => (
              <li key={i}>
                <a href={searchUrl(t, data.topic)} target="_blank" rel="noopener noreferrer">
                  {t}
                  <ExternalLink size={11} />
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
