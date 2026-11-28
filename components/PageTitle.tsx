import { ICONS } from "./NavIcons";

// سرتیتر استاندارد صفحه: آیکون + h1 (همان الگوی /sleep و /weekly)
export function PageTitle({ icon, title }: { icon: keyof typeof ICONS; title: string }) {
  return (
    <div className="trade-head-row" style={{ justifyContent: "flex-start" }}>
      <span className="page-title-icon">{ICONS[icon]}</span>
      <h1>{title}</h1>
    </div>
  );
}
