# اکوسیستم منتور — قرارداد معماری و API

آریون فقط پلتفرمه؛ منتورها کاربرهای مستقلن. این سند قراردادِ مشترکِ بک‌اند/فرانت/ادمین/تسته.

## مدل داده (prisma/schema.prisma — بخش «اکوسیستم منتور»)
- `MentorProfile` (یکی به‌ازای User) — منتوربودن = داشتنِ این رکورد. `categories: string[]` (کلیدهای `lib/mentorCategories.ts`: `ROUTINE`، `FITNESS`، `NUTRITION`).
- `MentorCredential` (profileId+category یکتا) — مدرکِ تخصصیِ هر دسته، وضعیتِ مستقل.
- `MentorDocument` — فایلِ مدرک *داخل دیتابیس* (Bytes)، هرگز در `public/`. فقط صاحبش و ادمینِ `mentors` از روتِ مجاز می‌گیرن.
- `MentorVerificationEvent` — تاریخچه‌ی هر تغییرِ وضعیتِ هویت/مدرک.
- `Mentorship` (mentorId+studentId یکتا) — رابطه + تنظیماتِ حریم خصوصیِ *همین* رابطه.
- `MentorProgram` / `MentorProgramItem` / `MentorProgramLog` / `MentorFeedback`.
- `MentorMessage` (چت)، `MentorReview` (یکتا به‌ازای mentor+student)، `MentorReport`، `InAppNotification`.

## هسته‌ی مشترک (lib/) — دور نزن
| فایل | کاربرد |
|---|---|
| `lib/mentorGuard.ts` | `requireMentorsUser()` (سشن + فلگ `mentors` + مسدود/حذف‌نشده)، `getActiveMentorProfile`، `getMentorshipForUser(id,userId)`، `getActiveMentorshipAsMentor(mentorId,studentId)`، `roleIn`، پاسخ‌های `notFound/forbidden/badRequest/conflict`، `touchMentorActivity` |
| `lib/mentorPrivacy.ts` | کلیدهای برنامه (`routine:<tag|name>`, `module:EXERCISE`, `module:CALORIE`)، `sanitizeSharedPrograms`، `canSeeScope`، `listStudentScopes`، `projectRoutineForMentor` |
| `lib/mentorProgramState.ts` | ماشینِ حالت: `canTransition(action, from, actor)`، `isEditable`، `visibleToStudent`، برچسب‌ها |
| `lib/mentorUpload.ts` | `validateDocument(bytes, name)` — magic bytes، ۵MB، فقط JPG/PNG/WebP/PDF |
| `lib/mentorCategories.ts` | رجیستریِ دسته‌ها + برچسب‌های وضعیتِ احراز |
| `lib/inAppNotify.ts` | `notifyUser(userId, {type,title,body,url})` — ردیفِ اعلان + پوشِ best-effort؛ `displayName(user)` |

## قوانین امنیتی (همه‌ی روت‌ها)
1. اول `requireMentorsUser()` (روت‌های ادمین: `requireAdmin("mentors")`).
2. هر id از URL/بدنه فقط همراهِ userIdِ سشن در `where` استفاده می‌شه؛ «وجود نداره» و «مالِ تو نیست» هر دو ۴۰۴.
3. هیچ‌وقت آبجکتِ بدنه مستقیم به Prisma داده نمی‌شه (mass assignment) — فقط فیلدهای لیست‌شده، بعد از اعتبارسنجی/`clampText`.
4. داده‌ی شاگرد برای منتور فقط از خروجیِ `lib/mentorPrivacy.ts` + برنامه‌هایی که *خودِ همون منتور* ساخته.
5. انتقالِ وضعیت با `canTransition` + `updateMany({ where: { id, status: from } })` (قفلِ خوش‌بینانه؛ count=0 → ۴۰۹).
6. اطلاعاتِ عمومیِ کاربر فقط: `id, name, lastName, username, avatarUrl` — هرگز ایمیل/شماره/مدرک.
7. `InAppNotification.url` همیشه مسیرِ داخلی (`/…`).

## API — کاربر (همه JSON؛ خطا: `{ error: string }`)

### پروفایلِ منتوریِ خودم
- `GET /api/mentors/me` → `{ profile: MentorSelf | null }`
  `MentorSelf = { id, userId, headline, bio, specialties[], categories[], published, acceptingStudents, identityStatus, identityRejectReason, suspendedAt, suspendedReason, ratingAvg, ratingCount, credentials: {category,status,rejectReason}[], documents: {id,kind,category,fileName,mimeType,sizeBytes,createdAt}[] }`
