#!/usr/bin/env bash
# تشخیصِ «سایت بالا نمیاد و باید چندبار ریلود کنم».
#
# این اسکریپت رو *روی خودِ سرور* (کنارِ docker-compose.yml) اجرا کن:
#     bash scripts/diagnose-uptime.sh            # دامنه از .env خونده می‌شه
#     bash scripts/diagnose-uptime.sh arionapp.ir
#
# فقط می‌خونه — هیچ‌چیزی رو ری‌استارت یا عوض نمی‌کنه. خروجی رو کامل کپی کن.

set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

DOMAIN="${1:-}"
if [ -z "$DOMAIN" ] && [ -f .env ]; then
  DOMAIN="$(grep -E '^NEXT_PUBLIC_SITE_URL=' .env | head -1 | cut -d= -f2- | tr -d '"' | sed -e 's#^https\?://##' -e 's#/.*##')"
fi

hr() { printf '\n──────────── %s ────────────\n' "$1"; }
have() { command -v "$1" >/dev/null 2>&1; }

hr "۱) وضعیتِ کانتینرها"
if have docker; then
  docker compose ps 2>/dev/null || docker ps
  echo
  for c in $(docker compose ps -q 2>/dev/null); do
    docker inspect --format '{{.Name}}  health={{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}  restarts={{.RestartCount}}  started={{.State.StartedAt}}  oomkilled={{.State.OOMKilled}}  exit={{.State.ExitCode}}' "$c"
  done
else
  echo "docker پیدا نشد."
fi

hr "۲) دو روتِ سلامت (مستقیم به Node، بدونِ nginx و کلادفلر)"
# health فقط می‌گه پروسه زنده‌ست؛ ready واقعاً به Postgres کوئری می‌زنه.
# اگه health سالم بود ولی ready تایم‌اوت داد → پولِ کانکشنِ دیتابیس پُره.
for path in /api/health /api/ready; do
  printf '%-14s → ' "$path"
  curl -s -o /tmp/_diag_body -w 'HTTP %{http_code}  %{time_total}s\n' --max-time 20 "http://127.0.0.1:3000$path" || echo "بی‌پاسخ"
  sed -e 's/^/                 /' /tmp/_diag_body 2>/dev/null; echo
done
rm -f /tmp/_diag_body

hr "۳) ۱۰ درخواستِ پشت‌سرهم به صفحه‌ی اصلی (نرخِ واقعیِ خطا)"
if [ -n "$DOMAIN" ]; then
  echo "دامنه: $DOMAIN"
  fail=0
  for i in $(seq 1 10); do
    code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 25 "https://$DOMAIN/" || echo 000)
    t=$(curl -s -o /dev/null -w '%{time_total}' --max-time 25 "https://$DOMAIN/" || echo -)
    printf '  %2d) HTTP %s  در %ss\n' "$i" "$code" "$t"
    [ "$code" = "200" ] || fail=$((fail+1))
  done
  echo "  → $fail از ۱۰ درخواست ناموفق بود."
else
  echo "دامنه مشخص نشد؛ اسکریپت رو با نامِ دامنه اجرا کن: bash scripts/diagnose-uptime.sh example.com"
fi

hr "۴) لاگِ اپ — دنبالِ کرش/OOM/خطای دیتابیس"
if have docker; then
  docker compose logs --tail=120 app 2>/dev/null | grep -Ei 'error|fatal|oom|heap|econnrefused|timeout|prisma|listen|ready in' | tail -40
  echo "(اگه چیزی چاپ نشد یعنی لاگِ اخیر تمیزه)"
fi

hr "۵) OOM killerِ خودِ لینوکس (سنگین‌ترین نشانه)"
if have dmesg; then
  (dmesg -T 2>/dev/null || sudo dmesg -T 2>/dev/null) | grep -Ei 'out of memory|oom-kill|killed process' | tail -10 \
    || echo "چیزی پیدا نشد (یا دسترسیِ dmesg نیست — با sudo دوباره اجرا کن)"
fi

hr "۶) حافظه و دیسک"
free -m 2>/dev/null | head -3
echo
df -h / 2>/dev/null | head -2
echo "(دیسکِ پُر هم دقیقاً همین علائم رو می‌ده: نه Postgres می‌تونه بنویسه نه Next)"

hr "۷) کانکشن‌های بازِ Postgres"
if have docker; then
  docker compose exec -T db psql -U "${POSTGRES_USER:-routine}" -d "${POSTGRES_DB:-routine}" \
    -c "SELECT count(*) AS open_connections, (SELECT setting FROM pg_settings WHERE name='max_connections') AS max_connections FROM pg_stat_activity;" 2>/dev/null \
    || echo "نشد به psql وصل شد (شاید POSTGRES_USER فرق داره)"
