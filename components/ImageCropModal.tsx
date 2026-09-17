"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronRight, ZoomIn } from "lucide-react";
import { LockBodyScroll } from "./LockBodyScroll";

// انتخابِ محلِ کراپِ عکس قبل از آپلود — طبقِ درخواستِ صریح («خودِ کاربر
// انتخاب کنه کجارو می‌خواد بزاره توی عکس»، با یک اسکرین‌شاتِ نمونه‌ی
// دایره‌ی کراپِ اپلی به‌عنوان مرجع). قبلا resizeImageToDataUrl/
// resizeBannerToDataUrl همیشه دقیقا وسطِ عکس را می‌بریدند — بدون این پاپ‌آپ
// هیچ راهی برای انتخابِ کاربر نبود.
//
// خروجی همیشه یک canvas با اندازه‌ی هدف است؛ چیزی از سمتِ کلاینت به سرور
// نمی‌رود جز همان data URL نهایی — همان قراردادِ قبلیِ آپلود دست‌نخورده می‌ماند.

const FRAME_W = 280;

export function ImageCropModal({
  file, aspect, shape = "circle", outputW, outputH, onCancel, onConfirm,
}: {
  file: File;
  /** نسبتِ عرض به ارتفاعِ قابِ کراپ — ۱ برای آواتارِ مربعی، ۳.۲ برای بنر */
  aspect: number;
  shape?: "circle" | "rect";
  outputW: number;
  outputH: number;
  onCancel: () => void;
  onConfirm: (dataUrl: string) => void;
}) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [minScale, setMinScale] = useState(1);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const frameH = FRAME_W / aspect;

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      // «cover» — کوچک‌ترین مقیاسی که قاب را کامل پر می‌کند، بدونِ فاصله‌ی
      // خالی دورش. کاربر فقط می‌تواند از این به بالا زوم کند، نه پایین‌تر.
      const s = Math.max(FRAME_W / image.width, frameH / image.height);
      setMinScale(s);
      setScale(s);
      setOffset({ x: 0, y: 0 });
      setImg(image);
    };
    image.src = url;
    return () => URL.revokeObjectURL(url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  // محدودکردنِ جابه‌جایی: لبه‌ی عکس هیچ‌وقت نباید داخلِ قاب دیده بشه
  function clamp(next: { x: number; y: number }, s: number) {
    if (!img) return next;
    const w = img.width * s;
    const h = img.height * s;
    const maxX = Math.max(0, (w - FRAME_W) / 2);
    const maxY = Math.max(0, (h - frameH) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, next.x)),
      y: Math.min(maxY, Math.max(-maxY, next.y)),
    };
  }

  function onPointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;
    setOffset(clamp({ x: dragRef.current.ox + dx, y: dragRef.current.oy + dy }, scale));
  }
  function onPointerUp() { dragRef.current = null; }

  function onZoomChange(v: number) {
    const s = minScale * v;
    setScale(s);
    setOffset((prev) => clamp(prev, s));
  }

  const imgStyle = useMemo(() => {
    if (!img) return undefined;
    return {
      width: img.width * scale,
      height: img.height * scale,
      transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px)`,
    } as React.CSSProperties;
  }, [img, scale, offset]);

  function confirm() {
    if (!img) return;
    const canvas = document.createElement("canvas");
    canvas.width = outputW;
    canvas.height = outputH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // مختصاتِ ناحیه‌ی دیده‌شده‌ی قاب، برحسبِ پیکسل‌های *واقعیِ* عکسِ اصلی
    const sw = FRAME_W / scale;
    const sh = frameH / scale;
    const sx = img.width / 2 - offset.x / scale - sw / 2;
    const sy = img.height / 2 - offset.y / scale - sh / 2;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outputW, outputH);
    onConfirm(canvas.toDataURL("image/jpeg", shape === "circle" ? 0.85 : 0.82));
  }

  return createPortal(
    <>
      <LockBodyScroll />
      <div className="modal-overlay open" onClick={onCancel} />
      <div className="crop-modal" role="dialog" aria-modal="true">
        <div className="crop-modal-head">
          <button type="button" className="crop-modal-back" onClick={onCancel} aria-label="انصراف">
            <ChevronRight size={20} />
          </button>
          <button type="button" className="crop-modal-confirm" onClick={confirm} disabled={!img} aria-label="تایید">
            <Check size={20} />
          </button>
        </div>

        <div
          className="crop-modal-stage"
          style={{ width: FRAME_W, height: frameH }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {img && <img src={img.src} alt="" className="crop-modal-img" style={imgStyle} draggable={false} />}
          <div className={`crop-modal-mask ${shape}`} />
        </div>

        <div className="crop-modal-zoom">
          <ZoomIn size={15} />
          <input
            type="range" min={1} max={3} step={0.01}
            defaultValue={1}
            onChange={(e) => onZoomChange(Number(e.target.value))}
            aria-label="بزرگ‌نمایی"
          />
        </div>
        <p className="crop-modal-hint">برای جابه‌جایی بکش، برای بزرگ‌نمایی از اسلایدر استفاده کن</p>
      </div>
    </>,
    document.body
  );
}
