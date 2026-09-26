import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import type { MobileCheckoutStatusResponse } from "@/lib/account-contract";
import { AccountApiError, describeAccountError, useAccountApi } from "../api";
import { onReturnFromCheckout } from "../browser";
import { clearPendingCheckout, formatIsoJalali, pollCheckoutStatus } from "../logic";
import { refreshNotices } from "../useNotices";
import { accountRoutePaths } from "../paths";
import { ErrorBox, PrimaryButton } from "../components/Ui";

// بعد از باز کردنِ صفحه‌ی پرداخت: منتظرِ برگشتِ کاربر (بسته‌شدنِ Custom Tab،
// resume یا arion://payment-result) و بعد پرسیدنِ وضعیت از سرور. «موفق» فقط
// وقتی نشون داده می‌شه که سرور از روی پرداختِ verify‌شده بگه PAID — اپ هیچ
// نشانه‌ای از خودِ مرورگر/آدرس رو باور نمی‌کنه.
export default function PaymentResultScreen() {
  const { checkoutId = "" } = useParams();
  const location = useLocation();
  const discountCode = (location.state as { discountCode?: string | null } | null)?.discountCode ?? null;
  const api = useAccountApi();
  const navigate = useNavigate();
  const [status, setStatus] = useState<MobileCheckoutStatusResponse | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const running = useRef(false);
  const done = useRef(false);

  const check = useCallback(async () => {
    if (running.current || done.current) return;
    running.current = true;
    setChecking(true);
    setError(null);
    try {
      const r = await pollCheckoutStatus(() => api.checkoutStatus(checkoutId), { onUpdate: setStatus });
      if (r?.final) {
        done.current = true;
        clearPendingCheckout();
        if (r.status === "PAID") {
          await api.refreshAccount().catch(() => {});
          refreshNotices(api, true).catch(() => {});
        }
      }
    } catch (e) {
      if (e instanceof AccountApiError && e.status === 404) {
        done.current = true;
        clearPendingCheckout();
      }
      setError(describeAccountError(e));
    } finally {
      running.current = false;
      setChecking(false);
    }
  }, [api, checkoutId]);

  useEffect(() => {
    void check();
    return onReturnFromCheckout(() => void check());
  }, [check]);

  const s = status?.status;
  return (
    <div>
      <AppHeader title="نتیجه‌ی پرداخت" showBack />
      <main className="flex flex-col items-center gap-3 px-6 pt-12 text-center font-vazir">
        {s === "PAID" ? (
          <>
            <CheckCircle2 size={48} color="var(--pnl-win)" />
            <p className="text-[16px] font-semibold" style={{ color: "var(--text)" }}>
              پرداخت تأیید شد
            </p>
            <p className="text-[13px] leading-6" style={{ color: "var(--muted)" }}>
              پلنت فعال شد{status?.subscriptionExpiresAt ? ` و تا ${formatIsoJalali(status.subscriptionExpiresAt)} اعتبار دارد` : ""}.
            </p>
          </>
        ) : s === "EXPIRED" ? (
          <>
            <XCircle size={48} color="var(--pnl-loss)" />
            <p className="text-[16px] font-semibold" style={{ color: "var(--text)" }}>
              پرداختی ثبت نشد
            </p>
            <p className="text-[13px] leading-6" style={{ color: "var(--muted)" }}>
              اگر مبلغی از حسابت کم شده، طبقِ قوانینِ بانکی ظرفِ ۷۲ ساعت برمی‌گردد. می‌توانی دوباره امتحان کنی.
            </p>
          </>
        ) : (
          <>
            <Clock size={48} color="var(--accent)" />
            <p className="text-[16px] font-semibold" style={{ color: "var(--text)" }}>
              {s === "OPENED" ? "در انتظارِ تأییدِ پرداخت…" : "صفحه‌ی پرداخت در مرورگر باز شد"}
            </p>
            <p className="text-[13px] leading-6" style={{ color: "var(--muted)" }}>
              پرداخت را در مرورگر کامل کن و بعد به اپ برگرد؛ وضعیت خودکار بررسی می‌شود.
              {discountCode ? ` کدِ تخفیف (${discountCode}) را در صفحه‌ی پرداخت وارد کن.` : ""}
            </p>
          </>
        )}

        {error && <div className="w-full pt-2"><ErrorBox message={error} /></div>}

        <div className="flex w-full flex-col gap-2 pt-6">
          {s === "PAID" ? (
            <PrimaryButton onClick={() => navigate("/", { replace: true })}>بازگشت به خانه</PrimaryButton>
          ) : s === "EXPIRED" ? (
            <PrimaryButton onClick={() => navigate(accountRoutePaths.plans, { replace: true })}>انتخابِ دوباره‌ی پلن</PrimaryButton>
          ) : (
            <PrimaryButton onClick={() => void check()} disabled={checking}>
              {checking ? "در حال بررسی…" : "بررسیِ وضعیت"}
            </PrimaryButton>
          )}
          <button type="button" onClick={() => navigate(accountRoutePaths.support)} className="text-[13px]" style={{ color: "var(--muted)", minHeight: 44 }}>
            مشکلی پیش آمد؟ تماس با پشتیبانی
          </button>
        </div>
      </main>
    </div>
  );
}
