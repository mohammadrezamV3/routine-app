# راهنمای ریلیز اپ اندروید (آریون)

این سند مراحل ساخت keystore، تنظیم سکرت‌ها روی گیت‌هاب، و گرفتن یک بیلد امضاشده (APK برای بازار، AAB برای گوگل‌پلی) رو توضیح می‌ده. Workflow مربوطه: `.github/workflows/android-release.yml`.

## ۱. ساخت keystore

اگه هنوز keystore نساختی، این دستور رو (با نصب JDK) اجرا کن:

```bash
keytool -genkeypair -v \
  -keystore arion-release.keystore \
  -alias arion-release \
  -keyalg RSA -keysize 2048 -validity 10000
```

نکات:
- `-alias` همون مقداریه که بعدا توی سکرت `ANDROID_KEY_ALIAS` می‌ذاری (اینجا `arion-release`).
- ازت دو تا رمز می‌پرسه: رمز خود فایل keystore (`ANDROID_KEYSTORE_PASSWORD`) و رمز کلید (`ANDROID_KEY_PASSWORD`). می‌تونن یکسان باشن ولی جدا نگه‌داشتنشون امن‌تره.
- `-validity 10000` یعنی حدود ۲۷ سال اعتبار — چون تمدید keystore بعد از انقضا یعنی دیگه نمی‌تونی همون اپ رو آپدیت کنی، بهتره خیلی طولانی بذاری.

## ۲. بک‌آپ گرفتن (خیلی مهم)

**اگه این فایل گم بشه یا رمزش یادت بره، دیگه هیچ‌وقت نمی‌تونی نسخه‌ی جدید همین اپ (`ir.arion.app`) رو منتشر کنی** — نه توی بازار، نه توی گوگل‌پلی. گوگل‌پلی و بازار هر دو فقط آپدیتی که با همون کلید امضا شده باشه رو قبول می‌کنن؛ باید از صفر با یه `applicationId` جدید منتشر کنی و همه‌ی نصب‌ها/ریویوها/رتبه‌بندی قبلی از دست می‌ره.

پس:
- فایل `arion-release.keystore` رو حداقل توی دو جای امن جدا از هم نگه دار (مثلا یک پسورد منیجر با پیوست فایل + یک درایو ابری خصوصی). **توی گیت کامیت نکن.**
- رمزهای keystore و key رو هم جدا (مثلا توی همون پسورد منیجر) ذخیره کن، نه فقط توی حافظه.
- اگه از این پروژه/تیم رفتی، حتما این فایل و رمزها رو به نفر بعدی تحویل بده.

## ۳. تبدیل به base64 (برای سکرت گیت‌هاب)

```bash
base64 -w0 arion-release.keystore > arion-release.keystore.b64
cat arion-release.keystore.b64
```

(روی مک به‌جای `-w0` از `base64 arion-release.keystore | tr -d '\n'` استفاده کن.)

خروجی همین یک خط base64 رو کپی کن — این می‌شه مقدار سکرت `ANDROID_KEYSTORE_BASE64`.

## ۴. سکرت‌ها و varها روی گیت‌هاب

توی ریپو برو به `Settings > Secrets and variables > Actions`.

### Secrets (این‌ها مقدارشون مخفی می‌مونه و توی لاگ echo نمی‌شن)

| اسم | مقدار |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | خروجی مرحله‌ی ۳ |
| `ANDROID_KEYSTORE_PASSWORD` | رمز فایل keystore |
| `ANDROID_KEY_ALIAS` | alias کلید (مثلا `arion-release`) |
| `ANDROID_KEY_PASSWORD` | رمز خود کلید |
| `MOBILE_API_BASE_URL` | آدرس واقعی API بک‌اند برای بیلد ریلیز (مثلا `https://arion.example.com`) |

### Variables (مقدار غیرحساسه، برای بیلد دیباگ)

