import type { WeeklyHour } from "./types";

// Booking slots for services, in WIB. Shared by the API (authoritative check) and the UI (slot grid).

export interface Slot {
  start: string; // ISO
  end: string;
  label: string; // "08:00"
  remaining: number;
  reason?: "PENUH" | "LEWAT";
}

const TZ_OFFSET = "+07:00";
export const LEAD_MINUTES = 60; // a slot must start at least 1 hour from now

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
const fromMin = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

export function jakartaDateKey(d = new Date()) {
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
}

export function dayOfWeek(dateKey: string) {
  return new Date(`${dateKey}T12:00:00${TZ_OFFSET}`).getUTCDay();
}

export function isOpenOn(dateKey: string, weeklyHours: WeeklyHour[], closedDates: string[]) {
  if (closedDates.includes(dateKey)) return null;
  return weeklyHours.find((h) => h.day === dayOfWeek(dateKey)) ?? null;
}

export function slotsFor(opts: {
  dateKey: string;
  weeklyHours: WeeklyHour[];
  closedDates: string[];
  durationMin: number;
  capacity: number;
  bookings: { start: string; end: string }[]; // active bookings of this product on that day
  now?: Date;
}): Slot[] {
  const hours = isOpenOn(opts.dateKey, opts.weeklyHours, opts.closedDates);
  if (!hours) return [];
  const duration = Math.max(15, opts.durationMin);
  const step = Math.min(Math.max(duration, 30), 120);
  const open = toMin(hours.start);
  const close = toMin(hours.end);
  const earliest = (opts.now ?? new Date()).getTime() + LEAD_MINUTES * 60_000;
  const slots: Slot[] = [];
  for (let m = open; m + duration <= close; m += step) {
    const start = new Date(`${opts.dateKey}T${fromMin(m)}:00${TZ_OFFSET}`);
    const end = new Date(start.getTime() + duration * 60_000);
    const overlapping = opts.bookings.filter((b) => new Date(b.start) < end && new Date(b.end) > start).length;
    const remaining = Math.max(0, opts.capacity - overlapping);
    slots.push({
      start: start.toISOString(),
      end: end.toISOString(),
      label: fromMin(m),
      remaining,
      reason: start.getTime() < earliest ? "LEWAT" : remaining === 0 ? "PENUH" : undefined,
    });
  }
  return slots;
}

export function isOpenNow(weeklyHours: WeeklyHour[], closedDates: string[], now = new Date()) {
  const key = jakartaDateKey(now);
  const hours = isOpenOn(key, weeklyHours, closedDates);
  if (!hours) return false;
  const hhmm = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
  return hhmm >= hours.start && hhmm < hours.end;
}
