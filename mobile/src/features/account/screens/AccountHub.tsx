import { Bell, CreditCard, LifeBuoy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import ListRow from "@/components/ListRow";
import { badgeLabel } from "../logic";
import { useNotices } from "../useNotices";
import { accountRoutePaths } from "../paths";

/** ورودیِ «اشتراک و پشتیبانی» — لید می‌تونه از MoreAccount یا More به `/account` لینک بده */
export default function AccountHub() {
  const navigate = useNavigate();
  const { unreadCount } = useNotices();
  const label = badgeLabel(unreadCount);
  return (
    <div>
      <AppHeader title="اشتراک و پشتیبانی" showBack />
      <main className="pt-2">
        <ListRow icon={<CreditCard size={20} color="var(--accent)" />} label="خرید یا تمدیدِ پلن" onClick={() => navigate(accountRoutePaths.plans)} />
        <ListRow icon={<LifeBuoy size={20} color="var(--accent)" />} label="پشتیبانی" onClick={() => navigate(accountRoutePaths.support)} />
        <ListRow
          icon={<Bell size={20} color="var(--accent)" />}
          label="اطلاعیه‌ها"
          detail={label ? `${label} نخوانده` : undefined}
          onClick={() => navigate(accountRoutePaths.notices)}
        />
      </main>
    </div>
  );
}
