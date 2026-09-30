import { describe, it, expect } from "vitest";
import { canTransition, isEditable, isProgramAction, visibleToStudent, PROGRAM_TRANSITIONS } from "@/lib/mentorProgramState";
import { validateDocument, sniffDocumentMime, sanitizeFileName, MAX_DOCUMENT_BYTES } from "@/lib/mentorUpload";
import { sanitizeSharedPrograms, canSeeScope, routineScopeKey, MAX_SHARED_PROGRAMS } from "@/lib/mentorPrivacy";
import { validateProgramInput, validateRoutineRole, parseHHmm, MAX_PROGRAM_ITEMS, PROGRAM_NOTE_MAX, ROUTINE_ROLE_MAX } from "@/lib/mentorValidate";
import { pngBytes, pdfBytes, jpegBytes, webpBytes, exeBytes, htmlBytes } from "./helpers/mentorTestUtils";

// تست‌های واحدِ خالصِ هسته‌ی منتور — بدونِ دیتابیس.

describe("mentorProgramState — ماشینِ حالت", () => {
  it("مسیرهای مجاز", () => {
    expect(canTransition("send", "DRAFT", "MENTOR")).toBe("PENDING");
    expect(canTransition("accept", "PENDING", "STUDENT")).toBe("ACCEPTED");
    expect(canTransition("reject", "PENDING", "STUDENT")).toBe("REJECTED");
    expect(canTransition("request_changes", "PENDING", "STUDENT")).toBe("DRAFT");
    expect(canTransition("activate", "ACCEPTED", "MENTOR")).toBe("ACTIVE");
    expect(canTransition("activate", "ACCEPTED", "STUDENT")).toBe("ACTIVE");
    expect(canTransition("complete", "ACTIVE", "STUDENT")).toBe("COMPLETED");
    for (const s of ["DRAFT", "PENDING", "ACCEPTED", "ACTIVE"] as const) {
      expect(canTransition("cancel", s, "MENTOR")).toBe("CANCELLED");
      expect(canTransition("cancel", s, "STUDENT")).toBe("CANCELLED");
    }
  });

  it("بازیگرِ اشتباه رد می‌شود", () => {
    expect(canTransition("send", "DRAFT", "STUDENT")).toBeNull();
    expect(canTransition("accept", "PENDING", "MENTOR")).toBeNull();
    expect(canTransition("reject", "PENDING", "MENTOR")).toBeNull();
    expect(canTransition("request_changes", "PENDING", "MENTOR")).toBeNull();
  });

  it("وضعیتِ مبداِ اشتباه رد می‌شود", () => {
    expect(canTransition("send", "PENDING", "MENTOR")).toBeNull();
    expect(canTransition("send", "ACTIVE", "MENTOR")).toBeNull();
    expect(canTransition("accept", "DRAFT", "STUDENT")).toBeNull();
    expect(canTransition("accept", "ACTIVE", "STUDENT")).toBeNull();
    expect(canTransition("complete", "ACCEPTED", "MENTOR")).toBeNull();
    expect(canTransition("activate", "PENDING", "MENTOR")).toBeNull();
    for (const s of ["COMPLETED", "CANCELLED", "REJECTED"] as const) {
      for (const a of Object.keys(PROGRAM_TRANSITIONS) as (keyof typeof PROGRAM_TRANSITIONS)[]) {
        expect(canTransition(a, s, "MENTOR")).toBeNull();
        expect(canTransition(a, s, "STUDENT")).toBeNull();
      }
    }
  });

  it("isProgramAction فقط کلیدهای خودِ جدول را می‌پذیرد (نه prototype)", () => {
    expect(isProgramAction("send")).toBe(true);
    expect(isProgramAction("toString")).toBe(false);
    expect(isProgramAction("__proto__")).toBe(false);
    expect(isProgramAction(undefined)).toBe(false);
    expect(isProgramAction("SEND")).toBe(false);
  });

  it("isEditable و visibleToStudent", () => {
    expect(isEditable("DRAFT")).toBe(true);
    expect(isEditable("PENDING")).toBe(false);
    expect(isEditable("ACTIVE")).toBe(false);
    expect(visibleToStudent({ status: "DRAFT", sentAt: null })).toBe(false);
    expect(visibleToStudent({ status: "DRAFT", sentAt: new Date() })).toBe(true);
    expect(visibleToStudent({ status: "PENDING", sentAt: new Date() })).toBe(true);
  });
});

