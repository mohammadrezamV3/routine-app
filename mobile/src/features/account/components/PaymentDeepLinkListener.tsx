import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { isPaymentResultUrl } from "../browser";
import { loadPendingCheckout } from "../logic";
import { accountRoutePaths } from "../paths";

/**
 * یک‌بار داخلِ Router سوار بشه (لید، کنارِ بقیه‌ی providerها). دو کار:
 *   • دیپ‌لینکِ arion://payment-result (بعد از اضافه شدنِ intent-filter —
 *     mobile/README-billing.md) → صفحه‌ی نتیجه‌ی آخرین checkout.
 *   • شروعِ سرد: اگه اپ حینِ پرداخت توسطِ سیستم کشته شده بود و checkout ِ
 *     نیمه‌کاره (≤۲ ساعت) مونده، کاربر به صفحه‌ی نتیجه برده می‌شه.
 * هیچ پارامتری از خودِ دیپ‌لینک باور نمی‌شه — فقط id ِ ذخیره‌شده‌ی محلی، و
 * وضعیت همیشه از سرور پرسیده می‌شه.
 */
export default function PaymentDeepLinkListener({ resumeOnLaunch = true }: { resumeOnLaunch?: boolean }) {
  const navigate = useNavigate();

  useEffect(() => {
    const goToPending = () => {
      const id = loadPendingCheckout();
      if (id) navigate(accountRoutePaths.payment(id));
    };
    if (resumeOnLaunch && !window.location.pathname.startsWith("/account/payment/")) goToPending();
    if (!Capacitor.isNativePlatform()) return;
    let remove: (() => void) | null = null;
    let cancelled = false;
    import("@capacitor/app")
      .then(({ App }) =>
        App.addListener("appUrlOpen", (e) => {
          if (isPaymentResultUrl(e.url)) goToPending();
        })
      )
      .then((h) => {
        if (cancelled) void h.remove();
        else remove = () => void h.remove();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      remove?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
