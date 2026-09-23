"use client";

// Browser side of Web Push: service worker registration + subscription management.

export type PushSupport = "supported" | "unsupported" | "ios-needs-install";

export function pushSupport(): PushSupport {
  if (typeof window === "undefined") return "unsupported";
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = window.matchMedia?.("(display-mode: standalone)").matches || (navigator as any).standalone === true;
  if (ios && !standalone) return "ios-needs-install"; // iOS only allows push for Home Screen apps (16.4+)
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported";
  return "supported";
}

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

async function registration() {
  const existing = await navigator.serviceWorker.getRegistration("/");
  return existing ?? navigator.serviceWorker.register("/sw.js", { scope: "/" });
}

export async function currentSubscription() {
  if (pushSupport() !== "supported") return null;
  const reg = await registration();
  return reg.pushManager.getSubscription();
}

export async function enablePush(userId: string) {
  if (pushSupport() !== "supported") throw new Error("Browser ini belum mendukung notifikasi push.");
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!key) throw new Error("Push belum dikonfigurasi di server.");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Izin notifikasi ditolak. Aktifkan lewat pengaturan browser.");
  const reg = await registration();
  await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) }));
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, subscription: sub.toJSON() }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Gagal mendaftarkan perangkat.");
  return json as { devices: number };
}

export async function disablePush(userId: string) {
  const sub = await currentSubscription();
  if (!sub) return;
  await fetch("/api/push/subscribe", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, endpoint: sub.endpoint }),
  }).catch(() => {});
  await sub.unsubscribe().catch(() => {});
}

export async function sendTestPush(userId: string) {
  const res = await fetch("/api/push/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId }) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Gagal mengirim tes.");
}

// Keep the server's copy fresh (after login switches account on a shared phone, or a rotated endpoint).
export async function syncSubscription(userId: string) {
  if (pushSupport() !== "supported" || Notification.permission !== "granted") return;
  const sub = await currentSubscription();
  if (!sub) return;
  await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, subscription: sub.toJSON() }),
  }).catch(() => {});
}