describe("mentorUpload — اعتبارسنجیِ فایل از روی محتوا", () => {
  it("magic bytes هر چهار نوعِ مجاز را تشخیص می‌دهد", () => {
    expect(sniffDocumentMime(pngBytes())).toBe("image/png");
    expect(sniffDocumentMime(pdfBytes())).toBe("application/pdf");
    expect(sniffDocumentMime(jpegBytes())).toBe("image/jpeg");
    expect(sniffDocumentMime(webpBytes())).toBe("image/webp");
  });

  it("اجرایی/HTML/SVG/خیلی کوتاه رد می‌شود با ۴۱۵", () => {
    for (const b of [exeBytes(), htmlBytes(), new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>')]) {
      const r = validateDocument(b, "evil.png");
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.status).toBe(415);
    }
    // فقط ۸ بایتِ PNG (زیرِ حداقلِ ۱۲)
    const r = validateDocument(pngBytes().slice(0, 8), "x.png");
    expect(r.ok).toBe(false);
  });

  it("فایلِ خالی ۴۰۰ و بزرگ‌تر از ۵MB ۴۱۳", () => {
    const e = validateDocument(new Uint8Array(0), "a.png");
    expect(e.ok === false && e.status).toBe(400);
    const big = validateDocument(pngBytes(MAX_DOCUMENT_BYTES + 1), "a.png");
    expect(big.ok === false && big.status).toBe(413);
    const exact = validateDocument(pngBytes(MAX_DOCUMENT_BYTES), "a.png");
    expect(exact.ok).toBe(true);
  });

  it("خروجیِ معتبر: mime از محتوا (نه اسم)، sha256، اسمِ پاک‌شده", () => {
    const r = validateDocument(pdfBytes(), "../../etc/passwd.png");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.doc.mimeType).toBe("application/pdf");
    expect(r.doc.fileName).toBe("passwd.pdf");
    expect(r.doc.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(r.doc.sizeBytes).toBe(pdfBytes().length);
  });

  it("sanitizeFileName کاراکترهای خطرناک/مسیر را حذف و پسوند را از mime می‌گذارد", () => {
    expect(sanitizeFileName("C:\\x\\<script>.exe", "image/png")).toBe("script.png");
    expect(sanitizeFileName(undefined, "image/jpeg")).toBe("document.jpg");
    expect(sanitizeFileName("مدرک من.pdf", "application/pdf")).toBe("مدرک من.pdf");
    expect(sanitizeFileName("a".repeat(200), "image/webp").length).toBeLessThanOrEqual(65);
  });
});

