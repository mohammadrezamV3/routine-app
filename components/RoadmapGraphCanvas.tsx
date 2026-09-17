"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Lock, Maximize2, Minus, Plus } from "lucide-react";
import { faNum } from "@/lib/jalali";
import {
  NodeProgress, RoadmapGraph, RoadmapNode, isNodeUnlocked, topologicalLayers,
} from "@/lib/roadmapGraph";

/**
 * کانواسِ گرافِ رودمپ.
 *
 * چرا کتابخانه‌ی گراف اضافه نشد: این پروژه هیچ وابستگیِ گرافی ندارد و
 * افزودنِ یکی (React Flow و امثالش) چند صد کیلوبایت به باندل و یک زبانِ
 * بصریِ غریبه به اپ اضافه می‌کرد. چیزی که این‌جا لازم است — چیدمانِ لایه‌ای،
 * یال‌های بزیه، pan/zoom — با همان SVG و CSSِ خودِ اپ در همین یک فایل جا
 * می‌شود.
 *
 * چیدمان: هر مرحله یک نوارِ افقی‌ست (بالا به پایین = ترتیبِ یادگیری)، و
 * داخلِ هر مرحله نودها بر اساسِ ترتیبِ توپولوژیکِ همان مرحله ردیف‌بندی
 * می‌شوند — یعنی پیش‌نیاز همیشه بالای چیزی‌ست که به آن وابسته است.
 *
 * جهت: اپ راست‌به‌چپ است، پس ردیف‌ها آینه می‌شوند تا نودِ اول سمتِ راست
 * بیفتد؛ محورِ اصلی (بالا→پایین) دست‌نخورده می‌ماند.
 */

const NODE_W = 152;
const NODE_H = 78;
const GAP_X = 18;
const GAP_Y = 26;
const STAGE_PAD_X = 16;
const STAGE_PAD_TOP = 38;
const STAGE_PAD_BOTTOM = 16;
const STAGE_GAP = 22;
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 1.8;

type Placed = { node: RoadmapNode; x: number; y: number; stageId: string };
type StageBox = { id: string; title: string; order: number; x: number; y: number; w: number; h: number };

type Layout = { placed: Placed[]; stages: StageBox[]; width: number; height: number };

function layoutGraph(graph: RoadmapGraph): Layout {
  const placed: Placed[] = [];
  const stages: StageBox[] = [];

  // پهنای جهان از عریض‌ترین ردیفِ همه‌ی مرحله‌ها می‌آید — تا هیچ مرحله‌ای
  // از قابِ مشترک بیرون نزند.
  const stageRows: { stage: RoadmapGraph["stages"][number]; rows: RoadmapNode[][] }[] = [];
  let maxRowWidth = NODE_W;

  for (const stage of graph.stages) {
    const ids = stage.nodes.map((n) => n.id);
    const inner = graph.connections.filter((c) => ids.includes(c.from) && ids.includes(c.to));
    // لایه‌بندیِ داخلِ همین مرحله؛ اگر به هر دلیل حلقه‌ای ماند (نباید بماند،
    // validateGraph جلویش را می‌گیرد) همه در یک ردیف می‌افتند.
    const layers = topologicalLayers(ids, inner) ?? [ids];
    const rows = layers.map((layer) => layer.map((id) => stage.nodes.find((n) => n.id === id)!).filter(Boolean));
    stageRows.push({ stage, rows });
    for (const row of rows) {
      maxRowWidth = Math.max(maxRowWidth, row.length * NODE_W + (row.length - 1) * GAP_X);
    }
  }

  const width = maxRowWidth + STAGE_PAD_X * 2;
  let y = 0;

  for (const { stage, rows } of stageRows) {
    const bodyH = rows.length * NODE_H + (rows.length - 1) * GAP_Y;
    const stageH = STAGE_PAD_TOP + bodyH + STAGE_PAD_BOTTOM;
    stages.push({ id: stage.id, title: stage.title, order: stage.order, x: 0, y, w: width, h: stageH });

    let rowY = y + STAGE_PAD_TOP;
    for (const row of rows) {
      const rowW = row.length * NODE_W + (row.length - 1) * GAP_X;
      const startX = (width - rowW) / 2;
      row.forEach((node, i) => {
        const rawX = startX + i * (NODE_W + GAP_X);
        // آینه‌کردن برای راست‌به‌چپ: نودِ اولِ ردیف سمتِ راست
        const x = width - rawX - NODE_W;
        placed.push({ node, x, y: rowY, stageId: stage.id });
      });
      rowY += NODE_H + GAP_Y;
    }

    y += stageH + STAGE_GAP;
  }

  return { placed, stages, width, height: Math.max(y - STAGE_GAP, NODE_H) };
}

