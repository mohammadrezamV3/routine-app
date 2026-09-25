import { useState } from "react";
import { Map, User, Settings, Info, Moon, Sun } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import ListRow from "@/components/ListRow";
import BottomSheet from "@/components/BottomSheet";
import { useTheme } from "@/lib/useTheme";

export default function More() {
  const navigate = useNavigate();
  const { mode, toggle } = useTheme();
  const [aboutOpen, setAboutOpen] = useState(false);

  return (
    <div>
      <AppHeader title="بیشتر" />
      <main className="pt-2">
        <ListRow icon={<Map size={18} color="var(--muted)" />} label="رودمپ‌ها" onClick={() => {}} />
        <ListRow icon={<User size={18} color="var(--muted)" />} label="حساب کاربری" onClick={() => navigate("/login")} />
        <ListRow
          icon={mode === "dark" ? <Moon size={18} color="var(--muted)" /> : <Sun size={18} color="var(--muted)" />}
          label={mode === "dark" ? "تم: تاریک" : "تم: روشن"}
          onClick={toggle}
        />
        <ListRow icon={<Settings size={18} color="var(--muted)" />} label="تنظیمات" onClick={() => {}} />
        <ListRow icon={<Info size={18} color="var(--muted)" />} label="درباره" onClick={() => setAboutOpen(true)} />
      </main>

      <BottomSheet open={aboutOpen} onClose={() => setAboutOpen(false)} title="درباره‌ی آریون">
        <p className="font-vazir text-[13.5px] leading-7" style={{ color: "var(--muted)" }}>
          آریون یک اپ روتین/ورزش/ترید/رودمپ است. این نسخه‌ی اندروید به‌زودی به حساب وب شما وصل می‌شه.
        </p>
      </BottomSheet>
    </div>
  );
}
