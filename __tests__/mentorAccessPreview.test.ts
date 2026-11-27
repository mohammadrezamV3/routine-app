import { describe, it, expect } from "vitest";
import { buildAccessPreview } from "@/lib/mentorAccessPreview";

const base = { shareAllPrograms: true, sharedPrograms: [], showSchedule: true, showProgramName: true, showTaskName: false, showTaskDetails: false, showProgress: true, shareSleep: false };
const ex = { name: "مطالعه", tag: "دانشگاه", time: "18:00 - 19:00", importance: "high", sample: false };
const vis = (r: ReturnType<typeof buildAccessPreview>) => Object.fromEntries(r.lines.map((l) => [l.key, l.visible]));

describe("پیش‌نمای دسترسی مربی", () => {
  it("پیش‌فرض: زمان، نام برنامه و پیشرفت دیده می‌شن؛ عنوان کار و جزئیات و خواب نه", () => {
    const r = buildAccessPreview(base, ex, true);
    expect(vis(r)).toEqual({ programs: true, schedule: true, programName: true, taskName: false, taskDetails: false, progress: true, sleep: false });
    expect(r.coachParts).toEqual([{ t: "program", v: "دانشگاه" }, { t: "busy" }, { t: "done" }]);
  });
  it("زمان‌بندی خاموش همه‌ی جزئیات رو می‌بنده", () => {
    const r = buildAccessPreview({ ...base, showSchedule: false, showTaskName: true, showTaskDetails: true }, ex, true);
    expect(r.lines.filter((l) => l.key !== "programs" && l.key !== "sleep").every((l) => !l.visible)).toBe(true);
    expect(r.lines.find((l) => l.key === "taskName")!.blockedBy).toBe("schedule");
    expect(r.coachParts).toBeNull();
  });
  it("برنامه‌ی انتخاب‌نشده برای مربی دیده نمی‌شه", () => {
    const r = buildAccessPreview({ ...base, shareAllPrograms: false, sharedPrograms: ["routine:ورزش"] }, ex, true);
    expect(r.lines[0].visible).toBe(false);
    expect(r.lines[1].blockedBy).toBe("programs");
    expect(r.coachParts).toBeNull();
  });
  it("بدون برچسب و با عنوان کار مخفی، نام برنامه از در پشتی لو نمی‌ره", () => {
    const r = buildAccessPreview(base, { ...ex, tag: undefined }, true);
    const pn = r.lines.find((l) => l.key === "programName")!;
    expect(pn.visible).toBe(false);
    expect(pn.blockedBy).toBe("name");
  });
  it("جزئیات بدون اهمیت ثبت‌شده دیده نمی‌شه و خواب مستقله", () => {
    const r = buildAccessPreview({ ...base, showTaskDetails: true, shareSleep: true }, { ...ex, importance: undefined }, true);
    expect(r.lines.find((l) => l.key === "taskDetails")!.blockedBy).toBe("importance");
    expect(r.lines.find((l) => l.key === "sleep")!.visible).toBe(true);
  });
  it("نمونه‌ی ساختگی بدون برنامه‌ی واقعی: فقط با انتخاب برنامه دیده می‌شه", () => {
    const s = { ...ex, sample: true };
    expect(buildAccessPreview({ ...base, shareAllPrograms: false }, s, false).lines[0].visible).toBe(false);
    expect(buildAccessPreview(base, s, false).lines[0].visible).toBe(true);
  });
});
