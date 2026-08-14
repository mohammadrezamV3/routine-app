# روتین من — پروژه (Arion)

## Stack واقعی این ریپو
Next.js 14 (App Router) + React 18 + TypeScript + Tailwind CSS | Prisma + PostgreSQL (db) | NextAuth.js (credentials + Google OAuth، JWT session) | Anthropic API (`lib/anthropic.ts`، تولید رودمپ با AI) | ملی‌پیامک (OTP فراموشی رمز) | Docker + Nginx (deploy — هنوز راه‌اندازی نشده)

> توجه: این پروژه از یک نسخه‌ی اولیه‌ی Vite+React (SPA با `window.storage`) به یک اپ کامل Next.js با بک‌اند/دیتابیس واقعی مهاجرت کرده. اگر جایی توضیحات قدیمی دیدی که می‌گفت "بک‌اند و auth واقعی هنوز نیست"، دیگه درست نیست — همون‌هاست که پایین آپدیت شده.

## قوانین ثابت
- شماره‌گذاری نسخه: در `README.md` با semver ساده (`v1.4.1`) ثبت می‌شه، نه در نام فایل — چون دیگه یک فایل تک‌جزئی مثل `App.tsx` نداریم، پروژه چندفایلیه (`app/`, `components/`, `lib/`). هر تغییر قابل توجه یک خط جدید بالای `README.md` می‌گیره.
- هر بخش جدید رو بساز و تحویل بده، بدون توقف برای اجازه گرفتن — فقط تغییر رو بده و برو مرحله بعد.
- بعد از هر push به برنچ فیچر، همیشه یک Pull Request بساز (اگه از قبل باز نیست) — این صریحاً درخواستِ کاربره، فراموش نشه.
- هیچ فیچری از roadmap بلندمدت رو خودسرانه شروع نکن مگه صریح خواسته بشه.
- persistence: برای مهمان (لاگین‌نکرده) → `localStorage`؛ برای کاربر لاگین‌کرده → API واقعی روی Prisma/Postgres. این سوییچ توی `lib/storage.ts` انجام می‌شه و بقیه‌ی کامپوننت‌ها اصلاً نمی‌دونن داده از کجا میاد — این قرارداد رو نشکن.
- دسترسی به ماژول‌های پولی (ورزش/کالری/ترید/رودمپ/AI Insight) هم سمت کلاینت (`ModuleGate`) و هم سمت سرور (`lib/moduleAccess.ts` → `requireModule`) چک می‌شه. هیچ روت API پولی نباید فقط به گیت کلاینتی تکیه کنه — کلاینت قابل دور زدنه.
- طراحی مرجع پیکسل‌محور (`Last_file.html`) دیگه توی این ریپو وجود نداره — اگه کار پورت مجدد UI پیش اومد و فایل مرجع داده شد، همون قانون قبلی برقراره: صفر انحراف در انیمیشن/دکمه/آیکون، شک داشتی سمت دقیق‌تر رو انتخاب کن.
- **هیچ‌وقت خودسرانه به هیچ عنصری بک‌گراند اضافه نکن** — نه به دکمه، نه به کارت، نه به هیچ‌چیز دیگه — مگر اینکه صریحاً خواسته بشه. اگه یه عنصر باید بی‌بک‌گراند (transparent/ghost) بمونه، هر تغییر دیگه‌ای (مثل جابه‌جایی به یه ساختار DOM جدید، مثلاً پورتال‌کردن) نباید باعث بشه یه قانونِ CSS دیگه (مثل ریست سراسریِ `button{}`) رو خودش بگیره — چک کن که بعد از هر تغییری، این عنصرها همچنان transparent بمونن.

