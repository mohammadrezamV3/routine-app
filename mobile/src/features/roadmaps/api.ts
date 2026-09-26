// اینترفیسِ تزریق‌پذیرِ API برای ماژول رودمپ. صفحه‌ها فقط به همین اینترفیس
// وابسته‌اند، نه به apiClient واقعی — تیمِ لید بعدا Provider واقعی
// (روی apiClient مشترک با auth/refresh) را جای‌گذاری می‌کند. مقدارِ
// پیش‌فرضِ context عمداً throw می‌کند تا فراموشیِ wiring بی‌سروصدا رد نشه.
import { createContext, useContext } from "react";
import type {
  MobileRoadmap,
  MobileRoadmapRegenerateRequest,
  MobileRoadmapRegenerateResponse,
  MobileRoadmapRequest,
  MobileRoadmapResponse,
} from "@/lib/api-contract";

export type RoadmapFetchResult = { status: 304 } | { status: 200; etag: string; data: MobileRoadmap[] };

/**
 * خطای API رودمپ — پیاده‌سازیِ واقعیِ RoadmapApi باید برای هر پاسخِ
 * غیرِ 2xx/304 یک RoadmapApiError پرتاب کند (status + بدنه‌ی error خام،
 * نه پیامِ فارسیِ نمایشی — ترجمه‌ی فارسی کارِ همین فیچر است، نه apiClient).
 */
export class RoadmapApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string) {
    super(code);
    this.name = "RoadmapApiError";
    this.status = status;
    this.code = code;
  }
}

export type RoadmapApi = {
  /** GET /api/mobile/roadmaps — با ETagِ محلی (اگه باشه) */
  fetchRoadmaps(etag?: string): Promise<RoadmapFetchResult>;
  /** POST /api/mobile/ai/roadmap — نیازمندِ اینترنت؛ خطا با RoadmapApiError */
  createAi(req: MobileRoadmapRequest): Promise<MobileRoadmapResponse>;
  /** POST /api/mobile/ai/roadmap/{id}/regenerate — ساختِ دوباره‌ی جزئیاتِ یک مرحله یا راهنما */
  regenerate(id: string, req: MobileRoadmapRegenerateRequest): Promise<MobileRoadmapRegenerateResponse>;
};

const notWired: RoadmapApi = {
  async fetchRoadmaps() {
    throw new Error("offline: RoadmapApi وصل نشده — لایه‌ی apiClient باید Provider واقعی بده");
  },
  async createAi() {
    throw new Error("offline: RoadmapApi وصل نشده — لایه‌ی apiClient باید Provider واقعی بده");
  },
  async regenerate() {
    throw new Error("offline: RoadmapApi وصل نشده — لایه‌ی apiClient باید Provider واقعی بده");
  },
};

export const RoadmapApiContext = createContext<RoadmapApi>(notWired);

export function useRoadmapApi(): RoadmapApi {
  return useContext(RoadmapApiContext);
}

export const RoadmapApiProvider = RoadmapApiContext.Provider;
