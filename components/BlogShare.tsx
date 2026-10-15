"use client";

import { useEffect, useState } from "react";
import { Check, Link2, Share2 } from "lucide-react";
import { tr } from "@/lib/i18n";
import "./blog.css";

/** کپی لینک + اشتراک بومی مرورگر (در صورت پشتیبانی)؛ بدون اسکریپت بیرونی */
export function BlogShare({ title }: { title: string }) {
  const [canShare, setCanShare] = useState(false);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  const url = () => window.location.origin + window.location.pathname;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* کلیپ‌بورد در دسترس نیست */
    }
  }
  async function share() {
    try {
      await navigator.share({ title, url: url() });
    } catch {
      /* کاربر بست */
    }
  }

  return (
    <div className="blog-share">
      <span>{tr("اشتراک این مقاله", "Share this article")}</span>
      <button type="button" onClick={copy} className="blog-share-btn">
        {copied ? <Check size={15} aria-hidden="true" /> : <Link2 size={15} aria-hidden="true" />}
        {copied ? tr("کپی شد", "Copied") : tr("کپی لینک", "Copy link")}
      </button>
      {canShare && (
        <button type="button" onClick={share} className="blog-share-btn">
          <Share2 size={15} aria-hidden="true" /> {tr("ارسال", "Share")}
        </button>
      )}
    </div>
  );
}
