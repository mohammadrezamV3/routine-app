// این پروژه قراره به‌صورت دو سایت جدا (نه یک سوییچ داخل یک سایت) دیپلوی بشه:
// یکی برای بازار ایران، یکی برای بازار بین‌المللی. اینکه هر build/دیپلوی
// مال کدوم بازاره از طریق env var مشخص می‌شه، نه انتخاب کاربر توی فرم ثبت‌نام.
// عمدا این فایل به @prisma/client وابسته نیست (چون از کامپوننت کلاینتی هم
// import می‌شه)؛ تبدیل به Market enum پریزما فقط سمت API انجام می‌شه.

export type SiteMarket = "IRAN" | "INTERNATIONAL";

export function getSiteMarket(): SiteMarket {
  const raw = (process.env.NEXT_PUBLIC_MARKET || "IRAN").toUpperCase();
  return raw === "INTERNATIONAL" ? "INTERNATIONAL" : "IRAN";
}

export function getSiteMarketLabel(): string {
  return getSiteMarket() === "INTERNATIONAL" ? "بین‌المللی (دلار)" : "ایران (تومان)";
}
