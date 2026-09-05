#!/usr/bin/env bash
# به‌روزرسانیِ کاملِ سرور — تنها دستوری که برای آپدیت لازم است:
#
#   bash deploy/update.sh
#
# چرا این اسکریپت لازم شد: آپدیتِ دستی چهار مرحله دارد و ترتیب/فلگ‌هایشان
# مهم است. دو اشتباهِ شایع، هر دو *بی‌صدا* خراب می‌کنند:
#
#   1) `docker compose up -d` بدونِ `--build` → کدِ جدید اصلا build نمی‌شود و
#      کانتینر با ایمیجِ قدیمی بالا می‌آید. سایت همان نسخه‌ی قبل را نشان
#      می‌دهد و هیچ خطایی هم نمی‌دهد.
#   2) `docker compose --profile tools run --rm migrate ...` بدونِ `--build` →
#      ایمیجِ migrate هم قدیمی است، یعنی پوشه‌ی prisma/migrations داخلش
#      مایگریشن‌های جدید را ندارد. خروجی می‌شود «No pending migrations found»
#      و آدم فکر می‌کند دیتابیس به‌روز است، در حالی که اصلا خبر نداشته.
#
# ترتیب هم عمدی است: اول migrate بعد app. اگر اول اپ بالا بیاید، تا لحظه‌ی
# اجرای migrate کدِ جدید روی اسکیمای قدیمی کار می‌کند و کاربر خطا می‌بیند.

set -euo pipefail
cd "$(dirname "$0")/.."

echo "── ۱/۵ گرفتنِ آخرین کد ────────────────────────────────"
if [ "${SKIP_PULL:-0}" != "1" ]; then
  git pull --ff-only
fi
git --no-pager log --oneline -1

echo
echo "── ۲/۵ build ایمیج‌ها ─────────────────────────────────"
# هر دو ایمیج (app و migrate) با هم ساخته می‌شوند تا دقیقا از یک commit باشند.
docker compose --profile tools build app migrate

echo
echo "── ۳/۵ اجرای مایگریشن‌ها ──────────────────────────────"
docker compose --profile tools run --rm migrate

echo
echo "── ۴/۵ بالا آوردنِ اپ ─────────────────────────────────"
docker compose up -d db app

echo
echo "── ۵/۵ انتظار برای healthy شدن ───────────────────────"
for i in $(seq 1 30); do
  status="$(docker compose ps --format '{{.Service}} {{.Health}}' 2>/dev/null | awk '$1=="app"{print $2}')"
  if [ "$status" = "healthy" ]; then
    echo "✔ اپ بالا آمد و healthy است."
    docker compose ps
    exit 0
  fi
  sleep 3
done

echo "✖ اپ ظرفِ ۹۰ ثانیه healthy نشد. لاگ:"
docker compose logs --tail 60 app
exit 1