describe("mentorPrivacy — sanitize و scope", () => {
  it("فقط کلیدهای معتبر را نگه می‌دارد و تکراری‌ها را یکی می‌کند", () => {
    const out = sanitizeSharedPrograms([
      "routine:Workout",
      "routine:Workout",
      "module:EXERCISE",
      "module:CALORIE",
      "module:TRADE",
      "routine:",
      "routine:a\nb",
      "Workout",
      "admin:all",
      42,
      null,
      { k: "routine:x" },
      "routine:" + "x".repeat(121),
    ]);
    expect(out).toEqual(["routine:Workout", "module:EXERCISE", "module:CALORIE"]);
  });

  it("غیرِ آرایه → []", () => {
    expect(sanitizeSharedPrograms("routine:Workout")).toEqual([]);
    expect(sanitizeSharedPrograms(null)).toEqual([]);
    expect(sanitizeSharedPrograms({ 0: "routine:x" })).toEqual([]);
  });

  it("سقفِ تعداد رعایت می‌شود", () => {
    const many = Array.from({ length: 300 }, (_, i) => `routine:p${i}`);
    expect(sanitizeSharedPrograms(many)).toHaveLength(MAX_SHARED_PROGRAMS);
  });

  it("canSeeScope: Select All همه را می‌بیند؛ وگرنه فقط لیست", () => {
    expect(canSeeScope({ shareAllPrograms: true, sharedPrograms: [] }, "routine:anything")).toBe(true);
    expect(canSeeScope({ shareAllPrograms: false, sharedPrograms: ["routine:A"] }, "routine:A")).toBe(true);
    expect(canSeeScope({ shareAllPrograms: false, sharedPrograms: ["routine:A"] }, "routine:B")).toBe(false);
    expect(canSeeScope({ shareAllPrograms: false, sharedPrograms: [] }, "module:EXERCISE")).toBe(false);
  });

  it("routineScopeKey: برچسب مقدم بر اسم؛ بدونِ برچسب اسم", () => {
    expect(routineScopeKey({ name: "دویدن", tag: "Workout" })).toBe("routine:Workout");
    expect(routineScopeKey({ name: "دویدن", tag: "  " })).toBe("routine:دویدن");
    expect(routineScopeKey({ name: " خواب " })).toBe("routine:خواب");
    expect(routineScopeKey({ name: "x".repeat(200) }).length).toBe("routine:".length + 120);
  });
});

// رتبه‌بندیِ شایستگی: __tests__/mentorRanking.test.ts

