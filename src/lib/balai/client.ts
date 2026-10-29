"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabaseClient } from "@/lib/supabase-client";
import type { BalaiOverview } from "./server";

export type { BalaiOverview };

export async function balaiApi<T = any>(action: string, userId: string | undefined, body: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch("/api/balai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, action, ...body }) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Permintaan gagal");
  return json as T;
}

export async function balaiGet<T = any>(userId: string, params: Record<string, string>): Promise<T> {
  const res = await fetch(`/api/balai?${new URLSearchParams({ userId, ...params })}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Permintaan gagal");
  return json as T;
}

// Whole Balai Warga state; refreshed live when polls / meetings / fundraisers / inventory change.
export function useBalai(userId?: string, communityId?: string) {
  const [data, setData] = useState<BalaiOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reload = useCallback(async () => {
    if (!userId) return; // session not read yet: stay in loading state
    try {
      setData(await balaiGet<BalaiOverview>(userId, { view: "overview" }));
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    if (!communityId || !userId) return;
    const soon = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(reload, 500);
    };
    const filter = `communityId=eq.${communityId}`;
    const ch = supabaseClient
      .channel(`balai:${communityId}:${userId}`)
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "polls", filter }, soon)
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "meetings", filter }, soon)
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "fundraisers", filter }, soon)
      .subscribe();
    return () => {
      if (timer.current) clearTimeout(timer.current);
      supabaseClient.removeChannel(ch);
    };
  }, [communityId, userId, reload]);

  return { data, loading, error, reload, setData };
}
