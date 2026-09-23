/* WargaIn service worker: shows Web Push notifications and opens the linked page on tap. */
/* eslint-disable no-restricted-globals */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "WargaIn", body: event.data ? event.data.text() : "" };
  }
  const urgent = data.priority === "URGENT";
  const options = {
    body: data.body || "",
    icon: data.icon || "/icons/icon-192.png",
    badge: "/icons/badge-96.png",
    tag: data.tag || undefined,
    renotify: !!data.tag,
    requireInteraction: urgent,
    vibrate: urgent ? [400, 150, 400, 150, 400] : [120],
    timestamp: data.createdAt ? new Date(data.createdAt).getTime() : Date.now(),
    data: { link: data.link || "/feed", id: data.id },
    actions: data.link ? [{ action: "open", title: "Lihat" }] : [],
  };
  event.waitUntil(self.registration.showNotification(data.title || "WargaIn", options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.link) || "/feed", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      for (const w of windows) {
        if (new URL(w.url).origin === self.location.origin && "focus" in w) {
          w.navigate(target).catch(() => {});
          return w.focus();
        }
      }
      return self.clients.openWindow(target);
    })
  );
});

// Browser rotated the subscription: tell the app so the server keeps a valid endpoint.
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((windows) => windows.forEach((w) => w.postMessage({ type: "PUSH_SUBSCRIPTION_CHANGED" })))
  );
});
