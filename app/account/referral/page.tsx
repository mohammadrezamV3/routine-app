"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Wallet, Link2, Copy, Check, Share2, Users, Receipt } from "lucide-react";
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

// مبلغِ خام (ریال برای ایران، سنت برای بین‌المللی) → همون قاعده‌ی نمایشیِ
// بقیه‌ی سایت: تومان با جداکننده‌ی هزارگان برای ایران (نگاه کن به
// components/PlanShowcase.tsx)، دلار با دو رقمِ اعشار برای بین‌المللی.
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

// تاریخ دعوت/تراکنش: فارسی همون toLocaleDateString قبلی؛ انگلیسی جلالی با ارقام لاتین
function formatInviteDate(iso: string): string {
  const d = new Date(iso);
  if (!isEn()) return d.toLocaleDateString("fa-IR");
  const [jy, jm, jd] = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return `${jd} ${jMonthName(jm - 1)} ${jy}`;
}

// رنگ‌بندیِ بج‌ها هم‌زبانِ همون پترنِ تینت‌دارِ موجود توی اپ‌ه (نگاه کن به
// .checkout-gateway-pill.on و .checkout-status-banner توی globals.css) —
// بجِ وضعیت ذاتاً به یه بک‌گراندِ نرم نیاز داره تا قابل‌تشخیص باشه.
function statusStyle(status: InviteStatus): { background: string; color: string } {
  if (status === "REWARDED") return { background: "var(--accent-dim)", color: "var(--accent)" };
  if (status === "REVOKED") return { background: "rgba(224,82,82,.1)", color: "#E05252" };
  return { background: "rgba(255,255,255,.06)", color: "var(--muted)" };
}

