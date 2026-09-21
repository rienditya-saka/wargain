import { SessionTenant } from "./types/auth";

const SESSION_KEY = "wargain_tenant_session";

export function getClientSession(): SessionTenant | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.error("Error reading client session:", err);
    return null;
  }
}

export function setClientSession(session: SessionTenant): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.getItem(SESSION_KEY);
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    // Dispatch custom event for cross-component realtime sync
    window.dispatchEvent(new Event("wargain_session_updated"));
  } catch (err) {
    console.error("Error setting client session:", err);
  }
}

export function clearClientSession(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(SESSION_KEY);
    window.dispatchEvent(new Event("wargain_session_updated"));
  } catch (err) {
    console.error("Error clearing client session:", err);
  }
}
