import type { BlogPost } from "../../types";

// ترجمه‌ی انگلیسی یک مقاله (docs/i18n.md) — کلید = slug. بلوک‌ها و پرسش‌ها هم‌تعداد
// و هم‌ترتیب نسخه‌ی فارسی؛ href ها همون قبلی.
export type BlogPostEn = Pick<BlogPost, "title" | "description" | "excerpt" | "blocks" | "related"> &
  Partial<Pick<BlogPost, "metaTitle" | "keywords" | "takeaways" | "faq">>;