## ساختار واقعی پروژه (Next.js App Router)
```
app/
  page.tsx              # صفحه اصلی (home/calendar)
  weekly/                # برنامه هفتگی
  roadmaps/              # رودمپ‌ها (+ new, custom/[id] برای رودمپ AI)
  exercise/               # بدنسازی (پلن ورزش + کالری)
  trade/                  # ژورنال ترید
  about/                  # درباره من
  terms/                  # قوانین
  auth/                   # login, signup, forgot-password
  api/                    # همه‌ی route handler ها (account, auth, calorie, exercise, market, roadmaps, settings, tasks, trade)
components/               # همه کامپوننت‌های UI کنار هم (بدون زیرپوشه دسته‌بندی)
lib/                      # منطق مشترک: auth, prisma, storage, validate, rateLimit,
                           # moduleAccess, modules, programMeta, exercisePlans, calorieCalc,
                           # jalali/gregorian date, market, notifications, ...
prisma/
  schema.prisma           # همه مدل‌ها (User, Plan, ModuleAccess, Subscription, Payment,
                           # ReferralCode, Partner, RoutineItem, ExercisePlan, TradeEntry,
                           # Roadmap, و…)
  migrations/
  seed.ts
public/images/             # لوگو و asset های استاتیک
```
نکته: پوشه‌بندی فرضیِ قدیمی (`src/components`, `src/pages`, `src/hooks`, `src/data`) دیگه درست نیست — این پروژه از `app/` (routing) + `components/` (فلت) + `lib/` (منطق/دیتای مشترک) استفاده می‌کنه، بدون پوشه `src/`.

## روت‌های واقعی (از `NavDrawer`)
`/` (خانه) · `/weekly` (برنامه هفتگی) · `/roadmaps` + `/roadmaps/new` + `/roadmaps/custom/[id]` (رودمپ‌ها) · `/exercise` (بدنسازی) · `/trade` (ترید) · `/about` (درباره من) — به‌علاوه `/auth/login`, `/auth/signup`, `/auth/forgot-password`, `/terms` که توی nav اصلی نیستن.

## مدل پلن/ماژول (باید در ذهن بمونه)
- `ModuleKey`: `ROUTINE`, `SLEEP`, `TASKS` (همیشه در پلن پایه) + `EXERCISE`, `CALORIE`, `TRADE`, `ROADMAP`, `AI_INSIGHT` (پولی/مشروط).
- `Plan` + `PlanModule` ترکیب هر پلن رو دیتابیسی تعریف می‌کنن (نه هاردکد در کد) — پلن جدید یا تغییر ترکیب فقط تغییر داده‌ست.
- `ModuleAccess` منبع واحد تصمیم دسترسیه: سوپریوزر همیشه مجاز؛ وگرنه باید رکورد فعال و منقضی‌نشده باشه.
- ثبت‌نام معمولی و ثبت‌نام با گوگل هر دو باید از `BASIC_MODULES` (`lib/modules.ts`) برای دوره آزمایشی استفاده کنن — این لیست باید با `prisma/seed.ts` هماهنگ بمونه.

## امنیت — چی انجام شده و چی مونده
انجام‌شده (رعایتش کن، دوباره نقضش نکن):
- rate limiting در-حافظه (`lib/rateLimit.ts`) روی ثبت‌نام، ورود، و ساخت رودمپ با AI — فقط تک-instance؛ اگه چند سرور/serverless شدیم باید با Redis عوض بشه.
- اعتبارسنجی ورودی (`lib/validate.ts`) روی ثبت‌نام، ترید، کالری، ورزش، رودمپ‌ساز.
- پیام خطای عمومی در ثبت‌نام (بدون افشای اینکه دقیقاً شماره یا یوزرنیم تکراریه) — جلوگیری از User Enumeration.
- هدرهای امنیتی HTTP در `next.config.js` فقط روی production اعمال می‌شن، نه `next dev` (چون CSP سخت‌گیرانه با `eval` تداخل داره و Hot Reload رو می‌شکنه) — این تمایز رو حفظ کن.
- همه‌ی کوئری‌ها Prisma پارامتری‌شده (بدون raw SQL)، بدون `dangerouslySetInnerHTML`/`eval`، روت‌های حذف/ویرایش همیشه با `where:{id, userId}` (نه فقط `{id}`) برای جلوگیری از IDOR.
- رمز عبور با bcrypt (۱۲ round)، session با JWT امضاشده (`NEXTAUTH_SECRET`)، `isSuperAdmin` فقط سمت سرور/دیتابیس تعیین می‌شه.