- `PUT /api/mentors/me` بدنه `{ headline?, bio?, specialties?: string[], categories?: string[], published?, acceptingStudents? }` → `{ profile }`. ساخت در اولین بار. `published=true` فقط با حداقل یک دسته و bio. برای هر دسته‌ی انتخابی ردیفِ `MentorCredential` ساخته می‌شه (NOT_PROVIDED). وضعیتِ احراز *هرگز* از این روت نوشته نمی‌شه.
- `POST /api/mentors/me/documents` (multipart: `file`, `kind`=IDENTITY|CERTIFICATE, `category` برای CERTIFICATE) → `{ document }`؛ وضعیتِ مربوط → PENDING + event. rate limit. اگه VERIFIED بود، ارسالِ جدید دوباره PENDING می‌کنه.
- `GET /api/mentors/me/documents/[docId]` → فایل (فقط صاحبش). هدرها: `Content-Disposition: attachment`, `X-Content-Type-Options: nosniff`, `Cache-Control: private, no-store`.
- `DELETE /api/mentors/me/documents/[docId]` → فقط وقتی وضعیتِ مربوط VERIFIED نیست.

### کشف منتور
- `GET /api/mentors?q=&category=&sort=popular|rating|new&page=` → `{ mentors: MentorCard[], hasMore }`
- `GET /api/mentors/popular` → `{ mentors: MentorCard[] }` (رتبه‌بندی `lib/mentorRanking.ts`، نه صرفاً تعداد شاگرد)
  `MentorCard = { userId, name, avatarUrl, headline, categories[], identityVerified: bool, certifications: {category, verified: bool}[], ratingAvg, ratingCount, activeStudents, totalStudents, acceptingStudents }`
- `GET /api/mentors/[mentorId]` (mentorId = userId) → `{ mentor: MentorCard & { bio, specialties[], completedPrograms, lastActiveAt, memberSince }, reviews: Review[], myMentorship: { id, status, initiatedBy } | null, canReview: bool, myReview: Review | null }`
  `Review = { id, rating, body, createdAt, student: { name, avatarUrl } }` (فقط VISIBLE).

### رابطه
- `GET /api/mentorships?role=student|mentor` → `{ mentorships: { id, status, initiatedBy, message, createdAt, startedAt, endedAt, counterpart: PublicUser, unread: number, activePrograms: number, blockedByMe: boolean, categories: string[] }[] }`
- `POST /api/mentorships` بدنه `{ mentorId, message?, categories? }` (شاگرد درخواست می‌ده) یا `{ studentUsername, message?, categories? }` (منتورِ فعال دعوت می‌کنه). `categories` = حوزه‌ی رابطه (زیرمجموعه‌ی دسته‌های منتور، مثلا `["ROUTINE"]`)؛ نفرستادن = همه‌ی حوزه‌های منتور. نوعِ برنامه‌ی مجاز از حوزه میاد: ROUTINE ↔ `ROUTINE`، WORKOUT ↔ `FITNESS`؛ تغذیه فعلا نوعِ برنامه نداره (۴۰۰). → `{ mentorship }`. خود-به-خود ممنوع؛ ACTIVE/PENDING → ۴۰۹؛ BLOCKED یا UserBlock → ۴۰۳ با پیامِ عمومی؛ REJECTED/ENDED → همون ردیف PENDING می‌شه و حریم خصوصی به پیش‌فرض (هیچ برنامه‌ای) برمی‌گرده.
- `PATCH /api/mentorships/[id]` بدنه `{ action }`:
  `accept` / `reject` (فقط طرفِ غیرِ initiator، از PENDING)، `cancel` (initiator، از PENDING → ENDED)، `end` (هر طرف، از ACTIVE → ENDED؛ برنامه‌های PENDING/ACCEPTED/ACTIVE لغو و آینه‌ی روتین حذف)، `block` (هر طرف → BLOCKED)، `unblock` (فقط blockedById → ENDED).
- `GET /api/mentorships/[id]/privacy` (فقط شاگرد) → `{ privacy: PrivacySettings, scopes: {key,label,kind}[] }`
- `PUT /api/mentorships/[id]/privacy` بدنه‌ی زیرمجموعه‌ای از `{ shareAllPrograms, sharedPrograms[], showSchedule, showProgramName, showTaskName, showTaskDetails, showProgress }` → `{ privacy }`

