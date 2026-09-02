"use client";

import { motion } from "framer-motion";
import { Mail, MessageCircleWarning } from "lucide-react";
import { SOCIAL, SUPPORT_EMAIL } from "@/lib/brand";
import { TelegramIcon, InstagramIcon } from "@/components/SocialIcons";
import { AccountBackButton } from "@/components/AccountBackButton";

const FAQ = [
  { q: "چطور اشتراکم رو ارتقا بدم؟", a: "از بخش «اشتراک» توی همین پنل، دکمه‌ی «ارتقا به پلن بالاتر» رو بزن." },
  { q: "چطور رمز عبورم رو عوض کنم؟", a: "از بخش «امنیت» توی همین پنل، رمز فعلی و رمز جدید رو وارد کن." },
  { q: "اگه با گوگل ثبت‌نام کردم چطور دوستام پیدام کنن؟", a: "از بخش «پروفایل» یه یوزرنیم برای خودت تنظیم کن." },
];

export default function SupportPage() {
  const mailto = `mailto:${SUPPORT_EMAIL}?subject=` + encodeURIComponent("گزارش مشکل — Arion");

  return (
    <section>
      <AccountBackButton />
      <h1>پشتیبانی</h1>
      <div className="account-content-hint">اگه سوالی داری یا با مشکلی روبه‌رو شدی</div>

      <div className="account-card">
        <a href={`mailto:${SUPPORT_EMAIL}`} className="account-row2">
          <span className="account-row2-icon"><Mail size={16} /></span>
          <span className="account-row2-body">
            <span className="account-row2-label">تماس با پشتیبانی</span>
            <span className="account-row2-desc mono" dir="ltr">{SUPPORT_EMAIL}</span>
          </span>
        </a>
        <a href={mailto} className="account-row2">
          <span className="account-row2-icon"><MessageCircleWarning size={16} /></span>
          <span className="account-row2-body">
            <span className="account-row2-label">گزارش مشکل</span>
            <span className="account-row2-desc">ارسال ایمیل برای گزارش باگ یا مشکل</span>
          </span>
        </a>
        <a href={SOCIAL.telegram.url} target="_blank" rel="me noopener noreferrer" className="account-row2">
          <span className="account-row2-icon"><TelegramIcon size={16} /></span>
          <span className="account-row2-body">
            <span className="account-row2-label">پشتیبانی در تلگرام</span>
            <span className="account-row2-desc mono" dir="ltr">{SOCIAL.telegram.handle}</span>
          </span>
        </a>
        <a href={SOCIAL.instagram.url} target="_blank" rel="me noopener noreferrer" className="account-row2">
          <span className="account-row2-icon"><InstagramIcon size={16} /></span>
          <span className="account-row2-body">
            <span className="account-row2-label">اینستاگرام</span>
            <span className="account-row2-desc mono" dir="ltr">{SOCIAL.instagram.handle}</span>
          </span>
        </a>
      </div>

      <div className="tm-extra">
        <div className="domain-sub">سوالات متداول</div>
        <div className="account-card" style={{ padding: "4px 16px" }}>
          {FAQ.map((f, i) => (
            <motion.div
              key={f.q}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.04 }}
              style={{ padding: "14px 0", borderBottom: i < FAQ.length - 1 ? "1px solid var(--line)" : "none" }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>{f.q}</div>
              <div className="item-line">{f.a}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
