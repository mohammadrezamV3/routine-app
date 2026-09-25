# خرید پلن از اپ — یادداشتِ فنی

## جریان (ارائه‌دهنده‌ی فعلی: `web`)

1. `GET /api/mobile/billing/plans` — پلن‌ها از `Plan`/`PlanModule` ِ دیتابیس، مبلغ از `lib/planPricing.ts` (سمتِ سرور).
2. `POST /api/mobile/billing/discount` — فقط پیش‌نمایشِ کد تخفیف/رفرال (بدونِ عارضه؛ کلیدِ rate limit مشترک با وب).
3. `POST /api/mobile/billing/checkout` — ردیفِ `MobileCheckout` با وضعیتِ `PENDING` (مالِ همین `userId`) + `checkoutUrl`:
   `https://<site>/api/mobile/billing/handoff?t=<token>`. توکن ۳۲ بایتِ تصادفی است، فقط SHA-256ش ذخیره می‌شود، حداکثر ۱۰ دقیقه عمر دارد و یک‌بارمصرف است (`updateMany` ِ اتمیک).
4. اپ آدرس را با **مرورگرِ سیستم** باز می‌کند (`@capacitor/browser`؛ اگر نصب نباشد `window.open`). هیچ Bearer‌ای در آدرس نیست.
5. `handoff` توکن را مصرف می‌کند، یک نشستِ وبِ **۳۰ دقیقه‌ای** (ردیفِ `Session` با provider `mobile-checkout`، در «دستگاه‌های فعال» قابلِ ابطال) می‌سازد و به همان صفحه‌ی `/subscription/checkout?plan=…&duration=…` ِ وب ریدایرکت می‌کند.
6. پرداخت و برگشتِ درگاه **دقیقا همان مسیرِ وب** است: `/api/subscription/checkout` → زیبال → `/api/subscription/verify`. اعطای `ModuleAccess` فقط همان‌جا و فقط بعد از verify ِ زیبال و تطبیقِ مبلغ انجام می‌شود.
7. بعد از برگشت به اپ (بسته‌شدنِ Custom Tab، resume، یا `arion://payment-result`): `GET /api/mobile/billing/status/:checkoutId` (فقط مالِ خودِ کاربر، وگرنه ۴۰۴). `PAID` فقط وقتی که یک `Payment` با `paidAt` پر، روی اشتراکی از همین کاربر و همین پلن، بعد از لحظه‌ی بازشدنِ لینک وجود داشته باشد. سپس اپ `GET /api/mobile/me` را صدا می‌زند (`AccountApi.refreshAccount`).

محدودیت‌های فعلی:
- کدِ تخفیف در صفحه‌ی پرداختِ وب پیش‌پر نمی‌شود (صفحه‌ی وب این پارامتر را نمی‌خواند)؛ اپ به کاربر می‌گوید آن‌جا هم واردش کند.
- `verify` ِ وب بعد از پرداخت به `/subscription?checkout=success` می‌رود، نه به `arion://`. برگشت به اپ با بستنِ تب/resume تشخیص داده می‌شود. اگر بعدا بخواهید برگشتِ خودکار باشد، verify باید (مثلا با یک کوکیِ `mobile_checkout`) به `arion://payment-result` ریدایرکت کند — بدونِ هیچ پارامترِ قابلِ اعتمادی؛ اپ همیشه از سرور می‌پرسد.

## کافه‌بازار / گوگل‌پلی

هر دو فروشگاه برای «کالای دیجیتال داخلِ اپ» ممکن است استفاده از پرداختِ درون‌برنامه‌ای خودشان را الزامی کنند
(کافه‌بازار: **Poolakey**؛ گوگل‌پلی: **Play Billing**) و پرداختِ بیرونی را دلیلِ رد/حذف بدانند. قبل از انتشار در هر فروشگاه،
قوانینِ فعلی‌اش را چک کنید.

برای همین سمتِ سرور یک اینترفیسِ `BillingProvider` (`lib/mobileBilling.ts`) وجود دارد و ستونِ `provider` روی `MobileCheckout`.
ارائه‌دهنده‌ی فروشگاهی آینده باید:
- خرید را در اپ با SDK ِ فروشگاه انجام دهد،
- توکنِ خرید را به یک روتِ سروری بفرستد که آن را **با API ِ سروریِ خودِ فروشگاه** verify کند (هیچ‌وقت ادعای کلاینت را باور نکند)،
- اعطای ماژول را از همان منطقِ اعطای verify ِ وب انجام دهد (بهتر است آن منطق اول به یک تابعِ مشترک در `lib/` منتقل شود).

## intent-filter برای `arion://payment-result` (لید اعمال کند)

داخلِ `<activity android:name=".MainActivity" …>` در `android/app/src/main/AndroidManifest.xml`:

```xml
<intent-filter android:autoVerify="false">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="arion" android:host="payment-result" />
</intent-filter>
```

اپ به هیچ پارامتری از این دیپ‌لینک اعتماد نمی‌کند؛ فقط `checkoutId` ِ ذخیره‌شده‌ی محلی را برمی‌دارد و وضعیت را از سرور می‌پرسد
(`PaymentDeepLinkListener`).

## wiring (لید)

- وابستگی: `npm i @capacitor/browser` در `mobile/` و `npx cap sync android`.
- `App.tsx`: `<Route path="/account/*" element={<AccountRoutes />} />` و یک‌بار `<PaymentDeepLinkListener />` داخلِ Router.
- `SyncProvider`: `<AccountApiProvider value={createAccountApi(request, { refreshAccount })}>` — نمونه در `src/features/account/api.ts`.
- زنگوله با بَج: `<NoticesBell />` در `right` ِ `AppHeader`؛ ورودیِ منو: لینک به `/account` (`AccountHub`).
