#!/usr/bin/env bash
#
# راه‌اندازی کاملِ سرور از صفر — یک دستور.
#
#   ssh root@<SERVER_IP>
#   curl -fsSL https://raw.githubusercontent.com/mohammadrezamV3/routine-app/main/deploy/bootstrap.sh -o bootstrap.sh
#   bash bootstrap.sh
#
# یا اگر کد را از قبل clone کرده‌ای:  sudo bash deploy/bootstrap.sh
#
# چه می‌کند: پکیج‌های پایه، فایروال، تایم‌زون، swap، داکر (+آینه برای
# سرورهای ایران)، کلونِ کد، ساختِ .env با رمزهای تصادفی، build و بالا آوردن
# اپ، seed، nginx، گواهی TLS، کرون‌ها و بکاپ روزانه.
#
# ایمنی‌ها:
#   • هر مرحله idempotent است — اگر وسطش قطع شد، دوباره اجرا کن.
#   • اگر `.env` از قبل باشد، دست نمی‌خورد (رمزها بازتولید نمی‌شوند).
#   • ورود ssh با رمز را *خودکار نمی‌بندد* (ریسکِ قفل‌شدنِ خودت).
#   • certbot فقط وقتی اجرا می‌شود که دامنه واقعاً به همین سرور اشاره کند.
#
# متغیرهای محیطی (برای اجرای بی‌سؤال):
#   DOMAIN=arionapp.ir ADMIN_EMAIL=you@example.com \
#   SUPERADMIN_USERNAME=admin SUPERADMIN_PASSWORD='...' \
#   NONINTERACTIVE=1 bash deploy/bootstrap.sh

set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/mohammadrezamV3/routine-app.git}"
APP_DIR="${APP_DIR:-/opt/routine-app}"
BRANCH="${BRANCH:-main}"
DOCKER_MIRROR="${DOCKER_MIRROR:-https://docker.arvancloud.ir}"
SWAP_GB="${SWAP_GB:-2}"
TIMEZONE="${TIMEZONE:-Asia/Tehran}"
BACKUP_DIR="${BACKUP_DIR:-/root/backups}"

