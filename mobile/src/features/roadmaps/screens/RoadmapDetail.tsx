import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { Clock, Flag, Target, Wrench } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import SegmentedTabs from "@/components/SegmentedTabs";
import { getRoadmap, toggleStep } from "../repo";
import { parseGuide } from "../guide";
import StageTimeline from "../components/StageTimeline";

function faDigits(n: number): string {
  return String(n).replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}

type Tab = "guide" | "stages";

export default function RoadmapDetail() {
  const params = useParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>("guide");

  const roadmap = useLiveQuery(() => (params.id ? getRoadmap(params.id) : undefined), [params.id]);

  const guideBlocks = useMemo(() => parseGuide(roadmap?.plan.guide ?? ""), [roadmap?.plan.guide]);

  function handleToggle(stageN: number) {
    if (!params.id) return;
    void toggleStep(params.id, stageN);
  }

  if (roadmap === undefined) {
    return (
      <div>
        <AppHeader title="در حال بارگذاری…" showBack />
      </div>
    );
  }

  if (roadmap === null) {
    return (
      <div>
        <AppHeader title="رودمپ" showBack />
        <main className="flex items-center justify-center" style={{ minHeight: "50vh" }}>
          <p className="font-vazir text-[13.5px]" style={{ color: "var(--muted)" }}>
            این مسیر پیدا نشد
          </p>
        </main>
      </div>
    );
  }

  const { plan } = roadmap;

  return (
    <div>
      <AppHeader title={plan.title} showBack />

      <main className="px-4 pt-3 pb-6">
        {plan.summary && (
          <p className="font-vazir text-[13.5px]" style={{ color: "var(--muted)" }}>
            {plan.summary}
          </p>
        )}

        {roadmap.goal && (
          <div className="mt-2 flex items-start gap-1.5 font-vazir text-[13px]" style={{ color: "var(--text)" }}>
            <Target size={13} className="mt-0.5 shrink-0" color="var(--accent)" />
            <span>
              <b>هدفت:</b> {roadmap.goal}
            </span>
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-1.5">
          <span
            className="flex items-center gap-1 rounded-full px-2.5 py-1 font-vazir text-[11.5px]"
            style={{ background: "var(--surface-2)", color: "var(--muted)" }}
          >
            <Flag size={11} />
            {roadmap.topic}
          </span>
          {plan.totalDuration && (
            <span
              className="flex items-center gap-1 rounded-full px-2.5 py-1 font-vazir text-[11.5px]"
              style={{ background: "var(--surface-2)", color: "var(--muted)" }}
            >
              <Clock size={11} />
              {plan.totalDuration}
            </span>
          )}
          <span
            className="rounded-full px-2.5 py-1 font-vazir text-[11.5px]"
            style={{ background: "var(--surface-2)", color: "var(--muted)" }}
          >
            {faDigits(plan.stages.length)} مرحله
          </span>
        </div>

        <div className="mt-3">
          <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: "var(--surface-2)" }}>
            <span
              className="block h-full rounded-full transition-all"
              style={{ width: `${roadmap.pct}%`, background: "var(--accent)" }}
            />
          </div>
          <div className="mt-1.5 font-vazir text-[12px]" style={{ color: "var(--muted)" }}>
            {faDigits(roadmap.done)} از {faDigits(roadmap.total)} مرحله — {faDigits(roadmap.pct)}٪
          </div>
        </div>

        <div className="mt-4">
          <SegmentedTabs
            active={tab}
            onChange={setTab}
            options={[
              { value: "guide", label: "راهنمای مسیر" },
              { value: "stages", label: `مرحله‌ها (${faDigits(plan.stages.length)})` },
            ]}
          />
        </div>

        {tab === "guide" ? (
          <div className="mt-4">
            {!!plan.tools.length && (
              <div className="mb-4">
                <div
                  className="mb-2 flex items-center gap-1.5 font-vazir text-[12.5px] font-semibold"
                  style={{ color: "var(--text)" }}
                >
                  <Wrench size={14} />
                  ابزارهای این مسیر
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {plan.tools.map((t, i) => (
                    <span
                      key={i}
                      className="rounded-full px-2.5 py-1 font-vazir text-[11.5px]"
                      style={{ background: "var(--surface-2)", color: "var(--muted)" }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {guideBlocks.map((b, i) =>
              b.kind === "h" ? (
                <h2 key={i} className="mt-4 font-vazir text-[15px] font-semibold" style={{ color: "var(--text)" }}>
                  {b.text}
                </h2>
              ) : b.kind === "li" ? (
                <div key={i} className="mt-1 font-vazir text-[13.5px]" style={{ color: "var(--text)" }}>
                  {"• "}
                  {b.text}
                </div>
              ) : (
                <p key={i} className="mt-2 font-vazir text-[13.5px] leading-7" style={{ color: "var(--text)" }}>
                  {b.text}
                </p>
              ),
            )}
            {!guideBlocks.length && (
              <p className="mt-2 font-vazir text-[13.5px]" style={{ color: "var(--muted)" }}>
                متنِ این مسیر ذخیره نشده — دوباره بسازش.
              </p>
            )}
          </div>
        ) : (
          <div className="mt-4">
            <StageTimeline stages={plan.stages} stepProgress={roadmap.stepProgress} onToggle={handleToggle} />
          </div>
        )}

        <p className="mt-2 font-vazir text-[11.5px] text-center" style={{ color: "var(--pnl-loss)" }} role="note">
          هوش مصنوعی ممکنه اشتباه کنه — خودت هم تحقیق کن.
        </p>
      </main>
    </div>
  );
}
