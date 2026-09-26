// سیگنال‌های `notFound()` / `redirect()` ِ next/navigation. مثلِ خودِ Next با
// throw پیاده شده‌ن تا کدِ بعدشون اجرا نشه؛ RouteBoundary (shell/) می‌گیرتشون.
export class NotFoundSignal extends Error {
  readonly digest = "NEXT_NOT_FOUND";
  constructor() {
    super("NEXT_NOT_FOUND");
  }
}

export class RedirectSignal extends Error {
  readonly digest = "NEXT_REDIRECT";
  constructor(readonly url: string, readonly replace: boolean) {
    super(`NEXT_REDIRECT;${url}`);
  }
}

export function isNotFoundSignal(e: unknown): e is NotFoundSignal {
  return e instanceof NotFoundSignal;
}

export function isRedirectSignal(e: unknown): e is RedirectSignal {
  return e instanceof RedirectSignal;
}
