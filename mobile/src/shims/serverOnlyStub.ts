// جایگزینِ ماژول‌های سرور-فقط (lib/prisma، lib/auth، next/server، bcryptjs، …)
// وقتی از گرافِ کلاینت می‌رسن. بیلدِ production اصلا به این‌جا نمی‌رسه
// (tooling/webCompat.ts → serverOnlyGuard با زنجیره‌ی importer خطا می‌ده)؛
// این فقط برای dev/vitest ـه تا صفحه لود بشه و استفاده‌ی واقعی بلند خطا بده.
function fail(): never {
  throw new Error("server-only module used in the mobile app bundle");
}

const handler: ProxyHandler<object> = {
  get(_t, prop) {
    if (prop === "__esModule") return true;
    if (prop === "then") return undefined;
    return new Proxy(fail, handler);
  },
  apply: fail,
  construct: fail,
};

const stub: any = new Proxy(fail, handler);
export default stub;
export const prisma = stub;
export const authOptions = stub;
export const getServerSession = stub;
export const NextResponse = stub;
export const NextRequest = stub;
