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
*/5 * * * * curl -fsS -X POST -H "Authorization: Bearer <CRON_SECRET>" https://arionapp.ir/api/push/send-reminders >/dev/null 2>&1
30 5 * * 6 curl -fsS -X POST -H "Authorization: Bearer <CRON_SECRET>" https://arionapp.ir/api/cron/weekly-report >/dev/null 2>&1
*/5 * * * * curl -fsS -X POST -H "Authorization: Bearer <CRON_SECRET>" https://arionapp.ir/api/cron/economic-alerts >/dev/null 2>&1
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
