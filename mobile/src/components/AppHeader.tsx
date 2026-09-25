import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import OfflinePill from "./OfflinePill";

interface AppHeaderProps {
  title: string;
  showBack?: boolean;
  right?: React.ReactNode;
}

export default function AppHeader({ title, showBack, right }: AppHeaderProps) {
  const navigate = useNavigate();

  return (
    <header
      className="no-select sticky top-0 z-30 flex items-center gap-2 border-b px-4 pb-3"
      style={{
        borderColor: "var(--surface-line)",
        background: "var(--surface-1)",
        paddingTop: "calc(env(safe-area-inset-top) + 12px)",
      }}
    >
      {showBack && (
        <button
          onClick={() => navigate(-1)}
          aria-label="بازگشت"
          className="flex items-center justify-center"
          style={{ width: 44, height: 44, marginInlineStart: -10 }}
        >
          <ChevronRight size={22} color="var(--text)" />
        </button>
      )}
      <h1 className="flex-1 truncate font-vazir text-[17px] font-semibold" style={{ color: "var(--text)" }}>
        {title}
      </h1>
      <OfflinePill />
      {right}
    </header>
  );
}
