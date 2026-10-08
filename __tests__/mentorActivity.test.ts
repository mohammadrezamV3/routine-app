import { describe, expect, it } from "vitest";
import { groupLogActivity, type ActivityLogRow } from "@/lib/mentorActivity";

const d = (s: string) => new Date(s + "T00:00:00Z");
function row(p: Partial<ActivityLogRow<string>> & { title: string }): ActivityLogRow<string> {
  return {
    programId: p.programId ?? "p1",
    status: p.status ?? "COMPLETED",
    date: p.date ?? d("2026-09-25"),
    doneOn: p.doneOn ?? null,
    updatedAt: p.updatedAt ?? new Date("2026-09-27T10:00:00Z"),
    item: { title: p.title },
    program: { student: "s" },
  };
}

describe("groupLogActivity", () => {
  it("one row per (program, day) instead of one per item synced at the same moment", () => {
    const out = groupLogActivity([
      row({ title: "پیاده‌روی" }),
      row({ title: "مطالعه" }),
      row({ title: "تست", status: "PARTIAL" }),
      row({ title: "پیاده‌روی", date: d("2026-09-24") }),
      row({ title: "پیاده‌روی", programId: "p2" }),
    ]);
    expect(out).toHaveLength(3);
    const g = out.find((a) => a.url === "/mentor-programs/p1" && a.day === "2026-09-25")!;
    expect(g.text).toBe("2 آیتم انجام شد، 1 آیتم نیمه‌کاره");
    expect(out.find((a) => a.day === "2026-09-24")!.text).toBe("پیاده‌روی: انجام شد");
  });

  it("uses the day it was actually ticked when the item was moved", () => {
    const [a] = groupLogActivity([row({ title: "x", date: d("2026-09-25"), doneOn: d("2026-09-26") })]);
    expect(a.day).toBe("2026-09-26");
  });

  it("keeps the latest sync time as `at`", () => {
    const [a] = groupLogActivity([
      row({ title: "a", updatedAt: new Date("2026-09-27T09:00:00Z") }),
      row({ title: "b", updatedAt: new Date("2026-09-27T11:00:00Z") }),
    ]);
    expect(a.at.toISOString()).toBe("2026-09-27T11:00:00.000Z");
  });
});