fi

hr "۸) پیکربندیِ زنده‌ی nginx"
NGX="$(ls /etc/nginx/sites-enabled/* 2>/dev/null | head -5)"
if [ -n "$NGX" ]; then
  for f in $NGX; do
    echo "فایل: $f"
    # کامنت‌ها رو قبلش حذف می‌کنیم — وگرنه همین کامنتِ توضیحیِ خودِ
    # nginx.arionapp.ir.conf (که دقیقاً همین رشته رو برای توضیحِ باگِ قدیمی
    # نقل‌قول می‌کنه) باعثِ یه false positive می‌شد.
    if grep -vE '^[[:space:]]*#' "$f" | grep -qE 'proxy_set_header[[:space:]]+Connection[[:space:]]+"upgrade"'; then
      echo "  ✖ باگِ کلاسیک پیدا شد: هدرِ Connection روی *همه‌ی* درخواست‌ها ثابت \"upgrade\"ه."
      echo "    این دقیقاً همون «گاهی بالا نمیاد، ریلود می‌زنم درست می‌شه» رو می‌سازه."
      echo "    ← deploy/nginx.conf.example همین ریپو رو جایگزینش کن و: sudo nginx -t && sudo systemctl reload nginx"
    else
      echo "  ✓ هدرِ Connection ثابتِ \"upgrade\" نیست."
    fi
    grep -nE 'keepalive|proxy_read_timeout|proxy_set_header[[:space:]]+Connection' "$f" | sed 's/^/    /'
  done
else
  echo "چیزی توی /etc/nginx/sites-enabled پیدا نشد."
fi

hr "۹) خطاهای اخیرِ nginx"
(tail -40 /var/log/nginx/error.log 2>/dev/null || sudo tail -40 /var/log/nginx/error.log 2>/dev/null) \
  | grep -Ei 'upstream|502|504|timed out|refused|worker_connections' | tail -20 \
  || echo "چیزی پیدا نشد (یا دسترسی نیست — با sudo اجرا کن)"

hr "۱۰) فایلِ استاتیکِ بزرگ: مستقیم در مقابلِ پشتِ Cloudflare"
# «سایت بدونِ استایل لود می‌شه» می‌تونه یعنیِ یه فایلِ CSS/JS بزرگ بینِ
# Cloudflare و این سرور نصفه‌کاره کش/تحویل شده — نشونه‌ش اینه که اندازه‌ی
# دریافتی از دامنه‌ی عمومی کمتر از اندازه‌ی واقعیِ رویِ دیسکه، درحالی‌که
# مستقیم از Node/nginx (بدونِ Cloudflare) کامل میاد.
CSS_FILE="$(find .next/static/css -name '*.css' 2>/dev/null | sort -rV | head -1)"
if [ -n "$CSS_FILE" ] && [ -n "$DOMAIN" ]; then
  CSS_NAME="$(basename "$CSS_FILE")"
  REAL_SIZE="$(wc -c < "$CSS_FILE")"
  DIRECT_SIZE="$(curl -s -o /dev/null -w '%{size_download}' --max-time 15 "http://127.0.0.1:3000/_next/static/css/$CSS_NAME" 2>/dev/null || echo 0)"
  PUBLIC_SIZE="$(curl -s -o /dev/null -w '%{size_download}' --max-time 15 "https://$DOMAIN/_next/static/css/$CSS_NAME" 2>/dev/null || echo 0)"
  echo "  فایل: $CSS_NAME"
  echo "  روی دیسک:        $REAL_SIZE بایت"
  echo "  مستقیم از Node:   $DIRECT_SIZE بایت"
  echo "  از دامنه‌ی عمومی: $PUBLIC_SIZE بایت"
  if [ "$DIRECT_SIZE" = "$REAL_SIZE" ] && [ "$PUBLIC_SIZE" != "$REAL_SIZE" ]; then
    echo "  ✖ Node/nginx کامل می‌دن ولی از پشتِ Cloudflare ناقص میاد — مشکل مالِ"
    echo "    مسیرِ Cloudflare↔سرورِه (مثلاً کندیِ لینکِ بین‌المللی)، نه خودِ اپ."
    echo "    ← deploy/nginx.arionapp.ir.conf رو برای راه‌اندازیِ Full (strict) SSL ببین."
  elif [ "$PUBLIC_SIZE" = "$REAL_SIZE" ]; then
    echo "  ✓ از هر مسیری کامل میاد."
  fi
else
  echo "  فایلِ CSS بیلد پیدا نشد یا دامنه مشخص نیست — این بخش رد شد."
fi

hr "پایان"
echo "کلِ این خروجی رو کپی کن و بفرست."
