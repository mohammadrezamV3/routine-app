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
# Prisma Client باید قبل از build ساخته بشه وگرنه import هاش fail می‌شن
RUN npx prisma generate
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

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
