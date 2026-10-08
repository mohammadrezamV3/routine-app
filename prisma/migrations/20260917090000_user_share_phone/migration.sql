-- به‌اشتراک‌گذاریِ شماره‌ی حساب توی پروفایل عمومی (پیش‌فرض خاموش)
ALTER TABLE "User" ADD COLUMN "sharePhone" BOOLEAN NOT NULL DEFAULT false;
