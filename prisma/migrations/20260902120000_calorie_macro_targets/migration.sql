-- هدفِ درشت‌مغذی‌ها (گرم در روز) روی هدفِ کالری — اختیاری، فقط از فرمِ دستی
ALTER TABLE "CalorieTarget" ADD COLUMN "proteinTargetG" INTEGER;
ALTER TABLE "CalorieTarget" ADD COLUMN "carbsTargetG" INTEGER;
ALTER TABLE "CalorieTarget" ADD COLUMN "fatTargetG" INTEGER;
