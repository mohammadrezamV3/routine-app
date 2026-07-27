"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

type CustomRoadmapSummary = { id: string; topic: string; title: string; note: string };

export default function RoadmapsHub() {
  const router = useRouter();
  const { status } = useSession();
  const [customRoadmaps, setCustomRoadmaps] = useState<CustomRoadmapSummary[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") { setLoaded(true); return; }
    fetch("/api/roadmaps")
      .then((r) => r.json())
      .then((res) => setCustomRoadmaps(res.roadmaps || []))
      .finally(() => setLoaded(true));
  }, [status]);

  return (
    <section>
      <h1>رودمپ‌ها</h1>
      <div className="section-note">بگو چی می‌خوای یاد بگیری، یه مسیر کامل باهات می‌سازیم</div>

      <div className="rm-grid">
        {customRoadmaps.map((r) => (
          <div key={r.id} className="rm-box" onClick={() => router.push(`/roadmaps/custom/${r.id}`)} style={{ cursor: "pointer" }}>
            <div>
              <div className="rm-box-title">{r.title}</div>
              <div className="rm-box-desc">{r.note}</div>
            </div>
          </div>
        ))}

        {loaded && !customRoadmaps.length && status === "authenticated" && (
          <div className="item-line empty">هنوز رودمپی نساختی</div>
        )}

        <div className="rm-box rm-box-add" onClick={() => router.push("/roadmaps/new")} style={{ cursor: "pointer" }}>
          <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
            <path d="M12 5v14M5 12h14" stroke="var(--accent)" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
        </div>
      </div>
    </section>
  );
}
