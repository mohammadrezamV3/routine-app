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

# ─── کنترل فضای دیسک ────────────────────────────────────────────────────
# هر build یک ایمیج تازه می‌سازد و قبلی dangling می‌شود؛ cache بیلدکیت هم
# رشد می‌کند. آستانه‌ها با env قابل تنظیم‌اند.
DISK_WARN_PCT="${DISK_WARN_PCT:-80}"        # هشدار
DISK_CRIT_PCT="${DISK_CRIT_PCT:-92}"        # پاکسازی اضطراری قبل از build
PRUNE_KEEP_HOURS="${PRUNE_KEEP_HOURS:-168}" # جدیدتر از ۷ روز می‌ماند (برای rollback)

disk_pct() {
  local root
  root="$(docker info --format '{{.DockerRootDir}}' 2>/dev/null || echo /)"
  df -P "$root" 2>/dev/null | awk 'NR==2{gsub("%","",$5); print $5}'
}

disk_check() {
  local pct
  pct="$(disk_pct || true)"
  [ -n "$pct" ] || return 0
  if [ "$pct" -ge "$DISK_CRIT_PCT" ]; then
    echo "✖ دیسک ${pct}٪ پر است (بحرانی). پاکسازی اضطراری ایمیج‌های بی‌صاحب و cache قدیمی..."
    docker image prune -f >/dev/null 2>&1 || true
    docker builder prune -f --filter "until=24h" >/dev/null 2>&1 || true
    pct="$(disk_pct || true)"
    echo "  بعد از پاکسازی: ${pct}٪"
  elif [ "$pct" -ge "$DISK_WARN_PCT" ]; then
    echo "⚠ هشدار: دیسک ${pct}٪ پر است. بعد از دیپلوی پاکسازی انجام می‌شود؛ اگر بالا ماند deploy/arionapp-runbook.md بخش «فضای دیسک» را ببین."
  else
    echo "دیسک: ${pct}٪ پر — مشکلی نیست."
  fi
}

# پاکسازی امن بعد از دیپلوی موفق: فقط چیزهای بی‌صاحب و قدیمی. ولوم‌ها
# (db_data و next_cache) و ایمیج‌های در حال استفاده هرگز لمس نمی‌شوند.
post_deploy_cleanup() {
  echo
  echo "── پاکسازی امن (قدیمی‌تر از $((PRUNE_KEEP_HOURS / 24)) روز) ─────────────"
  docker image prune -f --filter "until=${PRUNE_KEEP_HOURS}h" || true
  docker builder prune -f --filter "until=${PRUNE_KEEP_HOURS}h" || true
  docker container prune -f --filter "until=24h" || true
  docker system df || true
  disk_check || true
}

disk_check

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
    post_deploy_cleanup
    exit 0
  fi
  sleep 3
done

echo "✖ اپ ظرفِ ۹۰ ثانیه healthy نشد. لاگ:"
docker compose logs --tail 60 app
exit 1
