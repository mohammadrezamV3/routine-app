import { describe, expect, it } from "vitest";
import { programStatusText, studentStatusText } from "@/lib/mentorStatus";

describe("studentStatusText", () => {
  it("بر اساس درصد", () => {
    expect(studentStatusText({ rate: 0.8 }).text).toBe("عالی پیش می‌ره");
    expect(studentStatusText({ rate: 0.79 }).text).toBe("خوبه");
    expect(studentStatusText({ rate: 0.5 }).text).toBe("خوبه");
    expect(studentStatusText({ rate: 0.49 }).text).toBe("نیاز به حمایت");
    expect(studentStatusText({ rate: 85 }).text).toBe("عالی پیش می‌ره");
  });
  it("بی‌خبری بر درصد غلبه می‌کند و ارقام لاتین‌اند", () => {
    expect(studentStatusText({ rate: 0.9, idleDays: 3 })).toEqual({ text: "3 روزه خبری نیست", tone: "warn" });
    expect(studentStatusText({ rate: 0.9, idleDays: 1 }).text).toBe("عالی پیش می‌ره");
  });
  it("متوقف بالاترین اولویت", () => {
    expect(studentStatusText({ rate: 0.9, idleDays: 5, paused: true }).text).toBe("متوقف");
  });
  it("بدون داده", () => {
    expect(studentStatusText({ rate: null }).text).toBe("هنوز داده‌ای نیست");
    expect(studentStatusText({ rate: undefined, idleDays: 0 }).text).toBe("هنوز داده‌ای نیست");
  });
});

describe("programStatusText", () => {
  it("نگاشت وضعیت‌ها", () => {
    expect(programStatusText("DRAFT").text).toBe("ساخته شده، فرستاده نشده");
    expect(programStatusText("DRAFT", { changeRequested: true }).text).toBe("شاگرد تغییر خواسته");
    expect(programStatusText("PENDING").text).toBe("منتظر جواب شاگرد");
    expect(programStatusText("ACTIVE").text).toBe("در حال اجرا");
    expect(programStatusText("COMPLETED").text).toBe("تمام شده");
  });
  it("هیچ واژه‌ی فنی قدیمی نیست", () => {
    for (const s of ["DRAFT", "PENDING", "ACCEPTED", "REJECTED", "ACTIVE", "COMPLETED", "CANCELLED"] as const) {
      expect(programStatusText(s).text).not.toMatch(/پیش‌نویس|نسخه/);
    }
  });
});
