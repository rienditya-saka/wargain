"use client";

import { useCallback, useEffect, useState } from "react";
import { supabaseClient } from "@/lib/supabase-client";
import type { ChildKms, KmsDashboard } from "./types";

async function getJson<T>(url: string) {
  const res = await fetch(url);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Gagal memuat data KMS");
  return json as T;
}

export async function postKms(body: Record<string, unknown>) {
  const res = await fetch("/api/kms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Gagal menyimpan");
  return json as { child: ChildKms | null };
}

function useRealtimeRefresh(communityId: string | undefined, key: string, onChange: () => void) {
  useEffect(() => {
    if (!communityId) return;
    let t: ReturnType<typeof setTimeout> | null = null;
    const soon = () => {
      if (t) clearTimeout(t);
      t = setTimeout(onChange, 500);
    };
    const channel = supabaseClient
      .channel(`kms:${key}:${communityId}`)
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "growth_measurements", filter: `communityId=eq.${communityId}` }, soon)
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "immunization_records", filter: `communityId=eq.${communityId}` }, soon)
      .subscribe();
    return () => {
      if (t) clearTimeout(t);
      supabaseClient.removeChannel(channel);
    };
  }, [communityId, key, onChange]);
}

export function useHouseholdKms(communityId?: string, userId?: string) {
  const [children, setChildren] = useState<ChildKms[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    if (!communityId || !userId) {
      setLoading(false);
      return;
    }
    try {
      const r = await getJson<{ children: ChildKms[] }>(`/api/kms?communityId=${encodeURIComponent(communityId)}&userId=${encodeURIComponent(userId)}`);
      setChildren(r.children);
    } finally {
      setLoading(false);
    }
  }, [communityId, userId]);
  useEffect(() => {
    load();
  }, [load]);
  useRealtimeRefresh(communityId, "house", load);
  return { children, loading, reload: load };
}

export function useKmsDashboard(communityId?: string, userId?: string, enabled = true) {
  const [data, setData] = useState<KmsDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!communityId || !userId || !enabled) return;
    try {
      setData(await getJson<KmsDashboard>(`/api/kms?communityId=${encodeURIComponent(communityId)}&userId=${encodeURIComponent(userId)}&scope=dashboard`));
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  }, [communityId, userId, enabled]);
  useEffect(() => {
    load();
  }, [load]);
  useRealtimeRefresh(enabled ? communityId : undefined, "dash", load);
  return { data, error, reload: load };
}
