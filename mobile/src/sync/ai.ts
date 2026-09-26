// فیچرهای آنلاینِ AI (اسکنِ غذا، ساختِ برنامه‌ی ورزشی) روی apiClient مشترک.
import type {
  FoodScanResult,
  MobileExercisePlanRequest,
  MobileExercisePlanResponse,
  MobileFoodScanResponse,
} from "@m/lib/api-contract";
import { ApiClient, ApiError } from "./apiClient";
import { resizeToJpegBase64 } from "./image";

/** پیامِ فارسی برای خطاهای فیچرهای AI (روی status/کدِ ثابت، نه متنِ سرور) */
export function describeAiError(err: unknown, online = true): string {
  if (!online) return "برای این کار به اینترنت نیاز داری";
  if (err instanceof ApiError) {
    if (err.kind === "network" || err.kind === "timeout") return "اتصال به سرور برقرار نشد — اینترنت رو چک کن";
    if (err.kind === "session_expired") return "برای استفاده از این قابلیت وارد حسابت شو";
    if (err.kind === "not_configured") return "اتصال به سرور در این نسخه فعال نیست";
    if (err.status === 403 || err.serverMessage === "module_locked") return "این قابلیت در پلنِ فعلیت فعال نیست";
    if (err.status === 429) return err.serverMessage || "سقفِ استفاده پر شده — کمی بعد دوباره امتحان کن";
    if (err.status === 502 || err.status === 503) return "سرویسِ هوش مصنوعی موقتا در دسترس نیست — دوباره امتحان کن";
    if (err.status === 400 || err.status === 413) return err.serverMessage || "ورودی نامعتبره";
    if (err.status >= 500) return "خطای سرور — کمی بعد دوباره امتحان کن";
  }
  if (err instanceof Error && err.message === "image_decode_failed") return "این عکس خونده نشد — عکسِ دیگه‌ای انتخاب کن";
  return "مشکلی پیش اومد — دوباره امتحان کن";
}

export async function scanFoodImage(api: ApiClient, file: Blob): Promise<FoodScanResult> {
  const imageBase64 = await resizeToJpegBase64(file);
  const res = await api.authed<MobileFoodScanResponse>(
    "POST",
    "/api/mobile/ai/food-scan",
    { imageBase64, mediaType: "image/jpeg" },
    { timeoutMs: 60_000 }
  );
  if (!res?.result) throw new ApiError("http", 500);
  return res.result;
}

export async function generateAiExercisePlan(api: ApiClient, req: MobileExercisePlanRequest): Promise<MobileExercisePlanResponse> {
  // feasible:false با 200 (یا 4xx با message) برمی‌گرده — هر دو نمایش داده می‌شن
  const res = await api.authedRaw("POST", "/api/mobile/ai/exercise-plan", req, { timeoutMs: 75_000 });
  const body = await ApiClient.readJson(res);
  if (res.ok && body) return body as MobileExercisePlanResponse;
  if (body && body.feasible === false && typeof body.message === "string") return body as MobileExercisePlanResponse;
  throw new ApiError("http", res.status, typeof body?.error === "string" ? body.error : null);
}
