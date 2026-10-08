"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";
import { centeredView, clampView, sourceRect, zoomAt, type CropView, type Size } from "@/lib/cropMath";

// پیش‌نمایش و کراپ عکس قبل از آپلود (بنر و عکس پروفایل). طبق درخواست صریح
// هیچ دکمه/اسلایدری برای زوم و جابه‌جایی نیست — همه‌چیز لمسی‌ه:
// یک انگشت = جابه‌جایی، دو انگشت = بزرگ/کوچیک (حول وسط دو انگشت)،
// دوبار زدن = زوم سریع/برگشت، و روی دسکتاپ چرخ موس = زوم حول نشانگر.
// عکس همیشه کل قاب رو می‌پوشونه (lib/cropMath.ts) و خروجی دقیقا همون
// چیزیه که داخل قاب دیده می‌شه.
//
// عکس با FileReader به data URL خونده می‌شه، نه URL.createObjectURL —
// CSP پروداکشن img-src رو به 'self' data: https: محدود می‌کنه.

type Props = {
  file: File;
  outputW: number;
  outputH: number;
  title: string;
  /** قاب دایره‌ای برای عکس پروفایل (خروجی همچنان مربعه) */
  shape?: "rect" | "circle";
  onCancel: () => void;
  onConfirm: (dataUrl: string) => void;
};

const FRAME_MAX_W = 340;
const DOUBLE_TAP_MS = 280;

export function ImageCropModal({ file, outputW, outputH, title, shape = "rect", onCancel, onConfirm }: Props) {
  useLockBodyScroll();
  const [mounted, setMounted] = useState(false);
  const [src, setSrc] = useState<string | null>(null);
  const [natural, setNatural] = useState<Size | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<CropView>({ zoom: 1, x: 0, y: 0 });
  const [easing, setEasing] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const [frameW, setFrameW] = useState(FRAME_MAX_W);
  const frameH = Math.round((frameW * outputH) / outputW);
  const frame: Size = { w: frameW, h: frameH };

  // آخرین مقدارها برای هندلرهای native (wheel) و اشاره‌گرها
  const viewRef = useRef(view);
  viewRef.current = view;
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ view: CropView; dist: number; mid: { x: number; y: number } } | null>(null);
  const lastTap = useRef(0);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const reader = new FileReader();
    reader.onerror = () => setError("خواندن فایل ناموفق بود");
    reader.onload = () => {
      const url = String(reader.result || "");
      const img = new Image();
      img.onload = () => { setNatural({ w: img.naturalWidth, h: img.naturalHeight }); setSrc(url); };
      img.onerror = () => setError("این فرمت عکس پشتیبانی نمی‌شه (JPG یا PNG انتخاب کن)");
      img.src = url;
    };
    reader.readAsDataURL(file);
  }, [file]);

  useEffect(() => {
    const measure = () => { if (frameRef.current) setFrameW(frameRef.current.clientWidth); };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [mounted, src]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  // اولین بار و با تغییر اندازه‌ی قاب: وسط‌چین
  useEffect(() => {
    if (natural) setView(centeredView(natural, { w: frameW, h: frameH }));
  }, [natural, frameW, frameH]);

  // چرخ موس (دسکتاپ و پینچ ترک‌پد) — باید passive:false باشه تا صفحه اسکرول نشه
  useEffect(() => {
    const el = frameRef.current;
    if (!el || !natural) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const f = { w: r.width, h: r.height };
      const v = viewRef.current;
      setEasing(false);
      setView(zoomAt(v, v.zoom * Math.exp(-e.deltaY * 0.0022), e.clientX - r.left, e.clientY - r.top, natural, f));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [natural, src]);

  function local(e: React.PointerEvent) {
    const r = frameRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function startGesture() {
    const pts = [...pointers.current.values()];
    if (pts.length === 0) { gesture.current = null; return; }
    const mid = pts.length > 1 ? { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 } : pts[0];
    const dist = pts.length > 1 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : 0;
    gesture.current = { view: viewRef.current, dist, mid };
  }

  function onPointerDown(e: React.PointerEvent) {
    if (!natural) return;
    frameRef.current?.setPointerCapture?.(e.pointerId);
    const p = local(e);
    pointers.current.set(e.pointerId, p);
    setEasing(false);
    if (pointers.current.size === 1) {
      const now = Date.now();
      if (now - lastTap.current < DOUBLE_TAP_MS) {
        lastTap.current = 0;
        const v = viewRef.current;
        setEasing(true);
        setView(v.zoom > 1.05 ? centeredView(natural, frame) : zoomAt(v, 2.2, p.x, p.y, natural, frame));
      } else {
        lastTap.current = now;
      }
    }
    startGesture();
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!natural || !pointers.current.has(e.pointerId) || !gesture.current) return;
    pointers.current.set(e.pointerId, local(e));
    const g = gesture.current;
    const pts = [...pointers.current.values()];
    if (pts.length > 1 && g.dist > 0) {
      const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      // زوم حول وسط اولیه‌ی دو انگشت + جابه‌جایی همراه حرکت وسطشون
      const zoomed = zoomAt(g.view, (g.view.zoom * dist) / g.dist, g.mid.x, g.mid.y, natural, frame);
      setView(clampView({ ...zoomed, x: zoomed.x + mid.x - g.mid.x, y: zoomed.y + mid.y - g.mid.y }, natural, frame));
    } else {
      const p = pts[0];
      setView(clampView({ ...g.view, x: g.view.x + p.x - g.mid.x, y: g.view.y + p.y - g.mid.y }, natural, frame));
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    // با برداشتن یک انگشت از دو انگشت، ادامه‌ی حرکت از همون نقطه بدون پرش
    startGesture();
  }

  function confirm() {
    if (!src || !natural) return;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = outputW;
      canvas.height = outputH;
      const ctx = canvas.getContext("2d");
      if (!ctx) { setError("Canvas در دسترس نیست"); return; }
      ctx.imageSmoothingQuality = "high";
      const { sx, sy, sw, sh } = sourceRect(view, natural, frame);
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outputW, outputH);
      onConfirm(canvas.toDataURL("image/jpeg", 0.88));
    };
    img.src = src;
  }

  const scale = natural ? Math.max(frameW / natural.w, frameH / natural.h) * view.zoom : 1;

  if (!mounted) return null;
  return createPortal(
    <>
      <div className="modal-overlay open" onClick={onCancel} />
      <div className="modal-panel open crop-modal" role="dialog" aria-modal="true" aria-label={title} dir="rtl">
        <div className="modal-head">
          <div className="modal-title">{title}</div>
        </div>

        {error ? (
          <div className="field-error-msg" style={{ display: "block" }}>{error}</div>
        ) : (
          <>
            <div
              ref={frameRef}
              className={`crop-frame${shape === "circle" ? " is-circle" : ""}`}
              style={{ height: frameH }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              {src && natural && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={src} alt="" draggable={false} className={`crop-img${easing ? " is-easing" : ""}`}
                  style={{ width: natural.w, height: natural.h, transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${scale})` }}
                />
              )}
              {shape === "circle" && <span className="crop-ring" aria-hidden="true" />}
            </div>
            <div className="crop-hint">برای جابه‌جایی بکش، برای بزرگ و کوچیک کردن با دو انگشت باز و بسته کن</div>
          </>
        )}

        <div className="crop-actions">
          <button type="button" className="account-outline-btn muted" onClick={onCancel}>انصراف</button>
          <button type="button" className="account-outline-btn" onClick={confirm} disabled={!src || !!error}>ذخیره</button>
        </div>
      </div>
    </>,
    document.body,
  );
}
