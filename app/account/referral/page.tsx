"use client";

import { useCallback, useEffect, useState } from "react";
import { Wallet, Link2, Copy, Check, Share2, Users, Receipt } from "lucide-react";
import { AccountPageHead, AccountBlock, AccountSkeleton } from "@/components/AccountUI";
import { toJalali, jMonthName } from "@/lib/jalali";
import { walletDescriptionText } from "@/lib/subscriptionI18n";
import { tr, isEn } from "@/lib/i18n";

type InviteStatus = "PENDING" | "REWARDED" | "REVOKED";
type Invite = {
  id: string;
  status: InviteStatus;
  createdAt: string;
  rewardedAt: string | null;
  rewardAmount: number | null;
  inviteeName: string | null;
};
type TxType = "REFERRAL_REWARD" | "CHECKOUT_REDEMPTION" | "ADMIN_ADJUSTMENT";
type Transaction = {
  id: string;
  type: TxType;
  amount: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
};
type ReferralData = {
  code: string;
  shareUrl: string;
  walletBalance: number;
  currency: "IRR" | "USD";
  invites: Invite[];
  transactions: Transaction[];
};

// مبلغ خام (ریال برای ایران، سنت برای بین‌المللی) → همون قاعده‌ی نمایشی
// بقیه‌ی سایت: تومان با جداکننده‌ی هزارگان برای ایران (نگاه کن به
// components/PlanShowcase.tsx)، دلار با دو رقم اعشار برای بین‌المللی.
function formatMoney(amount: number, currency: "IRR" | "USD"): string {
  if (currency === "USD") {
    return "$" + (amount / 100).toLocaleString("en-US", { minimumFractionDigits: 2 });
  }
  return Math.round(amount / 10).toLocaleString("en-US") + tr(" تومان", " Toman");
}

const inviteStatusLabels = (): Record<InviteStatus, string> => ({
  PENDING: tr("در انتظار خرید", "Waiting for purchase"),
  REWARDED: tr("پاداش داده شد", "Reward given"),
  REVOKED: tr("باطل‌شده", "Revoked"),
});

// تاریخ دعوت/تراکنش: فارسی با تقویم جلالی و ارقام لاتین؛ انگلیسی هم جلالی با ماه به حروف
function formatInviteDate(iso: string): string {
  const d = new Date(iso);
  if (!isEn()) return d.toLocaleDateString("fa-IR-u-nu-latn");
  const [jy, jm, jd] = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return `${jd} ${jMonthName(jm - 1)} ${jy}`;
}

