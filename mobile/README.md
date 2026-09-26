# آریون — اپ اندروید (mobile/)

این پوشه یک پروژه‌ی کاملا جدا و مستقل از اپ وب Next.js ریشه‌ی ریپو است:
Vite + React 18 + TypeScript + Tailwind CSS، بسته‌بندی‌شده با Capacitor
برای اندروید. رابط کاربری کاملا داخل APK باندل می‌شه (بدون `server.url`
به سمت وب‌سایت)، یعنی اپ کاملا آفلاین باز و قابل استفاده‌ست. اتصال به
بک‌اند Next.js (لاگین/سینک) بعدا اضافه می‌شه — فعلا فقط UI/شل اپه.

## پیش‌نیازها
- Node.js 20+
- برای بیلد APK واقعی: JDK 17 + Android SDK (یا Android Studio که خودش
  همه‌ی این‌ها رو داره)

## اجرای dev (پیش‌نمایش در مرورگر)
```bash
cd mobile
npm install
npm run dev
```
این فقط برای دیدن سریع UI توی مرورگره؛ پلاگین‌های Capacitor (هپتیک،
استتوس‌بار، نتورک) روی وب به‌صورت no-op غیرفعال می‌مونن و اپ سالم بالا
می‌آد.

## ساخت وب‌بیلد + سینک با پروژه‌ی اندروید
```bash
cd mobile
npm run build       # tsc -b && vite build → خروجی توی mobile/dist
npm run cap:sync    # کپی dist/ به android/app/src/main/assets/public
```

## ساخت APK — روش ۱: Android Studio
```bash
npm run android:open   # پروژه‌ی android/ رو توی Android Studio باز می‌کنه
```
از منوی Build → Build Bundle(s) / APK(s) → Build APK(s) استفاده کن.
خروجی توی `mobile/android/app/build/outputs/apk/debug/app-debug.apk`.

## ساخت APK — روش ۲: خط فرمان (gradlew)
```bash
cd mobile
npm run build && npm run cap:sync
cd android
./gradlew assembleDebug
```
نیازمند JDK 17 و Android SDK نصب‌شده (متغیر `ANDROID_HOME`/
`ANDROID_SDK_ROOT` ست‌شده). خروجی همون مسیر بالاست.

## ساخت APK — روش ۳: GitHub Actions (بدون نیاز به نصب چیزی روی سیستم خودت)
هر پوش به شاخه‌ای که فایلی زیر `mobile/**` رو تغییر داده باشه (یا اجرای
دستی از تب Actions → Android APK (mobile/) → Run workflow) یک اجرا
می‌سازه که:
1. Node 20 + JDK 17 + Android SDK رو ست‌آپ می‌کنه
2. `npm ci` توی `mobile/`
3. `npm run build` (شامل typecheck)
4. `npx cap sync android`
5. `./gradlew assembleDebug` توی `mobile/android`

خروجی (`app-debug.apk`) به‌عنوان artifact اجرا (Actions → اجرای موردنظر
→ Artifacts → `arion-debug-apk`) قابل دانلوده.

## نکات مهم
- `mobile/android` (پروژه‌ی native Capacitor) قسمتی از سورس‌کنترله؛ ولی
  `mobile/android/app/build`، `mobile/android/.gradle` و
  `mobile/android/local.properties` ماشین‌ساخته و ignore شدن.
- تم پیش‌فرض تاریکه؛ سوییچ تم توی `بیشتر ← تم` ذخیره می‌شه (`localStorage`،
  با try/catch گارد شده).
- فونت‌ها (Vazirmatn + Inter) از طریق `@fontsource-variable/*` باندل
  می‌شن — یعنی فایل‌های woff2 مستقیم داخل باندل جاوااسکریپت/CSS اپ قرار
  می‌گیرن و برای فونت هیچ اتصال اینترنتی لازم نیست.
- این پروژه به `tsconfig.json` ریشه، `.dockerignore` و `.gitignore` ریشه
  دست نمی‌زنه جز اضافه‌کردنِ خودش به exclude/ignore — بیلد و تایپ‌چک اپ
  وب اصلا تحت تاثیر قرار نمی‌گیره.
