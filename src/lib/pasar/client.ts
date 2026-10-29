"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabaseClient } from "@/lib/supabase-client";
import type { Order, Product, Shop } from "./types";

export async function pasarApi<T = any>(url: string, method = "GET", body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Permintaan gagal");
  return json as T;
}

export type ShopWithLoc = Shop & { lat?: number | null; lng?: number | null };

// Catalog of the community (Realtime on shops + products, so stock / new items show up live).
export function useCatalog(communityId?: string, userId?: string) {
  const [shops, setShops] = useState<ShopWithLoc[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [myShopId, setMyShopId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    if (!communityId) return;
    try {
      const p = new URLSearchParams({ communityId });
      if (userId) p.set("userId", userId);
      const r = await pasarApi<{ shops: ShopWithLoc[]; products: Product[]; myShopId: string | null }>(`/api/pasar?${p}`);
      setShops(r.shops);
      setProducts(r.products);
      setMyShopId(r.myShopId);
    } finally {
      setLoading(false);
    }
  }, [communityId, userId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!communityId) return;
    const soon = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(load, 400);
    };
    const ch = supabaseClient
      .channel(`pasar:${communityId}`)
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "shop_products", filter: `communityId=eq.${communityId}` }, soon)
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "shops", filter: `communityId=eq.${communityId}` }, soon)
      .subscribe();
    return () => {
      if (timer.current) clearTimeout(timer.current);
      supabaseClient.removeChannel(ch);
    };
  }, [communityId, load]);

  return { shops, products, myShopId, loading, reload: load };
}

// Orders are private (no client Realtime), so they refresh on focus and every 20s while visible.
export function useOrders(userId: string | undefined, scope: "buyer" | "seller", enabled = true) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    if (!userId || !enabled) {
      setLoading(false);
      return;
    }
    try {
      const r = await pasarApi<{ orders: Order[] }>(`/api/pasar/orders?userId=${encodeURIComponent(userId)}&scope=${scope}`);
      setOrders(r.orders);
    } finally {
      setLoading(false);
    }
  }, [userId, scope, enabled]);

  useEffect(() => {
    load();
    if (!enabled) return;
    const onFocus = () => document.visibilityState === "visible" && load();
    const t = setInterval(onFocus, 20_000);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [load, enabled]);

  const act = useCallback(
    async (orderId: string, action: string, payload: Record<string, unknown> = {}) => {
      const r = await pasarApi<{ order: Order }>("/api/pasar/orders", "PATCH", { userId, orderId, action, ...payload });
      setOrders((l) => l.map((o) => (o.id === orderId ? r.order : o)));
      return r.order;
    },
    [userId]
  );

  return { orders, loading, reload: load, act, setOrders };
}

// ---------------- Cart (one shop at a time, kept in this browser) ----------------

export interface CartLine {
  productId: string;
  qty: number;
  variant?: string | null;
}
export interface Cart {
  shopId: string | null;
  lines: CartLine[];
}

const cartKey = (userId?: string) => `wargain_cart_${userId ?? "guest"}`;

export function useCart(userId?: string) {
  const [cart, setCart] = useState<Cart>({ shopId: null, lines: [] });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(cartKey(userId));
      if (raw) setCart(JSON.parse(raw));
    } catch {
      // storage unavailable: in-memory cart only
    }
  }, [userId]);

  const save = useCallback(
    (next: Cart) => {
      setCart(next);
      try {
        localStorage.setItem(cartKey(userId), JSON.stringify(next));
      } catch {
        // ignore
      }
    },
    [userId]
  );

  const add = useCallback(
    (shopId: string, line: CartLine): "added" | "replaced" => {
      const sameShop = cart.shopId === shopId;
      const lines = sameShop ? [...cart.lines] : [];
      const idx = lines.findIndex((l) => l.productId === line.productId && (l.variant ?? null) === (line.variant ?? null));
      if (idx >= 0) lines[idx] = { ...lines[idx], qty: lines[idx].qty + line.qty };
      else lines.push(line);
      save({ shopId, lines });
      return sameShop || !cart.lines.length ? "added" : "replaced";
    },
    [cart, save]
  );

  const setQty = useCallback(
    (productId: string, variant: string | null | undefined, qty: number) => {
      const lines = cart.lines
        .map((l) => (l.productId === productId && (l.variant ?? null) === (variant ?? null) ? { ...l, qty } : l))
        .filter((l) => l.qty > 0);
      save({ shopId: lines.length ? cart.shopId : null, lines });
    },
    [cart, save]
  );

  const clear = useCallback(() => save({ shopId: null, lines: [] }), [save]);
  const count = cart.lines.reduce((n, l) => n + l.qty, 0);
  return { cart, add, setQty, clear, count };
}
