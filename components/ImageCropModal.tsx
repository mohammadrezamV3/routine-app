"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ZoomIn } from "lucide-react";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";

// پیش‌نمایشِ عکس پروفایل/بنر قبل از آپلود — قبلا عکس بی‌صدا از *وسط*
// کراپ می‌شد و کاربر نمی‌تونست انتخاب کنه کدوم قسمتش دیده بشه (همون
// «جای پیش‌نمایش درست نیست»). حالا عکس داخلِ قابی با همون نسبتِ نهایی
// (دایره برای پروفایل، ۳.۲:۱ برای بنر) نشون داده می‌شه، با کشیدن جابه‌جا و
// با اسلایدر زوم می‌شه، و خروجی دقیقا همون چیزیه که داخل قاب دیده می‌شد.
//
// عکس با FileReader به data URL خونده می‌شه، نه URL.createObjectURL —
// CSP پروداکشن img-src رو به 'self' data: https: محدود می‌کنه.

type Props = {
  file: File;
  outputW: number;
  outputH: number;
  shape: "circle" | "rect";
  title: string;
  onCancel: () => void;
  onConfirm: (dataUrl: string) => void;
};

const FRAME_MAX_W = 340;

export function ImageCropModal({ file, outputW, outputH, shape, title, onCancel, onConfirm }: Props) {
  useLockBodyScroll();
  const [mounted, setMounted] = useState(false);
  const [src, setSrc] = useState<string | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 }); // گوشه‌ی بالا-چپِ عکس نسبت به قاب (px)
  const frameRef = useRef<HTMLDivElement>(null);
  const [frameW, setFrameW] = useState(FRAME_MAX_W);
  const drag = useRef<{ px: number; py: number; x: number; y: number } | null>(null);

  const frameH = Math.round((frameW * outputH) / outputW);

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

  // مقیاسی که عکس در zoom=1 دقیقا قاب رو پر کنه (cover)
  const baseScale = natural ? Math.max(frameW / natural.w, frameH / natural.h) : 1;
  const scale = baseScale * zoom;
  const dispW = natural ? natural.w * scale : 0;
  const dispH = natural ? natural.h * scale : 0;

  function clamp(p: { x: number; y: number }, w = dispW, h = dispH) {
    return {
      x: Math.min(0, Math.max(frameW - w, p.x)),
      y: Math.min(0, Math.max(frameH - h, p.y)),
    };
  }

  // اولین بار و با تغییر اندازه‌ی قاب: وسط‌چین
  useEffect(() => {
    if (!natural) return;
    setPos({ x: (frameW - dispW) / 2, y: (frameH - dispH) / 2 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [natural, frameW]);

  function changeZoom(next: number) {
    if (!natural) return;
    const nextScale = baseScale * next;
    // زوم حولِ مرکزِ قاب، نه گوشه‌ی عکس
    const cx = frameW / 2, cy = frameH / 2;
    const ratio = nextScale / scale;
    const p = { x: cx - (cx - pos.x) * ratio, y: cy - (cy - pos.y) * ratio };
    setZoom(next);
    setPos(clamp(p, natural.w * nextScale, natural.h * nextScale));
  }

  function onPointerDown(e: React.PointerEvent) {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    drag.current = { px: e.clientX, py: e.clientY, x: pos.x, y: pos.y };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current) return;
    setPos(clamp({ x: drag.current.x + e.clientX - drag.current.px, y: drag.current.y + e.clientY - drag.current.py }));
  }
  function onPointerUp() { drag.current = null; }

  function confirm() {
    if (!src || !natural) return;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = outputW;
      canvas.height = outputH;
      const ctx = canvas.getContext("2d");
      if (!ctx) { setError("Canvas در دسترس نیست"); return; }
      const sx = -pos.x / scale, sy = -pos.y / scale;
      const sw = frameW / scale, sh = frameH / scale;
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outputW, outputH);
      onConfirm(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.src = src;
  }

  if (!mounted) return null;
  return createPortal(
    <>
      <div className="modal-overlay open" onClick={onCancel} />
      <div className="modal-panel open crop-modal" role="dialog" aria-modal="true" dir="rtl">
        <div className="modal-head">
          <div>
            <div className="modal-eyebrow">پیش‌نمایش</div>
            <div className="modal-title">{title}</div>
          </div>
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
                  src={src} alt="" draggable={false} className="crop-img"
                  style={{ width: dispW, height: dispH, transform: `translate(${pos.x}px, ${pos.y}px)` }}
                />
              )}
            </div>
            <div className="crop-hint">برای جابه‌جایی عکس رو بکش</div>
            <label className="crop-zoom">
              <ZoomIn size={15} />
              <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => changeZoom(Number(e.target.value))} aria-label="زوم" />
            </label>
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
