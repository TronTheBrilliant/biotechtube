"use client";

import { useState, useEffect, useCallback } from "react";
import { createBrowserClient } from "@/lib/supabase";
import { useUser } from "@/lib/auth";

export interface WatchlistCollection {
  id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

const supabase = createBrowserClient();

export function useWatchlistCollections() {
  const { user } = useUser();
  const [collections, setCollections] = useState<WatchlistCollection[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCollections = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("watchlist_collections")
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true });

    if (!error && data) {
      setCollections(data as WatchlistCollection[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) fetchCollections();
    else setLoading(false);
  }, [user, fetchCollections]);

  const ensureDefault = useCallback(async (): Promise<WatchlistCollection | null> => {
    if (!user) return null;

    // Check local state first
    const localExisting = collections.find((c) => c.is_default);
    if (localExisting) return localExisting;

    // Always query DB to prevent duplicates from race conditions
    const { data: dbExisting } = await supabase
      .from("watchlist_collections")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_default", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    if (dbExisting) {
      const col = dbExisting as WatchlistCollection;
      // Update local state if not already there
      setCollections((prev) => {
        if (prev.some((c) => c.id === col.id)) return prev;
        return [col, ...prev];
      });
      return col;
    }

    // No default exists anywhere — create one
    const { data, error } = await supabase
      .from("watchlist_collections")
      .insert({ user_id: user.id, name: "My Watchlist", is_default: true })
      .select()
      .single();

    if (!error && data) {
      const col = data as WatchlistCollection;
      setCollections((prev) => [col, ...prev]);
      return col;
    }
    return null;
  }, [user, collections]);

  const createCollection = useCallback(
    async (name: string): Promise<WatchlistCollection | null> => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("watchlist_collections")
        .insert({ user_id: user.id, name, is_default: false })
        .select()
        .single();

      if (!error && data) {
        const col = data as WatchlistCollection;
        setCollections((prev) => [...prev, col]);
        return col;
      }
      return null;
    },
    [user]
  );

  const renameCollection = useCallback(
    async (id: string, name: string) => {
      const { error } = await supabase
        .from("watchlist_collections")
        .update({ name, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (!error) {
        setCollections((prev) =>
          prev.map((c) => (c.id === id ? { ...c, name } : c))
        );
      }
    },
    []
  );

  const deleteCollection = useCallback(
    async (id: string) => {
      // Delete watchlist items in this collection first
      await supabase
        .from("user_watchlist")
        .delete()
        .eq("collection_id", id);
      await supabase
        .from("user_pipeline_watchlist")
        .delete()
        .eq("collection_id", id);
      // Then delete the collection
      const { error } = await supabase
        .from("watchlist_collections")
        .delete()
        .eq("id", id);
      if (!error) {
        setCollections((prev) => prev.filter((c) => c.id !== id));
      }
    },
    []
  );

  return {
    collections,
    loading,
    fetchCollections,
    ensureDefault,
    createCollection,
    renameCollection,
    deleteCollection,
  };
}
