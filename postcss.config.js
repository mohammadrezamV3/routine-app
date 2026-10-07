// ترتیب مهمه: tailwind اول، بعد جایگزین‌های مرورگر قدیمی (postcss-compat.js)،
// آخر autoprefixer. باز‌کردن :is() و بقیه‌ی جایگزین‌ها توی همون پلاگین‌ن.
module.exports = {
  plugins: {
    tailwindcss: {},
    "./postcss-compat.js": {},
    autoprefixer: {},
  },
};
