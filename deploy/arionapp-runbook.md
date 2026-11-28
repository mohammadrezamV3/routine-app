# arionapp.ir — دستورهای آماده (کپی/پیست به ترتیب)

سرور: `87.107.129.94` · دامنه: `arionapp.ir` · ۸ گیگ رم / ۴ هسته

## ۱) DNS (همین الان بزن تا وقت انتشارش تلف نشه)

توی پنل دامنه:

| Type | Name | Value | TTL |
|---|---|---|---|
| A | `@` | `87.107.129.94` | 300 |
| A | `www` | `87.107.129.94` | 300 |

بعد چک کن: `dig +short arionapp.ir` باید `87.107.129.94` بده.

## ۲) سرور — پایه

```bash
ssh root@87.107.129.94

apt update && apt upgrade -y
apt install -y git curl ufw fail2ban nginx certbot python3-certbot-nginx

adduser arion && usermod -aG sudo arion
rsync --archive --chown=arion:arion ~/.ssh /home/arion

ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw --force enable
timedatectl set-timezone Asia/Tehran

# swap ۲ گیگ (جلوی OOM موقع build)
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

## ۳) داکر + آینه (سرور ایران)

```bash
curl -fsSL https://get.docker.com | sh
usermod -aG docker arion

# بدون این، build با timeout می‌خوابه
tee /etc/docker/daemon.json >/dev/null <<'JSON'
{ "registry-mirrors": ["https://docker.arvancloud.ir"] }
JSON
systemctl restart docker
docker pull hello-world     # باید موفق باشه؛ نشد → آینه‌ی دیگه
```

## ۴) کد + env

```bash
su - arion
sudo mkdir -p /opt && sudo chown arion:arion /opt
git clone https://github.com/mohammadrezamV3/routine-app.git /opt/routine-app
cd /opt/routine-app
cp .env.example .env

# رمزها را بساز و نگه دار:
openssl rand -hex 24   # POSTGRES_PASSWORD
openssl rand -hex 32   # NEXTAUTH_SECRET
openssl rand -hex 32   # CRON_SECRET
npx web-push generate-vapid-keys

nano .env
```

مقدارهای این سرور:

```ini
NEXTAUTH_URL=https://arionapp.ir
NEXT_PUBLIC_SITE_URL=https://arionapp.ir
TRUST_PROXY_HEADERS=1
WEB_CONCURRENCY=4
NODE_HEAP_MB=768
DB_CONNECTION_LIMIT=5
NEXT_PUBLIC_MARKET=IRAN
VAPID_SUBJECT=mailto:<ایمیل خودت>
SUPERADMIN_USERNAME=<یوزرنیم ادمین>
SUPERADMIN_PASSWORD=<رمز قوی>
# GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET را از IP ایران خالی بگذار
```

## ۵) بالا آوردن + seed

```bash
bash deploy/update.sh
docker compose --profile tools run --rm --build migrate npm run prisma:seed

curl -I http://127.0.0.1:3000/api/health   # 200
curl -I http://127.0.0.1:3000/api/ready    # 200
```

## ۶) nginx + گواهی

```bash
sudo cp deploy/nginx.arionapp.ir.conf /etc/nginx/sites-available/routine-app
sudo ln -s /etc/nginx/sites-available/routine-app /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

