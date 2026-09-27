import { describe, it, expect, afterAll, vi } from "vitest";

vi.mock("next-auth", async (orig) => ({
  ...(await orig<any>()),
  getServerSession: vi.fn(async () => {
    const id = (globalThis as any).__mentorSessionUser;
    return id ? { user: { id, isSuperAdmin: false } } : null;
  }),
}));
vi.mock("@/lib/webPush", () => ({ sendPushToUser: vi.fn(async () => ({ sent: 0, pruned: 0 })) }));

import { GET as listMentorships, POST as postMentorship } from "@/app/api/mentorships/route";
import { as, req, j, makeUser, makeMentor, cleanupUsers, mentorshipAction, createProgram, uniqueTag } from "./helpers/mentorTestUtils";

afterAll(async () => {
  await cleanupUsers();
});

// حوزه‌ی رابطه: منتورِ روتین جدا از منتورِ بدنسازی؛ نوعِ برنامه از حوزه میاد
describe("حوزه‌ی رابطه (روتین / بدنسازی / تغذیه)", () => {
  it("شاگرد فقط حوزه‌ی «روتین» را انتخاب می‌کند → فقط برنامه‌ی ROUTINE مجاز است", async () => {
    const mentor = await makeMentor({}, { headline: "م", bio: "ب", categories: ["ROUTINE", "FITNESS"], published: true });
    const student = await makeUser();
    as(student);
    const r = await postMentorship(req("POST", "/api/mentorships", { mentorId: mentor, categories: ["ROUTINE"] }));
    expect(r.status).toBe(200);
    const row = (await j(r)).mentorship;
    expect(row.categories).toEqual(["ROUTINE"]);
    expect((await mentorshipAction(mentor, row.id, "accept")).status).toBe(200);

    expect((await createProgram(mentor, row.id, { type: "WORKOUT", items: [{ title: "اسکوات", repeat: "DAILY", sets: 3, reps: "10" }] })).status).toBe(400);
    expect((await createProgram(mentor, row.id)).status).toBe(200);

    as(student);
    const list = await j(await listMentorships(req("GET", "/api/mentorships?role=student")));
    expect(list.mentorships.find((m: any) => m.id === row.id).categories).toEqual(["ROUTINE"]);
  });

  it("حوزه‌ای که منتور ندارد یا آرایه‌ی خالی → ۴۰۰؛ نفرستادن → همه‌ی حوزه‌های منتور", async () => {
    const mentor = await makeMentor({}, { headline: "م", bio: "ب", categories: ["FITNESS"], published: true });
    const s1 = await makeUser();
    as(s1);
    expect((await postMentorship(req("POST", "/api/mentorships", { mentorId: mentor, categories: ["ROUTINE"] }))).status).toBe(400);
    expect((await postMentorship(req("POST", "/api/mentorships", { mentorId: mentor, categories: [] }))).status).toBe(400);
    expect((await postMentorship(req("POST", "/api/mentorships", { mentorId: mentor, categories: "FITNESS" }))).status).toBe(400);
    const ok = await postMentorship(req("POST", "/api/mentorships", { mentorId: mentor }));
    expect(ok.status).toBe(200);
    expect((await j(ok)).mentorship.categories).toEqual(["FITNESS"]);
  });

  it("منتور هم می‌تواند شاگرد را برای یک حوزه‌ی مشخص دعوت کند", async () => {
    const mentor = await makeMentor({}, { headline: "م", bio: "ب", categories: ["ROUTINE", "NUTRITION"], published: true });
    const username = "st" + uniqueTag().slice(0, 12);
    const student = await makeUser({ username });
    as(mentor);
    const r = await postMentorship(req("POST", "/api/mentorships", { studentUsername: username, categories: ["NUTRITION"] }));
    expect(r.status).toBe(200);
    const row = (await j(r)).mentorship;
    expect(row.categories).toEqual(["NUTRITION"]);
    expect(row.initiatedBy).toBe("MENTOR");
    expect((await mentorshipAction(student, row.id, "accept")).status).toBe(200);
    // تغذیه هنوز نوعِ برنامه‌ی خودش رو نداره → نه ROUTINE نه WORKOUT
    expect((await createProgram(mentor, row.id)).status).toBe(400);
  });
});
