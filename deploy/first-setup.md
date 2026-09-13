# راه‌اندازی سرور از صفر (Ubuntu 22.04/24.04 + Docker)

از یک VPS خامِ تازه‌خریده تا سایتِ بالا آمده روی دامنه‌ی خودت. هر بلوک را
عیناً کپی/پیست کن. کل کار ~۳۰ دقیقه است و بیشترش انتظار برای build.

**پیش‌نیاز:** یک VPS با حداقل **۲ هسته / ۴ گیگ رم / ۴۰ گیگ SSD** (کمتر از
۲ گیگ رم برای build خودِ Next کافی نیست)، و دسترسی root با ssh.

---

## ۱) ورود و سخت‌کردن اولیه‌ی سرور

```bash
ssh root@<SERVER_IP>

# آپدیت و ابزارهای پایه
apt update && apt upgrade -y
apt install -y git curl ufw fail2ban

# یک کاربر غیر-root با دسترسی sudo (به‌جای کار مستقیم با root)
adduser arion
usermod -aG sudo arion
rsync --archive --chown=arion:arion ~/.ssh /home/arion   # کلید ssh را هم ببر

# فایروال: فقط ssh و وب
ufw allow OpenSSH && ufw allow 80 && ufw allow 443
ufw --force enable

# ورود با رمز را ببند (فقط کلید ssh) — قبلش مطمئن شو با کلید وارد می‌شوی
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
systemctl restart ssh

# ساعت سرور روی تهران (کرونِ گزارش هفتگی به همین وابسته است)
timedatectl set-timezone Asia/Tehran
```

از این به بعد با کاربر `arion` وارد شو: `ssh arion@<SERVER_IP>`

## ۲) نصب Docker

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker          # یا logout/login
docker --version && docker compose version
```

## ۳) گرفتن کد

```bash
sudo mkdir -p /opt && sudo chown $USER:$USER /opt
git clone <REPO_URL> /opt/routine-app
cd /opt/routine-app
```

## ۴) ساختن `.env`

```bash
cp .env.example .env

# رمزها را همین‌جا بساز و توی .env بگذار:
openssl rand -hex 24    # → POSTGRES_PASSWORD
openssl rand -hex 32    # → NEXTAUTH_SECRET
openssl rand -hex 32    # → CRON_SECRET
npx web-push generate-vapid-keys   # → دو کلید VAPID

nano .env
```

حداقلِ لازم برای بالا آمدن: `POSTGRES_PASSWORD`، `NEXTAUTH_SECRET`،
`NEXTAUTH_URL`، `NEXT_PUBLIC_SITE_URL`، `SUPERADMIN_USERNAME/PASSWORD`،
`TRUST_PROXY_HEADERS=1`. بقیه (پیامک، گوگل، AI، پرداخت) هرکدام یک قابلیت
جداست و بعداً هم می‌شود اضافه کرد — نبودشان اپ را crash نمی‌کند.

⚠️ `NEXTAUTH_URL` و `NEXT_PUBLIC_SITE_URL` باید **دقیقاً** آدرس نهایی با
`https://` و بدون اسلش آخر باشند.

### اندازه‌گذاری بر اساس سرور

قاعده: `WEB_CONCURRENCY × NODE_HEAP_MB` باید از **نصف رم** کمتر بماند تا
Postgres و کشِ فایل‌سیستم هم جا داشته باشند.

| رم / هسته | `WEB_CONCURRENCY` | `NODE_HEAP_MB` | `DB_CONNECTION_LIMIT` |
|---|---|---|---|
| ۲ گیگ / ۱ | 1 | 512 | 5 |
| ۴ گیگ / ۲ | 2 | 512 | 5 |
| **۸ گیگ / ۴** | **4** | **768** | **5** |
| ۱۶ گیگ / ۸ | 6 | 1024 | 5 |

`WEB_CONCURRENCY` را از تعداد هسته‌ها بیشتر نگذار — worker اضافه فقط رم
می‌خورد و context switch زیاد می‌کند.

### swap (توصیه‌شده)

حتی روی سرور پرِ رم، یک swap کوچک جلوی OOM-killer را موقع build می‌گیرد:

```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf && sudo sysctl -p
```

## ۵) بالا آوردن اپ

```bash
bash deploy/update.sh
```

این اسکریپت build می‌کند، مایگریشن‌ها را می‌زند، اپ را بالا می‌آورد و صبر
می‌کند تا healthy شود. (اولین build چند دقیقه طول می‌کشد.)

## ۶) seed اولیه — این را فراموش نکن

```bash
docker compose --profile tools run --rm --build migrate npm run seed
```

بدون seed، جدول `Plan`/`PlanModule` خالی می‌ماند و **ثبت‌نام دوره‌ی آزمایشی
نمی‌گیرد**؛ کاربر سوپرادمین هم ساخته نمی‌شود.

