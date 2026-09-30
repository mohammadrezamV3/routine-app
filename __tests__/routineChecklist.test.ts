import { describe, it, expect } from "vitest";
import { toggleTask, isOccDone, checklistProgress, checklistOf, itemKey } from "@/lib/routineChecklist";

const items = [{ id: "a", name: "نان" }, { id: "b", name: "شیر" }, { id: "c", name: "میوه" }];

describe("routineChecklist", () => {
  it("برنامه‌ی عادی همون تاگلِ قبلیه", () => {
    expect(toggleTask({}, "o1", [])).toEqual({ o1: true });
    expect(toggleTask({ o1: true }, "o1", [])).toEqual({ o1: false });
  });
  it("تیکِ آیتم‌ها یکی‌یکی؛ برنامه فقط وقتی همه تیک خوردن کامله", () => {
    let t = toggleTask({}, "o", items, "a");
    expect(t[itemKey("o", "a")]).toBe(true);
    expect(t.o).toBe(false);
    t = toggleTask(t, "o", items, "b");
    t = toggleTask(t, "o", items, "c");
    expect(t.o).toBe(true);
    expect(checklistProgress(t, "o", items)).toEqual({ done: 3, total: 3 });
    t = toggleTask(t, "o", items, "b");
    expect(t.o).toBe(false);
  });
  it("زدنِ عنوان: ناقص → همه تیک؛ کامل → همه برداشته", () => {
    let t = toggleTask({ [itemKey("o", "a")]: true }, "o", items);
    expect(isOccDone(t, "o", items)).toBe(true);
    expect(t.o).toBe(true);
    t = toggleTask(t, "o", items);
    expect(checklistProgress(t, "o", items).done).toBe(0);
    expect(t.o).toBe(false);
  });
  it("آیتمِ ناشناخته نادیده گرفته می‌شه؛ آیتم‌های نامعتبر فیلتر می‌شن", () => {
    expect(toggleTask({}, "o", items, "zz")).toEqual({});
    expect(checklistOf({ items: [{ id: "x", name: " " }, { id: 3 }, { id: "y", name: "ok" }] })).toEqual([{ id: "y", name: "ok" }]);
    expect(checklistOf({})).toEqual([]);
  });
});