// صفحه‌ی رفرال — دعوت دوستان با کد/لینک شخصی؛ وقتی دوست اولین خریدش رو
// انجام بده، 10٪ از مبلغ واقعا پرداخت‌شده به‌صورت اعتبار درون‌اپی به کیف
// دعوت‌کننده اضافه می‌شه. این صفحه مثل بقیه‌ی زیرصفحه‌های /account خودش
// چک auth نمی‌کنه — همون گیت app/account/layout.tsx قبلش نشسته.
export default function ReferralPage() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(() => {
    setFailed(false);
    fetch("/api/referral")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setData(d); else setFailed(true); })
      .catch(() => setFailed(true));
  }, []);

  useEffect(() => { load(); }, [load]);

  const title = tr("رفرال", "Referral");

  if (!data) {
    return (
      <section>
        <AccountPageHead title={title} />
        {failed ? (
          <div className="ap-card account-card">
            <div className="ap-empty">
              <div>{tr("اطلاعات رفرال باز نشد", "Could not load your referral details")}</div>
              <button type="button" className="btn btn-outline btn-sm" style={{ marginTop: 12 }} onClick={load}>{tr("تلاش دوباره", "Try again")}</button>
            </div>
          </div>
        ) : <AccountSkeleton blocks={3} />}
      </section>
    );
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(data!.shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // کلیپ‌بورد روی بعضی مرورگرهای قدیمی/غیر https ممکنه رد کنه — بی‌صدا
      // نادیده می‌گیریم، دکمه فقط به حالت عادی برمی‌گرده.
    }
  }

  const canShare = typeof navigator !== "undefined" && typeof (navigator as any).share === "function";

  async function shareLink() {
    try {
      await (navigator as any).share({ title: tr("رفرال", "Referral"), url: data!.shareUrl });
    } catch {
      // کاربر شیت اشتراک‌گذاری رو کنسل کرده یا مرورگر ساپورت نمی‌کرده — نیازی
      // به نشان‌دادن خطا نیست.
    }
  }

  const rewarded = data.invites.filter((i) => i.status === "REWARDED").length;

  return (
    <section>
      <AccountPageHead
        title={title}
        hint={tr("دوستت رو با لینک رفرال خودت دعوت کن — وقتی اولین خرید پلنش رو انجام بده، 10٪ از مبلغی که واقعا پرداخت کرده به‌صورت اعتبار به کیف تو اضافه می‌شه. این اعتبار فقط داخل همین اپ و فقط برای کم‌کردن قیمت خرید پلن‌های بعدی قابل‌استفاده‌ست — هیچ‌وقت قابل‌برداشت یا قابل‌استفاده‌ی بیرون از اپ نیست.", "Invite a friend with your referral link. When they make their first plan purchase, 10% of the amount they actually paid is added to your wallet as credit. This credit can only be used inside the app, only to reduce the price of future plan purchases, and can never be withdrawn or used outside the app.")}
      />

      {/* کیف پول */}
      <div className="ap-card account-card ap-wallet m-rise">
        <span className="ap-block-icon" aria-hidden="true"><Wallet /></span>
        <div style={{ minWidth: 0 }}>
          <div className="ap-wallet-amount mono" dir="ltr">{formatMoney(data.walletBalance, data.currency)}</div>
          <div className="ap-wallet-cap">
            {tr("اعتبار قابل‌استفاده برای خرید پلن‌ها — غیرقابل‌برداشت", "Credit you can use to buy plans. Not withdrawable")}
          </div>
        </div>
      </div>

      {/* کد/لینک رفرال */}
      <AccountBlock title={tr("کد و لینک دعوت", "Invite code and link")} icon={<Link2 />} index={1}>
        <div className="ap-invite-top">
          <span className="ap-invite-code mono" dir="ltr">{data.code}</span>
          {/* ردیف اقدام: اشتراک‌گذاری (تونال) و بعد کپی لینک (اصلی، آخر ردیف) */}
          <div className="ap-invite-actions">
            {canShare && (
              <button type="button" className="btn btn-tonal" onClick={shareLink}>
                <Share2 size={16} aria-hidden="true" /> {tr("اشتراک‌گذاری", "Share")}
              </button>
            )}
            <button type="button" className="btn btn-primary" onClick={copyLink}>
              {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />} {copied ? tr("کپی شد", "Copied") : tr("کپی لینک", "Copy link")}
            </button>
          </div>
        </div>
        <span className="ap-invite-link mono" dir="ltr">{data.shareUrl}</span>
      </AccountBlock>

      {/* دعوت‌ها */}
      <section className="ap-block m-rise" style={{ "--i": 2 } as React.CSSProperties}>
        <div className="acc-block-body ap-card ap-block-body flush">
          <div className="ap-block-head">
            <span className="ap-block-icon" aria-hidden="true"><Users /></span>
            <h2 className="ap-block-title">{tr("دعوت‌های تو", "Your invites")}</h2>
            {data.invites.length > 0 && (
              <span className="ap-count mono" dir="ltr">{rewarded}/{data.invites.length}</span>
            )}
          </div>
          <div className="ap-block-content">
            {data.invites.length === 0 ? (
              <div className="ap-empty">{tr("هنوز کسی رو دعوت نکردی", "You have not invited anyone yet")}</div>
            ) : (
              data.invites.map((inv, i) => (
                <div key={inv.id} className="ap-row-wrap m-rise" style={{ "--i": Math.min(i, 8) } as React.CSSProperties}>
                  <div className="ap-row">
                    <span className="ap-row-icon" aria-hidden="true"><Users size={16} /></span>
                    <span className="ap-row-body">
                      <span className="ap-row-label">{inv.inviteeName || tr("کاربر", "User")}</span>
                      <span className="ap-row-desc mono" dir="ltr">{formatInviteDate(inv.createdAt)}</span>
                    </span>
                    <span className="ap-row-end" style={{ flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                      <span className={`ap-status is-${inv.status.toLowerCase()}`}>{inviteStatusLabels()[inv.status]}</span>
                      {inv.status === "REWARDED" && inv.rewardAmount != null && (
                        <span className="ap-amount mono" dir="ltr">+{formatMoney(inv.rewardAmount, data.currency)}</span>
                      )}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* تاریخچه‌ی کیف */}
      <section className="ap-block m-rise" style={{ "--i": 3 } as React.CSSProperties}>
        <div className="acc-block-body ap-card ap-block-body flush">
          <div className="ap-block-head">
            <span className="ap-block-icon" aria-hidden="true"><Receipt /></span>
            <h2 className="ap-block-title">{tr("تاریخچه‌ی کیف", "Wallet history")}</h2>
          </div>
          <div className="ap-block-content">
            {data.transactions.length === 0 ? (
              <div className="ap-empty">{tr("هنوز تراکنشی توی کیفت ثبت نشده", "No wallet transactions yet")}</div>
            ) : (
              data.transactions.map((tx, i) => (
                <div key={tx.id} className="ap-row-wrap m-rise" style={{ "--i": Math.min(i, 8) } as React.CSSProperties}>
                  <div className="ap-row">
                    <span className="ap-row-icon" aria-hidden="true"><Receipt size={16} /></span>
                    <span className="ap-row-body">
                      <span className="ap-row-label">{walletDescriptionText(tx.description)}</span>
                      <span className="ap-row-desc mono" dir="ltr">{formatInviteDate(tx.createdAt)}</span>
                    </span>
                    <span className={`ap-amount mono${tx.amount >= 0 ? "" : " is-neg"}`} dir="ltr">
                      {tx.amount >= 0 ? "+" : ""}{formatMoney(tx.amount, data.currency)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </section>
  );
}
