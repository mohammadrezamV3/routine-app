// آیکون‌های برند به‌صورت SVG خام، چون lucide-react از نسخه‌ی ۱.x لوگوهای
// برند را حذف کرده. عمداً `currentColor` می‌گیرند و هیچ بک‌گراندی ندارند تا
// دقیقاً مثل بقیه‌ی آیکون‌های صفحه رفتار کنند.

type Props = { size?: number; className?: string };

export function TelegramIcon({ size = 16, className }: Props) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="currentColor"
      className={className} aria-hidden="true" focusable="false"
    >
      <path d="M21.94 4.6l-2.86 13.48c-.21.95-.78 1.19-1.58.74l-4.36-3.21-2.1 2.02c-.23.23-.43.43-.88.43l.31-4.44 8.09-7.31c.35-.31-.08-.49-.55-.18l-10 6.3-4.3-1.35c-.94-.29-.95-.94.2-1.39l16.8-6.48c.78-.29 1.46.18 1.21 1.39z" />
    </svg>
  );
}

export function InstagramIcon({ size = 16, className }: Props) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className={className} aria-hidden="true" focusable="false"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}