describe("mentorValidate — بدنه‌ی برنامه", () => {
  const ok = { type: "WORKOUT", title: "  پرس  ", items: [{ title: "اسکات", days: [1, 3, 1], sets: "۴", reps: "8-12", weightKg: "60.25", restSec: 90, startTime: "۰۸:۳۰" }] };

  it("ورودیِ معتبر نرمال می‌شود (ارقامِ فارسی، مرتب‌سازی/یکتاسازیِ روزها، گرد کردنِ وزنه)", () => {
    const r = validateProgramInput(ok);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.title).toBe("پرس");
    const it0 = r.data.items[0];
    expect(it0.days).toEqual([1, 3]);
    expect(it0.sets).toBe(4);
    expect(it0.weightKg).toBe(60.3);
    expect(it0.startTime).toBe("08:30");
    expect(it0.order).toBe(0);
  });

  it("فیلدهای حرکتی برای ROUTINE دور ریخته می‌شوند و DAILY همه‌ی روزها را می‌گیرد", () => {
    const r = validateProgramInput({ type: "ROUTINE", title: "t", items: [{ title: "x", repeat: "DAILY", sets: 5, reps: "10" }] });
    expect(r.ok && r.data.items[0]).toMatchObject({ sets: null, reps: null, days: [0, 1, 2, 3, 4, 5, 6] });
  });

  it("mass assignment: فیلدهای ناشناخته (status/version/studentId) در خروجی نیستند", () => {
    const r = validateProgramInput({ ...ok, status: "ACTIVE", version: 99, studentId: "victim", mentorId: "x", sentAt: "2020-01-01" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(Object.keys(r.data).sort()).toEqual(["description", "endDate", "items", "note", "startDate", "title", "type"]);
  });

  it("یادداشتِ برنامه: trim، خالی → null، بلند بریده می‌شود، غیرِرشته ۴۰۰", () => {
    const a = validateProgramInput({ ...ok, note: "  قبل از شروع جزوه رو داشته باش  " });
    expect(a.ok && a.data.note).toBe("قبل از شروع جزوه رو داشته باش");
    const b = validateProgramInput({ ...ok, note: "   " });
    expect(b.ok && b.data.note).toBe(null);
    const c = validateProgramInput({ ...ok, note: "x".repeat(PROGRAM_NOTE_MAX + 50) });
    expect(c.ok && c.data.note?.length).toBe(PROGRAM_NOTE_MAX);
    expect(validateProgramInput({ ...ok, note: 12 }).ok).toBe(false);
  });

  it.each([
    [{ ...ok, type: "NUTRITION" }, "نوع"],
    [{ ...ok, title: "   " }, "عنوان"],
    [{ ...ok, startDate: "2026-02-31" }, "شروع"],
    [{ ...ok, startDate: "2026-05-10", endDate: "2026-05-01" }, "پایان"],
    [{ ...ok, items: "x" }, "آیتم"],
    [{ ...ok, items: [{ title: "" }] }, "عنوان"],
    [{ ...ok, items: [{ title: "a", days: [] }] }, "روز"],
    [{ ...ok, items: [{ title: "a", days: [7] }] }, "روز"],
    [{ ...ok, items: [{ title: "a", days: [1.5] }] }, "روز"],
    [{ ...ok, items: [{ title: "a", repeat: "HOURLY", days: [1] }] }, "تکرار"],
    [{ ...ok, items: [{ title: "a", days: [1], startTime: "25:00" }] }, "HH:mm"],
    [{ ...ok, items: [{ title: "a", days: [1], durationMin: 0 }] }, "مدت"],
    [{ ...ok, items: [{ title: "a", days: [1], sets: 101 }] }, "ست"],
    [{ ...ok, items: [{ title: "a", days: [1], reps: "a lot" }] }, "تکرار"],
    [{ ...ok, items: [{ title: "a", days: [1], weightKg: -1 }] }, "وزنه"],
    [{ ...ok, items: [{ title: "a", days: [1], restSec: 5000 }] }, "استراحت"],
  ])("ورودیِ نامعتبر رد می‌شود (%#)", (body, needle) => {
    const r = validateProgramInput(body);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain(needle);
  });

  it("سقفِ تعدادِ آیتم", () => {
    const items = Array.from({ length: MAX_PROGRAM_ITEMS + 1 }, () => ({ title: "a", repeat: "DAILY" }));
    expect(validateProgramInput({ type: "ROUTINE", title: "t", items }).ok).toBe(false);
    expect(validateProgramInput({ type: "ROUTINE", title: "t", items: items.slice(1) }).ok).toBe(true);
  });

  it("type در ویرایش از fallback می‌آید", () => {
    const r = validateProgramInput({ title: "t", items: [] }, "WORKOUT");
    expect(r.ok && r.data.type).toBe("WORKOUT");
    expect(validateProgramInput({ title: "t", items: [] }).ok).toBe(false);
  });

  it("parseHHmm", () => {
    expect(parseHHmm("۰۷:۰۵")).toBe("07:05");
    expect(parseHHmm("7:05")).toBeNull();
    expect(parseHHmm(705)).toBeNull();
  });
});

describe("mentorValidate — نقشِ روتین", () => {
  it("trim و یکی‌کردنِ فاصله‌ها؛ خالی/null → null", () => {
    expect(validateRoutineRole("  استاد   ریاضی ")).toEqual({ ok: true, data: "استاد ریاضی" });
    expect(validateRoutineRole("   ")).toEqual({ ok: true, data: null });
    expect(validateRoutineRole(null)).toEqual({ ok: true, data: null });
  });
  it("بلندتر از سقف یا غیرِرشته رد می‌شود", () => {
    expect(validateRoutineRole("x".repeat(ROUTINE_ROLE_MAX)).ok).toBe(true);
    expect(validateRoutineRole("x".repeat(ROUTINE_ROLE_MAX + 1)).ok).toBe(false);
    expect(validateRoutineRole(5).ok).toBe(false);
  });
});