export function RoadmapGraphCanvas({
  graph,
  progress,
  selectedId,
  onSelect,
}: {
  graph: RoadmapGraph;
  progress: NodeProgress;
  selectedId: string | null;
  onSelect: (node: RoadmapNode) => void;
}) {
  const layout = useMemo(() => layoutGraph(graph), [graph]);
  const posById = useMemo(() => {
    const m = new Map<string, Placed>();
    for (const p of layout.placed) m.set(p.node.id, p);
    return m;
  }, [layout]);

  const wrapRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ x: 0, y: 0, z: 1 });
  const [dragging, setDragging] = useState(false);

  // اشاره‌گرهای فعال — برای اینکه هم درگِ تک‌انگشتی کار کند هم پینچِ دوانگشتی
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchStart = useRef<{ dist: number; z: number } | null>(null);
  const panStart = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);

  /** قابِ اولیه: کلِ گراف را وسطِ کانواس جا می‌دهد. */
  const fit = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const w = el.clientWidth || 1;
    const h = el.clientHeight || 1;
    const z = Math.min(1, Math.max(MIN_ZOOM, Math.min(w / (layout.width + 40), h / (layout.height + 40))));
    setView({ x: (w - layout.width * z) / 2, y: 16, z });
  }, [layout.width, layout.height]);

  useEffect(() => { fit(); }, [fit]);

  function onPointerDown(e: React.PointerEvent) {
    // فقط درگ روی خودِ زمینه پن می‌کند؛ کلیک روی نود کارِ خودش را دارد
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 1) {
      panStart.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
      setDragging(true);
    } else if (pointers.current.size === 2) {
      const [a, b] = Array.from(pointers.current.values());
      pinchStart.current = { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, z: view.z };
      panStart.current = null;
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size >= 2 && pinchStart.current) {
      const [a, b] = Array.from(pointers.current.values());
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const z = clamp(pinchStart.current.z * (dist / pinchStart.current.dist), MIN_ZOOM, MAX_ZOOM);
      setView((v) => ({ ...v, z }));
      return;
    }

    if (panStart.current) {
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      setView((v) => ({ ...v, x: panStart.current!.vx + dx, y: panStart.current!.vy + dy }));
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchStart.current = null;
    if (pointers.current.size === 0) {
      panStart.current = null;
      setDragging(false);
    }
  }

  function onWheel(e: React.WheelEvent) {
    // زوم حولِ همان نقطه‌ای که ماوس رویش است، نه گوشه‌ی کانواس
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    setView((v) => {
      const z = clamp(v.z * (e.deltaY < 0 ? 1.1 : 1 / 1.1), MIN_ZOOM, MAX_ZOOM);
      const k = z / v.z;
      return { z, x: px - (px - v.x) * k, y: py - (py - v.y) * k };
    });
  }

  function zoomBy(factor: number) {
    const el = wrapRef.current;
    const px = (el?.clientWidth ?? 0) / 2;
    const py = (el?.clientHeight ?? 0) / 2;
    setView((v) => {
      const z = clamp(v.z * factor, MIN_ZOOM, MAX_ZOOM);
      const k = z / v.z;
      return { z, x: px - (px - v.x) * k, y: py - (py - v.y) * k };
    });
  }

  return (
    <div className="rmg-wrap">
      <div
        ref={wrapRef}
        className={`rmg-canvas${dragging ? " dragging" : ""}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      >
        <div
          className="rmg-world"
          style={{
            width: layout.width,
            height: layout.height,
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.z})`,
          }}
        >
          {/* نوارِ هر مرحله، پشتِ نودها */}
          {layout.stages.map((s) => (
            <div key={s.id} className="rmg-stage" style={{ left: s.x, top: s.y, width: s.w, height: s.h }}>
              <span className="rmg-stage-label">
                <b>{faNum(s.order)}</b> {s.title}
              </span>
            </div>
          ))}

          {/* یال‌ها */}
          <svg className="rmg-edges" width={layout.width} height={layout.height} aria-hidden="true">
            {graph.connections.map((c, i) => {
              const from = posById.get(c.from);
              const to = posById.get(c.to);
              if (!from || !to) return null;
              const x1 = from.x + NODE_W / 2;
              const y1 = from.y + NODE_H;
              const x2 = to.x + NODE_W / 2;
              const y2 = to.y;
              const dy = Math.max(24, (y2 - y1) / 2);
              const done = progress[c.from] === "completed";
              return (
                <path
                  key={i}
                  className={`rmg-edge${done ? " done" : ""}`}
                  d={`M ${x1} ${y1} C ${x1} ${y1 + dy}, ${x2} ${y2 - dy}, ${x2} ${y2}`}
                />
              );
            })}
          </svg>

          {/* نودها */}
          {layout.placed.map(({ node, x, y }) => {
            const status = progress[node.id] || "not_started";
            const unlocked = isNodeUnlocked(node, progress);
            return (
              <button
                key={node.id}
                type="button"
                className={`rmg-node ${status}${selectedId === node.id ? " selected" : ""}${unlocked ? "" : " locked"}`}
                style={{ left: x, top: y, width: NODE_W, height: NODE_H }}
                onClick={() => onSelect(node)}
              >
                <span className="rmg-node-title">{node.title}</span>
                <span className="rmg-node-meta">
                  {status === "completed" ? <Check size={11} /> : !unlocked ? <Lock size={10} /> : null}
                  {node.estimatedHours > 0 && <span>{faNum(node.estimatedHours)} ساعت</span>}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rmg-controls">
        <button type="button" onClick={() => zoomBy(1.2)} aria-label="بزرگ‌نمایی"><Plus size={14} /></button>
        <button type="button" onClick={() => zoomBy(1 / 1.2)} aria-label="کوچک‌نمایی"><Minus size={14} /></button>
        <button type="button" onClick={fit} aria-label="جا دادن در صفحه"><Maximize2 size={13} /></button>
      </div>
    </div>
  );
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}
