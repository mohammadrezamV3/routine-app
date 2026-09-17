"use client";

import { useCallback, useMemo, useState } from "react";
import { History, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import { faNum } from "@/lib/jalali";
import {
  NodeProgress, NodeStatus, ProgressSummary, RoadmapGraph, RoadmapNode, computeProgress,
} from "@/lib/roadmapGraph";
import { RoadmapGraphCanvas } from "./RoadmapGraphCanvas";
import { RoadmapNodeDrawer } from "./RoadmapNodeDrawer";

type VersionInfo = { version: number; savedAt: string; reason: string };

/**
 * نمایِ گراف‌محورِ یک رودمپ: نقشه، کشوی نود، ویرایش با AI، بازسازی و نسخه‌ها.
 *
 * درصدِ پیشرفت همیشه دو جا حساب می‌شود و این عمدی‌ست: سمتِ سرور (منبعِ
 * حقیقت، همان چیزی که ذخیره می‌شود) و همین‌جا سمتِ کلاینت — فقط برای اینکه
 * لحظه‌ی تیک‌زدن عدد *در جا* عوض شود و منتظرِ رفت‌وبرگشتِ شبکه نماند. جوابِ
 * سرور که رسید، جایگزینِ همان می‌شود.
 */
export function RoadmapGraphView({
  id, topic, graph, initialProgress, initialSummary, initialVersion, initialVersions, onDelete,
}: {
  id: string;
  topic: string;
  graph: RoadmapGraph;
  initialProgress: NodeProgress;
  initialSummary: ProgressSummary | null;
  initialVersion: number;
  initialVersions: VersionInfo[];
  onDelete: () => void;
}) {
  const [current, setCurrent] = useState(graph);
  const [progress, setProgress] = useState<NodeProgress>(initialProgress);
  const [summary, setSummary] = useState<ProgressSummary>(
    initialSummary ?? computeProgress(graph, initialProgress)
  );
  const [version, setVersion] = useState(initialVersion);
  const [versions, setVersions] = useState<VersionInfo[]>(initialVersions);

  const [selected, setSelected] = useState<RoadmapNode | null>(null);
  const [savingNode, setSavingNode] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [busy, setBusy] = useState<null | "edit" | "regen" | "restore">(null);
  const [error, setError] = useState<string | null>(null);
  const [showVersions, setShowVersions] = useState(false);

  const nodeTitleById = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of current.stages) for (const n of s.nodes) m.set(n.id, n.title);
    return m;
  }, [current]);

  /** تیک‌زدنِ یک نود — بلافاصله در UI، بعد تاییدِ سرور. */
  const setStatus = useCallback(async (nodeId: string, status: NodeStatus) => {
    const optimistic: NodeProgress = { ...progress };
    if (status === "not_started") delete optimistic[nodeId];
    else optimistic[nodeId] = status;

    setProgress(optimistic);
    setSummary(computeProgress(current, optimistic));
    setSavingNode(true);

    try {
      const res = await fetch(`/api/roadmaps/${id}/progress`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodeId, status }),
      });
      const data = await res.json();
      if (res.ok) {
        // سرور منبعِ حقیقت است — اگر چیزی را کنار گذاشته باشد، همان می‌ماند
        setProgress(data.nodeProgress || {});
        setSummary(data.progress);
      }
    } catch {
      // شبکه نبود؛ حالتِ خوش‌بینانه می‌ماند و تیکِ بعدی دوباره تلاش می‌کند
    } finally {
      setSavingNode(false);
    }
  }, [id, progress, current]);

  async function runEdit() {
    const text = instruction.trim();
    if (!text || busy) return;
    setBusy("edit");
    setError(null);
    try {
      const res = await fetch(`/api/roadmaps/${id}/edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction: text }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data?.error || "ویرایش انجام نشد"); return; }
      applyNewVersion(data, text);
      setInstruction("");
    } catch {
      setError("ارتباط با سرور برقرار نشد");
    } finally {
      setBusy(null);
    }
  }

  async function regenerate() {
    if (busy) return;
    setBusy("regen");
    setError(null);
    try {
      const res = await fetch(`/api/roadmaps/${id}/regenerate`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setError(data?.error || "بازسازی انجام نشد"); return; }
      applyNewVersion(data, "بازسازیِ کامل");
    } catch {
      setError("ارتباط با سرور برقرار نشد");
    } finally {
      setBusy(null);
    }
  }

  async function restore(v: number) {
    if (busy) return;
    setBusy("restore");
    setError(null);
    try {
      const res = await fetch(`/api/roadmaps/${id}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version: v }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data?.error || "برگرداندن انجام نشد"); return; }
      applyNewVersion(data, `بازگشت به نسخه‌ی ${v}`);
      setShowVersions(false);
    } catch {
      setError("ارتباط با سرور برقرار نشد");
    } finally {
      setBusy(null);
    }
  }

  function applyNewVersion(data: any, reason: string) {
    if (!data?.graph) return;
    // نسخه‌ی قبلی به فهرستِ نسخه‌ها اضافه می‌شود — دقیقاً همان کاری که سرور
    // در history کرد، تا بدونِ یک fetchِ اضافه هم‌خوان بمانند.
    setVersions((prev) => [...prev, { version, savedAt: new Date().toISOString(), reason }].slice(-5));
    setCurrent(data.graph);
    setProgress(data.nodeProgress || {});
    setSummary(data.progress || computeProgress(data.graph, data.nodeProgress || {}));
    setVersion(data.version ?? version + 1);
    setSelected(null);
  }

  const nodeCount = summary.total;

  return (
    <>
      <div className="rm-hero">
        <div className="rm-hero-top">
          <h1>{current.title}</h1>
          <button type="button" className="trade-icon-btn danger" aria-label="حذف مسیر" onClick={onDelete}>
            <Trash2 size={16} />
          </button>
        </div>
        {current.description && <p className="rm-hero-note">{current.description}</p>}

        <div className="rm-meta">
          {current.level && <span className="rm-chip">{current.level}</span>}
          {current.estimatedWeeks > 0 && <span className="rm-chip">{faNum(current.estimatedWeeks)} هفته</span>}
          {summary.hoursTotal > 0 && <span className="rm-chip">{faNum(summary.hoursTotal)} ساعت</span>}
          <span className="rm-chip">{faNum(nodeCount)} مبحث</span>
          <span className="rm-chip">نسخه‌ی {faNum(version)}</span>
        </div>

        <div className="rm-progress">
          <div className="rm-progress-bar"><span style={{ width: `${summary.pct}%` }} /></div>
          <div className="rm-progress-text">
            {faNum(summary.completed)} از {faNum(summary.total)} مبحث — {faNum(summary.pct)}٪
            {summary.inProgress > 0 && ` · ${faNum(summary.inProgress)} در حال انجام`}
            {summary.hoursTotal > 0 && ` · ${faNum(summary.hoursDone)} از ${faNum(summary.hoursTotal)} ساعت`}
          </div>
        </div>
      </div>

      <RoadmapGraphCanvas
        graph={current}
        progress={progress}
        selectedId={selected?.id ?? null}
        onSelect={setSelected}
      />

      {/* ویرایش با AI */}
      <div className="rmg-edit">
        <div className="rm-section-title"><Sparkles size={15} /> با هوش مصنوعی تغییرش بده</div>
        <div className="rmg-edit-row">
          <input
            type="text"
            className="wsearch-newform-name"
            placeholder="مثلاً: پایتون رو بلدم، حذفش کن"
            value={instruction}
            maxLength={400}
            onChange={(e) => { setInstruction(e.target.value); setError(null); }}
            onKeyDown={(e) => { if (e.key === "Enter") runEdit(); }}
            disabled={!!busy}
          />
          <button type="button" className="wsearch-submit-btn rmg-edit-btn" onClick={runEdit} disabled={!!busy || !instruction.trim()}>
            {busy === "edit" ? <span className="wsearch-submit-spinner" /> : "اعمال کن"}
          </button>
        </div>
        <div className="rmg-edit-hints">
          {["فقط ۵ ساعت در هفته وقت دارم", "به هر مبحثِ امنیتی تمرینِ عملی اضافه کن", "مباحثِ پیشرفته رو حذف کن"].map((h) => (
            <button key={h} type="button" className="rm-wiz-chip" onClick={() => setInstruction(h)} disabled={!!busy}>
              {h}
            </button>
          ))}
        </div>

        <div className="rmg-edit-actions">
          <button type="button" className="account-outline-btn" onClick={regenerate} disabled={!!busy}>
            {busy === "regen" ? <span className="wsearch-submit-spinner" /> : <RefreshCw size={14} />}
            بازسازیِ کامل
          </button>
          {!!versions.length && (
            <button type="button" className="account-outline-btn" onClick={() => setShowVersions((v) => !v)} disabled={!!busy}>
              <History size={14} /> نسخه‌های قبلی ({faNum(versions.length)})
            </button>
          )}
        </div>

        {error && <div className="form-inline-error">{error}</div>}

        {showVersions && (
          <div className="rmg-version-list">
            {versions.slice().reverse().map((v) => (
              <div key={v.version} className="rmg-version">
                <div className="rmg-version-body">
                  <b>نسخه‌ی {faNum(v.version)}</b>
                  <span>{v.reason}</span>
                </div>
                <button type="button" className="account-outline-btn" onClick={() => restore(v.version)} disabled={!!busy}>
                  برگردان
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <RoadmapNodeDrawer
          node={selected}
          topic={topic}
          progress={progress}
          nodeTitleById={nodeTitleById}
          busy={savingNode}
          onClose={() => setSelected(null)}
          onStatus={(s) => setStatus(selected.id, s)}
        />
      )}
    </>
  );
}
