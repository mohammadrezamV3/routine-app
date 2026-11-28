import { describe, it, expect } from "vitest";
import { mergeTodayItems, doseState } from "@/lib/todayMerge";
import type { DoseSlot } from "@/lib/medicationDoses";

const dose = (name: string, minutes: number): DoseSlot => ({ key: `${name}@${minutes}`, medId: name, name, time: "", minutes });

describe("mergeTodayItems", () => {
  it("sorts doses between programs by time, untimed programs last", () => {
    const progs = [{ id: "a", startMin: 480 }, { id: "b", startMin: 780 }, { id: "c", startMin: null }];
    const out = mergeTodayItems(progs, [dose("x", 600), dose("y", 900)]);
    expect(out.map((o) => (o.kind === "program" ? o.program.id : o.dose.name))).toEqual(["a", "x", "b", "y", "c"]);
  });
  it("program precedes a dose at the same minute and input is not mutated", () => {
    const progs = [{ id: "a", startMin: 600 }];
    const out = mergeTodayItems(progs, [dose("x", 600)]);
    expect(out[0].kind).toBe("program");
    expect(progs).toHaveLength(1);
  });
  it("works with no doses or no programs", () => {
    expect(mergeTodayItems([{ startMin: 1 }], [])).toHaveLength(1);
    expect(mergeTodayItems([], [dose("x", 5)])[0].kind).toBe("dose");
  });
});

describe("doseState", () => {
  it("done / missed after 30 min / upcoming", () => {
    expect(doseState(600, true, 1000)).toBe("done");
    expect(doseState(600, false, 640)).toBe("missed");
    expect(doseState(600, false, 620)).toBe("upcoming");
    expect(doseState(600, false, null)).toBe("upcoming");
  });
});
