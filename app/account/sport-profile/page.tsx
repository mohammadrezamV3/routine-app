"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { VenetianMask, Ruler, Weight, Cake } from "lucide-react";
import { AuthField } from "@/components/AuthField";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { NumberInput } from "@/components/NumberInput";
import { AccountBackButton } from "@/components/AccountBackButton";
import { getBodyMetrics, saveBodyMetrics, BodyMetrics } from "@/lib/bodyMetrics";

const GENDER_OPTIONS: { value: "male" | "female" | "unset"; label: string }[] = [
  { value: "male", label: "مرد" },
  { value: "female", label: "زن" },
  { value: "unset", label: "نامشخص" },
];

// طبقِ درخواستِ صریح: قد/وزن/سن/جنسیت دیگر توی پروفایلِ عمومی نیست —
// فقط این‌جاست. از همان منبعِ مشترکِ lib/bodyMetrics.ts استفاده می‌کند که
// فرم‌های بدنسازی/کالری هم از قبل باهاش کار می‌کنند، پس هرجا یک‌بار پر
// بشه، بقیه‌ی جاها هم از قبل پرن — سازگار با قرارداد موجودِ پروژه.
export default function SportProfilePage() {
  const [gender, setGender] = useState<"male" | "female" | "unset">("unset");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [ageYears, setAgeYears] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getBodyMetrics().then(({ data }) => {
      if (data) {
        setGender(data.gender ?? "unset");
        setHeightCm(data.heightCm != null ? String(data.heightCm) : "");
        setWeightKg(data.weightKg != null ? String(data.weightKg) : "");
        setAgeYears(data.ageYears != null ? String(data.ageYears) : "");
      }
      setLoaded(true);
    });
  }, []);

  async function save() {
    setSaving(true);
    setSaveError(null);
    try {
      const height = heightCm.trim() ? Number(heightCm) : undefined;
      const weight = weightKg.trim() ? Number(weightKg) : undefined;
      const age = ageYears.trim() ? Number(ageYears) : undefined;
      if (height != null && (!Number.isFinite(height) || height < 100 || height > 250)) {
        setSaveError("قد باید بین ۱۰۰ تا ۲۵۰ سانتی‌متر باشه"); return;
      }
      if (weight != null && (!Number.isFinite(weight) || weight < 20 || weight > 300)) {
        setSaveError("وزن باید بین ۲۰ تا ۳۰۰ کیلوگرم باشه"); return;
      }
      if (age != null && (!Number.isFinite(age) || age < 10 || age > 100)) {
        setSaveError("سن باید بین ۱۰ تا ۱۰۰ سال باشه"); return;
      }
      const patch: BodyMetrics = {
        heightCm: height, weightKg: weight, ageYears: age,
        gender: gender === "unset" ? undefined : gender,
      };
      await saveBodyMetrics(patch);
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
    } catch {
      setSaveError("مشکلی در اتصال به سرور پیش اومد");
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) return null;

  return (
    <section>
      <AccountBackButton />
      <h1>پروفایل ورزشی</h1>
      <div className="account-content-hint">
        قد/وزن/سن/جنسیت — همین اطلاعات توی فرم‌های بدنسازی و کالری هم استفاده می‌شه
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="account-card" style={{ padding: 16 }}>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>
            <VenetianMask size={13} style={{ verticalAlign: "-2px", marginLeft: 5 }} />جنسیت
          </label>
          <SegmentedTabs options={GENDER_OPTIONS} active={gender} onChange={setGender} />
        </div>

        <div className="auth-field-grid">
          <AuthField id="sp-age" label="سن" icon={<Cake size={16} />}>
            <NumberInput id="sp-age" dir="ltr" style={{ textAlign: "right" }} className="wsearch-newform-name" value={ageYears} onChange={setAgeYears} />
          </AuthField>
          <AuthField id="sp-height" label="قد (سانتی‌متر)" icon={<Ruler size={16} />}>
            <NumberInput id="sp-height" dir="ltr" style={{ textAlign: "right" }} className="wsearch-newform-name" value={heightCm} onChange={setHeightCm} />
          </AuthField>
          <AuthField id="sp-weight" label="وزن (کیلوگرم)" icon={<Weight size={16} />}>
            <NumberInput decimal id="sp-weight" dir="ltr" style={{ textAlign: "right" }} className="wsearch-newform-name" value={weightKg} onChange={setWeightKg} />
          </AuthField>
        </div>

        {saveError && <div className="field-error-msg" style={{ display: "block", marginTop: 10 }}>{saveError}</div>}

        <button type="button" className="account-outline-btn" style={{ marginTop: 16 }} onClick={save} disabled={saving}>
          {saving ? "در حال ذخیره…" : saved ? "ذخیره شد" : "ذخیره"}
        </button>
      </motion.div>
    </section>
  );
}
