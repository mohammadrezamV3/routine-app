"use client";

import { useCallback, useRef, useState } from "react";

// ضبطِ ویس برای دستیارِ روتین.
//
// «فشرده‌سازی قبل از ارسال» این‌جا سه لایه دارد و هر سه *قبل* از رفتنِ داده
// روی شبکه‌اند:
//   ۱) خودِ گرفتنِ صدا مونو و ۱۶کیلوهرتز است (گفتار به بیشتر از این نیاز
//      ندارد؛ استریوی ۴۸کیلوهرتز فقط حجم است).
//   ۲) کدکِ Opus با نرخِ ۱۶ کیلوبیت — حدودِ ۲ کیلوبایت در ثانیه، یعنی یک
//      پیامِ ۱۰ثانیه‌ای حدودِ ۲۰ کیلوبایت.
//   ۳) سقفِ زمان و سقفِ حجم، تا یک ضبطِ فراموش‌شده مگابایت‌ها نفرستد.

export const VOICE_MAX_SECONDS = 60;
export const VOICE_MAX_BYTES = 1024 * 1024; // ۱ مگابایت
export const VOICE_BITS_PER_SECOND = 16_000;

/** محدودیت‌هایی که به getUserMedia داده می‌شود — لایه‌ی اولِ فشرده‌سازی */
export const VOICE_CONSTRAINTS: MediaTrackConstraints = {
  channelCount: 1,
  sampleRate: 16_000,
  echoCancellation: true,
  noiseSuppression: true,
};

/** اولین قالبی که مرورگر واقعا پشتیبانی می‌کند (سافاری با کروم فرق دارد) */
function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/ogg;codecs=opus",
    "audio/webm",
    "audio/mp4",
  ];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t));
}

export type VoiceRecorderState = "idle" | "recording" | "error";

export function useVoiceRecorder(getStream: () => MediaStream | null) {
  const [state, setState] = useState<VoiceRecorderState>("idle");
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resolveRef = useRef<((b: Blob | null) => void) | null>(null);

  const start = useCallback(() => {
    const stream = getStream();
    if (!stream) { setError("میکروفون در دسترس نیست."); setState("error"); return false; }
    if (typeof MediaRecorder === "undefined") {
      setError("مرورگرت ضبطِ صدا را پشتیبانی نمی‌کند.");
      setState("error");
      return false;
    }

    const mimeType = pickMimeType();
    let rec: MediaRecorder;
    try {
      rec = new MediaRecorder(stream, {
        ...(mimeType ? { mimeType } : {}),
        audioBitsPerSecond: VOICE_BITS_PER_SECOND,
      });
    } catch {
      setError("ضبطِ صدا شروع نشد.");
      setState("error");
      return false;
    }

    chunksRef.current = [];
    rec.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType || "audio/webm" });
      chunksRef.current = [];
      resolveRef.current?.(blob.size ? blob : null);
      resolveRef.current = null;
    };
    recorderRef.current = rec;
    rec.start();
    setError(null);
    setState("recording");

    // سقفِ زمان: ضبطِ فراموش‌شده نباید تا بی‌نهایت ادامه پیدا کند
    stopTimerRef.current = setTimeout(() => {
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    }, VOICE_MAX_SECONDS * 1000);
    return true;
  }, [getStream]);

  /** ضبط را تمام می‌کند و بلابِ نهایی را می‌دهد (null یعنی چیزی ضبط نشد) */
  const stop = useCallback((): Promise<Blob | null> => {
    if (stopTimerRef.current) { clearTimeout(stopTimerRef.current); stopTimerRef.current = null; }
    const rec = recorderRef.current;
    setState("idle");
    if (!rec || rec.state !== "recording") return Promise.resolve(null);
    return new Promise<Blob | null>((resolve) => {
      resolveRef.current = resolve;
      rec.stop();
      recorderRef.current = null;
    });
  }, []);

  /** لغو بدونِ استفاده از نتیجه */
  const cancel = useCallback(() => {
    if (stopTimerRef.current) { clearTimeout(stopTimerRef.current); stopTimerRef.current = null; }
    resolveRef.current?.(null);
    resolveRef.current = null;
    const rec = recorderRef.current;
    recorderRef.current = null;
    if (rec?.state === "recording") rec.stop();
    setState("idle");
  }, []);

  return { state, error, setError, start, stop, cancel };
}
