-- عیب‌یابی اسکرین اکسپرت روی اتصال متاتریدر
ALTER TABLE "TradeMtLink" ADD COLUMN "eaVersion" TEXT;
ALTER TABLE "TradeMtLink" ADD COLUMN "shotsEnabled" BOOLEAN;
ALTER TABLE "TradeMtLink" ADD COLUMN "lastShotAt" TIMESTAMP(3);
ALTER TABLE "TradeMtLink" ADD COLUMN "shotError" TEXT;
ALTER TABLE "TradeMtLink" ADD COLUMN "shotErrorAt" TIMESTAMP(3);