تست محلی قبل از رفتن سراغ دامنه:

```bash
curl -I http://127.0.0.1:3000/api/health   # 200
curl -I http://127.0.0.1:3000/api/ready    # 200 (این یکی به دیتابیس می‌زند)
```

## ۷) DNS

توی پنل دامنه، یک رکورد **A** بساز:

| Type | Name | Value |
|---|---|---|
| A | `@` | `<SERVER_IP>` |
| A | `www` | `<SERVER_IP>` |

اگر Cloudflare داری، فعلاً ابر را **خاکستری** (DNS only) بگذار تا certbot
بتواند گواهی بگیرد؛ بعد از گرفتن گواهی می‌توانی نارنجی‌اش کنی.

منتظر بمان تا `dig +short example.com` آی‌پی سرور را بدهد.

## ۸) nginx + گواهی TLS

```bash
sudo apt install -y nginx certbot python3-certbot-nginx

sudo cp deploy/nginx.conf.example /etc/nginx/sites-available/routine-app
sudo nano /etc/nginx/sites-available/routine-app   # your-domain.example → دامنه‌ی خودت
sudo ln -s /etc/nginx/sites-available/routine-app /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# گواهی رایگان (خودش کانفیگ را برای https ویرایش می‌کند)
sudo certbot --nginx -d example.com -d www.example.com
# تمدید خودکار از قبل با تایمر systemd فعال است:
systemctl list-timers | grep certbot
```

> اگر پشت Cloudflare با حالت Flexible کار می‌کنی، همان کانفیگ HTTP کافی است
> و به certbot نیاز نداری — توضیحش بالای خود `nginx.conf.example` هست.

## ۹) کرون‌ها

```bash
crontab -e
```

خط‌های `deploy/cron.example` را بگذار و `<CRON_SECRET>` و `<YOUR_DOMAIN>` را
پر کن.

⚠️ خط `economic-calendar` را **اضافه نکن**: در دیپلوی داکری خودِ `cluster.js`
این sync را از داخل کانتینر انجام می‌دهد و دوتایی‌اش فشار بی‌دلیل است.

## ۱۰) بکاپ خودکار (از همین روز اول)

```bash
mkdir -p ~/backups
crontab -e
```

```cron
# بکاپ روزانه‌ی دیتابیس، ساعت ۴ صبح، نگهداری ۱۴ روز
0 4 * * * cd /opt/routine-app && docker compose exec -T db pg_dump -U routine -Fc routine > ~/backups/arion-$(date +\%F).dump 2>/dev/null && find ~/backups -name 'arion-*.dump' -mtime +14 -delete
```

هر چند وقت یک‌بار یک نسخه را جای دیگری (خارج از همین سرور) کپی کن — بکاپی
که فقط روی همان سرور است، بکاپ نیست.

## ۱۱) تست نهایی

- `https://example.com` بالا می‌آید و قفل TLS سبز است
- ثبت‌نام با شماره → پیامک OTP می‌رسد (اگر `MELIPAYAMAK_*` را پر کرده‌ای)
- ورود با سوپرادمین و باز شدن `/admin`
- `docker compose ps` → همه `healthy`
- روشن‌کردن نوتیفیکیشن در پنل کاربری و گرفتن یک اعلان تستی
- نصب PWA روی موبایل (منوی مرورگر → افزودن به صفحه‌ی اصلی)

## به‌روزرسانی‌های بعدی

```bash
cd /opt/routine-app && bash deploy/update.sh
```

همین یک دستور کافی است؛ مراحل را جدا نزن (دلیلش داخل خود اسکریپت نوشته
شده — `up -d` بدون `--build` کد قدیمی را بی‌صدا بالا می‌آورد).

## عیب‌یابی سریع

| علامت | اولین جایی که باید نگاه کنی |
|---|---|
| سایت بالا نمی‌آید | `docker compose ps` و `docker compose logs -n 100 app` |
| ۵۰۲ از nginx | اپ هنوز healthy نشده، یا `proxy_pass` به پورت اشتباه |
| همه از حساب بیرون افتادند | `NEXTAUTH_SECRET` عوض شده |
| ورود برای همه قفل شد | `TRUST_PROXY_HEADERS=1` ست نشده (همه یک IP دیده می‌شوند) |
| OTP نمی‌رسد | `MELIPAYAMAK_*` خالی است — کد فقط در `docker compose logs app` چاپ می‌شود |
| ثبت‌نام دوره‌ی آزمایشی نمی‌دهد | seed اجرا نشده |
| دیسک پر شد | `docker system prune -a` و چک‌کردن اندازه‌ی بکاپ‌ها |
