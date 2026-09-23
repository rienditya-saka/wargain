"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabaseClient } from "@/lib/supabase-client";
import { HouseholdMember, SocialEvent, SocialRegistration } from "./types";

export interface SocialData {
  events: SocialEvent[];
  household: HouseholdMember[];
  householdRegistrations: SocialRegistration[];
  houseBlock: string | null;
}

const EMPTY: SocialData = { events: [], household: [], householdRegistrations: [], houseBlock: null };

// Loads events + the caller's household and refetches when anything changes in Realtime.
export function useSocialData(communityId: string | undefined, userId: string | undefined, scope: "upcoming" | "all" = "upcoming") {
  const [data, setData] = useState<SocialData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    if (!communityId) return;
    try {
      const params = new URLSearchParams({ communityId, scope });
      if (userId) params.set("userId", userId);
      const res = await fetch(`/api/sosial/events?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal memuat kegiatan");
      setData({
        events: json.events ?? [],
        household: json.household ?? [],
        householdRegistrations: json.householdRegistrations ?? [],
        houseBlock: json.houseBlock ?? null,
      });
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [communityId, userId, scope]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!communityId) return;
    const refetchSoon = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(load, 400);
    };
    const channel = supabaseClient
      .channel(`sosial:${communityId}:${scope}`)
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "social_events", filter: `communityId=eq.${communityId}` }, refetchSoon)
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "social_event_registrations", filter: `communityId=eq.${communityId}` }, refetchSoon)
      .subscribe();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      supabaseClient.removeChannel(channel);
    };
  }, [communityId, scope, load]);

  return { ...data, loading, error, reload: load };
}

export async function apiJson<T = any>(url: string, method: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Permintaan gagal");
  return json as T;
}
