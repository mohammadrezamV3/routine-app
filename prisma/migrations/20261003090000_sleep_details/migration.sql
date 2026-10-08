-- جزئیات اختیاری هر شب خواب (بازسازی بخش خواب)
ALTER TABLE "SleepEntry" ADD COLUMN "latencyMin" INTEGER;
ALTER TABLE "SleepEntry" ADD COLUMN "awakenings" INTEGER;
ALTER TABLE "SleepEntry" ADD COLUMN "napMin" INTEGER;
ALTER TABLE "SleepEntry" ADD COLUMN "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