### دیدِ منتور
- `GET /api/mentor/dashboard` → `{ profile: { published, suspendedAt, identityStatus } | null, stats: { students, activeStudents, pendingRequests, pendingPrograms, activePrograms }, requests: MentorshipRow[], pendingPrograms: ProgramRow[], recentActivity: { type: "log"|"program"|"message", at, studentName, text, url }[], completion: { studentId, name, avatarUrl, completed, partial, missed, rate }[] (۷ روزِ اخیر), attention: { studentId, name, avatarUrl, reason }[] }`
- `GET /api/mentor/students/[studentId]?from=YYYY-MM-DD&to=YYYY-MM-DD` (حداکثر ۳۱ روز؛ پیش‌فرض ۷ روزِ اخیر) → ۴۰۴ اگه رابطه‌ی ACTIVE نباشه.
  `{ student: PublicUser, mentorshipId, since, privacy: { shareAllPrograms, sharedCount, showSchedule, showProgramName, showTaskName, showTaskDetails, showProgress }, routine: { scheduleHidden, slots: MentorRoutineSlot[] }, modules: { exercise: {...} | null, calorie: {...} | null }, programs: ProgramRow[] (فقط برنامه‌های همین منتور), recentFeedback: Feedback[] }`

### برنامه
- `ProgramRow = { id, type, title, status, version, startDate, endDate, sentAt, updatedAt, mentorshipId, counterpart: PublicUser, progress: { completed, partial, missed, rate } }`
- `GET /api/mentor-programs?role=mentor|student&status=&mentorshipId=` → `{ programs: ProgramRow[] }` (شاگرد DRAFTِ هرگز-ارسال‌نشده رو نمی‌بینه)
- `POST /api/mentor-programs` (منتور) بدنه `{ mentorshipId, type: ROUTINE|WORKOUT, title, description?, startDate?, endDate?, items: ItemInput[] }` → `{ program }` (DRAFT). رابطه باید ACTIVE و متعلق به همین منتور باشه.
  `ItemInput = { title, details?, repeat: DAILY|WEEKLY, days: int[0..6], startTime?: "HH:mm", durationMin?, sets?, reps?, weightKg?, restSec? }` — حداکثر ۱۰۰ آیتم.
- `GET /api/mentor-programs/[id]?from=&to=` → `{ program: Program, role: "MENTOR"|"STUDENT", items, logs, feedback }`
- `PUT /api/mentor-programs/[id]` (منتور، فقط DRAFT) — همون بدنه‌ی POST بدون mentorshipId؛ آیتم‌ها جایگزین می‌شن.
- `DELETE /api/mentor-programs/[id]` (منتور، فقط DRAFTِ هرگز-ارسال‌نشده).
- `POST /api/mentor-programs/[id]/transition` بدنه `{ action: send|accept|reject|request_changes|activate|complete|cancel, note? }` → `{ program }`.
  - `send`: DRAFT→PENDING؛ اگه قبلا ارسال شده بود version++؛ changeRequestNote پاک می‌شه. حداقل یک آیتم لازمه.
  - `accept`: PENDING→ACCEPTED، و اگه startDate خالی یا ≤ امروز بود بلافاصله →ACTIVE.
  - `request_changes`: note اجباری → DRAFT + changeRequestNote.
  - `reject`: note اختیاری → rejectReason.
  - فعال‌شدنِ برنامه‌ی ROUTINE: آیتم‌ها به `customOccurrences`ِ شاگرد با `mentorProgramId` و `tag = عنوان برنامه` آینه می‌شن (مثلِ الگوی `roadmapId`)؛ با complete/cancel/end حذف می‌شن.
  - رابطه باید برای send/accept/activate هنوز ACTIVE باشه.
- `POST /api/mentor-programs/[id]/logs` (شاگرد، برنامه ACTIVE) بدنه `{ itemId, date: YYYY-MM-DD, status: COMPLETED|PARTIAL|MISSED, setsDone?, note? }` → `{ log }` (upsert روی itemId+date؛ تاریخِ آینده ممنوع؛ خارج از بازه‌ی برنامه ممنوع).
- `POST /api/mentor-programs/[id]/feedback` (منتور، برنامه غیرِ DRAFT) بدنه `{ body, itemId?, logId? }` → `{ feedback }`؛ item/log باید مالِ همین برنامه باشن.
- `POST /api/mentor-programs/[id]/feedback/read` (شاگرد) → همه‌ی فیدبک‌های خوانده‌نشده‌ی این برنامه read.
  `Feedback = { id, body, createdAt, readAt, itemId, logId, itemTitle }`

### چت
- `GET /api/mentorships/[id]/messages?before=<ISO>` → `{ messages: { id, body, createdAt, readAt, mine: bool }[], hasMore, canSend }` — پیام‌های دریافتی read می‌شن. رابطه‌ی ACTIVE یا ENDED (فقط‌خواندنی).
- `POST /api/mentorships/[id]/messages` بدنه `{ body }` (≤2000، فقط ACTIVE، rate limit) → `{ message }`.
- `GET /api/mentorships/unread` → `{ total, byMentorship: Record<id, number> }`

