# ─── مرحله ۱: نصب dependencies ───────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
# موتورهای Prisma به libssl نیاز دارن — node:20-alpine خامْ فاقدشه؛ بدونش
# schema/query engine با خطای غیر-JSON ("Could not parse schema engine
# response") روی musl کرش می‌کنه.
RUN apk add --no-cache openssl
COPY package.json package-lock.json* ./
RUN npm ci

# ─── مرحله ۲: build ───────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# متغیرهای NEXT_PUBLIC_* توی کدِ سمتِ کلاینت همین لحظه‌ی build جایگزین می‌شن
# (نه در runtime) — ولی .env توی .dockerignoreست (عمداً، چون رمزهای دیتابیس
# هم توشه) پس هیچ‌وقت وارد این stage نمی‌شه. باید صریح از docker-compose (که
# خودش .env رو برای همین ${...}ها می‌خونه) به‌عنوان build arg بیاد.
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY
ENV NEXT_PUBLIC_VAPID_PUBLIC_KEY=$NEXT_PUBLIC_VAPID_PUBLIC_KEY
# دامنه‌ی پایه‌ی زیردامنه‌های بخش‌ها (docs/sections.md) — خالی = زیردامنه‌ها خاموش
ARG NEXT_PUBLIC_SECTION_BASE_DOMAIN
ENV NEXT_PUBLIC_SECTION_BASE_DOMAIN=$NEXT_PUBLIC_SECTION_BASE_DOMAIN
# Prisma Client باید قبل از build ساخته بشه وگرنه import هاش fail می‌شن.
# generate اگه موتور Prisma توی node_modules نباشه از binaries.prisma.sh
# دانلودش می‌کنه؛ روی سرور ایران این اتصال گاهی وسط کار قطع می‌شه
# (ECONNRESET) و کل build می‌افته. پس چند بار با فاصله‌ی بیشتر تلاش می‌کنه.
# اگه اون دامنه کلا در دسترس نبود، PRISMA_ENGINES_MIRROR رو در .env بذار.
ARG PRISMA_ENGINES_MIRROR
ENV CHECKPOINT_DISABLE=1
RUN [ -n "$PRISMA_ENGINES_MIRROR" ] || unset PRISMA_ENGINES_MIRROR; \
    for i in 1 2 3 4 5 6; do \
      npx prisma generate && exit 0; \
      echo "prisma generate failed (attempt $i), retrying in $((i * 10))s..."; \
      sleep $((i * 10)); \
    done; exit 1
RUN npm run build

# ─── مرحله ۳: ایمیج نهایی اجرا (سبک، بدون devDependencies) ───────────────
FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

# خروجی standalone نکست: فقط فایل‌های لازمِ اجرا، نه کل node_modules
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# برای اجرای migrate/seed داخل کانتینر لازمه
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
# ورودیِ کلاستر (فورکِ چند worker از همین server.js) — جزوِ خروجیِ standalone
# نکست نیست چون هیچ فایلی importش نمی‌کنه، پس جدا کپی می‌شه.
COPY --from=builder /app/cluster.js ./cluster.js

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "cluster.js"]
