"use client";

// ظاهر یک اطلاعیه‌ی نمایشی (پاپ‌آپ، نوار بالا/پایین، کارت گوشه) — هم
// AnnouncementDelivery روی سایت و هم پیش‌نمایش فرم ادمین از همین استفاده
// می‌کنن تا چیزی که ادمین می‌بینه دقیقا همونی باشه که کاربر می‌بینه.
// متن همیشه به‌صورت text رندر می‌شه (بدون HTML).

import Link from "next/link";
import { X } from "lucide-react";
import { isExternalUrl, type AnnouncementTone } from "@/lib/announcements";

export type AnnouncementViewItem = {
  id: string;
  title: string;
  body: string;
  tone: AnnouncementTone;
  dismissible: boolean;
  ctaLabel: string | null;
  ctaUrl: string | null;
  imageUrl: string | null;
};

export type AnnouncementVariant = "popup" | "bar" | "corner";

function Cta({ item, onCta }: { item: AnnouncementViewItem; onCta?: () => void }) {
  if (!item.ctaLabel || !item.ctaUrl) return null;
  if (isExternalUrl(item.ctaUrl)) {
    return (
      <a className="trade-primary-btn ann-cta" href={item.ctaUrl} target="_blank" rel="noopener noreferrer" onClick={onCta}>
        {item.ctaLabel}
      </a>
    );
  }
  return (
    <Link className="trade-primary-btn ann-cta" href={item.ctaUrl} prefetch={false} onClick={onCta}>
      {item.ctaLabel}
    </Link>
  );
}

/**
 * closable: دکمه‌ی بستن نشون داده بشه یا نه (پاپ‌آپ همیشه بستنی‌ه؛ بنر فقط
 * اگه dismissible باشه). onClose در پیش‌نمایش ادمین خالیه.
 */
export function AnnouncementView({
  item,
  variant,
  closable,
  onClose,
  onCta,
}: {
  item: AnnouncementViewItem;
  variant: AnnouncementVariant;
  closable: boolean;
  onClose?: () => void;
  onCta?: () => void;
}) {
  const toneCls = `ann-tone-${item.tone.toLowerCase()}`;
  const close = closable ? (
    <button type="button" className="trade-icon-btn ann-close" onClick={onClose} aria-label="بستن">
      <X size={16} />
    </button>
  ) : null;

  if (variant === "popup") {
    return (
      <div className={`ann-content ann-content-popup ${toneCls}`}>
        {item.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="ann-popup-img" src={item.imageUrl} alt="" loading="lazy" decoding="async" />
        )}
        <div className="ann-head">
          <span className="ann-dot" aria-hidden="true" />
          <div className="ann-title">{item.title}</div>
          {close}
        </div>
        <p className="ann-body">{item.body}</p>
        {item.ctaLabel && item.ctaUrl && (
          <div className="ann-actions">
            <Cta item={item} onCta={onCta} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`ann-content ann-content-${variant} ${toneCls}`}>
      {item.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="ann-thumb" src={item.imageUrl} alt="" loading="lazy" decoding="async" />
      )}
      <div className="ann-text">
        <div className="ann-title">{item.title}</div>
        <p className="ann-body">{item.body}</p>
      </div>
      <Cta item={item} onCta={onCta} />
      {close}
    </div>
  );
}
