import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, CreditCard } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { useNetworkStatus } from "@/lib/useNetworkStatus";
import type { MobileBillingPlansResponse } from "@/lib/account-contract";
import { describeAccountError, useAccountApi } from "../api";
import { formatIsoJalali, formatToman, MODULE_LABELS } from "../logic";
import { accountRoutePaths } from "../paths";
import { Empty, ErrorBox, Loading, SectionTitle } from "../components/Ui";

export default function PlansScreen() {
  const api = useAccountApi();
  const navigate = useNavigate();
  const online = useNetworkStatus();
  const [data, setData] = useState<MobileBillingPlansResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    api.listPlans().then(setData, (e) => setError(describeAccountError(e)));
  }, [api]);

  useEffect(() => {
    if (online) load();
  }, [online, load]);

  return (
    <div>
      <AppHeader title="پلن‌ها" showBack />
      <main className="pb-6 pt-2">
        {!online && !data && <Empty icon={<CreditCard size={40} color="var(--muted)" />} text="برای دیدنِ پلن‌ها به اینترنت وصل شو" />}
        {error && <ErrorBox message={error} onRetry={load} />}
        {online && !data && !error && <Loading />}

        {data?.subscription && (
          <>
            <SectionTitle>اشتراکِ فعلی</SectionTitle>
            <div className="mx-4 rounded-card border px-4 py-3 font-vazir" style={{ borderColor: "var(--surface-line)" }}>
              <div className="text-[14.5px] font-semibold" style={{ color: "var(--text)" }}>
                {data.subscription.planName}
                {data.subscription.status === "TRIAL" ? " (آزمایشی)" : ""}
              </div>
              <div className="mt-1 text-[12.5px]" style={{ color: "var(--muted)" }}>
                تا {formatIsoJalali(data.subscription.expiresAt)}
              </div>
            </div>
          </>
        )}

        {data && (
          <>
            <SectionTitle>انتخابِ پلن</SectionTitle>
            <div className="flex flex-col gap-2.5 px-4">
              {data.plans
                .filter((p) => !p.free)
                .map((p) => {
                  const monthly = p.prices.find((x) => x.duration === "1");
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => navigate(accountRoutePaths.plan(p.key))}
                      disabled={!data.checkoutAvailable}
                      className="rounded-card border px-4 py-3 text-start font-vazir"
                      style={{ borderColor: p.current ? "var(--accent)" : "var(--surface-line)", opacity: data.checkoutAvailable ? 1 : 0.6 }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="flex-1 text-[15px] font-semibold" style={{ color: "var(--text)" }}>
                          {p.name}
                        </span>
                        {p.current && (
                          <span className="text-[11.5px] font-semibold" style={{ color: "var(--accent)" }}>
                            پلنِ فعلی
                          </span>
                        )}
                      </div>
                      {monthly && (
                        <div className="mt-1 text-[13px]" style={{ color: "var(--muted)" }}>
                          از {formatToman(monthly.upgradeAmount ?? monthly.amount)} / ماه
                        </div>
                      )}
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                        {p.modules.map((m) => (
                          <span key={m} className="flex items-center gap-1 text-[12px]" style={{ color: "var(--text)" }}>
                            <Check size={13} color="var(--accent)" />
                            {MODULE_LABELS[m] ?? m}
                          </span>
                        ))}
                      </div>
                    </button>
                  );
                })}
            </div>
            {!data.checkoutAvailable && (
              <p className="px-4 pt-3 font-vazir text-[12.5px]" style={{ color: "var(--muted)" }}>
                پرداخت هنوز روی سرور فعال نشده — به‌زودی.
              </p>
            )}
            <p className="px-4 pt-4 font-vazir text-[11.5px] leading-6" style={{ color: "var(--muted)" }}>
              پرداخت در صفحه‌ی امنِ سایتِ آریون و درگاهِ بانکی انجام می‌شود؛ اپ هیچ اطلاعاتِ کارتی نمی‌بیند.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