هنوز مونده (قبل از لانچ واقعی):
- عوض کردن رمز پیش‌فرض سوپریوزر قبل از production (دیگه هیچ رمز پیش‌فرضی هاردکد نیست، ولی `.env` باید پر بشه).
- Rate limiting با Redis اگه چند سرور شد.
- CSP سخت‌گیرانه‌تر با nonce به‌جای `'unsafe-inline'`.
- 2FA برای حساب ادمین، لاگ‌گیری تلاش‌های مشکوک، تست نفوذ، بک‌آپ خودکار دیتابیس.

## نکات فنی مهم (باگ‌های حل‌شده — دوباره تکرار نشه)
- ترتیب declaration مهمه: تعریف‌هایی مثل `PROGRAM_META` (`lib/programMeta.ts`) نباید قبل از دیتای وابسته‌شون تعریف بشن (باعث "Cannot access before initialization" می‌شه).
- CSS injected/inline نباید camelCase property names داشته باشه (مثلاً `backgroundColor` به‌جای `background-color` در استایل خام) — مرورگر silently نادیده می‌گیره و دیباگش سخته.
- CSP سخت‌گیرانه در dev باعث می‌شه `eval` بلاک بشه و Next.js dev/Hot Reload از کار بیفته و صفحه بدون تعامل لود بشه — هدرهای امنیتی رو فقط روی production بذار.
- قبل از گفتن "شبیه شده"/"پورت کامل شد"، اگه فایل مرجع طراحی وجود داشت، پیکسل به پیکسل چکش کن (فونت واقعی، liquid-glass filter، fill-bar wave texture، flip-card opacity).

## کانونشن‌های کدنویسی
- کامپوننت‌ها: PascalCase، فایل جدا برای هرکدوم، همه توی `components/` (بدون زیرپوشه).
- استیت مشترک بین صفحات (weekly/home/day-modal/…) باید sync باشه — تغییر توی یکی باید فوراً توی بقیه منعکس بشه.
- انیمیشن‌ها و افکت‌های بصری (particle background با cursor hover/fade، hamburger X-morph، theme icon sun/moon، liquid blob) باید دقیق بمونن، نه ساده‌سازی‌شده.

## وضعیت فعلی (README: v1.4.1)
موارد زیر از roadmap قدیمی الان پیاده‌سازی شده و دیگه "بلندمدت" نیستن:
1. ✅ فیتنس پروگرام generator (`app/exercise`, `lib/exercisePlans.ts`, `ExercisePlanForm.tsx`)
2. ✅ دایت/کالری (`CaloriePanel.tsx`, `lib/foodSeed.ts`, `lib/calorieCalc.ts`, مدل‌های `FoodItem`/`CalorieTarget`)
3. ✅ trading journal (`TradeJournal.tsx`, `TradeChecklist.tsx`, `TradeDayModal.tsx`)
4. ✅ roadmap generator یادگیری با AI (`app/roadmaps/new`, `app/roadmaps/custom/[id]`, `lib/anthropic.ts`)
5. ✅ sleep tracking (مدل `SleepEntry`)
6. ✅ اکانت پنل + auth کامل (`AccountPanel.tsx`, `app/auth/*`, NextAuth + Google OAuth)
7. ✅ لوگو (`public/images/logo-*`)
8. ➕ سیستم پلن/اشتراک/رفرال/پارتنر که در roadmap قدیمی اصلاً نبود (`Plan`, `Subscription`, `Payment`, `ReferralCode`, `Partner`, `AiUsageRecord`)

هنوز راه‌اندازی نشده: دیپلوی روی سرور شخصی (Docker+Nginx)، اپ اندروید (PWA/React Native)، 2FA و امنیت سطح لانچ.

## Roadmap بلندمدت باقی‌مانده (فقط یادآوری، هنوز نساز مگه خواسته بشه)
1. اپ اندروید (PWA/React Native)
2. مارکتینگ/برندینگ
3. باگ‌هانتینگ کلی
4. تکمیل امنیت سطح لانچ (لیست بالا: Redis rate limit، CSP nonce، 2FA، مانیتورینگ، پنتست، بک‌آپ)
5. cross-browser optimization
6. دیپلوی روی سرور شخصی (Docker + Nginx)
7. code cleanup کلی

## ignore
node_modules, .next, dist, build, *.log, .env, tsconfig.tsbuildinfo
