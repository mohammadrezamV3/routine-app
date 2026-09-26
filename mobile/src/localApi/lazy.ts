// هندلرِ LOCAL که ماژولش فقط بارِ اولِ استفاده import می‌شه — تا کدِ صفحه‌هایی که
// کاربر هنوز باز نکرده (و کتابخونه‌های وبی که می‌کشن) توی چانکِ شروعِ اپ نیاد.
import type { LocalCtx, LocalHandler } from "./types";

export function lazyHandler<M extends Record<string, unknown>>(load: () => Promise<M>, name: keyof M & string): LocalHandler {
  return async (ctx: LocalCtx) => {
    const mod = await load();
    return (mod[name] as LocalHandler)(ctx);
  };
}