### نظر و گزارش
- `POST /api/mentors/[mentorId]/reviews` بدنه `{ rating: 1..5, body? }` — فقط شاگردی با رابطه‌ای که `startedAt` داره (ACTIVE یا ENDED بعد از فعال‌شدن)؛ تکراری → ۴۰۹. `PUT` همون مسیر = ویرایشِ نظرِ خودم؛ `DELETE` = حذفِ نظرِ خودم. خلاصه‌ی امتیاز بعد از هر تغییر بازمحاسبه می‌شه.
- `POST /api/mentor-reports` بدنه `{ targetType: USER|REVIEW|MESSAGE|PROGRAM, targetId, reason, details? }` — گزارش‌دهنده باید به هدف دسترسیِ مشروع داشته باشه؛ تکراری → ۴۰۹.

### اعلان‌ها
- `GET /api/notifications?before=<ISO>` → `{ notifications: { id,type,title,body,url,readAt,createdAt }[], unread, hasMore }`
- `PATCH /api/notifications` بدنه `{ ids?: string[], all?: true }` → `{ ok }` (فقط اعلان‌های خودم).

## API — ادمین (`requireAdmin("mentors")` + `AuditLog` برای هر اقدام)
- `GET /api/admin/mentors?tab=pending|all|suspended&q=&page=` → `{ mentors: { profileId, user: {id,name,username,avatarUrl,isBlocked}, categories, published, identityStatus, credentials, pendingCount, suspendedAt, ratingAvg, ratingCount, students, createdAt }[], total }`
- `GET /api/admin/mentors/[profileId]` → پروفایل + credentials + documents (متا) + events (تاریخچه) + آمار + گزارش‌های باز علیه این کاربر.
- `GET /api/admin/mentors/documents/[docId]` → فایل (+ AuditLog `mentor.document_view`). هدرهای امنِ بالا.
- `POST /api/admin/mentors/[profileId]/verification` بدنه `{ kind: IDENTITY|CERTIFICATE, category?, status: PENDING|VERIFIED|REJECTED|NOT_PROVIDED, reason? }` — REJECTED بدونِ reason → ۴۰۰. event + audit + اعلان به منتور (`verification.result`).
- `POST /api/admin/mentors/[profileId]/suspend` بدنه `{ suspend: bool, reason? }`.
- `GET /api/admin/mentors/reviews?status=VISIBLE|HIDDEN|reported&page=` ؛ `PATCH /api/admin/mentors/reviews/[id]` بدنه `{ status, reason? }` → بازمحاسبه‌ی امتیاز.
- `GET /api/admin/mentors/reports?status=OPEN|RESOLVED|DISMISSED&page=` ؛ `PATCH /api/admin/mentors/reports/[id]` بدنه `{ status: RESOLVED|DISMISSED, resolution?, action?: "hide_review"|"delete_message"|"suspend_mentor" }`. مسدودکردنِ کلِ حساب از همون `/admin/users` موجود انجام می‌شه (قوانینِ `lib/adminUsers.ts`).

## صفحات
- کاربر: `/mentors` (کشف + محبوب‌ها)، `/mentors/[mentorId]` (پروفایل)، `/mentorship` (منتورهای من + درخواست‌ها)، `/mentorship/[id]` (چت / برنامه‌ها / حریم خصوصی)، `/mentor-programs/[id]` (اجرای برنامه برای شاگرد، پایش + فیدبک برای منتور)
- منتور: `/mentor` (داشبورد / شروعِ منتوری)، `/mentor/profile` (پروفایل + احراز)، `/mentor/students/[studentId]`، `/mentor/programs/new?mentorshipId=`، `/mentor/programs/[id]/edit`
- ادمین: `/admin/mentors` (صف احراز + همه)، `/admin/mentors/[profileId]`، `/admin/mentors/reviews`، `/admin/mentors/reports`

## رتبه‌بندیِ «محبوب‌ها»
نه صرفاً تعداد شاگرد. `lib/mentorRanking.ts` امتیاز رو از چند سیگنالِ قابل‌اندازه‌گیری می‌سازه: میانگینِ بیزیِ امتیاز (با وزنِ تعداد نظر)، لگاریتمِ شاگردهای فعال، برنامه‌های تکمیل‌شده، نسبتِ ماندگاری (فعال ÷ کلِ شروع‌شده‌ها)، و تازگیِ فعالیت. زمان پاسخ‌گویی هنوز اندازه‌گیری نمی‌شه (مستند، نه جعلی).

## عمداً عقب‌افتاده (پیاده نشده)
- زمانِ پاسخ‌گویی به‌عنوان سیگنالِ رتبه‌بندی.
- چتِ لحظه‌ای با WebSocket — چت با polling کار می‌کنه.
- برنامه‌ی تغذیه به‌عنوانِ نوعِ برنامه (enum آماده‌ی افزودنه).
