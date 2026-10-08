"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Wallet, Link2, Copy, Check, Share2, Users, Receipt } from "lucide-react";

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
  return Math.round(amount / 10).toLocaleString("en-US") + " تومان";
}

const INVITE_STATUS_FA: Record<InviteStatus, string> = {
  PENDING: "در انتظار خرید",
  REWARDED: "پاداش داده شد",
  REVOKED: "باطل‌شده",
};

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
      await (navigator as any).share({ title: "رفرال", url: data!.shareUrl });
    } catch {
      // کاربر شیت اشتراک‌گذاری رو کنسل کرده یا مرورگر ساپورت نمی‌کرده — نیازی
      // به نشان‌دادنِ خطا نیست.
    }
  }

  return (
    <section>
      <h1>رفرال</h1>
      <div className="account-content-hint">
        دوستت رو با لینکِ رفرالِ خودت دعوت کن — وقتی اولین خریدِ پلنش رو انجام بده، ۱۰٪ از مبلغی که واقعاً پرداخت کرده به‌صورتِ اعتبار به کیفِ تو اضافه می‌شه. این اعتبار فقط داخلِ همین اپ و فقط برای کم‌کردنِ قیمتِ خریدِ پلن‌های بعدی قابل‌استفاده‌ست — هیچ‌وقت قابل‌برداشت یا قابل‌استفاده‌ی بیرون از اپ نیست.
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
              اعتبار قابل‌استفاده برای خریدِ پلن‌ها — غیرقابل‌برداشت
            </div>
          </div>
        </div>
      </motion.div>

      {/* کد/لینکِ رفرال */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32, delay: 0.04 }} className="account-card" style={{ padding: 18, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <span className="account-row2-icon" style={{ width: 34, height: 34 }}><Link2 size={16} /></span>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text)" }}>کد و لینکِ دعوت</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span className="checkout-gateway-pill on mono" dir="ltr" style={{ fontSize: 13 }}>{data.code}</span>
          <div style={{ display: "flex", gap: 8, flex: 1, minWidth: 0 }}>
            <button type="button" className="account-sub-cta-btn account-sub-cta-btn-outline" onClick={copyLink} style={{ gap: 6 }}>
              {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "کپی شد" : "کپی لینک"}
            </button>
            {canShare && (
              <button type="button" className="account-sub-cta-btn account-sub-cta-btn-outline" onClick={shareLink} style={{ gap: 6 }}>
                <Share2 size={14} /> اشتراک‌گذاری
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* دعوت‌ها */}
      <div className="domain-sub">دعوت‌های تو</div>
      <div className="account-card" style={{ marginBottom: 16 }}>
        {data.invites.length === 0 ? (
          <div className="item-line empty" style={{ padding: "16px 15px" }}>هنوز کسی رو دعوت نکردی</div>
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
                <span className="account-row2-label">{inv.inviteeName || "کاربر"}</span>
                <span className="account-row2-desc mono" dir="ltr">{new Date(inv.createdAt).toLocaleDateString("fa-IR")}</span>
              </span>
              <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                <span style={{ ...statusStyle(inv.status), fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999, whiteSpace: "nowrap" }}>
                  {INVITE_STATUS_FA[inv.status]}
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
      <div className="domain-sub">تاریخچه‌ی کیف</div>
      <div className="account-card">
        {data.transactions.length === 0 ? (
          <div className="item-line empty" style={{ padding: "16px 15px" }}>هنوز تراکنشی توی کیفت ثبت نشده</div>
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
                <span className="account-row2-label">{tx.description}</span>
                <span className="account-row2-desc mono" dir="ltr">{new Date(tx.createdAt).toLocaleDateString("fa-IR")}</span>
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