step()  { printf '\n\033[1;36m── %s\033[0m\n' "$*"; }
ok()    { printf '  \033[1;32m✔\033[0m %s\n' "$*"; }
warn()  { printf '  \033[1;33m!\033[0m %s\n' "$*"; }
die()   { printf '\n\033[1;31m✘ %s\033[0m\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "این اسکریپت باید با root (یا sudo) اجرا شود."
command -v apt-get >/dev/null || die "فقط روی Ubuntu/Debian تست شده."

# ── ورودی‌ها ──────────────────────────────────────────────────────────────
ask() { # ask VAR "سؤال" [پیش‌فرض]
  local var="$1" prompt="$2" def="${3:-}" cur="${!1:-}"
  if [ -n "$cur" ]; then return; fi
  if [ "${NONINTERACTIVE:-0}" = "1" ]; then
    [ -n "$def" ] || die "متغیر $var در حالت NONINTERACTIVE لازم است."
    printf -v "$var" '%s' "$def"; return
  fi
  local ans
  read -r -p "  $prompt${def:+ [$def]}: " ans
  printf -v "$var" '%s' "${ans:-$def}"
  [ -n "${!var}" ] || die "$var خالی ماند."
}

step "۰/۱۱ اطلاعات اولیه"
ask DOMAIN "دامنه (بدون https)" "arionapp.ir"
ask ADMIN_EMAIL "ایمیل برای گواهی TLS و VAPID"
ask SUPERADMIN_USERNAME "یوزرنیم سوپرادمین" "admin"
if [ -z "${SUPERADMIN_PASSWORD:-}" ]; then
  if [ "${NONINTERACTIVE:-0}" = "1" ]; then die "SUPERADMIN_PASSWORD لازم است."; fi
  read -r -s -p "  رمز سوپرادمین (نمایش داده نمی‌شود): " SUPERADMIN_PASSWORD; echo
  [ ${#SUPERADMIN_PASSWORD} -ge 8 ] || die "رمز حداقل ۸ کاراکتر."
fi

# ── ۱) پکیج‌های پایه ──────────────────────────────────────────────────────
step "۱/۱۱ پکیج‌های پایه"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq git curl ufw fail2ban nginx certbot python3-certbot-nginx dnsutils rsync >/dev/null
ok "نصب شد"

# ── ۲) فایروال و تایم‌زون ─────────────────────────────────────────────────
step "۲/۱۱ فایروال و ساعت سرور"
ufw allow OpenSSH >/dev/null 2>&1 || true
ufw allow 80/tcp >/dev/null 2>&1 || true
ufw allow 443/tcp >/dev/null 2>&1 || true
ufw --force enable >/dev/null 2>&1 || true
timedatectl set-timezone "$TIMEZONE" || warn "تایم‌زون ست نشد"
ok "ufw فعال (۲۲/۸۰/۴۴۳) · تایم‌زون $TIMEZONE"
warn "ورود ssh با رمز عمداً بسته نشد. بعد از مطمئن‌شدن از ورود با کلید، خودت ببند:"
warn "  sed -i 's/^#\\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config && systemctl restart ssh"

# ── ۳) swap ──────────────────────────────────────────────────────────────
step "۳/۱۱ swap"
if swapon --show | grep -q .; then
  ok "swap از قبل فعال است"
else
  fallocate -l "${SWAP_GB}G" /swapfile && chmod 600 /swapfile
  mkswap /swapfile >/dev/null && swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  sysctl -qw vm.swappiness=10
  grep -q '^vm.swappiness' /etc/sysctl.conf || echo 'vm.swappiness=10' >> /etc/sysctl.conf
  ok "${SWAP_GB}G swap ساخته شد"
fi

# ── ۴) داکر ──────────────────────────────────────────────────────────────
step "۴/۱۱ داکر"
if command -v docker >/dev/null; then
  ok "داکر از قبل نصب است"
else
  curl -fsSL https://get.docker.com | sh >/dev/null
  ok "داکر نصب شد"
fi
if [ -n "$DOCKER_MIRROR" ] && [ ! -f /etc/docker/daemon.json ]; then
  mkdir -p /etc/docker
  printf '{ "registry-mirrors": ["%s"] }\n' "$DOCKER_MIRROR" > /etc/docker/daemon.json
  systemctl restart docker
  ok "آینه‌ی رجیستری ست شد ($DOCKER_MIRROR)"
fi
if ! timeout 90 docker pull -q hello-world >/dev/null 2>&1; then
  die "داکر نمی‌تواند ایمیج بگیرد. آینه‌ی دیگری در /etc/docker/daemon.json بگذار و دوباره اجرا کن."
fi
ok "دسترسی به رجیستری سالم است"

# ── ۵) کد ────────────────────────────────────────────────────────────────
step "۵/۱۱ کد پروژه"
if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" fetch --quiet origin "$BRANCH"
  git -C "$APP_DIR" checkout --quiet "$BRANCH"
  git -C "$APP_DIR" pull --quiet --ff-only
  ok "کد به‌روز شد"
else
  mkdir -p "$(dirname "$APP_DIR")"
  git clone --quiet --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
  ok "کلون شد در $APP_DIR"
fi
cd "$APP_DIR"

# ── ۶) .env ──────────────────────────────────────────────────────────────
step "۶/۱۱ فایل .env"
if [ -f .env ]; then
  ok ".env از قبل هست — دست نخورد (رمزهای موجود حفظ شدند)"
else
  # اندازه‌گذاری: مجموعِ heapِ همه‌ی workerها زیرِ نصفِ رم بماند تا Postgres
  # و کشِ فایل‌سیستم هم جا داشته باشند. سقفِ ۷۶۸ عمدی‌ست — heapِ بزرگ‌تر
  # برای این اپ فایده‌ای ندارد و فقط از رمِ Postgres می‌زند.
  CPU="$(nproc)"; RAM_MB="$(awk '/MemTotal/{print int($2/1024)}' /proc/meminfo)"
  WORKERS="$CPU"
  if [ "$WORKERS" -gt 6 ]; then WORKERS=6; fi
  HEAP=$(( (RAM_MB / 2) / WORKERS ))
  if [ "$HEAP" -gt 768 ]; then HEAP=768; fi
  if [ "$HEAP" -lt 384 ]; then HEAP=384; fi
  VAPID_OUT="$(docker run --rm node:20-alpine npx --yes web-push generate-vapid-keys --json 2>/dev/null || true)"
  VAPID_PUB="$(printf '%s' "$VAPID_OUT" | grep -oE '"publicKey":"[^"]+"' | cut -d'"' -f4 || true)"
  VAPID_PRIV="$(printf '%s' "$VAPID_OUT" | grep -oE '"privateKey":"[^"]+"' | cut -d'"' -f4 || true)"
  [ -n "$VAPID_PUB" ] || warn "کلید VAPID ساخته نشد — بعداً دستی پرش کن (نوتیف تا آن‌وقت خاموش است)."

  cp .env.example .env
  set_env() { # set_env KEY VALUE
    local k="$1" v="$2"
    if grep -qE "^#?\s*${k}=" .env; then
      # مقدار ممکن است / یا & داشته باشد، پس با awk جایگزین می‌کنیم نه sed
      awk -v k="$k" -v v="$v" 'BEGIN{FS=OFS="="} $0 ~ "^#?[ \t]*"k"=" && !done {print k"="v; done=1; next} {print}' .env > .env.tmp && mv .env.tmp .env
    else
      printf '%s=%s\n' "$k" "$v" >> .env
    fi
  }
  set_env POSTGRES_PASSWORD "$(openssl rand -hex 24)"
  set_env NEXTAUTH_SECRET   "$(openssl rand -hex 32)"
  set_env CRON_SECRET       "$(openssl rand -hex 32)"
  set_env NEXTAUTH_URL      "https://${DOMAIN}"
  set_env NEXT_PUBLIC_SITE_URL "https://${DOMAIN}"
  set_env TRUST_PROXY_HEADERS  "1"
  set_env WEB_CONCURRENCY   "$WORKERS"
  set_env NODE_HEAP_MB      "$HEAP"
  set_env DB_CONNECTION_LIMIT "5"
  set_env VAPID_SUBJECT     "mailto:${ADMIN_EMAIL}"
  [ -n "$VAPID_PUB" ]  && set_env NEXT_PUBLIC_VAPID_PUBLIC_KEY "$VAPID_PUB"
  [ -n "$VAPID_PRIV" ] && set_env VAPID_PRIVATE_KEY "$VAPID_PRIV"
  set_env SUPERADMIN_USERNAME "$SUPERADMIN_USERNAME"
  set_env SUPERADMIN_PASSWORD "$SUPERADMIN_PASSWORD"
  chmod 600 .env
  ok ".env ساخته شد (${WORKERS} worker × ${HEAP}MB heap برای ${CPU} هسته / ${RAM_MB}MB رم)"
  warn "کلیدهای سرویس‌های بیرونی (ملی‌پیامک، آروان AI، زیبال، SMTP) خالی‌اند — بعداً پرشان کن."
fi

# ── ۷) build و بالا آوردن ────────────────────────────────────────────────
step "۷/۱۱ build و اجرا (چند دقیقه طول می‌کشد)"
SKIP_PULL=1 bash deploy/update.sh
ok "اپ بالا آمد"

# ── ۸) seed ──────────────────────────────────────────────────────────────
step "۸/۱۱ داده‌ی اولیه (پلن‌ها و سوپرادمین)"
if docker compose exec -T db psql -U routine -d routine -tAc 'select count(*) from "Plan"' 2>/dev/null | grep -qE '^[1-9]'; then
  ok "دیتابیس از قبل seed شده"
else
  docker compose --profile tools run --rm --build migrate npm run seed
  ok "seed انجام شد"
fi

# ── ۹) nginx ─────────────────────────────────────────────────────────────
step "۹/۱۱ nginx"
CONF_SRC="deploy/nginx.conf.example"
[ -f "deploy/nginx.${DOMAIN}.conf" ] && CONF_SRC="deploy/nginx.${DOMAIN}.conf"
sed "s/your-domain\.example/${DOMAIN}/g" "$CONF_SRC" > /etc/nginx/sites-available/routine-app
ln -sf /etc/nginx/sites-available/routine-app /etc/nginx/sites-enabled/routine-app
rm -f /etc/nginx/sites-enabled/default
nginx -t >/dev/null 2>&1 || die "کانفیگ nginx خطا دارد: nginx -t"
systemctl reload nginx
ok "nginx روی $DOMAIN تنظیم شد"

# ── ۱۰) گواهی TLS ────────────────────────────────────────────────────────
step "۱۰/۱۱ گواهی TLS"
SERVER_IP="$(curl -fsS --max-time 10 https://api.ipify.org 2>/dev/null || hostname -I | awk '{print $1}')"
DOMAIN_IP="$(dig +short "$DOMAIN" A | tail -1)"
if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
  ok "گواهی از قبل هست"
elif [ -z "$DOMAIN_IP" ]; then
  warn "دامنه هنوز رزولو نمی‌شود — certbot رد شد. بعد از پخش DNS بزن:"
  warn "  certbot --nginx -d $DOMAIN -d www.$DOMAIN"
elif [ "$DOMAIN_IP" != "$SERVER_IP" ]; then
  warn "دامنه به $DOMAIN_IP اشاره می‌کند نه $SERVER_IP (یا پشت CDN است) — certbot رد شد."
  warn "اگر Cloudflare/CDN داری، ابر را خاکستری کن و بعد بزن:"
  warn "  certbot --nginx -d $DOMAIN -d www.$DOMAIN"
else
  certbot --nginx --non-interactive --agree-tos -m "$ADMIN_EMAIL" \
    -d "$DOMAIN" -d "www.$DOMAIN" --redirect || warn "certbot موفق نبود؛ بعداً دستی بزن."
  ok "گواهی گرفته شد (تمدید خودکار با تایمر systemd)"
fi

# ── ۱۱) کرون‌ها و بکاپ ───────────────────────────────────────────────────
step "۱۱/۱۱ کرون‌ها و بکاپ روزانه"
mkdir -p "$BACKUP_DIR"
CRON_SECRET_VAL="$(grep -E '^CRON_SECRET=' .env | cut -d= -f2-)"
MARK="# arion-cron"
if crontab -l 2>/dev/null | grep -q "$MARK"; then
  ok "کرون‌ها از قبل ثبت شده‌اند"
else
  {
    crontab -l 2>/dev/null || true
    echo "$MARK"
    echo "*/5 * * * * curl -fsS -X POST -H 'Authorization: Bearer ${CRON_SECRET_VAL}' https://${DOMAIN}/api/push/send-reminders >/dev/null 2>&1"
    echo "*/5 * * * * curl -fsS -X POST -H 'Authorization: Bearer ${CRON_SECRET_VAL}' https://${DOMAIN}/api/cron/economic-alerts >/dev/null 2>&1"
    echo "0 9 * * 6 curl -fsS -X POST -H 'Authorization: Bearer ${CRON_SECRET_VAL}' https://${DOMAIN}/api/cron/weekly-report >/dev/null 2>&1"
    echo "0 4 * * * cd ${APP_DIR} && docker compose exec -T db pg_dump -U routine -Fc routine > ${BACKUP_DIR}/arion-\$(date +\\%F).dump 2>/dev/null && find ${BACKUP_DIR} -name 'arion-*.dump' -mtime +14 -delete"
  } | crontab -
  ok "کرون‌ها ثبت شدند (تقویم اقتصادی عمداً نیست — cluster.js خودش انجامش می‌دهد)"
fi

# ── جمع‌بندی ─────────────────────────────────────────────────────────────
printf '\n\033[1;32m━━━ تمام شد ━━━\033[0m\n'
docker compose ps
cat <<EOF

  سایت:        https://${DOMAIN}
  ادمین:       ${SUPERADMIN_USERNAME}
  مسیر پروژه:  ${APP_DIR}
  بکاپ‌ها:      ${BACKUP_DIR}

  تست سلامت:
    curl -I http://127.0.0.1:3000/api/health
    curl -I http://127.0.0.1:3000/api/ready

  کارهای باقی‌مانده (هرکدام یک قابلیت است، اپ بدونشان سالم کار می‌کند):
    • MELIPAYAMAK_*  → بدونش کد OTP فقط در لاگ چاپ می‌شود (ثبت‌نام عملاً کار نمی‌کند)
    • ARVAN_AI_*     → رودمپ‌ساز / برنامه‌ی ورزشی / اسکن غذا / دستیار
    • ZIBAL_MERCHANT_KEY → خرید اشتراک
    • SMTP_*         → ایمیل
  بعد از پرکردن هرکدام در ${APP_DIR}/.env:  cd ${APP_DIR} && bash deploy/update.sh

  آپدیت‌های بعدی:  cd ${APP_DIR} && bash deploy/update.sh

EOF
