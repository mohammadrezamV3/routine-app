// سرویس‌ورکرِ اختصاصیِ Web Push — فقط دو کارِ حداقلی: نمایشِ نوتیف وقتی
// پیامِ push از سرور می‌رسه، و باز/فوکوس‌کردنِ تب وقتی کاربر روی نوتیف کلیک
// می‌کنه. عمداً بدون کش/آفلاین (این یه PWA کامل نیست، فقط زیرساختِ Push).

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Arion", body: event.data.text() };
  }
  const title = payload.title || "Arion";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || "",
      icon: "/images/logo-icon.png",
      badge: "/images/logo-icon.png",
      data: { url: payload.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsList) => {
      for (const client of clientsList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