sudo certbot --nginx -d arionapp.ir -d www.arionapp.ir
```

## ۷) کرون‌ها و بکاپ

```bash
crontab -e
```

```cron
30 5 * * 6 curl -fsS -X POST -H "Authorization: Bearer <CRON_SECRET>" https://arionapp.ir/api/cron/weekly-report >/dev/null 2>&1
# هفته‌نامه (weekly-report) هم الان با زمان‌بند داخلی ساخته می‌شه (هر ۱۰ دقیقه، از شنبه
# ۸ صبح به وقت هر کاربر)؛ خط بالا فقط پشتیبانه و دوباره‌زدنش شماره‌ی تکراری نمی‌سازه.
# یادآوری‌ها (send-reminders) و هشدار اخبار (economic-alerts) دیگه کران نمی‌خوان —
# خود سرور هر ۳۰ ثانیه می‌فرسته (lib/pushScheduler.ts).
0 4 * * * cd /opt/routine-app && docker compose exec -T db pg_dump -U routine -Fc routine > ~/backups/arion-$(date +\%F).dump 2>/dev/null && find ~/backups -name 'arion-*.dump' -mtime +14 -delete
```

(`mkdir -p ~/backups` یادت نره. خط `economic-calendar` را اضافه نکن —
`cluster.js` خودش انجامش می‌دهد. ساعت سرور تهران است، پس گزارش هفتگی را
`0 9 * * 6` هم می‌توانی بگذاری.)

## ۸) تست نهایی

- `https://arionapp.ir` با قفل سبز
- ورود با سوپرادمین → `/admin` باز شود
- `/api/admin/diagnostics/outbound` → ببین از داخل ایران به کدام سرویس‌ها وصل می‌شود
- `docker compose ps` → همه `healthy`
- نصب PWA روی موبایل

## آپدیت‌های بعدی

```bash
cd /opt/routine-app && bash deploy/update.sh
```

## فضای دیسک (جلوگیری از پر شدن بی‌دلیل)

چیزهایی که روی سرور رشد می‌کنند و کنترل هر کدام:

| منبع | کنترل |
|---|---|
| ایمیج‌های بی‌صاحب هر build | `update.sh` بعد از دیپلوی موفق ایمیج‌های بی‌صاحب قدیمی‌تر از ۷ روز را پاک می‌کند (ایمیج قبلی برای rollback می‌ماند) |
| cache بیلدکیت | همان پاکسازی (`docker builder prune` با فیلتر ۷ روز)؛ cache دانلود npm و Prisma و webpack عمدا نگه داشته می‌شود تا build دوباره همه‌چیز را از اینترنت نگیرد |
| کانتینرهای متوقف | `docker container prune` با فیلتر ۲۴ ساعت |
| لاگ کانتینرها | همه‌ی سرویس‌ها (db، app، migrate، autoheal) json-file با سقف دارند |
| کش runtime نکست (`.next/cache`) | ولوم نام‌دار `next_cache`، روی لایه‌ی کانتینر نمی‌نویسد |
| آپلود، اسکرین‌شات، خروجی | اپ فایل روی دیسک نمی‌نویسد و همه‌چیز در Postgres است. `/tmp` کانتینر tmpfs (RAM) و ۲۵۶ مگ است |
| WAL و لاگ Postgres | `max_wal_size=1GB`، فقط پرس‌وجوی کندتر از ۲ ثانیه لاگ می‌شود، لاگ هم سقف دارد |
| journald سرور | سقف ۲۰۰ مگ (دستور در `deploy/cron.example`) |

**هشدار دیسک:** `update.sh` اول کار و بعد از دیپلوی درصد پر بودن را چاپ می‌کند؛ از ۸۰٪ هشدار و از ۹۲٪ قبل از build پاکسازی اضطراری می‌کند. آستانه‌ها: `DISK_WARN_PCT`، `DISK_CRIT_PCT` و `PRUNE_KEEP_HOURS`. کرون هفتگی پاکسازی و هشدار ۸۵٪ در `deploy/cron.example` است.

**بررسی دستی:**

```bash
df -h /
docker system df
sudo du -sh /var/lib/docker/containers/*/ | sort -h | tail
```

**پاکسازی دستی امن** (هیچ‌کدام ولوم داده را پاک نمی‌کند):

```bash
docker image prune -f --filter "until=168h"
docker builder prune -f --filter "until=168h"
docker container prune -f --filter "until=24h"
```

هرگز `docker volume prune`، `docker system prune --volumes` یا `docker compose down -v` را نزن: ولوم `db_data` دیتابیس است.

**نکته:** بار اول بعد از این تغییر، `update.sh` کانتینر db را هم با تنظیمات WAL دوباره می‌سازد (چند ثانیه قطعی؛ داده سالم می‌ماند).