| اسم | مقدار |
|---|---|
| `MOBILE_API_BASE_URL_DEBUG` | آدرس API برای بیلد دیباگ (می‌تونه خالی هم بمونه، مثلا وقتی از localhost استفاده می‌کنی) |

## ۵. گرفتن یک ریلیز

Workflow با دو تا trigger کار می‌کنه:

1. **push کردن یک تگ به شکل `mobile-v*`** — مثلا:
   ```bash
   git tag mobile-v3
   git push origin mobile-v3
   ```
   عدد بعد از `mobile-v` مستقیم می‌شه `versionCode` (پس هر بار باید از قبلی بزرگ‌تر باشه — هم بازار و هم گوگل‌پلی آپدیت با `versionCode` مساوی یا کمتر از نسخه‌ی نصب‌شده رو رد می‌کنن). وقتی از تگ اجرا بشه، در پایان یک GitHub Release هم با APK و AAB پیوست‌شده ساخته می‌شه.

2. **اجرای دستی (`workflow_dispatch`)** از تب Actions — برای تست بدون نیاز به تگ زدن. توی این حالت `versionCode` از شماره‌ی اجرای Actions (`GITHUB_RUN_NUMBER`) گرفته می‌شه.

`versionName` هم به‌صورت خودکار از `mobile/package.json` (فیلد `version`) خونده می‌شه؛ قبل از تگ زدن اگه شماره‌نسخه عوض شده، اول `package.json` رو آپدیت کن.

بعد از اتمام، خروجی‌ها رو از تب Actions همون ران (بخش Artifacts) یا از GitHub Release دانلود کن:
- `arion-release-apk` → فایل `app-release.apk`
- `arion-release-aab` → فایل `app-release.aab`

## ۶. بازار (Cafebazaar) در مقابل گوگل‌پلی

- **بازار (Cafebazaar)**: فایل **APK** رو آپلود کن (`app-release.apk`). بازار از AAB پشتیبانی نمی‌کنه.
- **گوگل‌پلی**: فایل **AAB** رو آپلود کن (`app-release.aab`) — Play Console خودش از روی AAB، APKهای بهینه‌شده برای هر دستگاه می‌سازه. APK رو فقط برای تست دستی/نصب مستقیم نگه دار.

## ۷. قوانین versionCode

- `versionCode` باید عدد صحیح باشه و **هر ریلیز جدید حتما بزرگ‌تر از قبلی** باشه — هم بازار، هم گوگل‌پلی آپدیتی با `versionCode` مساوی یا کمتر رو رد می‌کنن.
- ساده‌ترین راه: از تگ `mobile-vN` استفاده کن و هر بار `N` رو یکی زیاد کن (`mobile-v1`, `mobile-v2`, ...).
- `versionName` (نسخه‌ی قابل‌نمایش برای کاربر، مثل `1.2.0`) جداست و لازم نیست عددی صعودی باشه، ولی بهتره با نسخه‌ی وب/بک‌اند هماهنگ بمونه — همون فیلد `version` توی `mobile/package.json`.
- اگه لازم شد versionCode رو دستی override کنی (مثلا برای یک هات‌فیکس بین دو تگ)، می‌تونی هنگام اجرای دستی workflow، مقدار env `ANDROID_VERSION_CODE` رو توی خود `build.gradle` موقتا ست کنی؛ ولی روش پیش‌فرض و توصیه‌شده همون تگ‌زدنه.

## نکات امنیتی

- هیچ‌وقت فایل keystore یا رمزهاش رو توی گیت کامیت نکن.
- Workflow هیچ سکرتی رو echo/print نمی‌کنه؛ فایل keystore دیکد‌شده بعد از بیلد پاک می‌شه (`rm -f`).
- بیلدهای دیباگ (`android-apk.yml`) امضای release ندارن و فقط برای تست داخلی هستن — هیچ‌وقت این APK رو منتشر نکن.
