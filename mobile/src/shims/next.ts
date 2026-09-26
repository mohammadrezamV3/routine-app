// shimِ `next` (ریشه) — صفحه‌های وب فقط تایپِ Metadata/Viewport رو ازش می‌خونن.
export type Metadata = Record<string, any>;
export type Viewport = Record<string, any>;
export type ResolvingMetadata = Promise<Metadata>;