// صفحه‌ی رفرال — دعوتِ دوستان با کد/لینکِ شخصی؛ وقتی دوست اولین خریدش رو
// انجام بده، ۱۰٪ از مبلغِ واقعاً پرداخت‌شده به‌صورتِ اعتبارِ درون‌اپی به کیفِ
// دعوت‌کننده اضافه می‌شه. این صفحه مثلِ بقیه‌ی زیرصفحه‌های /account خودش
// چک auth نمی‌کنه — همون گیتِ app/account/layout.tsx قبلش نشسته.
export default function ReferralPage() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/referral").then((r) => (r.ok ? r.json() : null)).then(setData);
  }, []);

  if (!data) return null;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(data!.shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // کلیپ‌بورد روی بعضی مرورگرهای قدیمی/غیرِ https ممکنه رد کنه — بی‌صدا
      // نادیده می‌گیریم، دکمه فقط به حالتِ عادی برمی‌گرده.
    }
  }

  const canShare = typeof navigator !== "undefined" && typeof (navigator as any).share === "function";

  async function shareLink() {
    try {
      await (navigator as any).share({ title: tr(tr("رفرال", "Referral"), "Referral"), url: data!.shareUrl });
    } catch {
      // کاربر شیت اشتراک‌گذاری رو کنسل کرده یا مرورگر ساپورت نمی‌کرده — نیازی
      // به نشان‌دادنِ خطا نیست.
    }
  }

  return (
    <section>
      <h1>{tr(tr("رفرال", "Referral"), "Referral")}</h1>
      <div className="account-content-hint">
        {tr("دوستت رو با لینکِ رفرالِ خودت دعوت کن — وقتی اولین خریدِ پلنش رو انجام بده، ۱۰٪ از مبلغی که واقعاً پرداخت کرده به‌صورتِ اعتبار به کیفِ تو اضافه می‌شه. این اعتبار فقط داخلِ همین اپ و فقط برای کم‌کردنِ قیمتِ خریدِ پلن‌های بعدی قابل‌استفاده‌ست — هیچ‌وقت قابل‌برداشت یا قابل‌استفاده‌ی بیرون از اپ نیست.", "Invite a friend with your referral link. When they make their first plan purchase, 10% of the amount they actually paid is added to your wallet as credit. This credit can only be used inside the app, only to reduce the price of future plan purchases, and can never be withdrawn or used outside the app.")}
      </div>

      {/* کیفِ پول */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="account-card" style={{ padding: 18, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="account-row2-icon" style={{ width: 44, height: 44 }}><Wallet size={19} /></span>
          <div>
            <div className="mono" dir="ltr" style={{ fontSize: 26, fontWeight: 800, color: "var(--accent)" }}>
              {formatMoney(data.walletBalance, data.currency)}
            </div>
            <div className="item-line" style={{ marginTop: 2 }}>
              {tr("اعتبار قابل‌استفاده برای خریدِ پلن‌ها — غیرقابل‌برداشت", "Credit you can use to buy plans. Not withdrawable")}
            </div>
          </div>
        </div>
      </motion.div>

      {/* کد/لینکِ رفرال */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32, delay: 0.04 }} className="account-card" style={{ padding: 18, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <span className="account-row2-icon" style={{ width: 34, height: 34 }}><Link2 size={16} /></span>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text)" }}>{tr("کد و لینکِ دعوت", "Invite code and link")}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span className="checkout-gateway-pill on mono" dir="ltr" style={{ fontSize: 13 }}>{data.code}</span>
          <div style={{ display: "flex", gap: 8, flex: 1, minWidth: 0 }}>
            <button type="button" className="account-sub-cta-btn account-sub-cta-btn-outline" onClick={copyLink} style={{ gap: 6 }}>
              {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? tr("کپی شد", "Copied") : tr("کپی لینک", "Copy link")}
            </button>
            {canShare && (
              <button type="button" className="account-sub-cta-btn account-sub-cta-btn-outline" onClick={shareLink} style={{ gap: 6 }}>
                <Share2 size={14} /> {tr("اشتراک‌گذاری", "Share")}
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* دعوت‌ها */}
      <div className="domain-sub">{tr("دعوت‌های تو", "Your invites")}</div>
      <div className="account-card" style={{ marginBottom: 16 }}>
        {data.invites.length === 0 ? (
          <div className="item-line empty" style={{ padding: "16px 15px" }}>{tr("هنوز کسی رو دعوت نکردی", "You have not invited anyone yet")}</div>
        ) : (
          data.invites.map((inv, i) => (
            <motion.div
              key={inv.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.03 }}
              className="account-row2"
            >
              <span className="account-row2-icon"><Users size={15} /></span>
              <span className="account-row2-body">
                <span className="account-row2-label">{inv.inviteeName || tr("کاربر", "User")}</span>
                <span className="account-row2-desc mono" dir="ltr">{formatInviteDate(inv.createdAt)}</span>
              </span>
              <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                <span style={{ ...statusStyle(inv.status), fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999, whiteSpace: "nowrap" }}>
                  {inviteStatusLabels()[inv.status]}
                </span>
                {inv.status === "REWARDED" && inv.rewardAmount != null && (
                  <span className="mono" dir="ltr" style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700 }}>
                    +{formatMoney(inv.rewardAmount, data.currency)}
                  </span>
                )}
              </span>
            </motion.div>
          ))
        )}
      </div>

      {/* تاریخچه‌ی کیف */}
      <div className="domain-sub">{tr("تاریخچه‌ی کیف", "Wallet history")}</div>
      <div className="account-card">
        {data.transactions.length === 0 ? (
          <div className="item-line empty" style={{ padding: "16px 15px" }}>{tr("هنوز تراکنشی توی کیفت ثبت نشده", "No wallet transactions yet")}</div>
        ) : (
          data.transactions.map((tx, i) => (
            <motion.div
              key={tx.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.03 }}
              className="account-row2"
            >
              <span className="account-row2-icon"><Receipt size={15} /></span>
              <span className="account-row2-body">
                <span className="account-row2-label">{walletDescriptionText(tx.description)}</span>
                <span className="account-row2-desc mono" dir="ltr">{formatInviteDate(tx.createdAt)}</span>
              </span>
              <span className="mono" dir="ltr" style={{ fontSize: 13, fontWeight: 700, color: tx.amount >= 0 ? "var(--accent)" : "var(--muted)" }}>
                {tx.amount >= 0 ? "+" : ""}{formatMoney(tx.amount, data.currency)}
              </span>
            </motion.div>
          ))
        )}
      </div>
    </section>
  );
}
