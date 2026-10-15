import { NextResponse } from "next/server";
import { requireMentorsUser, getActiveMentorshipAsMentor, notFound, badRequest } from "@/lib/mentorGuard";
import { readJsonBody } from "@/lib/validate";
import { deleteStudentNote, updateStudentNote } from "@/lib/mentorManageServer";
import { isSealedNote } from "@/lib/e2ee/notes";
import { tr } from "@/lib/i18n";

type Ctx = { params: { studentId: string; noteId: string } };

const validId = (id: unknown) => typeof id === "string" && !!id && id.length <= 64;

// PATCH /api/mentor/students/:studentId/notes/:noteId { body } → { note }
export async function PATCH(req: Request, { params }: Ctx) {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  const m = await getActiveMentorshipAsMentor(g.userId, params.studentId);
  if (!m || !validId(params.noteId)) return notFound();

  const parsed = await readJsonBody(req, 16 * 1024);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  // فقط پاکت رمزشده (lib/e2ee/notes.ts)؛ متن ساده رد می‌شود
  const body = parsed.body?.body;
  if (!isSealedNote(body)) return badRequest(tr(tr("یادداشت باید روی دستگاه رمزگذاری شود", "The note must be encrypted on this device"), "The note must be encrypted on this device"));

  const note = await updateStudentNote(params.noteId, m.id, g.userId, body);
  if (!note) return notFound();
  return NextResponse.json({ note });
}

// DELETE /api/mentor/students/:studentId/notes/:noteId
export async function DELETE(_req: Request, { params }: Ctx) {
  const g = await requireMentorsUser();
  if (!g.ok) return g.response;
  const m = await getActiveMentorshipAsMentor(g.userId, params.studentId);
  if (!m || !validId(params.noteId)) return notFound();
  if (!(await deleteStudentNote(params.noteId, m.id, g.userId))) return notFound();
  return NextResponse.json({ ok: true });
}
