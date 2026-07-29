-- AlterTable
ALTER TABLE "CalorieTarget" ADD COLUMN     "ageYears" INTEGER,
ADD COLUMN     "goal" TEXT,
ADD COLUMN     "mealBreakdown" JSONB,
ADD COLUMN     "mealsPerDay" INTEGER,
ADD COLUMN     "sex" TEXT;

-- AlterTable
ALTER TABLE "ExercisePlan" ADD COLUMN     "generatedByAi" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "gymDays" JSONB,
ADD COLUMN     "trainingPhase" TEXT;
